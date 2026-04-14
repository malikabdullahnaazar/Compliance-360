import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..serializers import (
    AuditRequestSerializer,
    SingleDocumentAnalysisSerializer,
)
from ..services.langchain_service import get_compliance_service
from ..services.document_processor import get_document_processor

logger = logging.getLogger(__name__)

class AIAuditAPIView(viewsets.ViewSet):
    """
    Direct AI audit endpoints for immediate analysis without saving.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def analyze_documents(self, request):
        """Analyze documents and return immediate results without saving."""
        serializer = AuditRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            ai_service = get_compliance_service()
            result = ai_service.analyze_documents(
                documents=data['documents'],
                patient_info={'patient_id': data.get('patient_id')} if data.get('patient_id') else None
            )
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Direct analysis failed: {str(e)}")
            return Response({'error': f'Analysis failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def analyze_single_document(self, request):
        """Analyze a single document immediately."""
        serializer = SingleDocumentAnalysisSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            ai_service = get_compliance_service()
            result = ai_service.analyze_documents(
                documents=[{
                    'content': data['document_content'],
                    'document_type': data['document_type'],
                    'filename': 'single_document.txt'
                }],
                patient_info={'patient_id': data.get('patient_id')} if data.get('patient_id') else None
            )
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Single document analysis failed: {str(e)}")
            return Response({'error': f'Analysis failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def extract_and_analyze(self, request):
        """Extract text from uploaded file and analyze it."""
        uploaded_file = request.FILES.get('file')
        document_type = request.data.get('document_type')
        
        if not uploaded_file or not document_type:
            return Response({'error': 'Both file and document_type are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            processor = get_document_processor()
            file_bytes = uploaded_file.read()
            processed = processor.process_bytes(
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                document_type=document_type
            )
            
            ai_service = get_compliance_service()
            result = ai_service.analyze_documents(
                documents=[{
                    'content': processed['content'],
                    'document_type': document_type,
                    'filename': uploaded_file.name
                }]
            )
            
            result['extraction'] = {
                'filename': processed['filename'],
                'pages': processed.get('total_pages'),
                'method': processed['extraction_method'],
                'size_mb': processed['file_size_mb']
            }
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Extract and analyze failed: {str(e)}")
            return Response({'error': f'Failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
