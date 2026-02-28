"""
Mistral AI Service for Compliance 360
Analyzes patient documents using Mistral open-mistral-nemo and returns a Markdown compliance report.
"""

import os
import logging
from pathlib import Path
from mistralai import Mistral
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Load the system prompt once at module level
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "hospice_compliance_prompt.txt"
try:
    _SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")
except Exception as e:
    logger.warning(f"Could not load prompt file: {e}")
    _SYSTEM_PROMPT = "You are a hospice compliance auditor. Analyze the provided documents and flag red flags."


class MistralComplianceService:
    """
    Mistral AI-powered compliance auditor.
    Reads patient document extracted text and returns a structured Markdown audit report.
    """

    def __init__(self):
        self.api_key = os.getenv("MISTRAL_AI_KEY")
        self.model = os.getenv("MISTRAL_MODEL", "open-mistral-nemo")
        self.max_tokens = 8192

        if not self.api_key:
            raise ValueError("MISTRAL_AI_KEY not set in environment variables")

        self.client = Mistral(api_key=self.api_key)
        logger.info(f"MistralComplianceService initialised – model: {self.model}")

    def analyze_documents(self, documents: list, patient_info: dict) -> str:
        """
        Analyze a list of patient documents and return a Markdown compliance report.

        Args:
            documents: list of dicts with keys: filename, document_type, extracted_text
            patient_info: dict with patient name, id, etc.

        Returns:
            Markdown string with the full compliance audit report
        """
        patient_name = (
            f"{patient_info.get('first_name', '')} {patient_info.get('last_name', '')}".strip()
            or patient_info.get("patient_id", "Unknown")
        )

        # Build the user message
        doc_sections = []
        for i, doc in enumerate(documents, 1):
            doc_sections.append(
                f"### Document {i}: {doc.get('filename', f'Document {i}')}\n"
                f"**Type:** {doc.get('document_type_display') or doc.get('document_type', 'Unknown')}\n\n"
                f"**Extracted Content:**\n\n{doc.get('extracted_text', '[No text extracted]')}"
            )

        documents_text = "\n\n---\n\n".join(doc_sections)

        user_message = (
            f"Please perform a full compliance audit on the following patient documents.\n\n"
            f"**Patient:** {patient_name}\n"
            f"**Total Documents:** {len(documents)}\n\n"
            f"---\n\n"
            f"{documents_text}"
        )

        try:
            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=self.max_tokens,
                temperature=0.1,
            )
            result = response.choices[0].message.content
            logger.info(
                f"Mistral analysis complete for patient {patient_info.get('patient_id')} "
                f"– {len(documents)} docs"
            )
            return result

        except Exception as exc:
            logger.error(f"Mistral API error: {exc}")
            raise RuntimeError(f"AI analysis failed: {exc}") from exc


# ── module-level singleton ──────────────────────────────────────────────────

_mistral_service: MistralComplianceService | None = None


def get_mistral_service() -> MistralComplianceService:
    """Return the shared MistralComplianceService instance (lazy init)."""
    global _mistral_service
    if _mistral_service is None:
        _mistral_service = MistralComplianceService()
    return _mistral_service
