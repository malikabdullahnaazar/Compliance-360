from django.contrib import admin
from .models import (
    AuditSession,
    AuditDocument,
    ComplianceFinding,
    RegulatoryCitation,
    CorrectionGuidance,
    RedFlag,
    AuditRecommendation,
    AIAnalysisResult,
    AssignedAuditReport,
    PromptTemplate,
)

@admin.register(AuditSession)
class AuditSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient_name', 'audit_type', 'status', 'overall_compliance_score', 'created_at')
    list_filter = ('status', 'audit_type', 'risk_level')
    search_fields = ('patient_name', 'patient_id')
    readonly_fields = ('id', 'created_at', 'updated_at')

@admin.register(AuditDocument)
class AuditDocumentAdmin(admin.ModelAdmin):
    list_display = ('filename', 'document_type', 'file_size_mb', 'created_at')
    list_filter = ('document_type',)
    search_fields = ('filename', 'extracted_text')

@admin.register(ComplianceFinding)
class ComplianceFindingAdmin(admin.ModelAdmin):
    list_display = ('finding_title', 'severity', 'status', 'check_number', 'category')
    list_filter = ('severity', 'status', 'category')
    search_fields = ('finding_title', 'finding_description')

@admin.register(RegulatoryCitation)
class RegulatoryCitationAdmin(admin.ModelAdmin):
    list_display = ('framework', 'citation')
    list_filter = ('framework',)
    search_fields = ('citation', 'description')

@admin.register(CorrectionGuidance)
class CorrectionGuidanceAdmin(admin.ModelAdmin):
    list_display = ('finding', 'responsible_party', 'timeline')
    list_filter = ('responsible_party',)

@admin.register(RedFlag)
class RedFlagAdmin(admin.ModelAdmin):
    list_display = ('flag_type', 'priority', 'created_at')
    list_filter = ('priority',)

@admin.register(AuditRecommendation)
class AuditRecommendationAdmin(admin.ModelAdmin):
    list_display = ('audit_session', 'priority', 'recommendation')
    list_filter = ('priority',)

@admin.register(AIAnalysisResult)
class AIAnalysisResultAdmin(admin.ModelAdmin):
    list_display = ('patient', 'status', 'ai_model_used', 'created_at')
    list_filter = ('status', 'ai_model_used')
    search_fields = ('patient__first_name', 'patient__last_name', 'report_markdown')

@admin.register(AssignedAuditReport)
class AssignedAuditReportAdmin(admin.ModelAdmin):
    list_display = ('analysis_result', 'assigned_to', 'status', 'assigned_at')
    list_filter = ('status',)
    search_fields = ('assigned_to__username',)

@admin.register(PromptTemplate)
class PromptTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'identifier', 'prompt_group', 'is_active', 'is_main', 'updated_at')
    list_filter = ('is_active', 'is_main', 'prompt_group')
    search_fields = ('name', 'identifier', 'description', 'prompt_text')
    readonly_fields = ('created_at', 'updated_at')
