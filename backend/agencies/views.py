from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg

from .models import Agency, AgencyAdmin
from patients.models import Patient
from ai.models import AuditSession, AuditDocument
from .serializers import (
    AgencySerializer, 
    AgencyCreateSerializer, 
    AgencyAdminSerializer,
    AgencyWithAdminsSerializer
)
from django.contrib.auth import get_user_model

User = get_user_model()


class AgencyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing agencies.
    Only superadmins can create, update, delete agencies.
    Superadmins can view all agencies.
    Agency admins can view their own agency.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'email', 'city', 'state']
    ordering_fields = ['created_at', 'name', 'is_active']

    def get_queryset(self):
        """Filter agencies by user permissions."""
        user = self.request.user
        
        if hasattr(user, 'is_superadmin') and user.is_superadmin:
            # Superadmins can see all agencies
            return Agency.objects.all()
        elif hasattr(user, 'is_agency_admin') and user.is_agency_admin and user.agency:
            # Agency admins can only see their own agency
            return Agency.objects.filter(id=user.agency.id)
        else:
            # Regular users can't see agencies
            return Agency.objects.none()

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return AgencyCreateSerializer
        elif self.action == 'retrieve':
            return AgencyWithAdminsSerializer
        return AgencySerializer

    def perform_create(self, serializer):
        """Set the created_by user."""
        user = self.request.user
        if hasattr(user, 'is_superadmin') and user.is_superadmin:
            serializer.save(created_by=user)
        else:
            # Only superadmins can create agencies
            raise PermissionError("Only superadmins can create agencies")

    def perform_update(self, serializer):
        """Check permissions before updating."""
        user = self.request.user
        if not (hasattr(user, 'is_superadmin') and user.is_superadmin):
            raise PermissionError("Only superadmins can update agencies")
        serializer.save()

    def perform_destroy(self, instance):
        """Check permissions before deleting."""
        user = self.request.user
        if not (hasattr(user, 'is_superadmin') and user.is_superadmin):
            raise PermissionError("Only superadmins can delete agencies")
        instance.delete()

    @action(detail=True, methods=['post'])
    def add_admin(self, request, pk=None):
        """Add a user as an admin for this agency."""
        agency = self.get_object()
        user = self.request.user
        
        # Only superadmins can add agency admins
        if not (hasattr(user, 'is_superadmin') and user.is_superadmin):
            return Response(
                {'error': 'Only superadmins can add agency admins'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_to_add = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Set the user's agency and role
        user_to_add.agency = agency
        user_to_add.role = 'agency_admin'
        user_to_add.save()
        
        # Create AgencyAdmin entry
        agency_admin, created = AgencyAdmin.objects.get_or_create(
            agency=agency,
            user=user_to_add,
            defaults={
                'is_primary': request.data.get('is_primary', False),
                'can_manage_users': request.data.get('can_manage_users', True),
                'can_manage_patients': request.data.get('can_manage_patients', True),
                'can_manage_documents': request.data.get('can_manage_documents', True),
                'can_run_audits': request.data.get('can_run_audits', True),
            }
        )
        
        if not created:
            # Update existing permissions
            agency_admin.is_primary = request.data.get('is_primary', agency_admin.is_primary)
            agency_admin.can_manage_users = request.data.get('can_manage_users', agency_admin.can_manage_users)
            agency_admin.can_manage_patients = request.data.get('can_manage_patients', agency_admin.can_manage_patients)
            agency_admin.can_manage_documents = request.data.get('can_manage_documents', agency_admin.can_manage_documents)
            agency_admin.can_run_audits = request.data.get('can_run_audits', agency_admin.can_run_audits)
            agency_admin.save()
        
        serializer = AgencyAdminSerializer(agency_admin)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def remove_admin(self, request, pk=None):
        """Remove a user as an admin for this agency."""
        agency = self.get_object()
        user = self.request.user
        
        # Only superadmins can remove agency admins
        if not (hasattr(user, 'is_superadmin') and user.is_superadmin):
            return Response(
                {'error': 'Only superadmins can remove agency admins'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_to_remove = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Remove agency admin role and reset user's agency
        try:
            agency_admin = AgencyAdmin.objects.get(agency=agency, user=user_to_remove)
            agency_admin.delete()
            
            # Reset user's role and agency if they were an agency admin
            if user_to_remove.role == 'agency_admin':
                user_to_remove.role = 'clinician'  # Default role
                user_to_remove.agency = None
                user_to_remove.save()
            
            return Response({'message': 'Agency admin removed successfully'}, status=status.HTTP_200_OK)
        except AgencyAdmin.DoesNotExist:
            return Response(
                {'error': 'User is not an admin for this agency'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def my_agency(self, request):
        """Get the agency of the current user."""
        user = request.user
        
        if hasattr(user, 'is_agency_admin') and user.is_agency_admin and user.agency:
            serializer = self.get_serializer(user.agency)
            return Response(serializer.data)
        elif hasattr(user, 'is_superadmin') and user.is_superadmin:
            # Superadmin can see all agencies
            agencies = self.get_queryset()
            serializer = self.get_serializer(agencies, many=True)
            return Response(serializer.data)
        else:
            return Response({'error': 'No agency assigned'}, status=status.HTTP_404_NOT_FOUND)


class AgencyAnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for agency analytics and reporting.
    Only superadmins can access analytics for all agencies.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get queryset based on user permissions."""
        user = self.request.user
        
        if hasattr(user, 'is_superadmin') and user.is_superadmin:
            # Superadmins can see analytics for all agencies
            return Agency.objects.all()
        else:
            # Others can't access analytics
            return Agency.objects.none()

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get overview analytics for agencies."""
        user = request.user
        
        if hasattr(user, 'is_superadmin') and user.is_superadmin:
            agencies = Agency.objects.all()
            total_agencies = agencies.count()
            active_agencies = agencies.filter(is_active=True).count()
            
            total_patients = Patient.objects.count()
            total_documents = AuditDocument.objects.count()
            
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            
            total_audits = AuditSession.objects.count()
            
            avg_compliance_score = AuditSession.objects.exclude(overall_compliance_score__isnull=True).aggregate(
                avg_score=Avg('overall_compliance_score')
            )['avg_score']
            
            agency_breakdown = [
                {
                    'id': agency.id,
                    'name': agency.name,
                    'patient_count': Patient.objects.filter(agency=agency).count(),
                    'document_count': AuditDocument.objects.filter(agency=agency).count(),
                    'audit_count': AuditSession.objects.filter(created_by__agency=agency).count(),
                }
                for agency in agencies
            ]
        elif hasattr(user, 'is_agency_admin') and user.is_agency_admin and user.agency:
            agency = user.agency
            total_agencies = 1
            active_agencies = 1 if agency.is_active else 0
            
            total_patients = Patient.objects.filter(agency=agency).count()
            total_documents = AuditDocument.objects.filter(agency=agency).count()
            
            total_users = User.objects.filter(agency=user.agency).count()
            active_users = User.objects.filter(agency=user.agency, is_active=True).count()
            
            total_audits = AuditSession.objects.filter(created_by__agency=agency).count()
            
            avg_compliance_score = AuditSession.objects.filter(created_by__agency=agency).exclude(overall_compliance_score__isnull=True).aggregate(
                avg_score=Avg('overall_compliance_score')
            )['avg_score']
            
            agency_breakdown = [
                {
                    'id': agency.id,
                    'name': agency.name,
                    'patient_count': total_patients,
                    'document_count': total_documents,
                    'audit_count': total_audits,
                }
            ]
        else:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        analytics_data = {
            'total_agencies': total_agencies,
            'active_agencies': active_agencies,
            'total_users': total_users,
            'active_users': active_users,
            'total_patients': total_patients,
            'total_documents': total_documents,
            'total_audits': total_audits,
            'average_compliance_score': round(avg_compliance_score, 2) if avg_compliance_score else 0,
            'agency_breakdown': agency_breakdown
        }
        
        return Response(analytics_data)