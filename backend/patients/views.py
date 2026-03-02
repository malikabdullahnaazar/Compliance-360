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
    ViewSet for managing patients.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['status']
    search_fields = ['first_name', 'last_name', 'email']
    ordering_fields = ['first_name', 'last_name', 'created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter patients by user permissions."""
        user = self.request.user
        # Agency admins can see all patients in their agency, superadmins see all
        if hasattr(user, 'role') and user.role == 'superadmin':
            return Patient.objects.all()
        elif hasattr(user, 'role') and user.role in ['agency_admin', 'qa_compliance']:
            return Patient.objects.filter(agency=user.agency)
        return Patient.objects.filter(created_by=user)

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
        # Set the agency based on the user's agency
        serializer.save(created_by=user, agency=user.agency)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search patients by name or email.
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
        Get patients created by the current user.
        """
        patients = self.get_queryset().filter(created_by=request.user)
        serializer = self.get_serializer(patients, many=True)
        return Response(serializer.data)