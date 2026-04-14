# AI Compliance Auditor Module

This Django app provides AI-powered compliance auditing for hospice clinical charts using OpenAI's GPT-4o model.

## Features

- **PDF Text Extraction**: Extract text from PDF documents with OCR support for scanned documents
- **AI-Powered Analysis**: Uses OpenAI GPT-4o to analyze clinical documents against 40 High-Risk compliance checks
- **Multi-Framework Support**: Checks against CMS, CHAP, Texas HHSC, Joint Commission, and ACHC standards
- **Comprehensive Findings**: Generates detailed findings with regulatory citations and correction guidance
- **Audit Workflow**: Full audit session management with document upload, analysis, and reporting

## Architecture

```
ai/
├── services/
│   ├── ai_service.py          # OpenAI GPT-4o integration
│   └── document_processor.py  # PDF text extraction & OCR
├── prompts/
│   └── system_prompts.py      # AI system prompts (40 High-Risk Checks)
├── models.py                   # Database models
├── serializers.py              # API serializers
├── views.py                    # API views & endpoints
├── urls.py                     # URL routing
└── admin.py                    # Django admin configuration
```

## Configuration

Create a `.env` file in the backend directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.1

# AI Service Configuration
AI_MAX_DOCUMENT_SIZE_MB=50
AI_SUPPORTED_FORMATS=pdf,doc,docx,txt
AI_OCR_ENABLED=true

# Compliance Frameworks
DEFAULT_FRAMEWORKS=CMS,CHAP
ENABLE_TEXAS_HHSC=true
```

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

## API Endpoints

### Audit Sessions

- `GET /api/ai/audit-sessions/` - List all audit sessions
- `POST /api/ai/audit-sessions/` - Create new audit session
- `GET /api/ai/audit-sessions/{id}/` - Get audit session details
- `POST /api/ai/audit-sessions/{id}/upload_document/` - Upload document
- `POST /api/ai/audit-sessions/{id}/run_audit/` - Run AI audit
- `GET /api/ai/audit-sessions/{id}/dashboard/` - Get audit dashboard

### Direct AI Analysis (No persistence)

- `POST /api/ai/analyze/` - Analyze documents directly
- `POST /api/ai/analyze-single/` - Analyze single document
- `POST /api/ai/extract-analyze/` - Upload file, extract & analyze

### Findings Management

- `GET /api/ai/findings/` - List all findings
- `GET /api/ai/findings/my_findings/` - Get assigned findings
- `GET /api/ai/findings/by_audit/?audit_id={id}` - Filter by audit
- `PATCH /api/ai/findings/{id}/` - Update finding status/assignment

## Usage Example

```python
import requests

# 1. Create audit session
response = requests.post('http://localhost:8000/api/ai/audit-sessions/', json={
    'patient_id': 'PAT001',
    'patient_name': 'John Doe',
    'audit_type': 'admission',
    'frameworks': ['CMS', 'CHAP']
}, headers={'Authorization': 'Bearer YOUR_TOKEN'})

audit_id = response.json()['id']

# 2. Upload documents
with open('election_statement.pdf', 'rb') as f:
    requests.post(
        f'http://localhost:8000/api/ai/audit-sessions/{audit_id}/upload_document/',
        files={'file': f},
        data={'document_type': 'election_statement'},
        headers={'Authorization': 'Bearer YOUR_TOKEN'}
    )

# 3. Run AI audit
response = requests.post(
    f'http://localhost:8000/api/ai/audit-sessions/{audit_id}/run_audit/',
    headers={'Authorization': 'Bearer YOUR_TOKEN'}
)

results = response.json()
print(f"Compliance Score: {results['overall_compliance_score']}")
print(f"Risk Level: {results['risk_level']}")
```

## The 40 High-Risk Checks

The AI analyzes documents against these compliance checks:

### A. Admission – Election & Rights (1-7)
- Election statement presence and completeness
- Patient signatures and dates
- Rights acknowledgment

### B. Certification of Terminal Illness (8-12)
- CTI presence and signatures
- Diagnosis matching
- Prognosis documentation

### C. Eligibility & Clinical Support (13-15)
- Clinical narrative support
- Decline documentation
- Contradictory information detection

### D. Assessments & Plan of Care (16-22)
- Timely assessments (48-hour rule)
- Pain/symptom documentation
- POC alignment

### E. Recertification & Face-to-Face (23-26)
- Recertification CTI
- F2F encounter requirements
- Benefit period tracking

## AI Response Structure

```json
{
  "audit_summary": {
    "total_documents_analyzed": 4,
    "overall_compliance_score": 85.5,
    "risk_level": "MEDIUM"
  },
  "findings": [
    {
      "id": "uuid",
      "check_number": 9,
      "category": "B",
      "severity": "HIGH",
      "finding_title": "Missing Attending Physician Signature",
      "finding_description": "...",
      "regulatory_citations": [
        {
          "framework": "CMS",
          "citation": "§418.22",
          "description": "..."
        }
      ],
      "correction_guidance": {
        "immediate_action": "...",
        "responsible_party": "PHYSICIAN",
        "timeline": "24-48 hours"
      }
    }
  ],
  "red_flags": [...],
  "recommendations": [...]
}
```

## Development

### Adding New Compliance Checks

Edit `prompts/system_prompts.py` to modify the system prompt and add new checks.

### Custom Frameworks

Add new frameworks to:
- `models.py` - FRAMEWORKS choices
- `system_prompts.py` - System prompt
- Settings - DEFAULT_FRAMEWORKS env var

### Testing

```bash
python manage.py test ai
```

## License

Private - CompliAI Chart Hospice System
