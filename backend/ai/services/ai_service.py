"""
OpenAI Service for CompliAI Chart AI Auditor
Handles document analysis using GPT-4o model
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class ComplianceAIService:
    """
    Service class for AI-powered compliance auditing using OpenAI GPT-4o.
    """
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4o')
        self.max_tokens = int(os.getenv('OPENAI_MAX_TOKENS', '4000'))
        self.temperature = float(os.getenv('OPENAI_TEMPERATURE', '0.1'))
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.client = OpenAI(api_key=self.api_key)
        logger.info(f"ComplianceAIService initialized with model: {self.model}")
    
    def analyze_documents(
        self,
        documents: List[Dict[str, Any]],
        audit_type: str = "admission",
        frameworks: List[str] = None,
        patient_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze hospice clinical documents for compliance.
        
        Args:
            documents: List of document dicts with 'content', 'type', 'filename'
            audit_type: Type of audit (admission, recertification, etc.)
            frameworks: List of compliance frameworks to apply
            patient_id: Optional patient identifier
            
        Returns:
            Dict containing structured audit findings
        """
        if frameworks is None:
            frameworks = ["CMS", "CHAP"]
        
        # Import system prompt
        from .prompts.system_prompts import COMPLIANCE_AUDITOR_SYSTEM_PROMPT
        
        # Prepare document content for analysis
        documents_content = self._format_documents_for_analysis(documents)
        
        # Construct the user message
        user_message = self._construct_analysis_message(
            documents_content=documents_content,
            audit_type=audit_type,
            frameworks=frameworks,
            patient_id=patient_id
        )
        
        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": COMPLIANCE_AUDITOR_SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": user_message
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            result = json.loads(response.choices[0].message.content)
            
            # Add metadata
            result['metadata']['model_used'] = self.model
            result['metadata']['tokens_used'] = response.usage.total_tokens if response.usage else None
            
            logger.info(f"Successfully analyzed {len(documents)} documents for patient {patient_id}")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {str(e)}")
            return self._create_error_response("Failed to parse AI response", str(e))
        except Exception as e:
            logger.error(f"Error during AI analysis: {str(e)}")
            return self._create_error_response("AI analysis failed", str(e))
    
    def analyze_single_document(
        self,
        document_content: str,
        document_type: str,
        frameworks: List[str] = None,
        patient_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a single document for compliance.
        
        Args:
            document_content: Extracted text content of the document
            document_type: Type of document (e.g., 'election_statement', 'cti')
            frameworks: List of compliance frameworks
            patient_id: Optional patient identifier
            
        Returns:
            Dict containing document-specific findings
        """
        if frameworks is None:
            frameworks = ["CMS", "CHAP"]
        
        from .prompts.system_prompts import (
            COMPLIANCE_AUDITOR_SYSTEM_PROMPT,
            DOCUMENT_ANALYSIS_PROMPT
        )
        
        # Format the prompt
        prompt = DOCUMENT_ANALYSIS_PROMPT.format(
            document_type=document_type,
            patient_id=patient_id or "Unknown",
            frameworks=", ".join(frameworks),
            document_content=document_content[:15000]  # Limit content length
        )
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": COMPLIANCE_AUDITOR_SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing single document: {str(e)}")
            return self._create_error_response("Single document analysis failed", str(e))
    
    def cross_document_analysis(
        self,
        documents: List[Dict[str, Any]],
        frameworks: List[str] = None,
        patient_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform cross-document consistency analysis.
        
        Args:
            documents: List of documents to compare
            frameworks: List of compliance frameworks
            patient_id: Optional patient identifier
            
        Returns:
            Dict containing cross-document findings
        """
        if frameworks is None:
            frameworks = ["CMS", "CHAP"]
        
        from .prompts.system_prompts import (
            COMPLIANCE_AUDITOR_SYSTEM_PROMPT,
            CROSS_DOCUMENT_ANALYSIS_PROMPT
        )
        
        # Create document list summary
        document_list = "\n".join([
            f"- {doc.get('type', 'Unknown')}: {doc.get('filename', 'unnamed')}"
            for doc in documents
        ])
        
        # Format all documents
        documents_content = self._format_documents_for_analysis(documents)
        
        # Format the prompt
        prompt = CROSS_DOCUMENT_ANALYSIS_PROMPT.format(
            document_list=document_list,
            patient_id=patient_id or "Unknown",
            frameworks=", ".join(frameworks),
            documents_content=documents_content[:20000]  # Limit for token constraints
        )
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": COMPLIANCE_AUDITOR_SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            logger.error(f"Error in cross-document analysis: {str(e)}")
            return self._create_error_response("Cross-document analysis failed", str(e))
    
    def _format_documents_for_analysis(self, documents: List[Dict[str, Any]]) -> str:
        """
        Format documents for AI analysis.
        
        Args:
            documents: List of document dictionaries
            
        Returns:
            Formatted string of all documents
        """
        formatted = []
        
        for idx, doc in enumerate(documents, 1):
            doc_type = doc.get('type', 'Unknown')
            filename = doc.get('filename', f'document_{idx}')
            content = doc.get('content', '')
            
            formatted.append(f"""
=== DOCUMENT {idx} ===
Type: {doc_type}
Filename: {filename}
Content:
{content}
=== END DOCUMENT {idx} ===
""")
        
        return "\n\n".join(formatted)
    
    def _construct_analysis_message(
        self,
        documents_content: str,
        audit_type: str,
        frameworks: List[str],
        patient_id: Optional[str]
    ) -> str:
        """
        Construct the analysis message for the AI.
        
        Args:
            documents_content: Formatted document content
            audit_type: Type of audit being performed
            frameworks: List of frameworks to apply
            patient_id: Optional patient ID
            
        Returns:
            Formatted user message
        """
        return f"""
Please analyze the following hospice clinical documents for compliance audit.

AUDIT DETAILS:
- Audit Type: {audit_type.upper()}
- Patient ID: {patient_id or 'Not provided'}
- Frameworks: {', '.join(frameworks)}
- Documents Count: Multiple documents provided

DOCUMENTS TO ANALYZE:
{documents_content}

Please perform a comprehensive compliance analysis checking all 40 High-Risk Checks across the provided documents. 
Identify deficiencies, cite specific regulations, and provide actionable correction guidance.

Return your findings in the structured JSON format specified in your instructions.
"""
    
    def _create_error_response(self, error_type: str, error_message: str) -> Dict[str, Any]:
        """
        Create a standardized error response.
        
        Args:
            error_type: Type of error
            error_message: Error details
            
        Returns:
            Error response dict
        """
        return {
            "audit_summary": {
                "total_documents_analyzed": 0,
                "overall_compliance_score": 0,
                "risk_level": "CRITICAL"
            },
            "findings": [],
            "red_flags": [
                {
                    "flag_type": "SYSTEM_ERROR",
                    "description": f"{error_type}: {error_message}",
                    "priority": "IMMEDIATE"
                }
            ],
            "recommendations": [
                {
                    "priority": 1,
                    "recommendation": "Please retry the analysis or contact support",
                    "expected_outcome": "Successful document analysis"
                }
            ],
            "metadata": {
                "audit_timestamp": "",
                "frameworks_applied": [],
                "ai_confidence_score": 0,
                "error": True,
                "error_type": error_type,
                "error_message": error_message
            }
        }


# Singleton instance for service
_ai_service = None


def get_ai_service() -> ComplianceAIService:
    """
    Get or create the AI service singleton instance.
    
    Returns:
        ComplianceAIService instance
    """
    global _ai_service
    if _ai_service is None:
        _ai_service = ComplianceAIService()
    return _ai_service
