"""
Serializers for AI Audit API
"""

from rest_framework import serializers
from .models import (
    AuditSession,
    AuditDocument,
    ComplianceFinding,
    RegulatoryCitation,
    CorrectionGuidance,
    RedFlag,
    AuditRecommendation,
    PromptTemplate
)


class RegulatoryCitationSerializer(serializers.ModelSerializer):
    """Serializer for regulatory citations."""
    
    class Meta:
        model = RegulatoryCitation
        fields = ['id', 'framework', 'citation', 'description']


class CorrectionGuidanceSerializer(serializers.ModelSerializer):
    """Serializer for correction guidance."""
    responsible_party_display = serializers.CharField(
        source='get_responsible_party_display',
        read_only=True
    )
    
    class Meta:
        model = CorrectionGuidance
        fields = [
            'id',
            'immediate_action',
            'responsible_party',
            'responsible_party_display',
            'timeline',
            'template_suggestion'
        ]


class ComplianceFindingSerializer(serializers.ModelSerializer):
    """Serializer for compliance findings."""
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    citations = RegulatoryCitationSerializer(many=True, read_only=True)
    correction_guidance = CorrectionGuidanceSerializer(read_only=True)
    related_document_filename = serializers.CharField(
        source='related_document.filename',
        read_only=True
    )
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name',
        read_only=True,
        default=None
    )
    
    class Meta:
        model = ComplianceFinding
        fields = [
            'id',
            'check_number',
            'category',
            'category_display',
            'severity',
            'severity_display',
            'status',
            'status_display',
            'finding_title',
            'finding_description',
            'evidence_from_document',
            'page_number',
            'section',
            'related_document_filename',
            'assigned_to',
            'assigned_to_name',
            'resolution_notes',
            'resolved_at',
            'created_at',
            'updated_at',
            'citations',
            'correction_guidance'
        ]
        read_only_fields = ['created_at', 'updated_at']


class AuditDocumentSerializer(serializers.ModelSerializer):
    """Serializer for audit documents."""
    document_type_display = serializers.CharField(
        source='get_document_type_display',
        read_only=True
    )
    
    class Meta:
        model = AuditDocument
        fields = [
            'id',
            'document_type',
            'document_type_display',
            'filename',
            'file_size_mb',
            'total_pages',
            'extraction_method',
            'created_at',
            'patient_first_name',
            'patient_last_name'
        ]

    patient_first_name = serializers.CharField(source='patient.first_name', read_only=True)
    patient_last_name = serializers.CharField(source='patient.last_name', read_only=True)


class RedFlagSerializer(serializers.ModelSerializer):
    """Serializer for red flags."""
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = RedFlag
        fields = ['id', 'flag_type', 'description', 'priority', 'priority_display', 'created_at']


class AuditRecommendationSerializer(serializers.ModelSerializer):
    """Serializer for audit recommendations."""
    
    class Meta:
        model = AuditRecommendation
        fields = ['id', 'priority', 'recommendation', 'expected_outcome']


class AuditSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing audit sessions."""
    audit_type_display = serializers.CharField(source='get_audit_type_display', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    findings_count = serializers.SerializerMethodField()
    critical_findings_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditSession
        fields = [
            'id',
            'created_at',
            'updated_at',
            'patient_id',
            'patient_name',
            'audit_type',
            'audit_type_display',
            'status',
            'status_display',
            'overall_compliance_score',
            'risk_level',
            'risk_level_display',
            'created_by_name',
            'findings_count',
            'critical_findings_count'
        ]
    
    def get_findings_count(self, obj):
        return obj.findings.count()
    
    def get_critical_findings_count(self, obj):
        return obj.findings.filter(severity='CRITICAL').count()


class AuditSessionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for audit session with all related data."""
    audit_type_display = serializers.CharField(source='get_audit_type_display', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    documents = AuditDocumentSerializer(many=True, read_only=True)
    findings = ComplianceFindingSerializer(many=True, read_only=True)
    red_flags = RedFlagSerializer(many=True, read_only=True)
    recommendations = AuditRecommendationSerializer(many=True, read_only=True)
    
    # Summary statistics
    findings_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditSession
        fields = [
            'id',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
            'patient_id',
            'patient_name',
            'audit_type',
            'audit_type_display',
            'frameworks',
            'status',
            'status_display',
            'overall_compliance_score',
            'risk_level',
            'risk_level_display',
            'ai_model_used',
            'tokens_used',
            'processing_time_seconds',
            'documents',
            'findings',
            'red_flags',
            'recommendations',
            'findings_summary'
        ]
        read_only_fields = ['created_at', 'updated_at', 'raw_ai_response']
    
    def get_findings_summary(self, obj):
        """Get summary counts of findings by severity."""
        return {
            'total': obj.findings.count(),
            'critical': obj.findings.filter(severity='CRITICAL').count(),
            'high': obj.findings.filter(severity='HIGH').count(),
            'medium': obj.findings.filter(severity='MEDIUM').count(),
            'low': obj.findings.filter(severity='LOW').count(),
            'open': obj.findings.filter(status='open').count(),
            'resolved': obj.findings.filter(status='resolved').count(),
        }


class CreateAuditSessionSerializer(serializers.ModelSerializer):
    """Serializer for creating a new audit session."""
    
    class Meta:
        model = AuditSession
        fields = [
            'patient_id',
            'patient_name',
            'audit_type',
            'frameworks'
        ]


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for document upload."""
    document_type = serializers.ChoiceField(choices=AuditDocument.DOCUMENT_TYPES)
    file = serializers.FileField()
    patient_id = serializers.CharField(required=False, allow_blank=True)


class UpdateFindingSerializer(serializers.ModelSerializer):
    """Serializer for updating a finding (assignment, status, etc.)."""
    
    class Meta:
        model = ComplianceFinding
        fields = ['status', 'assigned_to', 'resolution_notes']


class AuditRequestSerializer(serializers.Serializer):
    """Serializer for triggering an AI audit."""
    patient_id = serializers.CharField(required=True, max_length=100)
    patient_name = serializers.CharField(required=False, max_length=255, allow_blank=True)
    audit_type = serializers.ChoiceField(choices=AuditSession.AUDIT_TYPES)
    frameworks = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=['CMS', 'CHAP']
    )
    documents = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        help_text="List of documents with 'content', 'type', and 'filename'"
    )


class SingleDocumentAnalysisSerializer(serializers.Serializer):
    """Serializer for analyzing a single document."""
    document_content = serializers.CharField(required=True)
    document_type = serializers.ChoiceField(choices=AuditDocument.DOCUMENT_TYPES)
    frameworks = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=['CMS', 'CHAP']
    )
    patient_id = serializers.CharField(required=False, max_length=100)


class AIFindingResponseSerializer(serializers.Serializer):
    """Serializer for AI-generated findings (used to parse AI response)."""
    audit_summary = serializers.DictField()
    findings = serializers.ListField(child=serializers.DictField())
    red_flags = serializers.ListField(child=serializers.DictField(), required=False)
    recommendations = serializers.ListField(child=serializers.DictField(), required=False)
    metadata = serializers.DictField()


class PromptTemplateSerializer(serializers.ModelSerializer):
    """Serializer for PromptTemplate, used by super admins to manage AI prompts."""
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)

    class Meta:
        model = PromptTemplate
        fields = [
            'id', 'identifier', 'name', 'description', 'prompt_text',
            'prompt_group', 'response_format', 'is_active', 'is_main', 'is_locked',
            'created_at', 'updated_at', 'updated_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'updated_by_name']
