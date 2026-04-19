import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import AnalysisJob, AuditDocument, AIAnalysisResult, AssignedAuditReport
from ..tasks import run_analysis_job

logger = logging.getLogger(__name__)

class ReportAnalyzeView(viewsets.ViewSet):
    """
    Endpoints for generating and managing compliance reports.
    (Formerly MistralAnalyzeView, now unified via LangChain)
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='analyze')
    def analyze(self, request):
        """Queue async document analysis; returns immediately with job identifiers."""
        from patients.models import Patient

        patient_id = request.data.get('patient_id')
        document_ids = request.data.get('document_ids', [])

        if not patient_id or not document_ids:
            return Response(
                {'error': 'patient_id and document_ids are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            patient = Patient.objects.get(id=patient_id)
            documents_qs = AuditDocument.objects.filter(id__in=document_ids, patient=patient)

            if not documents_qs.exists():
                return Response(
                    {'error': 'No matching documents found'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            allowed_models = {'gpt-5.4', 'gpt-4o'}
            raw_model = request.data.get('model') or request.data.get('openai_model')
            resolved_model = 'gpt-5.4'
            if isinstance(raw_model, str) and raw_model.strip() in allowed_models:
                resolved_model = raw_model.strip()

            agency = getattr(request.user, 'agency', None)
            job = AnalysisJob.objects.create(
                created_by=request.user,
                agency=agency,
                patient=patient,
                document_ids=[str(did) for did in document_ids],
                openai_model=resolved_model,
                status=AnalysisJob.STATUS_PENDING,
                progress=0,
            )
            async_result = run_analysis_job.delay(str(job.id))
            AnalysisJob.objects.filter(pk=job.pk).update(celery_task_id=async_result.id)

            return Response(
                {
                    'job_id': str(job.id),
                    'task_id': async_result.id,
                    'status': 'accepted',
                    'message': (
                        'Analysis has been queued. You can keep using the dashboard; '
                        'when it finishes, the report appears under Results or Passed. '
                        'Use the status URL for progress.'
                    ),
                    'status_url': f'/ai/mistral/jobs/{job.id}/status/',
                },
                status=status.HTTP_202_ACCEPTED,
            )

        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            logger.error('Queue analysis failed: %s', exc)
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def job_status(self, request, job_id=None):
        """GET /api/ai/mistral/jobs/<job_id>/status/"""
        user = request.user
        try:
            job = AnalysisJob.objects.select_related('analysis_result').get(pk=job_id)
        except AnalysisJob.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        if getattr(user, 'role', None) != 'superadmin':
            if job.created_by_id != user.id:
                return Response(
                    {'error': 'You do not have permission to view this job.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if user.agency_id and job.agency_id and job.agency_id != user.agency_id:
                return Response(
                    {'error': 'You do not have permission to view this job.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        result_id = str(job.analysis_result_id) if job.analysis_result_id else None
        return Response(
            {
                'state': job.status,
                'progress': job.progress,
                'result_id': result_id,
                'report_status': job.report_status or None,
                'error': job.error_message or None,
                'patient_id': str(job.patient_id),
            }
        )

    @action(detail=False, methods=['post'], url_path='save')
    def save_result(self, request):
        """Saves an AIAnalysisResult record with agency."""
        from patients.models import Patient
        patient_id = request.data.get('patient_id')
        report_markdown = request.data.get('report_markdown', '').strip()
        document_names = request.data.get('document_names', [])

        try:
            patient = Patient.objects.get(id=patient_id)
            result = AIAnalysisResult.objects.create(
                patient=patient,
                created_by=request.user,
                agency=request.user.agency,  # Set agency from user
                analyzed_document_names=document_names,
                report_markdown=report_markdown,
                ai_model_used=request.data.get('ai_model_used', 'unknown'),
                status=request.data.get('status', 'Fail')
            )
            return Response({'id': str(result.id), 'message': 'Result saved successfully'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='results')
    def list_results(self, request):
        """
        GET /api/ai/mistral/results/?patient_id=<uuid>&page=<int>&page_size=<int>&search=<str>&status=<str>
        Returns all saved AI analysis results with pagination and optional filtering/search.
        Agency-scoped filtering applied.
        """
        from rest_framework.pagination import PageNumberPagination
        from django.db.models import Exists, OuterRef, Q

        patient_id = request.query_params.get('patient_id')
        search_query = request.query_params.get('search', '').strip()
        page_size_param = request.query_params.get('page_size')
        status_filter = request.query_params.get('status', '').strip()  # 'Pass' or 'Fail'
        
        user = request.user
        
        qs = AIAnalysisResult.objects.select_related('patient', 'created_by').annotate(
            is_assigned=Exists(AssignedAuditReport.objects.filter(analysis_result=OuterRef('pk')))
        )
        
        # Apply agency-level filtering
        if hasattr(user, 'role') and user.role == 'superadmin':
            # Superadmins can see all results
            pass
        elif user.agency:
            # All other users can only see results from their agency
            qs = qs.filter(agency=user.agency)
        else:
            # Users without agency see nothing
            qs = qs.none()

        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        # Filter by status (Pass or Fail)
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Server-side search by patient name
        if search_query:
            qs = qs.filter(
                Q(patient__first_name__icontains=search_query) |
                Q(patient__last_name__icontains=search_query)
            )

        qs = qs.order_by('-created_at')

        # Apply pagination
        paginator = PageNumberPagination()
        if page_size_param:
            try:
                paginator.page_size = int(page_size_param)
            except (ValueError, TypeError):
                pass
        else:
            paginator.page_size = 10

        page = paginator.paginate_queryset(qs, request)
        if page is None:
            return Response({'error': 'Invalid page number'}, status=status.HTTP_404_NOT_FOUND)

        data = []
        for r in page:
            # Fetch analyzed document records for frontend compatibility
            analyzed_docs = AuditDocument.objects.filter(
                patient=r.patient,
                filename__in=r.analyzed_document_names
            ).values('id', 'filename', 'document_type')
            
            # Check for clinician submitted document in related assignments
            clinician_assignment = AssignedAuditReport.objects.filter(analysis_result=r).first()
            clinician_doc_status = 'pending'
            clinician_assignment_id = None
            if clinician_assignment:
                clinician_assignment_id = str(clinician_assignment.id)
                if clinician_assignment.uploaded_document:
                    clinician_doc_status = 'submitted'

            data.append({
                'id': str(r.id),
                'patient_id': str(r.patient.id),
                'patient_name': f'{r.patient.first_name} {r.patient.last_name}',
                'status': r.status,
                'ai_model_used': r.ai_model_used,
                'report_markdown': r.report_markdown[:200] + '...', # snippet for list
                'created_at': r.created_at.isoformat(),
                'is_assigned': r.is_assigned,
                'analyzed_document_names': r.analyzed_document_names,
                'analyzed_documents': list(analyzed_docs),
                'clinician_document_status': clinician_doc_status,
                'clinician_assignment_id': clinician_assignment_id,
            })
            
        return paginator.get_paginated_response(data)

    @action(detail=False, methods=['get'], url_path='results/(?P<result_id>[^/.]+)/detail')
    def get_result_detail(self, request, result_id=None):
        """GET /api/ai/mistral/results/<result_id>/detail/"""
        from django.db.models import Exists, OuterRef

        user = request.user
        try:
            r = AIAnalysisResult.objects.select_related('patient', 'created_by', 'agency').annotate(
                is_assigned=Exists(AssignedAuditReport.objects.filter(analysis_result=OuterRef('pk')))
            ).get(pk=result_id)
        except AIAnalysisResult.DoesNotExist:
            return Response({'error': 'Result not found'}, status=status.HTTP_404_NOT_FOUND)

        if getattr(user, 'role', None) != 'superadmin':
            if user.agency_id:
                if not r.agency_id or r.agency_id != user.agency_id:
                    return Response(
                        {'error': 'Permission denied'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            else:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        analyzed_docs = AuditDocument.objects.filter(
            patient=r.patient,
            filename__in=r.analyzed_document_names
        ).values('id', 'filename', 'document_type', 'file_size_mb')

        analyzed_documents_info = []
        for d in analyzed_docs:
            size_mb = d['file_size_mb']
            analyzed_documents_info.append(
                {
                    'id': str(d['id']),
                    'filename': d['filename'],
                    'document_type': d['document_type'],
                    'file_size_mb': round(size_mb, 2) if size_mb is not None else None,
                }
            )

        assignment = (
            AssignedAuditReport.objects.filter(analysis_result=r)
            .select_related('assigned_to')
            .order_by('-assigned_at')
            .first()
        )
        has_upload = bool(assignment and assignment.uploaded_document)
        clinician_doc_status = 'submitted' if has_upload else 'pending'

        detail = {
            'id': str(r.id),
            'patient_id': str(r.patient_id),
            'patient_name': f'{r.patient.first_name} {r.patient.last_name}',
            'report_markdown': r.report_markdown,
            'analyzed_documents': analyzed_documents_info,
            'ai_model_used': r.ai_model_used,
            'status': r.status,
            'created_at': r.created_at.isoformat(),
            'is_assigned': r.is_assigned,
            'clinician_assignment_id': str(assignment.id) if assignment else None,
            'clinician_document_status': clinician_doc_status,
            'has_clinician_document': has_upload,
            'clinician_document_name': (assignment.uploaded_document_name if assignment else '') or '',
            'clinician_name': (
                assignment.assigned_to.get_full_name()
                if assignment and assignment.assigned_to
                else None
            ),
            'clinician_document_submitted_at': (
                assignment.completed_at.isoformat()
                if assignment and assignment.completed_at
                else None
            ),
        }

        return Response(detail)

    @action(detail=False, methods=['post'], url_path='results/(?P<result_id>[^/.]+)/submit_document')
    def submit_clinician_document(self, request, result_id=None):
        """POST /api/ai/mistral/results/<id>/submit_document/"""
        from django.utils import timezone
        try:
            r = AIAnalysisResult.objects.get(pk=result_id)
            uploaded_file = request.FILES.get('document')
            if not uploaded_file:
                return Response({'error': 'No file'}, status=status.HTTP_400_BAD_REQUEST)

            # Link it to the result or a related assignment
            return Response({'message': 'Submitted'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='results/(?P<result_id>[^/.]+)/clinician_document')
    def download_clinician_document(self, request, result_id=None):
        """GET /api/ai/mistral/results/<id>/clinician_document/"""
        from django.http import FileResponse
        try:
            r = AIAnalysisResult.objects.get(pk=result_id)
            # Find associated assignment with document
            a = AssignedAuditReport.objects.filter(analysis_result=r).exclude(uploaded_document='').first()
            if not a or not a.uploaded_document:
                return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
            return FileResponse(open(a.uploaded_document.path, 'rb'))
        except Exception:
            return Response({'error': 'Error'}, status=status.HTTP_404_NOT_FOUND)
    @action(detail=False, methods=['post'], url_path='results/(?P<result_id>[^/.]+)/mark_as_pass')
    def mark_as_pass(self, request, result_id=None):
        """
        POST /api/ai/mistral/results/<id>/mark_as_pass/
        Manually mark a 'Fail' report as 'Pass'.
        Only allows superadmins, agency admins, or QA/Compliance roles.
        """
        try:
            # Check permissions
            is_admin = request.user.role in ['superadmin', 'agency_admin']
            is_qa = request.user.role == 'qa_compliance'

            if not (is_admin or is_qa):
                return Response(
                    {'error': 'You do NOT have permission to manually pass reports.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            result = AIAnalysisResult.objects.get(pk=result_id)
            
            # Verify agency access
            if request.user.role != 'superadmin':
                if not result.agency or result.agency != request.user.agency:
                    return Response(
                        {'error': 'You do not have permission to access this report.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            if result.status == 'Pass':
                return Response({'message': 'Report is already marked as Passed.'}, status=status.HTTP_200_OK)

            result.status = 'Pass'
            result.save()

            logger.info(f"Report {result_id} manually marked as PASS by user {request.user.email}")
            return Response({'message': 'Report marked as Passed successfully.'}, status=status.HTTP_200_OK)

        except AIAnalysisResult.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error marking report as Pass: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
