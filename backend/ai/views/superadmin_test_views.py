"""
Super Admin Test Analyzer Views
Completely isolated from agency-scoped analysis. Superadmins can upload a raw
PDF chart, pick an AI model + prompt, and test the analysis pipeline.
"""

import logging
import os

from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import SuperAdminTestJob, SuperAdminTestResult
from ..services.document_processor import get_document_processor
from ..tasks import run_superadmin_test_job

logger = logging.getLogger(__name__)


class IsSuperAdmin:
    """Simple permission helper – not a DRF class, used inline."""
    @staticmethod
    def check(user):
        return bool(user and user.is_authenticated and getattr(user, "role", None) == "superadmin")


class SuperAdminTestViewSet(viewsets.ViewSet):
    """
    Endpoints for the Super Admin 'Test AI Analyzer' feature.

    POST   /ai/superadmin-test/start/          – upload PDF, pick model+prompt → returns job_id
    GET    /ai/superadmin-test/<job_id>/status/ – poll job progress
    GET    /ai/superadmin-test/results/         – list latest Pass/Fail results for this admin
    GET    /ai/superadmin-test/results/<id>/    – full report markdown for a result
    """
    permission_classes = [IsAuthenticated]

    def _require_superadmin(self, request):
        if not IsSuperAdmin.check(request.user):
            return Response({"error": "Superadmin access required."}, status=status.HTTP_403_FORBIDDEN)
        return None

    @action(detail=False, methods=["post"], url_path="start")
    def start(self, request):
        """
        Upload a chart PDF, specify ai_model and prompt_id, kick off async analysis.
        Returns immediately with { job_id }.
        """
        deny = self._require_superadmin(request)
        if deny:
            return deny

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "A PDF/chart file is required."}, status=status.HTTP_400_BAD_REQUEST)

        ai_model = (request.data.get("ai_model") or "gpt-5.4").strip()
        allowed_models = {"gpt-5.4", "gpt-4o", "gpt-4o-mini"}
        if ai_model not in allowed_models:
            ai_model = "gpt-5.4"

        prompt_id = request.data.get("prompt_id") or None
        prompt_name = request.data.get("prompt_name") or ""

        # Save file to media storage
        filename = uploaded_file.name
        storage_path = f"superadmin_test_uploads/{request.user.id}/{filename}"
        saved_path = default_storage.save(storage_path, uploaded_file)

        # Extract text immediately so we can store it on the job
        extracted_text = ""
        try:
            processor = get_document_processor()
            with default_storage.open(saved_path, "rb") as f:
                file_bytes = f.read()
            processed = processor.process_bytes(
                file_bytes=file_bytes,
                filename=filename,
                document_type="other",
            )
            extracted_text = processed.get("content") or ""
        except Exception as exc:
            logger.warning("Pre-extraction failed for superadmin test upload: %s", exc)

        job = SuperAdminTestJob.objects.create(
            created_by=request.user,
            filename=filename,
            file_path=saved_path,
            extracted_text=extracted_text,
            ai_model=ai_model,
            prompt_id=prompt_id,
            prompt_name=prompt_name,
        )

        async_result = run_superadmin_test_job.delay(str(job.id))
        SuperAdminTestJob.objects.filter(pk=job.pk).update(celery_task_id=async_result.id)

        return Response(
            {
                "job_id": str(job.id),
                "message": "Analysis queued. Poll /status/ for progress.",
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["get"], url_path=r"(?P<job_id>[^/.]+)/status")
    def job_status(self, request, job_id=None):
        """Poll status for a SuperAdminTestJob."""
        deny = self._require_superadmin(request)
        if deny:
            return deny

        try:
            job = SuperAdminTestJob.objects.get(pk=job_id, created_by=request.user)
        except SuperAdminTestJob.DoesNotExist:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "job_id": str(job.id),
                "state": job.status,
                "progress": job.progress,
                "report_status": job.report_status or None,
                "error": job.error_message or None,
            }
        )

    @action(detail=False, methods=["get"], url_path="results")
    def list_results(self, request):
        """
        Return the latest Pass and Fail result for the current superadmin.
        At most 2 results: one Pass, one Fail.
        """
        deny = self._require_superadmin(request)
        if deny:
            return deny

        results = SuperAdminTestResult.objects.filter(created_by=request.user).order_by("-created_at")
        data = [
            {
                "id": str(r.id),
                "filename": r.filename,
                "ai_model_used": r.ai_model_used,
                "prompt_name": r.prompt_name,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
                "report_markdown_snippet": r.report_markdown[:300] + "..." if len(r.report_markdown) > 300 else r.report_markdown,
            }
            for r in results
        ]
        return Response(data)

    @action(detail=False, methods=["get"], url_path=r"results/(?P<result_id>[^/.]+)")
    def get_result(self, request, result_id=None):
        """Return the full report markdown for a SuperAdminTestResult."""
        deny = self._require_superadmin(request)
        if deny:
            return deny

        try:
            r = SuperAdminTestResult.objects.get(pk=result_id, created_by=request.user)
        except SuperAdminTestResult.DoesNotExist:
            return Response({"error": "Result not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "id": str(r.id),
                "filename": r.filename,
                "ai_model_used": r.ai_model_used,
                "prompt_name": r.prompt_name,
                "status": r.status,
                "report_markdown": r.report_markdown,
                "created_at": r.created_at.isoformat(),
            }
        )
