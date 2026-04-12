import os
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import FileResponse, Http404
from django.utils import timezone

from ..models import AssignedAuditReport, AIAnalysisResult
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
        """Creates an AssignedAuditReport record."""
        result_id = request.data.get('analysis_result_id')
        clinician_id = request.data.get('clinician_id')

        if not result_id or not clinician_id:
            return Response({'error': 'Id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = AIAnalysisResult.objects.get(id=result_id)
            clinician = CustomUser.objects.get(id=clinician_id, role='clinician')
            
            assignment = AssignedAuditReport.objects.create(
                analysis_result=result,
                assigned_by=request.user,
                assigned_to=clinician,
            )
            return Response({'id': str(assignment.id), 'message': 'Assigned successfully'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='assigned')
    def list_assigned(self, request):
        """Lists assignments based on user logic."""
        user = request.user
        qs = AssignedAuditReport.objects.select_related('analysis_result', 'assigned_to')
        
        if getattr(user, 'role', None) == 'clinician':
            qs = qs.filter(assigned_to=user)
        elif getattr(user, 'agency', None):
            qs = qs.filter(analysis_result__patient__agency=user.agency)

        data = []
        for a in qs:
            data.append({
                'id': str(a.id),
                'patient_name': f"{a.analysis_result.patient.first_name} {a.analysis_result.patient.last_name}",
                'status': a.status,
                'assigned_to': a.assigned_to.get_full_name()
            })
        return Response(data)

    @action(detail=True, methods=['get'], url_path='detail')
    def get_detail(self, request, pk=None):
        """GET /api/ai/mistral/assigned/<id>/detail/"""
        user = request.user
        try:
            a = AssignedAuditReport.objects.select_related(
                'analysis_result', 'analysis_result__patient',
                'assigned_by', 'assigned_to'
            ).get(pk=pk)
        except AssignedAuditReport.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if getattr(user, 'role', None) == 'clinician' and a.assigned_to != user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        r = a.analysis_result
        from ..models import AuditDocument
        analyzed_docs = AuditDocument.objects.filter(
            patient=r.patient,
            filename__in=r.analyzed_document_names
        ).values('id', 'filename', 'document_type', 'file_size_mb', 'created_at')

        analyzed_documents_info = [
            {
                'id': str(d['id']),
                'filename': d['filename'],
                'document_type': d['document_type'],
                'file_size_mb': round(d['file_size_mb'], 2),
                'created_at': d['created_at'].isoformat() if d['created_at'] else None,
            }
            for d in analyzed_docs
        ]

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
            'assigned_to_email': a.assigned_to.email if a.assigned_to else None,
            'status': a.status,
            'uploaded_document_name': a.uploaded_document_name,
            'has_document': bool(a.uploaded_document),
            'completed_at': a.completed_at.isoformat() if a.completed_at else None,
        })

    @action(detail=True, methods=['post'], url_path='upload_document')
    def upload_document(self, request, pk=None):
        """Uploads a document and marks assignment as complete."""
        try:
            assignment = AssignedAuditReport.objects.get(pk=pk)
            uploaded_file = request.FILES.get('document')
            if not uploaded_file:
                return Response({'error': 'No file'}, status=status.HTTP_400_BAD_REQUEST)

            assignment.uploaded_document = uploaded_file
            assignment.uploaded_document_name = uploaded_file.name
            assignment.status = 'complete'
            assignment.completed_at = timezone.now()
            assignment.save()

            return Response({'message': 'Uploaded successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='download_document')
    def download_document(self, request, pk=None):
        """Download assigned document."""
        try:
            assignment = AssignedAuditReport.objects.get(pk=pk)
            if not assignment.uploaded_document:
                raise Http404()
            return FileResponse(open(assignment.uploaded_document.path, 'rb'), content_type='application/pdf')
        except Exception:
            raise Http404()

    @action(detail=False, methods=['get'], url_path='clinicians')
    def list_clinicians(self, request):
        """GET /api/ai/mistral/clinicians/ – return clinician users in admin's agency"""
        user = request.user
        qs = CustomUser.objects.filter(role='clinician', is_active=True)
        if getattr(user, 'agency', None):
            qs = qs.filter(agency=user.agency)
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
