import logging
from typing import Any, Dict, List

from celery import shared_task
from django.db import transaction

from .models import AIAnalysisResult, AnalysisJob, AuditDocument, ChartIntakeJob
from .services.langchain_service import get_compliance_service
from .services.report_markdown_builder import build_compliance_report_markdown
from .utils.report_status import report_status_from_markdown
from .services.document_processor import get_document_processor

logger = logging.getLogger(__name__)


def _job_update(job_id, **fields):
    AnalysisJob.objects.filter(pk=job_id).update(**fields)


@shared_task(bind=True, ignore_result=True)
def run_analysis_job(self, job_uuid: str) -> None:
    """Execute document analysis for an AnalysisJob and persist AIAnalysisResult."""
    try:
        job = AnalysisJob.objects.select_related("patient", "created_by", "agency").get(
            pk=job_uuid
        )
    except AnalysisJob.DoesNotExist:
        logger.error("AnalysisJob %s not found", job_uuid)
        return

    if job.status == AnalysisJob.STATUS_COMPLETED and job.analysis_result_id:
        return

    task_id = getattr(self.request, "id", "") or ""
    _job_update(
        job_uuid,
        status=AnalysisJob.STATUS_RUNNING,
        progress=10,
        celery_task_id=task_id,
    )

    try:
        patient = job.patient
        doc_ids = job.document_ids or []
        documents_qs = AuditDocument.objects.filter(
            id__in=doc_ids, patient=patient
        )
        if not documents_qs.exists():
            raise ValueError("No matching documents for this job")

        patient_info = {
            "patient_id": str(patient.id),
            "first_name": patient.first_name,
            "last_name": patient.last_name,
        }
        documents_data: List[Dict[str, Any]] = [
            {
                "filename": doc.filename,
                "document_type": doc.document_type,
                "document_type_display": doc.get_document_type_display(),
                "extracted_text": doc.extracted_text or "[No text extracted]",
                "file_size_mb": float(doc.file_size_mb or 0),
            }
            for doc in documents_qs
        ]

        service = get_compliance_service()

        def progress_cb(pct: int) -> None:
            _job_update(job_uuid, progress=pct)

        openai_kw: Dict[str, Any] = {}
        if service.provider != "google":
            openai_kw["openai_model"] = (job.openai_model or "").strip() or None

        result = service.analyze_documents(
            documents=documents_data,
            patient_info=patient_info,
            progress_callback=progress_cb,
            **openai_kw,
        )

        if result.get("metadata", {}).get("error"):
            raise ValueError(
                result.get("metadata", {}).get("details", "AI returned an error payload")
            )

        _job_update(job_uuid, progress=95)

        report_markdown = build_compliance_report_markdown(result, documents_qs)
        report_status = report_status_from_markdown(report_markdown)
        model_used = (
            result.get("metadata", {}).get("model")
            or job.openai_model
            or "unknown"
        )
        document_names = [d["filename"] for d in documents_data]

        with transaction.atomic():
            analysis = AIAnalysisResult.objects.create(
                patient=patient,
                created_by=job.created_by,
                agency=job.agency,
                analyzed_document_names=document_names,
                report_markdown=report_markdown,
                ai_model_used=str(model_used)[:100],
                status=report_status,
            )
            _job_update(
                job_uuid,
                status=AnalysisJob.STATUS_COMPLETED,
                progress=100,
                analysis_result_id=analysis.id,
                report_status=report_status,
                error_message="",
            )

        logger.info("AnalysisJob %s completed -> AIAnalysisResult %s", job_uuid, analysis.id)

    except Exception as exc:
        logger.exception("AnalysisJob %s failed: %s", job_uuid, exc)
        _job_update(
            job_uuid,
            status=AnalysisJob.STATUS_FAILED,
            error_message=str(exc)[:4000],
        )


def _intake_update(job_id, **fields):
    ChartIntakeJob.objects.filter(pk=job_id).update(**fields)


@shared_task(bind=True, ignore_result=True)
def run_chart_intake_job(self, job_uuid: str) -> None:
    """Extract chart text from an uploaded PDF (async).

    Patient intake extraction was removed; this job now only performs OCR/text extraction.
    """
    try:
        job = ChartIntakeJob.objects.select_related("created_by", "agency").get(pk=job_uuid)
    except ChartIntakeJob.DoesNotExist:
        logger.error("ChartIntakeJob %s not found", job_uuid)
        return

    if job.status in {ChartIntakeJob.STATUS_CANCELLED, ChartIntakeJob.STATUS_COMPLETED}:
        return

    task_id = getattr(self.request, "id", "") or ""
    _intake_update(job_uuid, status=ChartIntakeJob.STATUS_RUNNING, progress=5, celery_task_id=task_id)

    try:
        if not job.file_path:
            raise ValueError("No file_path recorded for intake job")

        processor = get_document_processor()
        _intake_update(job_uuid, progress=15)

        from django.core.files.storage import default_storage

        with default_storage.open(job.file_path, "rb") as f:
            file_bytes = f.read()

        processed = processor.process_bytes(
            file_bytes=file_bytes,
            filename=job.filename or "chart.pdf",
            document_type="other",
        )
        _intake_update(
            job_uuid,
            progress=45,
            extracted_text=processed.get("content") or "",
            extraction_method=processed.get("extraction_method") or "text",
            file_size_mb=processed.get("file_size_mb"),
            total_pages=processed.get("total_pages"),
        )

        chart_text = processed.get("content") or ""
        if not chart_text.strip():
            raise ValueError("Could not extract text from PDF (possibly scanned/corrupted).")

        _intake_update(job_uuid, progress=90)
        _intake_update(
            job_uuid,
            status=ChartIntakeJob.STATUS_COMPLETED,
            progress=100,
            extracted_patient=None,
            ambiguous_candidates=[],
            error_message="",
        )

    except Exception as exc:
        logger.exception("ChartIntakeJob %s failed: %s", job_uuid, exc)
        _intake_update(
            job_uuid,
            status=ChartIntakeJob.STATUS_FAILED,
            error_message=str(exc)[:4000],
        )


