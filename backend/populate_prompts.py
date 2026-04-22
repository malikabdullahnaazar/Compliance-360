import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from ai.models import PromptTemplate
from ai.prompts.system_prompts import COMPLIANCE_AUDITOR_SYSTEM_PROMPT

def run():
    print("Populating initial prompts...")
    
    # 1. Compliance Auditor
    PromptTemplate.objects.get_or_create(
        identifier='compliance_auditor',
        defaults={
            'name': 'Compliance Auditor (Main)',
            'description': 'Main system prompt used for analyzing charts and generating the compliance report.',
            'prompt_text': COMPLIANCE_AUDITOR_SYSTEM_PROMPT,
            'is_active': True,
        }
    )

    # 2. Patient Intake Extractor
    intake_prompt = (
        "You extract patient demographics from clinical chart text. "
        "Return ONLY valid JSON (no markdown). "
        "If multiple names/DOBs appear, set status='ambiguous' and provide candidates. "
        "If name or DOB cannot be found at all, set status='insufficient_data'. "
        "DOB must be returned as mm/dd/yyyy when possible."
    )
    PromptTemplate.objects.get_or_create(
        identifier='patient_intake_extractor',
        defaults={
            'name': 'Patient Intake Extractor',
            'description': 'Used when uploading a chart to automatically extract patient demographics.',
            'prompt_text': intake_prompt,
            'is_active': True,
        }
    )

    print("Prompts populated successfully!")

if __name__ == '__main__':
    run()
