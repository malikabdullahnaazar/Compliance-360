from rest_framework import viewsets, permissions
from rest_framework.permissions import BasePermission
from ..models import PromptTemplate
from ..serializers import PromptTemplateSerializer


class IsSuperAdmin(BasePermission):
    """
    Allows access only to superadmin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', None) == 'superadmin')


class PromptTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing AI Prompt Templates.
    Only accessible to super-admins.
    """
    queryset = PromptTemplate.objects.all()
    serializer_class = PromptTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get_queryset(self):
        # We might only want to show active templates, but super admins should see all.
        return self.queryset

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
