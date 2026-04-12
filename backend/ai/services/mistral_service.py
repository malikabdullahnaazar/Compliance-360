"""
Mistral AI Service for CompliAI Chart
──────────────────────────────────────
DEPRECATED: This module is kept for backward compatibility.
New code should use unified_ai_service.get_unified_ai_service() instead,
which automatically picks Dev (Mistral) or Prod (OpenAI) based on APP_ENV.

If you call get_mistral_service() directly it still works by delegating
to the UnifiedAIService so the behaviour is consistent.
"""

import os
import logging
from typing import List, Dict

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class MistralComplianceService:
    """
    Backward-compatible facade.
    Internally delegates to UnifiedAIService.
    """

    def __init__(self):
        from .unified_ai_service import get_unified_ai_service
        self._svc = get_unified_ai_service()
        logger.info(
            f"MistralComplianceService → delegating to UnifiedAIService "
            f"(env={self._svc.environment}, model={self._svc.model_name})"
        )

    @property
    def model(self) -> str:
        return self._svc.model_name

    def analyze_documents(self, documents: List[Dict], patient_info: Dict) -> str:
        """
        Analyze a list of patient documents and return a Markdown compliance report.

        Args:
            documents: list of dicts with keys: filename, document_type,
                       document_type_display, extracted_text
            patient_info: dict with patient name, id, etc.

        Returns:
            Markdown string with the full compliance audit report
        """
        return self._svc.analyze_documents(documents=documents, patient_info=patient_info)


# ── module-level singleton ─────────────────────────────────────────────────────
_mistral_service: MistralComplianceService | None = None


def get_mistral_service() -> MistralComplianceService:
    """Return the shared MistralComplianceService instance (lazy init)."""
    global _mistral_service
    if _mistral_service is None:
        _mistral_service = MistralComplianceService()
    return _mistral_service
