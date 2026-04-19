import logging
import mimetypes
import os

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import AssignedAuditReport, AIAnalysisResult, AuditDocument
from users.models import CustomUser

logger = logging.getLogger(__name__)

class AssignedAuditReportView(viewsets.ViewSet):
    """
    Endpoints for assigning AI analysis results to clinicians.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=False, methods=['post'], url_path='assign')
    def assign(self, request):
        """Creates an AssignedAuditReport record with agency."""
        result_id = request.data.get('analysis_result_id')
        clinician_id = request.data.get('clinician_id')

        if not result_id or not clinician_id:
            return Response({'error': 'Id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = AIAnalysisResult.objects.get(id=result_id)
            clinician = CustomUser.objects.get(id=clinician_id, role='clinician')
            
            # Verify user has access to this result
            if request.user.agency and result.agency != request.user.agency:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

            assignment = AssignedAuditReport.objects.create(
                analysis_result=result,
                agency=request.user.agency,  # Set agency
                assigned_by=request.user,
                assigned_to=clinician,
            )
            return Response({'id': str(assignment.id), 'message': 'Assigned successfully'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='assigned')
    def list_assigned(self, request):
        """Lists assignments based on user logic with agency filtering."""
        user = request.user
        qs = AssignedAuditReport.objects.select_related(
            'analysis_result', 'analysis_result__patient', 'assigned_to'
        )

        # Apply agency-level filtering
        if getattr(user, 'role', None) == 'clinician':
            # Clinicians see only their own assignments
            qs = qs.filter(assigned_to=user)
        elif getattr(user, 'role', None) == 'superadmin':
            # Superadmins see all assignments
            pass
        elif getattr(user, 'agency', None):
            # Agency users see assignments in their agency
            qs = qs.filter(agency=user.agency)
        else:
            # Users without agency see nothing
            qs = qs.none()

        qs = qs.order_by('-assigned_at')

        data = []
        for a in qs:
            assignee = a.assigned_to
            r = a.analysis_result
            data.append({
                'id': str(a.id),
                'patient_name': f"{r.patient.first_name} {r.patient.last_name}",
                'status': a.status,
                'assigned_at': a.assigned_at.isoformat(),
                'ai_status': r.status,
                'report_markdown': r.report_markdown or '',
                'has_document': bool(a.uploaded_document),
                'completed_at': a.completed_at.isoformat() if a.completed_at else None,
                'analyzed_document_names': r.analyzed_document_names or [],
                'assigned_to': assignee.get_full_name() if assignee else '',
                'assigned_to_username': assignee.username if assignee else '',
            })
        return Response(data)

    @action(detail=True, methods=['get'], url_path='detail')
    def get_detail(self, request, pk=None):
        """GET /api/ai/mistral/assigned/<id>/detail/ with agency verification."""
        user = request.user
        try:
            a = AssignedAuditReport.objects.select_related(
                'analysis_result', 'analysis_result__patient',
                'assigned_by', 'assigned_to'
            ).get(pk=pk)
        except AssignedAuditReport.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        # Verify agency access
        if getattr(user, 'role', None) != 'superadmin':
            if a.agency and user.agency != a.agency:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Clinicians can only see their own assignments
        if getattr(user, 'role', None) == 'clinician' and a.assigned_to != user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        r = a.analysis_result
        from ..models import AuditDocument
        analyzed_docs = AuditDocument.objects.filter(
            patient=r.patient,
            filename__in=r.analyzed_document_names
        ).values('id', 'filename', 'document_type', 'file_size_mb', 'created_at')

        analyzed_documents_info = []
        for d in analyzed_docs:
            size_mb = d['file_size_mb']
            analyzed_documents_info.append(
                {
                    'id': str(d['id']),
                    'filename': d['filename'],
                    'document_type': d['document_type'],
                    'file_size_mb': round(size_mb, 2) if size_mb is not None else None,
                    'created_at': d['created_at'].isoformat() if d['created_at'] else None,
                }
            )

        return Response({
            'id': str(a.id),
            'analysis_result_id': str(r.id),
            'patient_id': str(r.patient_id),
            'patient_name': f'{r.patient.first_name} {r.patient.last_name}',
            'report_markdown': r.report_markdown,
            'analyzed_document_names': r.analyzed_document_names,
            'analyzed_documents': analyzed_documents_info,
            'ai_model_used': r.ai_model_used,
            'ai_status': r.status,
            'assigned_at': a.assigned_at.isoformat(),
            'assigned_by': a.assigned_by.get_full_name() if a.assigned_by else None,
            'assigned_to_id': str(a.assigned_to.id) if a.assigned_to else None,
            'assigned_to_name': a.assigned_to.get_full_name() if a.assigned_to else None,
            'assigned_to_username': a.assigned_to.username if a.assigned_to else None,
            'assigned_to_email': a.assigned_to.email if a.assigned_to else None,
            'status': a.status,
            'uploaded_document_name': a.uploaded_document_name,
            'has_document': bool(a.uploaded_document),
            'completed_at': a.completed_at.isoformat() if a.completed_at else None,
        })

    @action(detail=True, methods=['post'], url_path='upload_document')
    def upload_document(self, request, pk=None):
        """Uploads a document and marks assignment as complete."""
        user = request.user
        try:
            assignment = AssignedAuditReport.objects.select_related(
                'agency', 'assigned_to', 'analysis_result'
            ).get(pk=pk)
        except AssignedAuditReport.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if user.role != 'superadmin':
            if assignment.agency_id and user.agency_id != assignment.agency_id:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if getattr(user, 'role', None) == 'clinician' and assignment.assigned_to_id != user.id:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if assignment.status == 'complete':
            return Response(
                {'error': 'This report is already completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES.get('document')
        if not uploaded_file:
            return Response({'error': 'No file'}, status=status.HTTP_400_BAD_REQUEST)

        assignment.uploaded_document = uploaded_file
        assignment.uploaded_document_name = uploaded_file.name
        assignment.status = 'complete'
        assignment.completed_at = timezone.now()
        assignment.save()

        return Response(
            {
                'message': 'Uploaded successfully',
                'status': assignment.status,
                'has_document': bool(assignment.uploaded_document),
                'uploaded_document_name': assignment.uploaded_document_name,
                'completed_at': assignment.completed_at.isoformat() if assignment.completed_at else None,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'], url_path='download_document')
    def download_document(self, request, pk=None):
        """Download clinician-uploaded document for this assignment."""
        user = request.user
        try:
            assignment = AssignedAuditReport.objects.select_related('agency', 'assigned_to').get(pk=pk)
        except AssignedAuditReport.DoesNotExist:
            raise Http404()

        if user.role != 'superadmin':
            if assignment.agency_id and user.agency_id != assignment.agency_id:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if getattr(user, 'role', None) == 'clinician' and assignment.assigned_to_id != user.id:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if not assignment.uploaded_document:
            raise Http404()

        content_type, _ = mimetypes.guess_type(assignment.uploaded_document_name or '') or (
            'application/octet-stream',
            None,
        )
        response = FileResponse(
            open(assignment.uploaded_document.path, 'rb'),
            content_type=content_type,
        )
        response['Content-Disposition'] = (
            f'inline; filename="{assignment.uploaded_document_name or "document"}"'
        )
        return response

    def download_analyzed_source(self, request, pk=None, doc_id=None):
        """
        Download an AI source document linked to this assignment (clinician-safe).
        GET /api/ai/mistral/assigned/<pk>/analyzed_documents/<doc_id>/download/
        """
        user = request.user
        try:
            assignment = AssignedAuditReport.objects.select_related(
                'agency', 'assigned_to', 'analysis_result', 'analysis_result__patient'
            ).get(pk=pk)
        except AssignedAuditReport.DoesNotExist:
            raise Http404()

        if user.role != 'superadmin':
            if assignment.agency_id and user.agency_id != assignment.agency_id:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if getattr(user, 'role', None) == 'clinician' and assignment.assigned_to_id != user.id:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        result = assignment.analysis_result
        try:
            doc = AuditDocument.objects.get(pk=doc_id, patient_id=result.patient_id)
        except AuditDocument.DoesNotExist:
            raise Http404()

        names = result.analyzed_document_names or []
        if doc.filename not in names:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        file_path = os.path.join(settings.MEDIA_ROOT, doc.file_path)
        if not os.path.exists(file_path):
            raise Http404()

        content_type, _ = mimetypes.guess_type(doc.filename) or ('application/octet-stream', None)
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{doc.filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='clinicians')
    def list_clinicians(self, request):
        """GET /api/ai/mistral/clinicians/ – return clinician users in admin's agency"""
        user = request.user
        qs = CustomUser.objects.filter(role='clinician', is_active=True)
        
        # Superadmins see all clinicians
        if getattr(user, 'role', None) != 'superadmin':
            # All other users only see clinicians in their agency
            if getattr(user, 'agency', None):
                qs = qs.filter(agency=user.agency)
            else:
                # Users without agency see no clinicians
                qs = qs.none()
        
        data = [
            {
                'id': str(u.id),
                'full_name': u.get_full_name() or u.username,
                'email': u.email,
                'username': u.username,
            }
            for u in qs
        ]
        return Response(data, status=status.HTTP_200_OK)
