import os
import json
import logging
import time
from collections.abc import Callable
from typing import List, Dict, Any, Optional

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from ai.prompts.system_prompts import COMPLIANCE_AUDITOR_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

class LangChainComplianceService:
    """
    Refactored AI service using LangChain to support multiple providers (OpenAI, Google)
    and centralized prompt management.
    
    Both OpenAI (GPT-4o) and Google (Gemini) have built-in web search/knowledge capabilities.
    The system prompt instructs the AI to use its training knowledge of CMS, CHAP, and HHSC
    regulations, and can search for current regulatory information when needed.
    """

    def __init__(self):
        # Support both AI_PROVIDER and USE_MODEL for backward compatibility
        self.provider = (os.getenv("AI_PROVIDER") or os.getenv("USE_MODEL", "openai")).lower()
        self.temperature = float(os.getenv("GOOGLE_TEMPERATURE" if self.provider == "google" else "OPENAI_TEMPERATURE", "0.1"))
        
        # Increase default to 32k. Note: OpenAI gpt-4o-2024-08-06 supports up to 16,384 output tokens.
        # However, Gemini supports much more. We'll set a higher default and cap it for OpenAI specifically.
        self.max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "100000"))

        self.model = self._setup_model()
        logger.info(f"LangChainComplianceService initialized with provider: {self.provider} | Max Tokens: {self.max_tokens}")

    def _setup_model(self):
        """Initialize the appropriate LangChain chat model based on environment config."""
        if self.provider == "google":
            api_key = os.getenv("GOOGLE_API_KEY")
            model_name = os.getenv("GOOGLE_MODEL", "gemini-2.0-pro-exp-02-05")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY is not set in .env")
            
            logger.info(f"Setting up Google Gemini model: {model_name}")
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                temperature=self.temperature,
                max_output_tokens=self.max_tokens, # Use the increased limit
            )
        else:
            api_key = os.getenv("OPENAI_API_KEY")
            model_name = os.getenv("OPENAI_MODEL", "gpt-5.4")
            if not api_key:
                raise ValueError("OPENAI_API_KEY is not set in .env")
            
            # OpenAI gpt-4o currently caps output at 4k or 16k depending on version.
            # We cap our request to 16k to avoid "limit too high" errors while maximizing output.
            openai_limit = min(self.max_tokens, 16384)
            
            logger.info(f"Setting up OpenAI model: {model_name} with max_tokens: {openai_limit}")
            return ChatOpenAI(
                model=model_name,
                api_key=api_key,
                temperature=self.temperature,
                max_tokens=openai_limit,
                model_kwargs={"response_format": {"type": "json_object"}}
            )

    def _openai_chat_for_model(self, model_name: str) -> ChatOpenAI:
        """Build a ChatOpenAI instance for a single request (avoids mutating the singleton)."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set in .env")
        openai_limit = min(self.max_tokens, 16384)
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=self.temperature,
            max_tokens=openai_limit,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

    def analyze_documents(
        self,
        documents: List[Dict[str, Any]],
        patient_info: Optional[Dict[str, Any]] = None,
        openai_model: Optional[str] = None,
        progress_callback: Optional[Callable[[int], None]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for clinical document review.
        Reads all documents, constructs the prompt, and returns structured findings.
        
        The AI model (GPT-4o or Gemini) uses its built-in knowledge of CMS, CHAP, and HHSC
        regulations to analyze documents against all 63 red flag checks defined in the
        system prompt.
        """
        patient_name = f"{patient_info.get('first_name', '')} {patient_info.get('last_name', '')}".strip() or "Unknown"
        logger.info(f"Starting AI Analysis for Patient: {patient_name} | Documents: {len(documents)}")

        if not documents:
            logger.warning("No documents provided for analysis. Aborting.")
            return self._create_error_response("No documents provided for analysis")

        # 1. Prepare clinical data context
        logger.info("Step 1/4: Preparing document context for AI...")
        user_content = self._prepare_user_content(documents, patient_info)
        logger.info(f"Context preparation complete. Total characters: {len(user_content)}")
        if progress_callback:
            progress_callback(25)

        # 2. Construct messages (system prompt includes all 63 red flag checks)
        logger.info("Step 2/4: Constructing message payload...")
        from ..models import PromptTemplate
        
        system_content = COMPLIANCE_AUDITOR_SYSTEM_PROMPT
        try:
            template = PromptTemplate.objects.filter(identifier='compliance_auditor', is_active=True).first()
            if template and template.prompt_text.strip():
                system_content = template.prompt_text
        except Exception as e:
            logger.error(f"Error fetching PromptTemplate: {e}")

        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=user_content)
        ]

        try:
            # 3. Call AI Model (per-run OpenAI model when provider is openai)
            if self.provider == "google":
                invoke_model = self.model
                active_model = getattr(
                    self.model, "model", getattr(self.model, "model_name", "unknown")
                )
            else:
                resolved_name = (openai_model or os.getenv("OPENAI_MODEL", "gpt-5.4")).strip()
                invoke_model = self._openai_chat_for_model(resolved_name)
                active_model = resolved_name

            logger.info(f"Step 3/4: Invoking AI model ({self.provider}: {active_model})...")
            if progress_callback:
                progress_callback(55)
            start_time = time.time()

            response = invoke_model.invoke(messages)

            duration = time.time() - start_time
            logger.info(f"AI response received in {duration:.2f}s")

            # 4. Parse JSON response
            logger.info("Step 4/4: Parsing AI response...")
            if progress_callback:
                progress_callback(75)
            content = response.content
            # Strip markdown code blocks if present
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            elif content.startswith("```"):
                content = content.replace("```", "").strip()

            result = json.loads(content)

            # Add metadata about the run
            if "metadata" not in result:
                result["metadata"] = {}
            result["metadata"].update({
                "provider": self.provider,
                "model": active_model,
                "total_docs": len(documents),
            })
            if progress_callback:
                progress_callback(85)

            risk = result.get('audit_summary', {}).get('risk_level', 'Unknown')
            findings_count = len(result.get('findings', []))
            logger.info(f"Analysis Complete. Risk: {risk} | Findings: {findings_count}")

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {str(e)}")
            logger.debug(f"Raw response: {response.content}")
            return self._create_error_response("AI returned invalid JSON", str(e))
        except Exception as e:
            logger.error(f"Critical error during AI document analysis: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            return self._create_error_response("AI service error", str(e))

    def _prepare_user_content(self, documents: List[Dict[str, Any]], patient_info: Optional[Dict[str, Any]]) -> str:
        """Formats the documents and patient info into a single user message string."""
        patient_str = f"Patient Info: {json.dumps(patient_info)}" if patient_info else "Patient Info: Not Provided"
        
        doc_contents = []
        for i, doc in enumerate(documents, 1):
            filename = doc.get('filename', f'Document_{i}')
            doc_type = doc.get('document_type_display') or doc.get('document_type', 'Unknown')
            text = doc.get('extracted_text') or doc.get('content', '')
            
            # Truncate text if it's too long for a single document to avoid context overflow
            # We assume a reasonable limit per doc as we consolidate multiple docs
            truncated_text = text[:30000] if text else "[No text available]"
            
            doc_contents.append(f"--- DOCUMENT {i}: {filename} ({doc_type}) ---\n{truncated_text}\n")
            
        return f"{patient_str}\n\nTotal Documents: {len(documents)}\n\n" + "\n".join(doc_contents)

    def _create_error_response(self, error_type: str, details: str = "") -> Dict[str, Any]:
        """Standardized error response matching the required UI format."""
        return {
            "audit_summary": {
                "overall_compliance_score": 0,
                "risk_level": "CRITICAL",
                "summary_text": f"Error during analysis: {error_type}"
            },
            "findings": [],
            "red_flags": [
                {
                    "flag_type": "SYSTEM_ERROR",
                    "description": f"{error_type}: {details}",
                    "priority": "IMMEDIATE"
                }
            ],
            "recommendations": [{"priority": 1, "text": "Contact support or retry analysis"}],
            "metadata": {"error": True, "details": details}
        }

# Singleton Instance
_service = None

def get_compliance_service() -> LangChainComplianceService:
    global _service
    if _service is None:
        _service = LangChainComplianceService()
    return _service
