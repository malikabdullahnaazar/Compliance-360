# Generated manually for AnalysisJob

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("agencies", "0002_initial"),
        ("ai", "0002_initial"),
        ("patients", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AnalysisJob",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "celery_task_id",
                    models.CharField(blank=True, db_index=True, max_length=255),
                ),
                ("document_ids", models.JSONField(default=list)),
                ("openai_model", models.CharField(blank=True, max_length=100)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("running", "Running"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("error_message", models.TextField(blank=True)),
                (
                    "report_status",
                    models.CharField(
                        blank=True,
                        choices=[("Pass", "Pass"), ("Fail", "Fail")],
                        help_text="Pass/Fail snapshot after completion for UI routing",
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "agency",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="analysis_jobs",
                        to="agencies.agency",
                    ),
                ),
                (
                    "analysis_result",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="analysis_job",
                        to="ai.aianalysisresult",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="analysis_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="analysis_jobs",
                        to="patients.patient",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="analysisjob",
            index=models.Index(fields=["agency"], name="ai_analysis_agency__idx"),
        ),
        migrations.AddIndex(
            model_name="analysisjob",
            index=models.Index(fields=["patient"], name="ai_analysis_patient_idx"),
        ),
        migrations.AddIndex(
            model_name="analysisjob",
            index=models.Index(fields=["created_by"], name="ai_analysis_created_idx"),
        ),
        migrations.AddIndex(
            model_name="analysisjob",
            index=models.Index(fields=["status"], name="ai_analysis_status_idx"),
        ),
    ]
