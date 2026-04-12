from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from ..models import ComplianceFinding
from ..serializers import ComplianceFindingSerializer, UpdateFindingSerializer

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
            return Response({'error': 'audit_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        findings = ComplianceFinding.objects.filter(
            audit_session_id=audit_id
        ).order_by('-severity', 'check_number')
        
        serializer = self.get_serializer(findings, many=True)
        return Response(serializer.data)