def _test_job_update(job_id, **fields):
    from .models import SuperAdminTestJob
    SuperAdminTestJob.objects.filter(pk=job_id).update(**fields)


@shared_task(bind=True, ignore_result=True)
def run_superadmin_test_job(self, job_uuid: str) -> None:
    """
    Execute an AI analysis for a SuperAdminTestJob.
    Accepts a raw uploaded PDF chart, runs compliance analysis using the
    selected model and prompt, then stores the result in SuperAdminTestResult
    (replacing the previous result of the same status for this superadmin).
    """
    from .models import SuperAdminTestJob, SuperAdminTestResult, PromptTemplate

    try:
        job = SuperAdminTestJob.objects.select_related("created_by").get(pk=job_uuid)
    except SuperAdminTestJob.DoesNotExist:
        logger.error("SuperAdminTestJob %s not found", job_uuid)
        return

    if job.status in {SuperAdminTestJob.STATUS_COMPLETED, SuperAdminTestJob.STATUS_FAILED}:
        return

    task_id = getattr(self.request, "id", "") or ""
    _test_job_update(job_uuid, status=SuperAdminTestJob.STATUS_RUNNING, progress=5, celery_task_id=task_id)

    try:
        # Fetch extracted text (already extracted during upload)
        extracted_text = job.extracted_text
        if not extracted_text.strip():
            # Try to extract now from file_path
            from django.core.files.storage import default_storage
            processor = get_document_processor()
            if job.file_path:
                with default_storage.open(job.file_path, "rb") as f:
                    file_bytes = f.read()
                processed = processor.process_bytes(
                    file_bytes=file_bytes,
                    filename=job.filename or "chart.pdf",
                    document_type="other",
                )
                extracted_text = processed.get("content") or ""
                _test_job_update(job_uuid, extracted_text=extracted_text)
            if not extracted_text.strip():
                raise ValueError("Could not extract text from the uploaded document.")

        _test_job_update(job_uuid, progress=30)

        # Determine which prompt to use
        system_content = None
        if job.prompt_id:
            try:
                prompt_obj = PromptTemplate.objects.get(pk=job.prompt_id)
                system_content = prompt_obj.prompt_text
                if prompt_obj.response_format and "## RESPONSE FORMAT" not in system_content:
                    system_content = f"{system_content}\n\n{prompt_obj.response_format}".strip()
            except PromptTemplate.DoesNotExist:
                logger.warning("PromptTemplate %s not found, falling back to default", job.prompt_id)

        documents_data = [
            {
                "filename": job.filename or "uploaded_chart.pdf",
                "document_type": "other",
                "document_type_display": "Uploaded Chart",
                "extracted_text": extracted_text,
            }
        ]

        service = get_compliance_service()

        def progress_cb(pct: int) -> None:
            _test_job_update(job_uuid, progress=pct)

        # Temporarily override system prompt if a specific prompt was provided
        import ai.prompts.system_prompts as sp
        original_prompt = sp.COMPLIANCE_AUDITOR_SYSTEM_PROMPT
        if system_content:
            sp.COMPLIANCE_AUDITOR_SYSTEM_PROMPT = system_content

        openai_kw = {}
        if service.provider != "google":
            openai_kw["openai_model"] = (job.ai_model or "gpt-5.4").strip()

        try:
            result = service.analyze_documents(
                documents=documents_data,
                patient_info={"patient_id": "superadmin-test", "first_name": "Test", "last_name": "Chart"},
                progress_callback=progress_cb,
                **openai_kw,
            )
        finally:
            # Always restore original prompt
            sp.COMPLIANCE_AUDITOR_SYSTEM_PROMPT = original_prompt

        if result.get("metadata", {}).get("error"):
            raise ValueError(result.get("metadata", {}).get("details", "AI returned an error payload"))

        _test_job_update(job_uuid, progress=90)

        report_markdown = build_compliance_report_markdown(result, [])
        report_status = report_status_from_markdown(report_markdown)
        model_used = result.get("metadata", {}).get("model") or job.ai_model or "unknown"

        with transaction.atomic():
            # Delete old result with same status for this superadmin (keep only latest)
            SuperAdminTestResult.objects.filter(
                created_by=job.created_by,
                status=report_status,
            ).delete()

            SuperAdminTestResult.objects.create(
                created_by=job.created_by,
                filename=job.filename or "chart.pdf",
                ai_model_used=str(model_used)[:100],
                prompt_name=job.prompt_name or "",
                report_markdown=report_markdown,
                status=report_status,
            )

            _test_job_update(
                job_uuid,
                status=SuperAdminTestJob.STATUS_COMPLETED,
                progress=100,
                report_status=report_status,
                error_message="",
            )

        logger.info("SuperAdminTestJob %s completed → status=%s", job_uuid, report_status)

    except Exception as exc:
        logger.exception("SuperAdminTestJob %s failed: %s", job_uuid, exc)
        _test_job_update(
            job_uuid,
            status=SuperAdminTestJob.STATUS_FAILED,
            progress=0,
            error_message=str(exc)[:4000],
        )
