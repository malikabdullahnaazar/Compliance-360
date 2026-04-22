import os
import logging
from datetime import datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction, models
from django.db.models import Q
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse, Http404
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from ..models import AuditDocument
from ..serializers import AuditDocumentSerializer, DocumentUploadSerializer
from ..services.document_processor import get_document_processor
from ..models import ChartIntakeJob
from ..tasks import run_chart_intake_job

logger = logging.getLogger(__name__)

_APP_ENV = os.getenv('APP_ENV', 'Dev').strip().lower()
_IS_PROD = _APP_ENV == 'prod'
OPENAI_FILE_SIZE_LIMIT_MB = float(os.getenv("OPENAI_FILE_SIZE_LIMIT_MB", "500"))

class DocumentManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for general document management operations.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['document_type', 'patient']
    search_fields = ['filename']
    ordering_fields = ['filename', 'created_at', 'document_type']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter documents by user permissions."""
        user = self.request.user
        if hasattr(user, 'is_superadmin') and user.is_superadmin:
            return AuditDocument.objects.all()
        elif getattr(user, 'role', None) in ['agency_admin', 'qa_compliance'] and user.agency:
            return AuditDocument.objects.filter(agency=user.agency)
        else:
            return AuditDocument.objects.filter(
                Q(audit_session__created_by=user) | Q(patient__created_by=user)
            ).distinct()

    def get_serializer_class(self):
        return AuditDocumentSerializer

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Upload a document to the agency or link to a patient."""
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            uploaded_file = request.FILES.get('file')
            document_type = serializer.validated_data['document_type']
            patient_id = serializer.validated_data.get('patient_id')
            
            user = request.user
            agency = getattr(user, 'agency', None)
            
            patient = None
            if patient_id:
                from patients.models import Patient
                try:
                    patient = Patient.objects.get(id=patient_id)
                    if agency and patient.agency != agency:
                         return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
                except Patient.DoesNotExist:
                    return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
            
            doc_agency = patient.agency if patient else agency
            processor = get_document_processor()
            file_bytes = uploaded_file.read()

            processed_doc = processor.process_bytes(
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                document_type=document_type
            )
            
            file_path = f"uploads/general/{uploaded_file.name}"
            if patient:
                file_path = f"uploads/patient_{patient.id}/{uploaded_file.name}"
            elif doc_agency:
                file_path = f"uploads/agency_{doc_agency.id}/{uploaded_file.name}"

            saved_file_path = default_storage.save(file_path, ContentFile(file_bytes))

            with transaction.atomic():
                document = AuditDocument.objects.create(
                    patient=patient,
                    agency=doc_agency,
                    document_type=document_type,
                    filename=uploaded_file.name,
                    file_path=saved_file_path,
                    file_size_mb=processed_doc['file_size_mb'],
                    total_pages=processed_doc.get('total_pages'),
                    extracted_text=processed_doc['content'],
                    extraction_method=processed_doc['extraction_method']
                )

            return Response(AuditDocumentSerializer(document).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Document upload failed: {str(e)}")
            return Response({'error': f'Failed to process document: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="chart_intake/start")
    def chart_intake_start(self, request):
        """
        Start async intake extraction for a new patient chart upload.
        Accepts: multipart/form-data with `file` (PDF only).
        Returns: { job_id } for polling status/progress.
        """
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        file_size_mb = uploaded_file.size / (1024 * 1024)
        server_limit_mb = 100
        if file_size_mb > server_limit_mb:
            return Response(
                {"error": f"File too large ({file_size_mb:.1f} MB). Limit is {server_limit_mb} MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        if uploaded_file.content_type != "application/pdf" and not uploaded_file.name.lower().endswith(".pdf"):
            return Response({"error": "Only PDF files are allowed"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        agency = getattr(user, "agency", None)

        job = ChartIntakeJob.objects.create(
            created_by=user,
            agency=agency,
            status=ChartIntakeJob.STATUS_PENDING,
            progress=0,
            filename=uploaded_file.name,
            openai_model="gpt-5.4-mini",
        )

        try:
            file_bytes = uploaded_file.read()
            tmp_path = f"uploads/chart_intake/{job.id}/{uploaded_file.name}"
            saved_file_path = default_storage.save(tmp_path, ContentFile(file_bytes))
            ChartIntakeJob.objects.filter(pk=job.id).update(
                file_path=saved_file_path,
                file_size_mb=file_size_mb,
                progress=2,
            )
        except Exception as exc:
            job.status = ChartIntakeJob.STATUS_FAILED
            job.error_message = str(exc)[:4000]
            job.save(update_fields=["status", "error_message"])
            return Response({"error": "Failed to store file for intake"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        run_chart_intake_job.delay(str(job.id))
        return Response({"job_id": str(job.id)}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=["get"], url_path=r"chart_intake/(?P<job_id>[^/.]+)/status")
    def chart_intake_status(self, request, job_id=None):
        """Poll intake job status and extracted patient payload."""
        try:
            job = ChartIntakeJob.objects.get(pk=job_id)
        except ChartIntakeJob.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if getattr(user, "role", None) != "superadmin" and job.agency_id and user.agency_id != job.agency_id:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {
                "job_id": str(job.id),
                "status": job.status,
                "progress": int(job.progress or 0),
                "error_message": job.error_message,
                "extracted_patient": job.extracted_patient,
                "ambiguous_candidates": job.ambiguous_candidates or [],
                "filename": job.filename,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path=r"chart_intake/(?P<job_id>[^/.]+)/cancel")
    def chart_intake_cancel(self, request, job_id=None):
        """Cancel an intake job and delete the temporarily stored file."""
        try:
            job = ChartIntakeJob.objects.get(pk=job_id)
        except ChartIntakeJob.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

        if job.status in {ChartIntakeJob.STATUS_COMPLETED, ChartIntakeJob.STATUS_FAILED}:
            return Response({"error": "Job already finished"}, status=status.HTTP_400_BAD_REQUEST)

        job.status = ChartIntakeJob.STATUS_CANCELLED
        job.progress = 0
        job.save(update_fields=["status", "progress"])
        if job.file_path:
            try:
                default_storage.delete(job.file_path)
            except Exception:
                logger.warning("Failed to delete intake tmp file for job %s", job.id)
        return Response({"job_id": str(job.id), "status": job.status}, status=status.HTTP_200_OK)

    def _parse_date_for_patient(self, value: str):
        v = (value or "").strip()
        if not v:
            return None
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y"):
            try:
                return datetime.strptime(v, fmt).date()
            except ValueError:
                continue
        return None

    @action(detail=False, methods=["post"], url_path=r"chart_intake/(?P<job_id>[^/.]+)/create_patient_and_attach")
    def chart_intake_create_patient_and_attach(self, request, job_id=None):
        """
        Confirm step: create patient (if allowed) and attach the intake document to that patient.
        Enforces edge cases: exact duplicate, name collision, required fields.
        """
        try:
            job = ChartIntakeJob.objects.get(pk=job_id)
        except ChartIntakeJob.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        agency = getattr(user, "agency", None)
        if getattr(user, "role", None) != "superadmin" and job.agency_id and agency and job.agency_id != agency.id:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        if job.status != ChartIntakeJob.STATUS_COMPLETED:
            return Response({"error": "Job is not completed"}, status=status.HTTP_400_BAD_REQUEST)

        payload = request.data or {}
        first_name = (payload.get("first_name") or "").strip()
        last_name = (payload.get("last_name") or "").strip()
        gender = (payload.get("gender") or "").strip()
        dob_raw = (payload.get("date_of_birth") or "").strip()
        dob = self._parse_date_for_patient(dob_raw)

        if not first_name or not dob or not gender:
            return Response(
                {
                    "error": "Missing required fields",
                    "missing": {
                        "first_name": not bool(first_name),
                        "date_of_birth": not bool(dob),
                        "gender": not bool(gender),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from patients.models import Patient
        existing_exact = Patient.objects.filter(
            agency=agency,
            first_name__iexact=first_name,
            last_name__iexact=last_name,
            date_of_birth=dob,
        )
        if existing_exact.exists():
            patient = existing_exact.first()
            return Response(
                {
                    "error": "duplicate_exact",
                    "message": f"A patient named '{patient.full_name}' with DOB '{patient.date_of_birth}' already exists.",
                    "existing_patient": {"id": str(patient.id), "first_name": patient.first_name, "last_name": patient.last_name, "date_of_birth": str(patient.date_of_birth)},
                },
                status=status.HTTP_409_CONFLICT,
            )

        same_name_qs = Patient.objects.filter(
            agency=agency,
            first_name__iexact=first_name,
            last_name__iexact=last_name,
        )
        if same_name_qs.exists():
            identifier = (payload.get("name_identifier") or "").strip()
            if not identifier:
                return Response(
                    {
                        "error": "name_conflict",
                        "message": f"A patient named '{first_name} {last_name}' already exists.",
                        "existing_patients": [
                            {"id": str(p.id), "first_name": p.first_name, "last_name": p.last_name, "date_of_birth": str(p.date_of_birth)}
                            for p in same_name_qs.order_by("date_of_birth")[:25]
                        ],
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            last_name = f"{last_name} {identifier}".strip()

        patient_payload = {
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": dob,
            "gender": gender,
            "phone": (payload.get("phone") or "").strip() or None,
            "email": (payload.get("email") or "").strip() or None,
            "address": (payload.get("address") or "").strip() or None,
            "city": (payload.get("city") or "").strip() or None,
            "state": (payload.get("state") or "").strip() or None,
            "zip_code": (payload.get("zip_code") or "").strip() or None,
            "admission_date": self._parse_date_for_patient((payload.get("admission_date") or "").strip()),
            "status": (payload.get("status") or "Active").strip() or "Active",
        }

        if not job.file_path:
            return Response({"error": "Missing stored file for job"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with default_storage.open(job.file_path, "rb") as f:
                file_bytes = f.read()
        except Exception:
            return Response({"error": "Failed to read stored chart file"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        saved_file_path = ""
        created_patient = None
        try:
            with transaction.atomic():
                created_patient = Patient.objects.create(
                    created_by=user,
                    agency=agency,
                    **patient_payload,
                )

                file_path = f"uploads/patient_{created_patient.id}/{job.filename or 'chart.pdf'}"
                saved_file_path = default_storage.save(file_path, ContentFile(file_bytes))

                document = AuditDocument.objects.create(
                    patient=created_patient,
                    agency=agency,
                    document_type="other",
                    filename=job.filename or "chart.pdf",
                    file_path=saved_file_path,
                    file_size_mb=float(job.file_size_mb or (len(file_bytes) / (1024 * 1024))),
                    total_pages=job.total_pages,
                    extracted_text=job.extracted_text or "",
                    extraction_method=job.extraction_method or "text",
                )

            try:
                default_storage.delete(job.file_path)
            except Exception:
                logger.warning("Failed to delete intake tmp file for job %s", job.id)

            return Response(
                {
                    "patient": {"id": str(created_patient.id), "first_name": created_patient.first_name, "last_name": created_patient.last_name},
                    "document": AuditDocumentSerializer(document).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            logger.exception("Failed to create patient and attach document for job %s: %s", job.id, exc)
            if saved_file_path:
                try:
                    default_storage.delete(saved_file_path)
                except Exception:
                    pass
            return Response({"error": "Failed to create patient and attach document"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path=r"chart_intake/(?P<job_id>[^/.]+)/attach_existing")
    def chart_intake_attach_existing(self, request, job_id=None):
        """
        Attach the uploaded chart to an existing patient (used for exact-duplicate edge case).
        Body: { patient_id }
        """
        try:
            job = ChartIntakeJob.objects.get(pk=job_id)
        except ChartIntakeJob.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

        patient_id = (request.data or {}).get("patient_id")
        if not patient_id:
            return Response({"error": "patient_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        from patients.models import Patient
        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        agency = getattr(user, "agency", None)
        if getattr(user, "role", None) != "superadmin" and agency and patient.agency_id != agency.id:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        if not job.file_path:
            return Response({"error": "Missing stored file for job"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with default_storage.open(job.file_path, "rb") as f:
                file_bytes = f.read()
        except Exception:
            return Response({"error": "Failed to read stored chart file"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        saved_file_path = ""
        try:
            with transaction.atomic():
                file_path = f"uploads/patient_{patient.id}/{job.filename or 'chart.pdf'}"
                saved_file_path = default_storage.save(file_path, ContentFile(file_bytes))

                document = AuditDocument.objects.create(
                    patient=patient,
                    agency=patient.agency,
                    document_type="other",
                    filename=job.filename or "chart.pdf",
                    file_path=saved_file_path,
                    file_size_mb=float(job.file_size_mb or (len(file_bytes) / (1024 * 1024))),
                    total_pages=job.total_pages,
                    extracted_text=job.extracted_text or "",
                    extraction_method=job.extraction_method or "text",
                )

            try:
                default_storage.delete(job.file_path)
            except Exception:
                logger.warning("Failed to delete intake tmp file for job %s", job.id)

            return Response(AuditDocumentSerializer(document).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            logger.exception("Failed to attach existing patient for job %s: %s", job.id, exc)
            if saved_file_path:
                try:
                    default_storage.delete(saved_file_path)
                except Exception:
                    pass
            return Response({"error": "Failed to attach document"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Get documents associated with a specific patient."""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from patients.models import Patient
            patient = Patient.objects.get(id=patient_id)
            
            # Check if user has permission to access this patient's documents
            user = request.user
            if (hasattr(user, 'role') and user.role not in ['superadmin', 'agency_admin', 'qa_compliance']) and \
               patient.created_by != user:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            documents = AuditDocument.objects.filter(patient=patient)
            serializer = self.get_serializer(documents, many=True)
            return Response(serializer.data)
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download a document file."""
        document = self.get_object()
        file_path = os.path.join(settings.MEDIA_ROOT, document.file_path)

        if os.path.exists(file_path):
            import mimetypes
            content_type, _ = mimetypes.guess_type(document.filename) or ('application/octet-stream', None)
            response = FileResponse(open(file_path, 'rb'), content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{document.filename}"'
            return response
        raise Http404("File not found")

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search documents by filename or patient."""
        query = request.query_params.get('q', '')
        if query:
            documents = self.get_queryset().filter(
                Q(filename__icontains=query) |
                Q(patient__first_name__icontains=query) |
                Q(patient__last_name__icontains=query)
            )
        else:
            documents = self.get_queryset()

        serializer = self.get_serializer(documents, many=True)
        return Response(serializer.data)
