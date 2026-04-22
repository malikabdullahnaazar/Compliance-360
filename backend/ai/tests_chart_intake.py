from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from agencies.models import Agency
from patients.models import Patient
from ai.models import ChartIntakeJob


@override_settings(MEDIA_ROOT="test_media")
class ChartIntakeFlowTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.agency = Agency.objects.create(name="Test Agency")
        self.user = User.objects.create_user(username="u1", password="pass12345")
        self.user.agency = self.agency
        self.user.role = "agency_admin"
        self.user.save()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("ai.views.document_views.run_chart_intake_job.delay")
    def test_start_intake_rejects_non_pdf(self, delay_mock):
        f = SimpleUploadedFile("x.txt", b"hello", content_type="text/plain")
        res = self.client.post("/api/ai/documents/chart_intake/start/", {"file": f}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Only PDF", res.data.get("error", ""))
        delay_mock.assert_not_called()

    def test_status_requires_job(self):
        res = self.client.get("/api/ai/documents/chart_intake/00000000-0000-0000-0000-000000000000/status/")
        self.assertEqual(res.status_code, 404)

    def test_create_patient_and_attach_duplicate_exact_returns_409(self):
        existing = Patient.objects.create(
            first_name="John",
            last_name="Doe",
            date_of_birth=date(1990, 1, 1),
            gender="Male",
            created_by=self.user,
            agency=self.agency,
        )
        job = ChartIntakeJob.objects.create(
            created_by=self.user,
            agency=self.agency,
            status=ChartIntakeJob.STATUS_COMPLETED,
            filename="chart.pdf",
            file_path="",
            extracted_text="x",
            extracted_patient={"first_name": "John", "last_name": "Doe", "date_of_birth": "01/01/1990", "gender": "Male"},
        )
        res = self.client.post(
            f"/api/ai/documents/chart_intake/{job.id}/create_patient_and_attach/",
            {"first_name": "john", "last_name": "doe", "date_of_birth": "01/01/1990", "gender": "Male"},
            format="json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data.get("error"), "duplicate_exact")
        self.assertEqual(res.data.get("existing_patient", {}).get("id"), str(existing.id))

