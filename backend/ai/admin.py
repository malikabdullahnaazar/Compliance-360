"""
Admin configuration for AI Audit models
"""

from django.contrib import admin
from .models import (
    AuditSession,
    AuditDocument,
    ComplianceFinding,
    RegulatoryCitation,
    CorrectionGuidance,
    RedFlag,
    AuditRecommendation
)


class RegulatoryCitationInline(admin.TabularInline):
    model = RegulatoryCitation
    extra = 1


class CorrectionGuidanceInline(admin.StackedInline):
    model = CorrectionGuidance


@admin.register(ComplianceFinding)
class ComplianceFindingAdmin(admin.ModelAdmin):
    list_display = [
        'finding_title',
        'audit_session',
        'severity',
        'category',
        'status',
        'check_number',
        'created_at'
    ]
    list_filter = ['severity', 'category', 'status', 'created_at']
    search_fields = ['finding_title', 'finding_description', 'evidence_from_document']
    inlines = [RegulatoryCitationInline, CorrectionGuidanceInline]


@admin.register(AuditSession)
class AuditSessionAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'patient_id',
        'patient_name',
        'audit_type',
        'status',
        'risk_level',
        'overall_compliance_score',
        'created_at',
        'created_by'
    ]
    list_filter = ['audit_type', 'status', 'risk_level', 'created_at']
    search_fields = ['patient_id', 'patient_name']


@admin.register(AuditDocument)
class AuditDocumentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'document_type', 'audit_session', 'file_size_mb', 'created_at']
    list_filter = ['document_type', 'created_at']


@admin.register(RedFlag)
class RedFlagAdmin(admin.ModelAdmin):
    list_display = ['flag_type', 'audit_session', 'priority', 'created_at']
    list_filter = ['priority', 'created_at']


@admin.register(AuditRecommendation)
class AuditRecommendationAdmin(admin.ModelAdmin):
    list_display = ['audit_session', 'priority', 'recommendation', 'expected_outcome']
    list_filter = ['priority']
