"""
Models for AI Audit System
"""

import uuid
from django.db import models
from django.conf import settings


class AuditSession(models.Model):
    """
    Represents an AI audit session for a patient chart.
    """
    AUDIT_TYPES = [
        ('admission', 'Admission Audit'),
        ('recertification', 'Recertification Audit'),
        ('follow_up', 'Follow-up Audit'),
        ('complaint', 'Complaint-driven Audit'),
    ]
    
    RISK_LEVELS = [
        ('LOW', 'Low Risk'),
        ('MEDIUM', 'Medium Risk'),
        ('HIGH', 'High Risk'),
        ('CRITICAL', 'Critical Risk'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Relationships
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='audit_sessions'
    )
    patient_id = models.CharField(max_length=100, help_text="Patient identifier")
    patient_name = models.CharField(max_length=255, blank=True)
    
    # Audit Configuration
    audit_type = models.CharField(max_length=20, choices=AUDIT_TYPES)
    frameworks = models.JSONField(default=list, help_text="List of frameworks applied")
    
    # Status and Results
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    overall_compliance_score = models.FloatField(null=True, blank=True)
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS, null=True, blank=True)
    
    # AI Metadata
    ai_model_used = models.CharField(max_length=50, blank=True)
    tokens_used = models.IntegerField(null=True, blank=True)
    processing_time_seconds = models.FloatField(null=True, blank=True)
    
    # Raw AI Response (for debugging)
    raw_ai_response = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient_id']),
            models.Index(fields=['created_by']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Audit {self.id} - {self.patient_id} ({self.audit_type})"


class AuditDocument(models.Model):
    """
    Documents uploaded for an audit session.
    """
    DOCUMENT_TYPES = [
        ('election_statement', 'Election Statement'),
        ('cti_initial', 'CTI - Initial'),
        ('cti_recertification', 'CTI - Recertification'),
        ('rn_assessment', 'RN Initial Assessment'),
        ('comprehensive_assessment', 'Comprehensive Assessment'),
        ('plan_of_care', 'Plan of Care'),
        ('f2f_encounter', 'Face-to-Face Encounter'),
        ('clinical_notes', 'Clinical Notes'),
        ('physician_orders', 'Physician Orders'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit_session = models.ForeignKey(
        AuditSession,
        on_delete=models.CASCADE,
        related_name='documents',
        null=True,
        blank=True
    )
    
    # Add direct patient reference for standalone documents
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='documents',
        null=True,
        blank=True
    )
    
    # Associated agency (through patient or audit session)
    agency = models.ForeignKey(
        'agencies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents'
    )

    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPES)
    filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size_mb = models.FloatField()
    total_pages = models.IntegerField(null=True, blank=True)

    # Extracted Content
    extracted_text = models.TextField()
    extraction_method = models.CharField(max_length=20, default='text')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document_type', 'filename']

    def __str__(self):
        return f"{self.filename} ({self.document_type})"


class ComplianceFinding(models.Model):
    """
    Individual compliance findings from an AI audit.
    """
    SEVERITY_LEVELS = [
        ('CRITICAL', 'Critical'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_review', 'In Review'),
        ('assigned', 'Assigned'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    CHECK_CATEGORIES = [
        ('A', 'Admission – Election & Rights'),
        ('B', 'Certification of Terminal Illness'),
        ('C', 'Eligibility & Clinical Support'),
        ('D', 'Assessments & Plan of Care'),
        ('E', 'Recertification & Face-to-Face'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit_session = models.ForeignKey(
        AuditSession,
        on_delete=models.CASCADE,
        related_name='findings'
    )
    related_document = models.ForeignKey(
        AuditDocument,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='findings'
    )
    
    # Finding Details
    check_number = models.IntegerField(help_text="Check number from 40 High-Risk Checks")
    category = models.CharField(max_length=1, choices=CHECK_CATEGORIES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    # Content
    finding_title = models.CharField(max_length=255)
    finding_description = models.TextField()
    evidence_from_document = models.TextField(blank=True)
    
    # Location
    page_number = models.IntegerField(null=True, blank=True)
    section = models.CharField(max_length=255, blank=True)
    
    # Correction Workflow
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_findings'
    )
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-severity', 'check_number', 'created_at']
        indexes = [
            models.Index(fields=['audit_session']),
            models.Index(fields=['severity']),
            models.Index(fields=['status']),
            models.Index(fields=['assigned_to']),
        ]
    
    def __str__(self):
        return f"{self.finding_title} ({self.severity})"


class RegulatoryCitation(models.Model):
    """
    Regulatory citations associated with findings.
    """
    FRAMEWORKS = [
        ('CMS', 'CMS Hospice CoPs'),
        ('CHAP', 'CHAP Standards'),
        ('HHSC', 'Texas HHSC'),
        ('JOINT_COMMISSION', 'Joint Commission'),
        ('ACHC', 'ACHC'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    finding = models.ForeignKey(
        ComplianceFinding,
        on_delete=models.CASCADE,
        related_name='citations'
    )
    
    framework = models.CharField(max_length=20, choices=FRAMEWORKS)
    citation = models.CharField(max_length=50, help_text="Citation code (e.g., §418.22)")
    description = models.TextField(help_text="Full regulatory text")
    
    class Meta:
        ordering = ['framework', 'citation']
    
    def __str__(self):
        return f"{self.framework} {self.citation}"


class CorrectionGuidance(models.Model):
    """
    Correction guidance for compliance findings.
    """
    RESPONSIBLE_PARTIES = [
        ('RN', 'Registered Nurse'),
        ('PHYSICIAN', 'Physician'),
        ('SOCIAL_WORKER', 'Social Worker'),
        ('CHAPLAIN', 'Chaplain'),
        ('ADMIN', 'Administrator'),
        ('QA', 'QA/Compliance Officer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    finding = models.OneToOneField(
        ComplianceFinding,
        on_delete=models.CASCADE,
        related_name='correction_guidance'
    )
    
    immediate_action = models.TextField(help_text="What needs to be done immediately")
    responsible_party = models.CharField(max_length=20, choices=RESPONSIBLE_PARTIES)
    timeline = models.CharField(max_length=100, help_text="Urgency timeframe")
    template_suggestion = models.TextField(blank=True, help_text="Optional template language")
    
    class Meta:
        verbose_name_plural = "Correction Guidance"
    
    def __str__(self):
        return f"Guidance for {self.finding.finding_title}"


class RedFlag(models.Model):
    """
    Critical red flags identified during audit.
    """
    PRIORITY_LEVELS = [
        ('IMMEDIATE', 'Immediate Action Required'),
        ('URGENT', 'Urgent'),
        ('ROUTINE', 'Routine'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit_session = models.ForeignKey(
        AuditSession,
        on_delete=models.CASCADE,
        related_name='red_flags'
    )
    
    flag_type = models.CharField(max_length=100)
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-priority', 'created_at']
    
    def __str__(self):
        return f"{self.flag_type} ({self.priority})"


class AuditRecommendation(models.Model):
    """
    Recommendations generated from the audit.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit_session = models.ForeignKey(
        AuditSession,
        on_delete=models.CASCADE,
        related_name='recommendations'
    )
    
    priority = models.IntegerField(help_text="Priority order (1 = highest)")
    recommendation = models.TextField()
    expected_outcome = models.TextField()
    
    class Meta:
        ordering = ['priority']
    
    def __str__(self):
        return f"Recommendation {self.priority}: {self.recommendation[:50]}..."
