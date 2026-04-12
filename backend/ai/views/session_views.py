import time
import logging
import os
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from ..models import (
    AuditSession,
    AuditDocument,
    ComplianceFinding,
    RegulatoryCitation,
    CorrectionGuidance,
    RedFlag,
    AuditRecommendation,
)
from ..serializers import (
    AuditSessionListSerializer,
    AuditSessionDetailSerializer,
    CreateAuditSessionSerializer,
    ComplianceFindingSerializer,
    AuditDocumentSerializer,
    DocumentUploadSerializer
)
from ..services.langchain_service import get_compliance_service
from ..services.document_processor import get_document_processor

logger = logging.getLogger(__name__)

_APP_ENV = os.getenv('APP_ENV', 'Dev').strip().lower()
_IS_PROD = _APP_ENV == 'prod'
OPENAI_FILE_SIZE_LIMIT_MB = float(os.getenv("OPENAI_FILE_SIZE_LIMIT_MB", "500"))

class AuditSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing audit sessions.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter audit sessions by user permissions."""
        user = self.request.user
        if hasattr(user, 'role') and user.role in ['superadmin', 'qa']:
            return AuditSession.objects.all()
        return AuditSession.objects.filter(created_by=user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return AuditSessionListSerializer
        elif self.action == 'create':
            return CreateAuditSessionSerializer
        return AuditSessionDetailSerializer
    
    def perform_create(self, serializer):
        """Set the created_by user."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def upload_document(self, request, pk=None):
        """Upload a document to an existing audit session."""
        audit_session = self.get_object()
        serializer = DocumentUploadSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

            document_type = serializer.validated_data['document_type']
            file_size_mb = uploaded_file.size / (1024 * 1024)
            
            if _IS_PROD and file_size_mb > OPENAI_FILE_SIZE_LIMIT_MB:
                return Response(
                    {'error': f"File too large ({file_size_mb:.1f} MB). Limit is {OPENAI_FILE_SIZE_LIMIT_MB} MB."},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                )

            processor = get_document_processor()
            file_bytes = uploaded_file.read()

            processed_doc = processor.process_bytes(
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                document_type=document_type
            )

            file_path = f"uploads/{audit_session.id}/{uploaded_file.name}"
            saved_file_path = default_storage.save(file_path, ContentFile(file_bytes))

            with transaction.atomic():
                document = AuditDocument.objects.create(
                    audit_session=audit_session,
                    document_type=document_type,
                    filename=uploaded_file.name,
                    file_path=saved_file_path,
                    file_size_mb=processed_doc['file_size_mb'],
                    total_pages=processed_doc.get('total_pages'),
                    extracted_text=processed_doc['content'],
                    extraction_method=processed_doc['extraction_method'],
                    agency=audit_session.created_by.agency
                )

            return Response(AuditDocumentSerializer(document).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Document upload failed: {str(e)}")
            return Response({'error': f'Failed to process document: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def run_audit(self, request, pk=None):
        """Run AI audit on all documents in the session."""
        audit_session = self.get_object()
        documents = audit_session.documents.all()
        if not documents.exists():
            return Response({'error': 'No documents uploaded for this audit session'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            audit_session.status = 'processing'
            audit_session.save()
            
            ai_documents = []
            for doc in documents:
                ai_documents.append({
                    'extracted_text': doc.extracted_text,
                    'document_type': doc.document_type,
                    'filename': doc.filename
                })
            
            start_time = time.time()
            ai_service = get_compliance_service()
            
            result = ai_service.analyze_documents(
                documents=ai_documents,
                patient_info={
                    'patient_id': audit_session.patient_id,
                    'last_name': audit_session.patient_name
                }
            )
            
            processing_time = time.time() - start_time
            
            with transaction.atomic():
                self._save_audit_results(audit_session, result, processing_time)
            
            return Response(AuditSessionDetailSerializer(audit_session).data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Audit failed: {str(e)}")
            audit_session.status = 'failed'
            audit_session.save()
            return Response({'error': f'Audit failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _save_audit_results(self, audit_session, result, processing_time):
        """Save AI analysis results to database."""
        audit_summary = result.get('audit_summary', {})
        audit_session.status = 'completed'
        audit_session.overall_compliance_score = audit_summary.get('overall_compliance_score')
        audit_session.risk_level = audit_summary.get('risk_level')
        audit_session.processing_time_seconds = processing_time
        audit_session.raw_ai_response = result
        
        metadata = result.get('metadata', {})
        audit_session.ai_model_used = metadata.get('model', 'unknown')
        audit_session.tokens_used = metadata.get('tokens_used')
        audit_session.save()
        
        for finding_data in result.get('findings', []):
            self._create_finding(audit_session, finding_data)
        
        for flag_data in result.get('red_flags', []):
            RedFlag.objects.create(
                audit_session=audit_session,
                flag_type=flag_data.get('flag_type', ''),
                description=flag_data.get('description', ''),
                priority=flag_data.get('priority', 'ROUTINE')
            )
        
        for rec_data in result.get('recommendations', []):
            AuditRecommendation.objects.create(
                audit_session=audit_session,
                priority=rec_data.get('priority', 99),
                recommendation=rec_data.get('recommendation', ''),
                expected_outcome=rec_data.get('expected_outcome', '')
            )
    
    def _create_finding(self, audit_session, finding_data):
        """Create a compliance finding from AI result data."""
        location = finding_data.get('location_in_document', {})
        finding = ComplianceFinding.objects.create(
            audit_session=audit_session,
            check_number=finding_data.get('check_number', 0),
            category=finding_data.get('category', 'A'),
            severity=finding_data.get('severity', 'LOW'),
            status='open',
            finding_title=finding_data.get('finding_title', ''),
            finding_description=finding_data.get('finding_description', ''),
            evidence_from_document=finding_data.get('evidence_from_document', ''),
            page_number=location.get('page_number'),
            section=location.get('section', '')
        )
        
        for citation_data in finding_data.get('regulatory_citations', []):
            RegulatoryCitation.objects.create(
                finding=finding,
                framework=citation_data.get('framework', 'CMS'),
                citation=citation_data.get('citation', ''),
                description=citation_data.get('description', '')
            )
        
        guidance = finding_data.get('correction_guidance', {})
        if guidance:
            CorrectionGuidance.objects.create(
                finding=finding,
                immediate_action=guidance.get('immediate_action', ''),
                responsible_party=guidance.get('responsible_party', 'QA'),
                timeline=guidance.get('timeline', ''),
                template_suggestion=guidance.get('template_suggestion', '')
            )

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Get dashboard summary for an audit session."""
        audit_session = self.get_object()
        findings = audit_session.findings.all()
        
        dashboard_data = {
            'audit_info': {
                'id': str(audit_session.id),
                'patient_id': audit_session.patient_id,
                'patient_name': audit_session.patient_name,
                'audit_type': audit_session.get_audit_type_display(),
                'status': audit_session.status,
                'compliance_score': audit_session.overall_compliance_score,
                'risk_level': audit_session.risk_level,
            },
            'findings_summary': {
                'total': findings.count(),
                'by_severity': {
                    'critical': findings.filter(severity='CRITICAL').count(),
                    'high': findings.filter(severity='HIGH').count(),
                    'medium': findings.filter(severity='MEDIUM').count(),
                    'low': findings.filter(severity='LOW').count(),
                },
                'by_status': {
                    'open': findings.filter(status='open').count(),
                    'resolved': findings.filter(status='resolved').count(),
                }
            },
            'red_flags': [
                {'type': flag.flag_type, 'description': flag.description, 'priority': flag.priority}
                for flag in audit_session.red_flags.all()
            ]
        }
        return Response(dashboard_data)
