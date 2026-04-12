"""
Unified AI Service for CompliAI Chart
──────────────────────────────────────
Routes to the correct AI backend depending on APP_ENV:
  • Dev  → Mistral AI  (open-mistral-nemo)  – cost-free / low-cost
  • Prod → OpenAI GPT-4o (full analysis) / GPT-4o-mini (lightweight) – high accuracy

Usage:
    from ai.services.unified_ai_service import get_unified_ai_service
    svc = get_unified_ai_service()
    report_markdown = svc.analyze_documents(documents, patient_info)
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Load system prompt once ────────────────────────────────────────────────────
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "hospice_compliance_prompt.txt"
try:
    _SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")
except Exception as exc:
    logger.warning(f"Could not load prompt file: {exc}")
    _SYSTEM_PROMPT = (
        "You are a hospice compliance auditor. "
        "Analyze the provided documents and flag all red flags per CMS hospice CoPs."
    )

# ── OpenAI file-size hard limit ────────────────────────────────────────────────
OPENAI_FILE_SIZE_LIMIT_MB = float(os.getenv("OPENAI_FILE_SIZE_LIMIT_MB", "20"))


# ── Helper: build user message ─────────────────────────────────────────────────
def _build_user_message(documents: List[Dict], patient_info: Dict) -> str:
    patient_name = (
        f"{patient_info.get('first_name', '')} {patient_info.get('last_name', '')}".strip()
        or patient_info.get("patient_id", "Unknown")
    )

    doc_sections = []
    for i, doc in enumerate(documents, 1):
        doc_sections.append(
            f"### Document {i}: {doc.get('filename', f'Document {i}')}\n"
            f"**Type:** {doc.get('document_type_display') or doc.get('document_type', 'Unknown')}\n\n"
            f"**Extracted Content:**\n\n{doc.get('extracted_text', '[No text extracted]')}"
        )

    documents_text = "\n\n---\n\n".join(doc_sections)

    return (
        f"Please perform a full compliance audit on the following patient documents.\n\n"
        f"**Patient:** {patient_name}\n"
        f"**Total Documents:** {len(documents)}\n\n"
        f"---\n\n"
        f"{documents_text}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Mistral backend (Dev)
# ═══════════════════════════════════════════════════════════════════════════════
class _MistralBackend:
    def __init__(self):
        from mistralai import Mistral
        api_key = os.getenv("MISTRAL_AI_KEY")
        if not api_key:
            raise ValueError("MISTRAL_AI_KEY not set")
        self.model = os.getenv("MISTRAL_MODEL", "open-mistral-nemo")
        self.client = Mistral(api_key=api_key)
        logger.info(f"[Dev] Mistral backend initialised – model: {self.model}")

    def analyze_documents(self, documents: List[Dict], patient_info: Dict) -> str:
        user_message = _build_user_message(documents, patient_info)
        response = self.client.chat.complete(
            model=self.model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=8192,
            temperature=0.1,
        )
        content = response.choices[0].message.content
        logger.info(
            f"[Dev/Mistral] Analysis complete – patient {patient_info.get('patient_id')} "
            f"– {len(documents)} docs"
        )
        return content

    @property
    def model_name(self) -> str:
        return self.model


# ═══════════════════════════════════════════════════════════════════════════════
# OpenAI backend (Prod)
# ═══════════════════════════════════════════════════════════════════════════════
class _OpenAIBackend:
    """
    Uses GPT-4o for full-chart compliance analysis (high accuracy).
    Uses GPT-4o-mini only when the document text is small enough that
    full-power analysis would be wasteful (< 5 000 chars total).
    """

    def __init__(self):
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        self._primary_model = os.getenv("OPENAI_MODEL", "gpt-4o")
        self._mini_model = os.getenv("OPENAI_MINI_MODEL", "gpt-4o-mini")
        self._max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "16000"))
        self._temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.1"))
        self.client = OpenAI(api_key=api_key)
        logger.info(
            f"[Prod] OpenAI backend initialised – "
            f"primary: {self._primary_model}, mini: {self._mini_model}"
        )

    def _pick_model(self, total_chars: int) -> str:
        """
        Cost optimisation:
         • < 5 000 chars  → gpt-4o-mini  (lightweight, cheap)
         • ≥ 5 000 chars  → gpt-4o       (full power for large clinical charts)
        The 20 MB OpenAI file-size API limit does NOT apply here because
        we send extracted text, not raw files.
        """
        return self._mini_model if total_chars < 5_000 else self._primary_model

    def analyze_documents(self, documents: List[Dict], patient_info: Dict) -> str:
        user_message = _build_user_message(documents, patient_info)
        model = self._pick_model(len(user_message))
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=self._max_tokens,
            temperature=self._temperature,
        )
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if response.usage else "?"
        logger.info(
            f"[Prod/OpenAI] Analysis complete – patient {patient_info.get('patient_id')} "
            f"– {len(documents)} docs – model: {model} – tokens: {tokens_used}"
        )
        return content

    @property
    def model_name(self) -> str:
        return self._primary_model


# ═══════════════════════════════════════════════════════════════════════════════
# Google backend (Prod / Gemini)
# ═══════════════════════════════════════════════════════════════════════════════
class _GoogleBackend:
    """
    Uses Google Gemini (e.g., Gemini 2.0 Pro) for clinical analysis.
    """

    def __init__(self):
        import google.generativeai as genai

        api_key = os.getenv("GOOGLE_API_KEY", "").strip().strip('"')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not set")
        
        genai.configure(api_key=api_key)
        
        # Model mapping for human-friendly names in .env
        raw_model = os.getenv("GOOGLE_MODEL", "gemini-2.0-pro").strip()
        if "Gemini 2.0 Pro" in raw_model:
            self._model_id = "gemini-2.0-pro-exp-02-05"
        else:
            self._model_id = raw_model
            
        self.model = genai.GenerativeModel(
            model_name=self._model_id,
            system_instruction=_SYSTEM_PROMPT
        )
        logger.info(f"[Prod] Google backend initialised – model: {self._model_id}")

    def analyze_documents(self, documents: List[Dict], patient_info: Dict) -> str:
        user_message = _build_user_message(documents, patient_info)
        response = self.model.generate_content(
            user_message,
            generation_config= {
                "temperature": 0.1,
                "max_output_tokens": 8192,
            }
        )
        
        content = response.text
        logger.info(
            f"[Prod/Google] Analysis complete – patient {patient_info.get('patient_id')} "
            f"– {len(documents)} docs – model: {self._model_id}"
        )
        return content

    @property
    def model_name(self) -> str:
        return self._model_id


# ═══════════════════════════════════════════════════════════════════════════════
# Unified service facade
# ═══════════════════════════════════════════════════════════════════════════════
class UnifiedAIService:
    """
    Facade that delegates to the correct backend based on APP_ENV.
    If APP_ENV == 'Prod'  → OpenAI GPT-4o / GPT-4o-mini
    Otherwise (default)  → Mistral open-mistral-nemo
    """

    def __init__(self):
        app_env = os.getenv("APP_ENV", "Dev").strip().lower()
        self.is_prod = app_env == "prod"

        if self.is_prod:
            use_model = os.getenv("USE_MODEL", "OpenAI").strip().lower()
            if use_model == "google":
                self._backend = _GoogleBackend()
                logger.info("UnifiedAIService: PRODUCTION mode – using Google Gemini")
            else:
                self._backend = _OpenAIBackend()
                logger.info("UnifiedAIService: PRODUCTION mode – using OpenAI")
        else:
            self._backend = _MistralBackend()
            logger.info("UnifiedAIService: DEVELOPMENT mode – using Mistral AI")

    def analyze_documents(
        self,
        documents: List[Dict],
        patient_info: Dict,
    ) -> str:
        """
        Analyze patient documents and return a Markdown compliance report.

        Args:
            documents: list of dicts with keys: filename, document_type,
                       document_type_display, extracted_text
            patient_info: dict with first_name, last_name, patient_id

        Returns:
            Markdown string with the full compliance audit report
        """
        # Validate file sizes for OpenAI (hard API limit: 20 MB per call)
        if self.is_prod:
            for doc in documents:
                size_mb = doc.get("file_size_mb", 0)
                if size_mb and size_mb > OPENAI_FILE_SIZE_LIMIT_MB:
                    raise ValueError(
                        f"Document '{doc.get('filename', 'unknown')}' is "
                        f"{size_mb:.1f} MB which exceeds the OpenAI "
                        f"{OPENAI_FILE_SIZE_LIMIT_MB:.0f} MB limit. "
                        f"Please upload a smaller file or split the document."
                    )

        try:
            return self._backend.analyze_documents(documents, patient_info)
        except Exception as exc:
            logger.error(f"AI analysis failed: {exc}")
            raise RuntimeError(f"AI analysis failed: {exc}") from exc

    @property
    def model_name(self) -> str:
        return self._backend.model_name

    @property
    def environment(self) -> str:
        return "Prod" if self.is_prod else "Dev"


# ── Singleton ─────────────────────────────────────────────────────────────────
_unified_service: Optional["UnifiedAIService"] = None


def get_unified_ai_service() -> UnifiedAIService:
    """Return the shared UnifiedAIService instance (lazy init)."""
    global _unified_service
    if _unified_service is None:
        _unified_service = UnifiedAIService()
    return _unified_service


def reset_unified_ai_service():
    """Reset the singleton (useful for testing environment switches)."""
    global _unified_service
    _unified_service = None
