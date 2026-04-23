from django.db import transaction
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from ..models import PromptTemplate
from ..serializers import PromptTemplateSerializer


class CanAccessPrompts(BasePermission):
    """
    Allow access to prompt management for operational roles.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = getattr(request.user, "role", None)
        return role in {"superadmin", "agency_admin", "qa_compliance", "clinical_leadership"}


def _is_superadmin(user) -> bool:
    return bool(user and getattr(user, "role", None) == "superadmin")


def _attach_output_format(prompt_text: str, response_format: str) -> str:
    if not response_format:
        return (prompt_text or "").strip()
    text = (prompt_text or "").strip()
    if "## RESPONSE FORMAT" in text:
        return text
    return f"{text}\n\n{response_format}".strip()


class PromptTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing AI Prompt Templates.
    Main compliance prompt is view-only for non-superadmins.
    """
    queryset = PromptTemplate.objects.all()
    serializer_class = PromptTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessPrompts]

    def get_queryset(self):
        return self.queryset

    def perform_create(self, serializer):
        user = self.request.user
        prompt_group = serializer.validated_data.get("prompt_group") or PromptTemplate.PROMPT_GROUP_COMPLIANCE_AUDITOR

        main = PromptTemplate.objects.filter(prompt_group=prompt_group, is_main=True).first()
        response_format = ""
        if main:
            response_format = main.response_format or ""

        with transaction.atomic():
            raw_prompt_text = serializer.validated_data.get("prompt_text") or ""
            prompt_text = _attach_output_format(raw_prompt_text, response_format)
            created = serializer.save(
                updated_by=user,
                response_format=response_format,
                is_main=False,
                is_locked=False,
                is_active=False,
                prompt_text=prompt_text,
            )
            # New prompts should not steal "active" status by default.

    def perform_update(self, serializer):
        user = self.request.user
        instance: PromptTemplate = self.get_object()

        if instance.is_locked and not _is_superadmin(user):
            raise PermissionDenied("This prompt is view-only.")

        # Prevent changing the main prompt flags via normal updates.
        serializer.validated_data.pop("is_main", None)
        serializer.validated_data.pop("is_locked", None)
        serializer.validated_data.pop("prompt_group", None)
        serializer.validated_data.pop("response_format", None)

        with transaction.atomic():
            updated = serializer.save(updated_by=user)
            if updated.is_active:
                PromptTemplate.objects.filter(prompt_group=updated.prompt_group).exclude(pk=updated.pk).update(is_active=False)

    def destroy(self, request, *args, **kwargs):
        instance: PromptTemplate = self.get_object()
        if instance.is_locked:
            return Response({"detail": "This prompt cannot be deleted."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = request.user
        instance: PromptTemplate = self.get_object()
        with transaction.atomic():
            PromptTemplate.objects.filter(prompt_group=instance.prompt_group).update(is_active=False)
            PromptTemplate.objects.filter(pk=instance.pk).update(is_active=True, updated_by=user)
        return Response({"status": "ok"}, status=status.HTTP_200_OK)
