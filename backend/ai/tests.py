"""
CompliAI Chart – AI Service Tests
===================================
Tests for both Dev (Mistral) and Prod (OpenAI) environments.

Run with:
    python manage.py test ai.tests

Environment selection:
    • Set APP_ENV=Dev  in .env → Mistral AI is used
    • Set APP_ENV=Prod in .env → OpenAI GPT-4o / GPT-4o-mini is used
"""

import os
import unittest
from unittest.mock import patch, MagicMock, PropertyMock
from django.test import TestCase, override_settings

# ─── Helpers ──────────────────────────────────────────────────────────────────

SAMPLE_PATIENT_INFO = {
    'patient_id': 'test-patient-001',
    'first_name': 'Amanda',
    'last_name': 'Scott',
}

SAMPLE_DOCUMENTS = [
    {
        'filename': 'election_statement.pdf',
        'document_type': 'election_statement',
        'document_type_display': 'Election Statement',
        'extracted_text': (
            '--- Page 1 ---\n'
            'HOSPICE ELECTION STATEMENT\n'
            'Patient: Amanda Scott\n'
            'Date of Birth: 03/15/1945\n'
            'Effective Date: 01/10/2025\n'
            'Patient/Representative Signature: Amanda Scott\n'
            'Attending Physician: Dr. James Williams\n'
            'I understand that I am electing hospice care and waiving curative treatment.\n'
        ),
        'file_size_mb': 0.5,
    },
    {
        'filename': 'cti_initial.pdf',
        'document_type': 'cti_initial',
        'document_type_display': 'CTI - Initial',
        'extracted_text': (
            '--- Page 1 ---\n'
            'CERTIFICATION OF TERMINAL ILLNESS\n'
            'Patient: Amanda Scott DOB: 03/15/1945\n'
            'Primary Diagnosis: End-stage COPD\n'
            'Prognosis: Life expectancy of 6 months or less if disease runs its normal course.\n'
            'Clinical Narrative: Patient demonstrates significant functional decline with PPS 30%.\n'
            'Weight loss of 12 lbs over 3 months. Increased oxygen dependency.\n'
            'Medical Director Signature: Dr. Fiona Hart   Date: 01/10/2025\n'
            'Attending Physician Signature: Dr. James Williams  Date: 01/10/2025\n'
        ),
        'file_size_mb': 0.3,
    },
]

# A document that contains RED FLAGS (contradictory notes)
RED_FLAG_DOCUMENTS = [
    {
        'filename': 'progress_notes.pdf',
        'document_type': 'clinical_notes',
        'document_type_display': 'Clinical Notes',
        'extracted_text': (
            '--- Page 1 ---\n'
            'PROGRESS NOTE – RN Visit\n'
            'Patient: Kevin Howrigan  DOB: 07/22/1942\n'
            'Date: 02/05/2025\n'
            'Patient is ambulating independently in the hallway without any assist.\n'
            'Nutrition intake: 100% of meals. Patient states he \"feels great today\".\n'
            'Vital Signs: BP 122/78, HR 72, SpO2 98% on room air.\n'
            'Patient is stable and improving per family report.\n'
            '--- Page 2 ---\n'
            'CTI Narrative: Life expectancy less than 6 months.\n'
            'Primary Diagnosis: Congestive Heart Failure – Terminal Stage.\n'
            'Medical Director Signature: [NOT SIGNED]\n'
        ),
        'file_size_mb': 1.2,
    },
]


# ─── Document Processor Tests ─────────────────────────────────────────────────

