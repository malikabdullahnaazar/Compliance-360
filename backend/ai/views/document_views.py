import os
import logging
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
