from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0003_analysis_job"),
        ("agencies", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ChartIntakeJob",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("celery_task_id", models.CharField(blank=True, db_index=True, max_length=255)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="chart_intake_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "agency",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="chart_intake_jobs",
                        to="agencies.agency",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("running", "Running"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("error_message", models.TextField(blank=True)),
                ("filename", models.CharField(blank=True, max_length=255)),
                ("file_path", models.CharField(blank=True, max_length=500)),
                ("file_size_mb", models.FloatField(blank=True, null=True)),
                ("total_pages", models.IntegerField(blank=True, null=True)),
                ("extraction_method", models.CharField(default="text", max_length=20)),
                ("extracted_text", models.TextField(blank=True)),
                ("extracted_patient", models.JSONField(blank=True, help_text="Structured extracted patient payload for review modal.", null=True)),
                (
                    "ambiguous_candidates",
                    models.JSONField(
                        blank=True,
                        help_text="When ambiguous, array of possible extracted patients.",
                        null=True,
                    ),
                ),
                ("openai_model", models.CharField(default="gpt-5.4-mini", max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="chartintakejob",
            index=models.Index(fields=["agency"], name="ai_chartint_agency_i_6f472a_idx"),
        ),
        migrations.AddIndex(
            model_name="chartintakejob",
            index=models.Index(fields=["created_by"], name="ai_chartint_created__5d7c69_idx"),
        ),
        migrations.AddIndex(
            model_name="chartintakejob",
            index=models.Index(fields=["status"], name="ai_chartint_status_9a6f55_idx"),
        ),
        migrations.AddIndex(
            model_name="chartintakejob",
            index=models.Index(fields=["created_at"], name="ai_chartint_created__f08845_idx"),
        ),
    ]