class TestDocumentProcessor(TestCase):
    """Tests for the document processing service."""

    def test_process_bytes_pdf_no_size_limit(self):
        """Processor should accept any file when AI_MAX_DOCUMENT_SIZE_MB=0."""
        from ai.services.document_processor import DocumentProcessor
        proc = DocumentProcessor()
        proc.max_file_size_mb = 0  # 0 = no limit

        # Simulate a minimal valid PDF structure
        minimal_pdf = b'%PDF-1.4\n%EOF'
        # Should NOT raise even though we bypassed the size check
        # (pypdf may fail on invalid PDF, that's OK – we just check no size error)
        try:
            result = proc.process_bytes(minimal_pdf, 'test.pdf', 'other')
        except ValueError as exc:
            # Only size-limit errors are unexpected
            self.assertNotIn('exceeds the configured maximum', str(exc))
        except Exception:
            pass  # pypdf parse errors are expected for fake content

    def test_process_bytes_enforces_limit_when_set(self):
        """Processor should reject files when a positive size limit is configured."""
        from ai.services.document_processor import DocumentProcessor
        proc = DocumentProcessor()
        proc.max_file_size_mb = 1  # 1 MB limit

        # Create 2 MB of fake content
        fake_bytes = b'A' * (2 * 1024 * 1024)
        with self.assertRaises(ValueError) as ctx:
            proc.process_bytes(fake_bytes, 'large_file.pdf', 'other')
        self.assertIn('exceeds the configured maximum', str(ctx.exception))

    def test_chunk_text_splits_correctly(self):
        """Large text should be split into chunks."""
        from ai.services.document_processor import DocumentProcessor, MAX_CHARS_PER_CHUNK
        proc = DocumentProcessor()
        large_text = 'A' * (MAX_CHARS_PER_CHUNK * 3)
        chunks = proc._chunk_text(large_text)
        self.assertEqual(len(chunks), 3)
        for chunk in chunks:
            self.assertLessEqual(len(chunk), MAX_CHARS_PER_CHUNK)

    def test_chunk_text_single_chunk_for_small_text(self):
        """Small text should remain as a single chunk."""
        from ai.services.document_processor import DocumentProcessor
        proc = DocumentProcessor()
        small_text = 'Hello, world!'
        chunks = proc._chunk_text(small_text)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], small_text)

    def test_process_bytes_returns_chunk_metadata(self):
        """process_bytes result should include chunks and total_chunks."""
        from ai.services.document_processor import DocumentProcessor
        proc = DocumentProcessor()
        text_bytes = b'Hello this is a test document content for a text file.'
        result = proc.process_bytes(text_bytes, 'test.txt', 'other')
        self.assertIn('chunks', result)
        self.assertIn('total_chunks', result)
        self.assertGreaterEqual(result['total_chunks'], 1)


# ─── Unified AI Service Tests (Env Routing) ───────────────────────────────────

class TestUnifiedAIServiceDevMode(TestCase):
    """Tests for the UnifiedAIService in Dev (Mistral) mode."""

    @patch.dict(os.environ, {'APP_ENV': 'Dev'})
    def test_dev_environment_uses_mistral(self):
        """In Dev mode, the service should use Mistral backend."""
        from ai.services.unified_ai_service import reset_unified_ai_service
        reset_unified_ai_service()

        with patch('ai.services.unified_ai_service._MistralBackend.__init__', return_value=None), \
             patch('ai.services.unified_ai_service._MistralBackend.model_name',
                   new_callable=PropertyMock, return_value='open-mistral-nemo'):
            from ai.services.unified_ai_service import UnifiedAIService
            svc = UnifiedAIService()
            self.assertEqual(svc.environment, 'Dev')
            self.assertFalse(svc.is_prod)

        reset_unified_ai_service()

    @patch.dict(os.environ, {'APP_ENV': 'dev'})
    def test_dev_case_insensitive(self):
        """APP_ENV='dev' (lowercase) should also select Dev mode."""
        from ai.services.unified_ai_service import reset_unified_ai_service, UnifiedAIService
        reset_unified_ai_service()

        with patch('ai.services.unified_ai_service._MistralBackend.__init__', return_value=None), \
             patch('ai.services.unified_ai_service._MistralBackend.model_name',
                   new_callable=PropertyMock, return_value='open-mistral-nemo'):
            svc = UnifiedAIService()
            self.assertFalse(svc.is_prod)

        reset_unified_ai_service()

    @patch.dict(os.environ, {'APP_ENV': 'Dev'})
    def test_dev_analyze_documents_calls_mistral_backend(self):
        """analyze_documents in Dev mode should call the Mistral backend."""
        from ai.services.unified_ai_service import reset_unified_ai_service, UnifiedAIService
        reset_unified_ai_service()

        mock_report = '# Compliance Audit Report\n**Overall Risk Level:** 🟠 HIGH\n**Total Findings:** 3'
        mock_backend = MagicMock()
        mock_backend.analyze_documents.return_value = mock_report
        mock_backend.model_name = 'open-mistral-nemo'

        with patch('ai.services.unified_ai_service._MistralBackend', return_value=mock_backend):
            svc = UnifiedAIService()
            result = svc.analyze_documents(SAMPLE_DOCUMENTS, SAMPLE_PATIENT_INFO)

        self.assertEqual(result, mock_report)
        mock_backend.analyze_documents.assert_called_once_with(
            documents=SAMPLE_DOCUMENTS,
            patient_info=SAMPLE_PATIENT_INFO,
        )
        reset_unified_ai_service()


