"""
Views for AI Audit API
"""

import time
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.db.models import Q

from .models import (
    AuditSession,
    AuditDocument,
    ComplianceFinding,
    RegulatoryCitation,
    CorrectionGuidance,
    RedFlag,
    AuditRecommendation
)
from .serializers import (
    AuditSessionListSerializer,
    AuditSessionDetailSerializer,
    CreateAuditSessionSerializer,
    ComplianceFindingSerializer,
    AuditDocumentSerializer,
    UpdateFindingSerializer,
    AuditRequestSerializer,
    SingleDocumentAnalysisSerializer,
    DocumentUploadSerializer
)
from .services.ai_service import get_ai_service
from .services.document_processor import get_document_processor

logger = logging.getLogger(__name__)


class AuditSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing audit sessions.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter audit sessions by user permissions."""
        user = self.request.user
        # Admins can see all, others see their own or assigned
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
        """
        Upload a document to an existing audit session.
        """
        audit_session = self.get_object()
        serializer = DocumentUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get the uploaded file
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            document_type = serializer.validated_data['document_type']
            
            # Process the document
            processor = get_document_processor()
            file_bytes = uploaded_file.read()
            
            processed_doc = processor.process_bytes(
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                document_type=document_type
            )
            
            # Create document record
            with transaction.atomic():
                document = AuditDocument.objects.create(
                    audit_session=audit_session,
                    document_type=document_type,
                    filename=uploaded_file.name,
                    file_path=f"uploads/{audit_session.id}/{uploaded_file.name}",
                    file_size_mb=processed_doc['file_size_mb'],
                    total_pages=processed_doc.get('total_pages'),
                    extracted_text=processed_doc['content'],
                    extraction_method=processed_doc['extraction_method']
                )
            
            return Response(
                AuditDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Document upload failed: {str(e)}")
            return Response(
                {'error': f'Failed to process document: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def run_audit(self, request, pk=None):
        """
        Run AI audit on all documents in the session.
        """
        audit_session = self.get_object()
        
        # Check if there are documents to analyze
        documents = audit_session.documents.all()
        if not documents.exists():
            return Response(
                {'error': 'No documents uploaded for this audit session'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update status
            audit_session.status = 'processing'
            audit_session.save()
            
            # Prepare documents for AI
            ai_documents = []
            for doc in documents:
                ai_documents.append({
                    'content': doc.extracted_text,
                    'type': doc.document_type,
                    'filename': doc.filename
                })
            
            # Run AI analysis
            start_time = time.time()
            ai_service = get_ai_service()
            
            result = ai_service.analyze_documents(
                documents=ai_documents,
                audit_type=audit_session.audit_type,
                frameworks=audit_session.frameworks,
                patient_id=audit_session.patient_id
            )
            
            processing_time = time.time() - start_time
            
            # Save results
            with transaction.atomic():
                self._save_audit_results(audit_session, result, processing_time)
            
            return Response(
                AuditSessionDetailSerializer(audit_session).data,
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Audit failed: {str(e)}")
            audit_session.status = 'failed'
            audit_session.save()
            return Response(
                {'error': f'Audit failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _save_audit_results(self, audit_session, result, processing_time):
        """Save AI analysis results to database."""
        # Update session summary
        audit_summary = result.get('audit_summary', {})
        audit_session.status = 'completed'
        audit_session.overall_compliance_score = audit_summary.get('overall_compliance_score')
        audit_session.risk_level = audit_summary.get('risk_level')
        audit_session.processing_time_seconds = processing_time
        audit_session.raw_ai_response = result
        
        # Get metadata
        metadata = result.get('metadata', {})
        audit_session.ai_model_used = metadata.get('model_used', 'unknown')
        audit_session.tokens_used = metadata.get('tokens_used')
        
        audit_session.save()
        
        # Save findings
        findings = result.get('findings', [])
        for finding_data in findings:
            self._create_finding(audit_session, finding_data)
        
        # Save red flags
        red_flags = result.get('red_flags', [])
        for flag_data in red_flags:
            RedFlag.objects.create(
                audit_session=audit_session,
                flag_type=flag_data.get('flag_type', ''),
                description=flag_data.get('description', ''),
                priority=flag_data.get('priority', 'ROUTINE')
            )
        
        # Save recommendations
        recommendations = result.get('recommendations', [])
        for rec_data in recommendations:
            AuditRecommendation.objects.create(
                audit_session=audit_session,
                priority=rec_data.get('priority', 99),
                recommendation=rec_data.get('recommendation', ''),
                expected_outcome=rec_data.get('expected_outcome', '')
            )
    
    def _create_finding(self, audit_session, finding_data):
        """Create a compliance finding from AI result data."""
        location = finding_data.get('location_in_document', {})
        
        # Find related document if possible
        related_doc = None
        # You could match by document type or other criteria here
        
        finding = ComplianceFinding.objects.create(
            audit_session=audit_session,
            related_document=related_doc,
            check_number=finding_data.get('check_number', 0),
            category=finding_data.get('category', 'A'),
            severity=finding_data.get('severity', 'LOW'),
            status='PASS' if finding_data.get('status') == 'PASS' else 'open',
            finding_title=finding_data.get('finding_title', ''),
            finding_description=finding_data.get('finding_description', ''),
            evidence_from_document=finding_data.get('evidence_from_document', ''),
            page_number=location.get('page_number'),
            section=location.get('section', '')
        )
        
        # Create citations
        citations = finding_data.get('regulatory_citations', [])
        for citation_data in citations:
            RegulatoryCitation.objects.create(
                finding=finding,
                framework=citation_data.get('framework', 'CMS'),
                citation=citation_data.get('citation', ''),
                description=citation_data.get('description', '')
            )
        
        # Create correction guidance
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
        """
        Get dashboard summary for an audit session.
        """
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
                'by_category': {
                    'A': findings.filter(category='A').count(),
                    'B': findings.filter(category='B').count(),
                    'C': findings.filter(category='C').count(),
                    'D': findings.filter(category='D').count(),
                    'E': findings.filter(category='E').count(),
                },
                'by_status': {
                    'open': findings.filter(status='open').count(),
                    'in_review': findings.filter(status='in_review').count(),
                    'assigned': findings.filter(status='assigned').count(),
                    'resolved': findings.filter(status='resolved').count(),
                }
            },
            'red_flags': [
                {
                    'type': flag.flag_type,
                    'description': flag.description,
                    'priority': flag.priority
                }
                for flag in audit_session.red_flags.all()
            ],
            'recent_findings': ComplianceFindingSerializer(
                findings.order_by('-created_at')[:5],
                many=True
            ).data
        }
        
        return Response(dashboard_data)


class ComplianceFindingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing compliance findings.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ComplianceFindingSerializer
    
    def get_queryset(self):
        """Filter findings by user permissions."""
        user = self.request.user
        if hasattr(user, 'role') and user.role in ['superadmin', 'qa']:
            return ComplianceFinding.objects.all()
        return ComplianceFinding.objects.filter(
            Q(audit_session__created_by=user) | Q(assigned_to=user)
        )
    
    def get_serializer_class(self):
        """Use update serializer for partial updates."""
        if self.action in ['update', 'partial_update']:
            return UpdateFindingSerializer
        return ComplianceFindingSerializer
    
    @action(detail=False, methods=['get'])
    def my_findings(self, request):
        """Get findings assigned to current user."""
        findings = ComplianceFinding.objects.filter(
            assigned_to=request.user
        ).order_by('-severity', 'created_at')
        
        serializer = self.get_serializer(findings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_audit(self, request):
        """Get findings filtered by audit session."""
        audit_id = request.query_params.get('audit_id')
        if not audit_id:
            return Response(
                {'error': 'audit_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        findings = ComplianceFinding.objects.filter(
            audit_session_id=audit_id
        ).order_by('-severity', 'check_number')
        
        serializer = self.get_serializer(findings, many=True)
        return Response(serializer.data)


class AIAuditAPIView(viewsets.ViewSet):
    """
    Direct AI audit endpoints for immediate analysis without saving.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def analyze_documents(self, request):
        """
        Analyze documents and return immediate results without saving.
        """
        serializer = AuditRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            
            # Run AI analysis
            ai_service = get_ai_service()
            result = ai_service.analyze_documents(
                documents=data['documents'],
                audit_type=data['audit_type'],
                frameworks=data.get('frameworks', ['CMS', 'CHAP']),
                patient_id=data.get('patient_id')
            )
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Direct analysis failed: {str(e)}")
            return Response(
                {'error': f'Analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def analyze_single_document(self, request):
        """
        Analyze a single document immediately.
        """
        serializer = SingleDocumentAnalysisSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            
            ai_service = get_ai_service()
            result = ai_service.analyze_single_document(
                document_content=data['document_content'],
                document_type=data['document_type'],
                frameworks=data.get('frameworks', ['CMS', 'CHAP']),
                patient_id=data.get('patient_id')
            )
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Single document analysis failed: {str(e)}")
            return Response(
                {'error': f'Analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def extract_and_analyze(self, request):
        """
        Extract text from uploaded file and analyze it.
        """
        uploaded_file = request.FILES.get('file')
        document_type = request.data.get('document_type')
        frameworks = request.data.get('frameworks', 'CMS,CHAP').split(',')
        
        if not uploaded_file or not document_type:
            return Response(
                {'error': 'Both file and document_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Extract text
            processor = get_document_processor()
            file_bytes = uploaded_file.read()
            
            processed = processor.process_bytes(
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                document_type=document_type
            )
            
            # Analyze
            ai_service = get_ai_service()
            result = ai_service.analyze_single_document(
                document_content=processed['content'],
                document_type=document_type,
                frameworks=frameworks
            )
            
            # Add extraction metadata
            result['extraction'] = {
                'filename': processed['filename'],
                'pages': processed.get('total_pages'),
                'method': processed['extraction_method'],
                'size_mb': processed['file_size_mb']
            }
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Extract and analyze failed: {str(e)}")
            return Response(
                {'error': f'Failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
