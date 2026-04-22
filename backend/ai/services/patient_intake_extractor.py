import json
import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)


_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def _clean_space(value: str) -> str:
    return re.sub(r"\\s+", " ", (value or "").strip())


def _split_full_name(full_name: str) -> Tuple[str, str]:
    """
    Split a full name into (first_name, last_name).
    Handles middle names/initials and common suffixes by keeping them with last name.
    """
    name = _clean_space(full_name)
    if not name:
        return "", ""

    tokens = [t for t in re.split(r"[\\s,]+", name) if t]
    if len(tokens) == 1:
        return tokens[0], ""

    last_tokens = []
    if tokens[-1].strip(".").lower() in _SUFFIXES:
        last_tokens.insert(0, tokens[-1])
        tokens = tokens[:-1]

    if len(tokens) == 1:
        return tokens[0], _clean_space(" ".join(last_tokens))

    first = tokens[0]
    last = " ".join(tokens[1:] + last_tokens)
    return _clean_space(first), _clean_space(last)


def _normalize_gender(raw: Optional[str]) -> str:
    v = _clean_space(raw or "").lower()
    if not v:
        return ""
    if v in {"m", "male", "man"}:
        return "Male"
    if v in {"f", "female", "woman"}:
        return "Female"
    if "prefer" in v and "not" in v:
        return "Prefer not to say"
    if v in {"other", "nonbinary", "non-binary", "nb"}:
        return "Other"
    return ""


def _parse_dob_to_mmddyyyy(raw: Optional[str]) -> str:
    v = _clean_space(raw or "")
    if not v:
        return ""

    candidates = [
        "%m/%d/%Y",
        "%m-%d-%Y",
        "%Y-%m-%d",
        "%m/%d/%y",
        "%m-%d-%y",
    ]
    for fmt in candidates:
        try:
            dt = datetime.strptime(v, fmt)
            return dt.strftime("%m/%d/%Y")
        except ValueError:
            continue
    return ""


@dataclass(frozen=True)
class PatientExtractionResult:
    status: str  # ok | ambiguous | insufficient_data
    patient: Dict[str, Any]
    candidates: List[Dict[str, Any]]
    warnings: List[str]


class PatientIntakeExtractor:
    def __init__(self, model_name: str = "gpt-5.4-mini") -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set in .env")
        self.model_name = model_name
        self.llm = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=0.1,
            max_tokens=2048,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

    def extract(self, chart_text: str) -> PatientExtractionResult:
        system = SystemMessage(
            content=(
                "You extract patient demographics from clinical chart text. "
                "Return ONLY valid JSON (no markdown). "
                "If multiple names/DOBs appear, set status='ambiguous' and provide candidates. "
                "If name or DOB cannot be found at all, set status='insufficient_data'. "
                "DOB must be returned as mm/dd/yyyy when possible."
            )
        )
        user = HumanMessage(
            content=(
                "Extract these fields if present: first_name, last_name, patient_name (optional), "
                "date_of_birth, gender, phone, email, address, city, state, zip_code. "
                "Gender must be one of: Male, Female, Other, Prefer not to say, or empty string if unknown. "
                "If only a single patient_name is present, include it. "
                "Output schema:\\n"
                "{\\n"
                "  'status': 'ok' | 'ambiguous' | 'insufficient_data',\\n"
                "  'patient': { ...fields... },\\n"
                "  'candidates': [ { ...fields..., 'confidence': 0-1 } ],\\n"
                "  'warnings': [string]\\n"
                "}\\n\\n"
                "CHART TEXT:\\n"
                f"{chart_text[:120000]}"
            )
        )
        resp = self.llm.invoke([system, user])
        content = resp.content
        if isinstance(content, str) and content.strip().startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()

        data = json.loads(content)
        status = (data.get("status") or "").strip().lower()
        if status not in {"ok", "ambiguous", "insufficient_data"}:
            status = "ok"
        patient = data.get("patient") or {}
        candidates = data.get("candidates") or []
        warnings = [str(w) for w in (data.get("warnings") or [])][:20]

        patient = self._post_process_patient(patient)
        candidates = [self._post_process_patient(c) for c in candidates][:10]

        return PatientExtractionResult(
            status=status,
            patient=patient,
            candidates=candidates,
            warnings=warnings,
        )

    def _post_process_patient(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        patient_name = _clean_space(str(raw.get("patient_name") or ""))
        first_name = _clean_space(str(raw.get("first_name") or ""))
        last_name = _clean_space(str(raw.get("last_name") or ""))

        if (not first_name or not last_name) and patient_name:
            f, l = _split_full_name(patient_name)
            first_name = first_name or f
            last_name = last_name or l

        dob = _parse_dob_to_mmddyyyy(raw.get("date_of_birth"))
        gender = _normalize_gender(raw.get("gender"))

        return {
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": dob,
            "gender": gender,
            "phone": _clean_space(str(raw.get("phone") or "")),
            "email": _clean_space(str(raw.get("email") or "")),
            "address": _clean_space(str(raw.get("address") or "")),
            "city": _clean_space(str(raw.get("city") or "")),
            "state": _clean_space(str(raw.get("state") or "")),
            "zip_code": _clean_space(str(raw.get("zip_code") or "")),
        }


_extractor: Optional[PatientIntakeExtractor] = None


def get_patient_intake_extractor(model_name: str = "gpt-5.4-mini") -> PatientIntakeExtractor:
    global _extractor
    if _extractor is None or _extractor.model_name != model_name:
        _extractor = PatientIntakeExtractor(model_name=model_name)
    return _extractor