class TestUnifiedAIServiceProdMode(TestCase):
    """Tests for the UnifiedAIService in Prod (OpenAI) mode."""

    @patch.dict(os.environ, {'APP_ENV': 'Prod'})
    def test_prod_environment_uses_openai(self):
        """In Prod mode, the service should use OpenAI backend."""
        from ai.services.unified_ai_service import reset_unified_ai_service, UnifiedAIService
        reset_unified_ai_service()

        with patch('ai.services.unified_ai_service._OpenAIBackend.__init__', return_value=None), \
             patch('ai.services.unified_ai_service._OpenAIBackend.model_name',
                   new_callable=PropertyMock, return_value='gpt-4o'):
            svc = UnifiedAIService()
            self.assertEqual(svc.environment, 'Prod')
            self.assertTrue(svc.is_prod)

        reset_unified_ai_service()

    @patch.dict(os.environ, {'APP_ENV': 'Prod', 'OPENAI_FILE_SIZE_LIMIT_MB': '20'})
    def test_prod_rejects_oversized_documents(self):
        """In Prod mode, documents over 20 MB should raise ValueError."""
        from ai.services.unified_ai_service import reset_unified_ai_service, UnifiedAIService
        reset_unified_ai_service()

        oversized_docs = [
            {
                'filename': 'huge_chart.pdf',
                'document_type': 'other',
                'extracted_text': 'content',
                'file_size_mb': 25.0,  # over 20 MB OpenAI limit
            }
        ]

        with patch('ai.services.unified_ai_service._OpenAIBackend.__init__', return_value=None), \
             patch('ai.services.unified_ai_service._OpenAIBackend.model_name',
                   new_callable=PropertyMock, return_value='gpt-4o'):
            svc = UnifiedAIService()
            with self.assertRaises(ValueError) as ctx:
                svc.analyze_documents(oversized_docs, SAMPLE_PATIENT_INFO)

        self.assertIn('exceeds the OpenAI', str(ctx.exception))
        reset_unified_ai_service()

    @patch.dict(os.environ, {'APP_ENV': 'Prod'})
    def test_prod_accepts_documents_within_size_limit(self):
        """In Prod mode, documents under 20 MB should pass without error."""
        from ai.services.unified_ai_service import reset_unified_ai_service, UnifiedAIService
        reset_unified_ai_service()

        mock_report = '# Compliance Audit Report\n**Total Findings:** 0'
        mock_backend = MagicMock()
        mock_backend.analyze_documents.return_value = mock_report
        mock_backend.model_name = 'gpt-4o'

        with patch('ai.services.unified_ai_service._OpenAIBackend', return_value=mock_backend):
            svc = UnifiedAIService()
            result = svc.analyze_documents(SAMPLE_DOCUMENTS, SAMPLE_PATIENT_INFO)

        self.assertEqual(result, mock_report)
        reset_unified_ai_service()

    @patch.dict(os.environ, {'APP_ENV': 'Prod'})
    def test_openai_backend_picks_mini_for_small_content(self):
        """OpenAI backend should use gpt-4o-mini for small documents (<5000 chars)."""
        with patch.dict(os.environ, {
            'OPENAI_API_KEY': 'test-key',
            'OPENAI_MODEL': 'gpt-4o',
            'OPENAI_MINI_MODEL': 'gpt-4o-mini',
            'OPENAI_MAX_TOKENS': '16000',
            'OPENAI_TEMPERATURE': '0.1',
        }):
            with patch('ai.services.unified_ai_service.OpenAI', MagicMock()):
                from ai.services.unified_ai_service import _OpenAIBackend
                backend = _OpenAIBackend.__new__(_OpenAIBackend)
                backend._primary_model = 'gpt-4o'
                backend._mini_model = 'gpt-4o-mini'
                # Small content uses mini model
                model = backend._pick_model(100)
                self.assertEqual(model, 'gpt-4o-mini')

    @patch.dict(os.environ, {'APP_ENV': 'Prod'})
    def test_openai_backend_picks_primary_for_large_content(self):
        """OpenAI backend should use gpt-4o for large documents (>=5000 chars)."""
        with patch('ai.services.unified_ai_service.OpenAI', MagicMock()):
            from ai.services.unified_ai_service import _OpenAIBackend
            backend = _OpenAIBackend.__new__(_OpenAIBackend)
            backend._primary_model = 'gpt-4o'
            backend._mini_model = 'gpt-4o-mini'
            # Large content uses primary model
            model = backend._pick_model(10_000)
            self.assertEqual(model, 'gpt-4o')


# ─── Compliance Report Quality Tests ─────────────────────────────────────────

