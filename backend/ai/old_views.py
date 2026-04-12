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
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse, Http404
import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from .models import (
    AuditSession,
    AuditDocument,
    ComplianceFinding,
    RegulatoryCitation,
    CorrectionGuidance,
    RedFlag,
    AuditRecommendation,
    AIAnalysisResult,
    AssignedAuditReport,
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
from .services.langchain_service import get_compliance_service
from .services.document_processor import get_document_processor

logger = logging.getLogger(__name__)

# Read APP_ENV once at module level
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

            # Enforce OpenAI file-size limit in Prod mode
            file_size_mb = uploaded_file.size / (1024 * 1024)
            if _IS_PROD and file_size_mb > OPENAI_FILE_SIZE_LIMIT_MB:
                return Response(
                    {
                        'error': (
                            f"File '{uploaded_file.name}' is {file_size_mb:.1f} MB which exceeds "
                            f"the {OPENAI_FILE_SIZE_LIMIT_MB:.0f} MB limit for AI analysis. "
                            f"Please split or compress the document and re-upload."
                        )
                    },
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                )

            # Process the document
            processor = get_document_processor()
            file_bytes = uploaded_file.read()

            processed_doc = processor.process_bytes(
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                document_type=document_type
            )

            file_path = f"uploads/{audit_session.id}/{uploaded_file.name}"
            saved_file_path = default_storage.save(file_path, ContentFile(file_bytes))

            # Create document record
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
                    agency=audit_session.created_by.agency  # Set agency from audit session creator
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

    @action(detail=False, methods=['post'])
    def upload_patient_document(self, request):
        """
        Upload a document directly to a patient (not associated with an audit session).
        """
        # Validate the request data first
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get the patient
            from patients.models import Patient
            patient = Patient.objects.get(id=patient_id)
            
            # Get the uploaded file
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            document_type = serializer.validated_data['document_type']

            # Enforce OpenAI file-size limit in Prod mode
            file_size_mb = uploaded_file.size / (1024 * 1024)
            if _IS_PROD and file_size_mb > OPENAI_FILE_SIZE_LIMIT_MB:
                return Response(
                    {
                        'error': (
                            f"File '{uploaded_file.name}' is {file_size_mb:.1f} MB which exceeds "
                            f"the {OPENAI_FILE_SIZE_LIMIT_MB:.0f} MB limit for AI analysis. "
                            f"Please split or compress the document and re-upload."
                        )
                    },
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                )

            # Process the document
            processor = get_document_processor()
            file_bytes = uploaded_file.read()

            processed_doc = processor.process_bytes(
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                document_type=document_type
            )

            file_path = f"uploads/patient_{patient.id}/{uploaded_file.name}"
            saved_file_path = default_storage.save(file_path, ContentFile(file_bytes))

            # Create document record linked directly to patient
            with transaction.atomic():
                document = AuditDocument.objects.create(
                    patient=patient,
                    document_type=document_type,
                    filename=uploaded_file.name,
                    file_path=saved_file_path,
                    file_size_mb=processed_doc['file_size_mb'],
                    total_pages=processed_doc.get('total_pages'),
                    extracted_text=processed_doc['content'],
                    extraction_method=processed_doc['extraction_method'],
                    agency=patient.agency  # Set agency from patient
                )

            return Response(
                AuditDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )

        except Patient.DoesNotExist:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Patient document upload failed: {str(e)}")
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
            ai_service = get_compliance_service()
            
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
        # Superadmins can see all documents
        if hasattr(user, 'is_superadmin') and user.is_superadmin:
            return AuditDocument.objects.all()
        # Agency admins and QA/Compliance can see all documents in their agency
        elif getattr(user, 'role', None) in ['agency_admin', 'qa_compliance'] and user.agency:
            return AuditDocument.objects.filter(agency=user.agency)
        # Regular users can see documents they created through audit sessions or linked to their patients
        else:
            return AuditDocument.objects.filter(
                Q(audit_session__created_by=user) | Q(patient__created_by=user)
            ).distinct()

    def get_serializer_class(self):
        """Return appropriate serializer."""
        return AuditDocumentSerializer

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        Upload a document to the agency or link to a patient.
        """
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
                    # Permission check
                    if agency and patient.agency != agency:
                         return Response(
                            {'error': 'Permission denied: Patient belongs to another agency'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Patient.DoesNotExist:
                    return Response(
                        {'error': 'Patient not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Determine agency for document
            doc_agency = patient.agency if patient else agency
            
            if not doc_agency and not patient and not getattr(user, 'is_superadmin', False):
                return Response(
                    {'error': 'Document must be associated with an agency or patient'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Process document
            processor = get_document_processor()
            file_bytes = uploaded_file.read()

            processed_doc = processor.process_bytes(
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                document_type=document_type
            )
            
            # Determine file path
            if patient:
                file_path = f"uploads/patient_{patient.id}/{uploaded_file.name}"
            elif doc_agency:
                file_path = f"uploads/agency_{doc_agency.id}/{uploaded_file.name}"
            else:
                file_path = f"uploads/general/{uploaded_file.name}"

            saved_file_path = default_storage.save(file_path, ContentFile(file_bytes))

            # Create document record
            with transaction.atomic():
                document = AuditDocument.objects.create(
                    audit_session=None,
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

    @action(detail=False, methods=['get'])
    def my_documents(self, request):
        """Get documents associated with audit sessions created by the current user."""
        documents = self.get_queryset()
        serializer = self.get_serializer(documents, many=True)
        return Response(serializer.data)

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
        """
        Download a document file.
        """
        document = self.get_object()
        
        # Check permissions (already handled by get_object/get_queryset but extra safety)
        user = request.user
        if not user.is_staff and document.agency != getattr(user, 'agency', None) and document.patient.created_by != user:
             # Basic check, detailed check is in get_queryset
             pass

        file_path = os.path.join(settings.MEDIA_ROOT, document.file_path)

        if os.path.exists(file_path):
            import mimetypes
            content_type, _ = mimetypes.guess_type(document.filename)
            if not content_type:
                content_type = 'application/octet-stream'
            # Use 'inline' so the browser opens the file in a new tab
            response = FileResponse(open(file_path, 'rb'), content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{document.filename}"'
            return response
        else:
            raise Http404("File not found")

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search documents by filename or patient."""
        query = request.query_params.get('q', '')
        if query:
            documents = self.get_queryset().filter(
                Q(filename__icontains=query) |
                Q(audit_session__patient_name__icontains=query) |
                Q(audit_session__patient_id__icontains=query) |
                Q(patient__first_name__icontains=query) |
                Q(patient__last_name__icontains=query)
            )
        else:
            documents = self.get_queryset()

        serializer = self.get_serializer(documents, many=True)
        return Response(serializer.data)


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
            ai_service = get_compliance_service()
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
            
            ai_service = get_compliance_service()
            result = ai_service.analyze_documents(
                documents=[{
                    'content': data['document_content'],
                    'type': data['document_type'],
                    'filename': 'single_document.txt'
                }],
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
            ai_service = get_compliance_service()
            result = ai_service.analyze_documents(
                documents=[{
                    'content': processed['content'],
                    'type': document_type,
                    'filename': uploaded_file.name
                }]
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


class MistralAnalyzeView(viewsets.ViewSet):
    """
    Mistral AI analysis endpoints.
    POST /api/ai/mistral/analyze/   – analyze selected docs, return Markdown
    POST /api/ai/mistral/save/      – save a result to the DB
    GET  /api/ai/mistral/results/   – list saved results (optionally ?patient_id=)
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='analyze')
    def analyze(self, request):
        """
        Accepts: { patient_id: str, document_ids: [str, ...] }
        Returns: { report_markdown: str, patient_info: {...}, document_names: [...] }
        """
        from .services.mistral_service import get_mistral_service
        from patients.models import Patient

        patient_id = request.data.get('patient_id')
        document_ids = request.data.get('document_ids', [])

        if not patient_id:
            return Response({'error': 'patient_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not document_ids:
            return Response({'error': 'document_ids list is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

        # Fetch documents
        documents_qs = AuditDocument.objects.filter(id__in=document_ids, patient=patient)
        if not documents_qs.exists():
            return Response({'error': 'No matching documents found for this patient'}, status=status.HTTP_400_BAD_REQUEST)

        patient_info = {
            'patient_id': str(patient.id),
            'first_name': patient.first_name,
            'last_name': patient.last_name,
        }

        documents_data = [
            {
                'filename': doc.filename,
                'document_type': doc.document_type,
                'document_type_display': doc.get_document_type_display(),
                'extracted_text': doc.extracted_text or '[No text extracted]',
                'file_size_mb': float(doc.file_size_mb or 0),
            }
            for doc in documents_qs
        ]

        try:
            service = get_unified_ai_service()
            report_markdown = service.analyze_documents(
                documents=documents_data,
                patient_info=patient_info,
            )
            ai_model_name = service.model_name
            import re
            from datetime import datetime
            current_date_str = datetime.now().strftime("%B %d, %Y")

            # Replace all common AI-generated date placeholders with the real date
            # The AI sometimes writes [Date], [Current Date], [Audit Date], [date], etc.
            date_pattern = re.compile(
                r'\[(?:Date|Current\s+Date|Audit\s+Date|date|current\s+date|TODAY)\]',
                re.IGNORECASE
            )
            report_markdown = date_pattern.sub(current_date_str, report_markdown)
            
            # Replace ISO timestamp placeholders specifically
            iso_pattern = re.compile(
                r'\[(?:ISO timestamp|Current ISO timestamp)\]',
                re.IGNORECASE
            )
            report_markdown = iso_pattern.sub(datetime.now().isoformat(), report_markdown)

            # Replace [Model Name] placeholder with actual model name
            model_pattern = re.compile(r'\[Model\s+Name\]', re.IGNORECASE)
            report_markdown = model_pattern.sub(ai_model_name, report_markdown)

            # Post-process: make document names clickable links.
            for doc in documents_qs:
                escaped = re.escape(doc.filename)
                link = f"[{doc.filename}](doc:{str(doc.id)})"
                report_markdown = re.sub(
                    rf'(?<!\[){escaped}(?!\])',
                    link,
                    report_markdown,
                )


        except Exception as exc:
            logger.error(f'AI analysis failed: {exc}')
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'report_markdown': report_markdown,
            'patient_info': patient_info,
            'document_names': [d['filename'] for d in documents_data],
            'ai_model_used': ai_model_name,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='analyze_assignment')
    def analyze_assignment(self, request):
        """
        Accepts: { assignment_id: str }
        Reads the uploaded clinician document, extracts text, calls Mistral analysis, and returns Markdown report.
        """
        from .services.mistral_service import get_mistral_service
        from documents.services import get_document_processor

        assignment_id = request.data.get('assignment_id')
        if not assignment_id:
            return Response({'error': 'assignment_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            assignment = AssignedAuditReport.objects.select_related('analysis_result__patient').get(id=assignment_id)
        except AssignedAuditReport.DoesNotExist:
            return Response({'error': 'Assignment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not assignment.uploaded_document:
            return Response({'error': 'No document uploaded for this assignment'}, status=status.HTTP_400_BAD_REQUEST)

        patient = assignment.analysis_result.patient

        # Process / extract text from the document
        processor = get_document_processor()
        try:
            assignment.uploaded_document.seek(0)
            file_bytes = assignment.uploaded_document.read()
            processed_doc = processor.process_bytes(
                file_bytes=file_bytes,
                filename=assignment.uploaded_document_name,
                document_type='other'
            )
            extracted_text = processed_doc['content']
        except Exception as e:
            return Response({'error': f'Failed to process document: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        patient_info = {
            'patient_id': str(patient.id),
            'first_name': patient.first_name,
            'last_name': patient.last_name,
        }

        documents_data = [
            {
                'filename': assignment.uploaded_document_name,
                'document_type': 'clinician_submitted',
                'document_type_display': 'Clinician Submitted Document',
                'extracted_text': extracted_text or '[No text extracted]',
            }
        ]

        try:
            service = get_mistral_service()
            report_markdown = service.analyze_documents(
                documents=documents_data,
                patient_info=patient_info,
            )
            import re
            from datetime import datetime
            current_date_str = datetime.now().strftime("%B %d, %Y")
            date_pattern = re.compile(
                r'\[(?:Date|Current\s+Date|Audit\s+Date|date|current\s+date|TODAY)\]',
                re.IGNORECASE
            )
            report_markdown = date_pattern.sub(current_date_str, report_markdown)
            
            iso_pattern = re.compile(
                r'\[(?:ISO timestamp|Current ISO timestamp)\]',
                re.IGNORECASE
            )
            report_markdown = iso_pattern.sub(datetime.now().isoformat(), report_markdown)

        except Exception as exc:
            logger.error(f'Mistral analysis failed: {exc}')
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'report_markdown': report_markdown,
            'patient_info': patient_info,
            'document_names': [assignment.uploaded_document_name],
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='save')
    def save_result(self, request):
        """
        Accepts: { patient_id, report_markdown, document_names, ai_model_used }
        Saves an AIAnalysisResult record and returns its id.
        """
        from patients.models import Patient

        patient_id = request.data.get('patient_id')
        report_markdown = request.data.get('report_markdown', '').strip()
        document_names = request.data.get('document_names', [])
        # Use the actual model name from unified service if not provided by frontend
        _default_model = get_unified_ai_service().model_name
        ai_model = request.data.get('ai_model_used') or _default_model
        status_val = request.data.get('status', 'Fail')

        if not patient_id or not report_markdown:
            return Response({'error': 'patient_id and report_markdown are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

        # ── Server-side status recomputation ─────────────────────────────────
        # Always derive status from the report content so frontend logic drifts
        # or bugs don't cause incorrect stored statuses.
        import re as _re
        findings_match = _re.search(r'Total\s+Findings\D*(\d+)', report_markdown, _re.IGNORECASE)
        if findings_match:
            total_findings = int(findings_match.group(1))
            status_val = 'Pass' if total_findings == 0 else 'Fail'
        else:
            score_match = _re.search(r'Compliance\s+Score\s*:\s*(\d+)\s*/\s*100', report_markdown, _re.IGNORECASE)
            if score_match:
                score = int(score_match.group(1))
                status_val = 'Pass' if score >= 85 else 'Fail'
            else:
                risk_match = _re.search(r'Overall\s+Risk\s+Level\s*:.*?(CRITICAL|HIGH|MEDIUM|LOW|NONE)', report_markdown, _re.IGNORECASE)
                if risk_match:
                    risk_level = risk_match.group(1).upper()
                    status_val = 'Pass' if risk_level in ('LOW', 'NONE') else 'Fail'
                # else keep whatever the frontend sent as a last resort

        result = AIAnalysisResult.objects.create(
            patient=patient,
            created_by=request.user,
            analyzed_document_names=document_names,
            report_markdown=report_markdown,
            ai_model_used=ai_model,
            status=status_val,
        )

        return Response({
            'id': str(result.id),
            'created_at': result.created_at.isoformat(),
            'message': 'Result saved successfully',
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='results')
    def list_results(self, request):
        """
        GET /api/ai/mistral/results/?patient_id=<uuid>
        Returns all saved AI analysis results for a patient.
        """
        patient_id = request.query_params.get('patient_id')
        from django.db.models import Exists, OuterRef
        qs = AIAnalysisResult.objects.select_related('patient', 'created_by').annotate(
            is_assigned=Exists(AssignedAuditReport.objects.filter(analysis_result=OuterRef('pk')))
        )

        user = request.user
        if hasattr(user, 'is_superadmin') and user.is_superadmin:
            pass  # see all
        elif hasattr(user, 'agency') and user.agency:
            qs = qs.filter(patient__agency=user.agency)
        else:
            qs = qs.filter(patient__created_by=user)

        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        data = []
        for r in qs:
            # Fetch analyzed document records so the frontend can View/Download them
            analyzed_docs = AuditDocument.objects.filter(
                patient=r.patient,
                filename__in=r.analyzed_document_names
            ).values('id', 'filename', 'document_type', 'file_size_mb')
            analyzed_documents_info = [
                {
                    'id': str(d['id']),
                    'filename': d['filename'],
                    'document_type': d['document_type'],
                    'file_size_mb': round(d['file_size_mb'], 2),
                }
                for d in analyzed_docs
            ]

            # Clinician doc comes from the AssignedAuditReport's uploaded_document
            assignment_with_doc = AssignedAuditReport.objects.filter(
                analysis_result=r,
                uploaded_document__isnull=False
            ).exclude(uploaded_document='').first()

            if assignment_with_doc:
                clinician_doc_status = 'submitted'
                clinician_doc_name = assignment_with_doc.uploaded_document_name
                has_clinician_doc = True
                clinician_doc_submitted_at = assignment_with_doc.completed_at.isoformat() if assignment_with_doc.completed_at else None
                clinician_assignment_id = str(assignment_with_doc.id)
            else:
                clinician_doc_status = 'pending'
                clinician_doc_name = ''
                has_clinician_doc = False
                clinician_doc_submitted_at = None
                clinician_assignment_id = None

            data.append({
                'id': str(r.id),
                'patient_id': str(r.patient_id),
                'patient_name': f'{r.patient.first_name} {r.patient.last_name}',
                'report_markdown': r.report_markdown,
                'analyzed_document_names': r.analyzed_document_names,
                'analyzed_documents': analyzed_documents_info,
                'ai_model_used': r.ai_model_used,
                'status': r.status,
                'created_at': r.created_at.isoformat(),
                'created_by': r.created_by.get_full_name() if r.created_by else None,
                'is_assigned': getattr(r, 'is_assigned', False),
                'clinician_document_status': clinician_doc_status,
                'clinician_document_name': clinician_doc_name,
                'has_clinician_document': has_clinician_doc,
                'clinician_document_submitted_at': clinician_doc_submitted_at,
                'clinician_assignment_id': clinician_assignment_id,
            })

        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='results/(?P<result_id>[^/.]+)/detail')
    def get_result_detail(self, request, result_id=None):
        """
        GET /api/ai/mistral/results/<result_id>/detail/
        Returns a single saved AI analysis result with full details.
        """
        from django.db.models import Exists, OuterRef
        try:
            r = AIAnalysisResult.objects.select_related('patient', 'created_by').annotate(
                is_assigned=Exists(AssignedAuditReport.objects.filter(analysis_result=OuterRef('pk')))
            ).get(pk=result_id)
        except AIAnalysisResult.DoesNotExist:
            return Response({'error': 'Result not found'}, status=status.HTTP_404_NOT_FOUND)

        # Permission check
        user = request.user
        if not getattr(user, 'is_superadmin', False):
            if getattr(user, 'agency', None):
                if r.patient.agency != user.agency:
                    return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            else:
                if r.created_by != user:
                    return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        analyzed_docs = AuditDocument.objects.filter(
            patient=r.patient,
            filename__in=r.analyzed_document_names
        ).values('id', 'filename', 'document_type', 'file_size_mb')
        analyzed_documents_info = [
            {
                'id': str(d['id']),
                'filename': d['filename'],
                'document_type': d['document_type'],
                'file_size_mb': round(d['file_size_mb'], 2),
            }
            for d in analyzed_docs
        ]

        # Clinician doc comes from the AssignedAuditReport's uploaded_document
        assignment_with_doc = AssignedAuditReport.objects.filter(
            analysis_result=r,
            uploaded_document__isnull=False
        ).exclude(uploaded_document='').select_related('assigned_to').first()

        if assignment_with_doc:
            clinician_doc_status = 'submitted'
            clinician_doc_name = assignment_with_doc.uploaded_document_name
            has_clinician_doc = True
            clinician_doc_submitted_at = assignment_with_doc.completed_at.isoformat() if assignment_with_doc.completed_at else None
            clinician_assignment_id = str(assignment_with_doc.id)
            clinician_name = assignment_with_doc.assigned_to.get_full_name() if assignment_with_doc.assigned_to else None
        else:
            clinician_doc_status = 'pending'
            clinician_doc_name = ''
            has_clinician_doc = False
            clinician_doc_submitted_at = None
            clinician_assignment_id = None
            clinician_name = None

        return Response({
            'id': str(r.id),
            'patient_id': str(r.patient_id),
            'patient_name': f'{r.patient.first_name} {r.patient.last_name}',
            'report_markdown': r.report_markdown,
            'analyzed_document_names': r.analyzed_document_names,
            'analyzed_documents': analyzed_documents_info,
            'ai_model_used': r.ai_model_used,
            'status': r.status,
            'created_at': r.created_at.isoformat(),
            'created_by': r.created_by.get_full_name() if r.created_by else None,
            'is_assigned': getattr(r, 'is_assigned', False),
            'clinician_document_status': clinician_doc_status,
            'clinician_document_name': clinician_doc_name,
            'has_clinician_document': has_clinician_doc,
            'clinician_document_submitted_at': clinician_doc_submitted_at,
            'clinician_assignment_id': clinician_assignment_id,
            'clinician_name': clinician_name,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='results/(?P<result_id>[^/.]+)/submit_document',
            parser_classes=[MultiPartParser, FormParser])
    def submit_clinician_document(self, request, result_id=None):
        """
        POST multipart with 'document' file field to /api/ai/mistral/results/<id>/submit_document/
        Clinician submits a document for a specific AI analysis result.
        """
        from django.utils import timezone
        from django.db.models import Exists, OuterRef
        try:
            r = AIAnalysisResult.objects.select_related('patient').annotate(
                is_assigned=Exists(AssignedAuditReport.objects.filter(analysis_result=OuterRef('pk')))
            ).get(pk=result_id)
        except AIAnalysisResult.DoesNotExist:
            return Response({'error': 'Result not found'}, status=status.HTTP_404_NOT_FOUND)

        uploaded_file = request.FILES.get('document')
        if not uploaded_file:
            return Response({'error': 'No document file provided'}, status=status.HTTP_400_BAD_REQUEST)

        r.clinician_document = uploaded_file
        r.clinician_document_name = uploaded_file.name
        r.clinician_document_status = 'submitted'
        r.clinician_document_submitted_at = timezone.now()
        r.save()

        return Response({
            'id': str(r.id),
            'clinician_document_status': r.clinician_document_status,
            'clinician_document_name': r.clinician_document_name,
            'clinician_document_submitted_at': r.clinician_document_submitted_at.isoformat(),
            'message': 'Document submitted successfully.',
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='results/(?P<result_id>[^/.]+)/clinician_document')
    def download_clinician_document(self, request, result_id=None):
        """
        GET /api/ai/mistral/results/<id>/clinician_document/
        Download the clinician-submitted document for this result.
        """
        try:
            r = AIAnalysisResult.objects.get(pk=result_id)
        except AIAnalysisResult.DoesNotExist:
            return Response({'error': 'Result not found'}, status=status.HTTP_404_NOT_FOUND)

        if not r.clinician_document:
            return Response({'error': 'No document submitted for this report'}, status=status.HTTP_404_NOT_FOUND)

        file_path = r.clinician_document.path
        if os.path.exists(file_path):
            import mimetypes
            content_type, _ = mimetypes.guess_type(r.clinician_document_name or file_path)
            if not content_type:
                content_type = 'application/octet-stream'
            response = FileResponse(open(file_path, 'rb'), content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{r.clinician_document_name}"'
            return response
        raise Http404('File not found on server')


class AssignedAuditReportView(viewsets.ViewSet):
    """
    Endpoints for assigning AI analysis results to clinicians.

    POST /api/ai/mistral/assign/        – assign a result to a clinician
    GET  /api/ai/mistral/assigned/      – list all assignments (agency scoped)
    GET  /api/ai/mistral/assigned/<id>/ – fetch a single assignment detail
    POST /api/ai/mistral/assigned/<id>/upload_document/ – upload document & mark complete
    GET  /api/ai/mistral/clinicians/    – list clinicians in admin's agency
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=False, methods=['post'], url_path='assign')
    def assign(self, request):
        """
        POST { analysis_result_id, clinician_id }
        Creates an AssignedAuditReport record.
        """
        from users.models import CustomUser
        result_id = request.data.get('analysis_result_id')
        clinician_id = request.data.get('clinician_id')

        if not result_id or not clinician_id:
            return Response({'error': 'analysis_result_id and clinician_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = AIAnalysisResult.objects.get(id=result_id)
        except AIAnalysisResult.DoesNotExist:
            return Response({'error': 'Analysis result not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            clinician = CustomUser.objects.get(id=clinician_id, role='clinician')
        except CustomUser.DoesNotExist:
            return Response({'error': 'Clinician not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check agency scope
        user = request.user
        if getattr(user, 'role', None) in ['agency_admin', 'qa_compliance']:
            if clinician.agency != user.agency:
                return Response({'error': 'Clinician does not belong to your agency'}, status=status.HTTP_403_FORBIDDEN)

        assignment = AssignedAuditReport.objects.create(
            analysis_result=result,
            assigned_by=user,
            assigned_to=clinician,
        )

        return Response({
            'id': str(assignment.id),
            'assigned_at': assignment.assigned_at.isoformat(),
            'message': 'Report assigned successfully',
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='assigned')
    def list_assigned(self, request):
        """
        GET /api/ai/mistral/assigned/
        - Clinicians: only see assignments assigned to them.
        - Agency admins / superadmins: see all assignments in their scope.
        """
        user = request.user
        qs = AssignedAuditReport.objects.select_related(
            'analysis_result', 'analysis_result__patient',
            'assigned_by', 'assigned_to'
        )

        if getattr(user, 'is_superadmin', False):
            pass  # see all
        elif getattr(user, 'role', None) == 'clinician':
            # Clinician can only see reports assigned specifically to them
            qs = qs.filter(assigned_to=user)
        elif getattr(user, 'agency', None):
            qs = qs.filter(analysis_result__patient__agency=user.agency)
        else:
            qs = qs.none()

        data = []
        for a in qs:
            r = a.analysis_result
            data.append({
                'id': str(a.id),
                'analysis_result_id': str(r.id),
                'patient_id': str(r.patient_id),
                'patient_name': f'{r.patient.first_name} {r.patient.last_name}',
                'report_markdown': r.report_markdown,
                'analyzed_document_names': r.analyzed_document_names,
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

        return Response(data, status=status.HTTP_200_OK)

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

        # Clinicians can only access their own assigned reports
        if getattr(user, 'role', None) == 'clinician' and a.assigned_to != user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        r = a.analysis_result

        # Fetch the actual AuditDocument records for this patient that match the analyzed filenames
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
        """
        POST multipart with 'document' file field.
        Uploads a document, marks the assignment as complete.
        """
        from django.utils import timezone
        user = request.user
        try:
            assignment = AssignedAuditReport.objects.get(pk=pk)
        except AssignedAuditReport.DoesNotExist:
            return Response({'error': 'Assignment not found'}, status=status.HTTP_404_NOT_FOUND)

        # Clinicians can only upload to their own assigned reports
        if getattr(user, 'role', None) == 'clinician' and assignment.assigned_to != user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if assignment.status == 'complete':
            return Response({'error': 'This report is already completed. Cannot re-upload.'}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES.get('document')
        if not uploaded_file:
            return Response({'error': 'No document file provided'}, status=status.HTTP_400_BAD_REQUEST)

        assignment.uploaded_document = uploaded_file
        assignment.uploaded_document_name = uploaded_file.name
        assignment.status = 'complete'
        assignment.completed_at = timezone.now()
        assignment.save()

        return Response({
            'id': str(assignment.id),
            'status': assignment.status,
            'uploaded_document_name': assignment.uploaded_document_name,
            'completed_at': assignment.completed_at.isoformat(),
            'message': 'Document uploaded and report marked as complete.',
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='download_document')
    def download_document(self, request, pk=None):
        """GET /api/ai/mistral/assigned/<id>/download_document/ – download the uploaded doc"""
        try:
            assignment = AssignedAuditReport.objects.get(pk=pk)
        except AssignedAuditReport.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if not assignment.uploaded_document:
            return Response({'error': 'No document uploaded'}, status=status.HTTP_404_NOT_FOUND)

        file_path = assignment.uploaded_document.path
        if os.path.exists(file_path):
            response = FileResponse(
                open(file_path, 'rb'),
                content_type='application/pdf',
            )
            response['Content-Disposition'] = f'inline; filename="{assignment.uploaded_document_name}"'
            return response
        raise Http404("File not found on server")

    @action(detail=False, methods=['get'], url_path='clinicians')
    def list_clinicians(self, request):
        """GET /api/ai/mistral/clinicians/ – return clinician users in admin's agency"""
        from users.models import CustomUser
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
