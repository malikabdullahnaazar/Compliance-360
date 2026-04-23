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

    print("Prompts populated successfully!")

if __name__ == '__main__':
    run()