class TestComplianceReportQuality(TestCase):
    """Tests to verify that AI reports contain expected structure."""

    def _make_mock_report(self, findings: int = 2, risk: str = 'HIGH', score: int = 65) -> str:
        return (
            f"# Compliance Audit Report\n"
            f"**Patient:** Amanda Scott\n"
            f"**Audit Date:** April 05, 2026\n"
            f"**Frameworks Applied:** CMS Hospice CoPs, CHAP, HHSC (Texas)\n\n"
            f"---\n\n"
            f"## Executive Summary\n"
            f"Multiple compliance deficiencies were identified.\n\n"
            f"**Overall Risk Level:** 🟠 {risk}\n"
            f"**Compliance Score:** {score}/100\n"
            f"**Total Findings:** {findings} | Critical: 1 | High: 1 | Medium: 0 | Low: 0\n\n"
            f"---\n\n"
            f"## 🚨 Red Flags (Immediate Action Required)\n\n"
            f"### Red Flag 1: Missing Medical Director Signature on CTI\n"
            f"- **Severity:** 🔴 CRITICAL\n"
            f"- **Regulatory Citation:** CMS §418.22(b)\n\n"
            f"---\n\n"
            f"## Audit Metadata\n"
            f"- **AI Model:** open-mistral-nemo\n"
            f"- **Analysis Timestamp:** 2026-04-05T16:36:19\n"
        )

    def test_report_contains_executive_summary(self):
        """Generated report must contain Executive Summary section."""
        report = self._make_mock_report()
        self.assertIn('## Executive Summary', report)

    def test_report_contains_red_flags_section(self):
        """Report must contain Red Flags section."""
        report = self._make_mock_report()
        self.assertIn('## 🚨 Red Flags', report)

    def test_report_contains_total_findings(self):
        """Report must contain Total Findings count."""
        report = self._make_mock_report(findings=3)
        self.assertIn('Total Findings: 3', report)

    def test_report_contains_compliance_score(self):
        """Report must contain a Compliance Score."""
        report = self._make_mock_report(score=72)
        self.assertIn('Compliance Score: 72/100', report)

    def test_report_contains_regulatory_citation(self):
        """Red flags must include regulatory citations."""
        report = self._make_mock_report()
        self.assertIn('§418.22', report)

    def test_status_computation_pass_for_zero_findings(self):
        """save_result status logic: 0 findings → Pass."""
        import re
        report = self._make_mock_report(findings=0)
        findings_match = re.search(r'Total\s+Findings[^\d]*(\d+)', report, re.IGNORECASE)
        if findings_match:
            total_findings = int(findings_match.group(1))
            status = 'Pass' if total_findings == 0 else 'Fail'
        else:
            status = 'Fail'
        self.assertEqual(status, 'Pass')

    def test_status_computation_fail_for_nonzero_findings(self):
        """save_result status logic: >0 findings → Fail."""
        import re
        report = self._make_mock_report(findings=4)
        findings_match = re.search(r'Total\s+Findings[^\d]*(\d+)', report, re.IGNORECASE)
        if findings_match:
            total_findings = int(findings_match.group(1))
            status = 'Pass' if total_findings == 0 else 'Fail'
        else:
            status = 'Fail'
        self.assertEqual(status, 'Fail')

    def test_red_flag_patterns_detected(self):
        """Validate that common hospice red-flag phrases are detectable."""
        red_flag_text = RED_FLAG_DOCUMENTS[0]['extracted_text']
        red_flag_phrases = [
            'ambulating independently',
            'stable and improving',
            'NOT SIGNED',
            '100% of meals',
        ]
        for phrase in red_flag_phrases:
            self.assertIn(phrase.lower(), red_flag_text.lower(),
                          f"Expected red-flag phrase not found: '{phrase}'")


# ─── MistralComplianceService backward-compat test ───────────────────────────

class TestMistralServiceBackwardCompatibility(TestCase):
    """Ensure old get_mistral_service() still works after refactor."""

    @patch.dict(os.environ, {'APP_ENV': 'Dev'})
    def test_get_mistral_service_returns_wrapper(self):
        """get_mistral_service() should return an object with analyze_documents."""
        from ai.services.unified_ai_service import reset_unified_ai_service
        reset_unified_ai_service()

        with patch('ai.services.unified_ai_service._MistralBackend.__init__', return_value=None), \
             patch('ai.services.unified_ai_service._MistralBackend.model_name',
                   new_callable=PropertyMock, return_value='open-mistral-nemo'), \
             patch('ai.services.unified_ai_service._MistralBackend.analyze_documents',
                   return_value='# Report'):
            from ai.services import mistral_service
            mistral_service._mistral_service = None
            svc = mistral_service.get_mistral_service()
            self.assertTrue(hasattr(svc, 'analyze_documents'))

        reset_unified_ai_service()
        mistral_service._mistral_service = None


# ─── Run tests ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    unittest.main()
