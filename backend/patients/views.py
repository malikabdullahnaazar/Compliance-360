from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import Patient
from .serializers import PatientSerializer, PatientCreateSerializer, PatientUpdateSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing patients with strict agency-level data isolation.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['status']
    search_fields = ['first_name', 'last_name', 'email']
    ordering_fields = ['first_name', 'last_name', 'created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter patients by user permissions with strict agency isolation."""
        user = self.request.user
        
        # Superadmins can see all patients
        if hasattr(user, 'role') and user.role == 'superadmin':
            return Patient.objects.all()
        
        # Agency admins, QA/Compliance can only see patients in their agency
        if hasattr(user, 'role') and user.role in ['agency_admin', 'qa_compliance', 'clinical_leadership']:
            if not user.agency:
                return Patient.objects.none()
            return Patient.objects.filter(agency=user.agency)
        
        # Clinicians can only see patients in their agency
        if user.agency:
            return Patient.objects.filter(agency=user.agency)
        
        # Fallback: no access
        return Patient.objects.none()

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return PatientCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PatientUpdateSerializer
        return PatientSerializer

    def perform_create(self, serializer):
        """Set the created_by user and associated agency."""
        user = self.request.user
        # Ensure agency is set from the user's agency
        agency = user.agency
        serializer.save(created_by=user, agency=agency)

    def get_object(self):
        """Override to ensure users can only access patients in their agency."""
        obj = super().get_object()
        user = self.request.user
        
        # Superadmins can access any patient
        if hasattr(user, 'role') and user.role == 'superadmin':
            return obj
        
        # All other users can only access patients in their agency
        if user.agency and obj.agency != user.agency:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to access this patient.")
        
        return obj

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search patients by name or email (agency-scoped).
        """
        query = request.query_params.get('q', '')
        if query:
            patients = self.get_queryset().filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query)
            )
        else:
            patients = self.get_queryset()

        serializer = self.get_serializer(patients, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_patients(self, request):
        """
        Get patients created by the current user (agency-scoped).
        """
        patients = self.get_queryset().filter(created_by=request.user)
        serializer = self.get_serializer(patients, many=True)
        return Response(serializer.data)