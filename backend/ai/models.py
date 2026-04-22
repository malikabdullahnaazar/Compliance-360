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
    
    # Associated agency for data isolation
    agency = models.ForeignKey(
        'agencies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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
            models.Index(fields=['agency']),
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
    
    # Associated agency for data isolation
    agency = models.ForeignKey(
        'agencies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='compliance_findings'
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
            models.Index(fields=['agency']),
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


class AIAnalysisResult(models.Model):
    """
    Stores the Mistral AI-generated Markdown compliance audit report for a patient.
    """
    CLINICIAN_DOC_STATUS = [
        ('pending', 'Document Pending'),
        ('submitted', 'Document Submitted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Associated agency for data isolation
    agency = models.ForeignKey(
        'agencies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_analysis_results'
    )

    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='ai_analysis_results',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_analysis_results',
    )

    # The documents that were analyzed
    analyzed_document_names = models.JSONField(
        default=list,
        help_text="List of filenames of documents that were analyzed",
    )

    # The full Markdown report from Mistral
    report_markdown = models.TextField(
        help_text="Full Markdown compliance audit report generated by Mistral AI",
    )

    ai_model_used = models.CharField(max_length=100, default='open-mistral-nemo')
    status = models.CharField(max_length=10, choices=[('Pass', 'Pass'), ('Fail', 'Fail')], default='Fail')
    created_at = models.DateTimeField(auto_now_add=True)

    # Clinician-submitted document for this report
    clinician_document = models.FileField(
        upload_to='clinician_report_docs/',
        null=True,
        blank=True,
        help_text='Document submitted by the clinician for this report',
    )
    clinician_document_name = models.CharField(
        max_length=255,
        blank=True,
        help_text='Original filename of the clinician-submitted document',
    )
    clinician_document_status = models.CharField(
        max_length=20,
        choices=CLINICIAN_DOC_STATUS,
        default='pending',
        help_text='Whether clinician has submitted a document for this report',
    )
    clinician_document_submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the clinician submitted the document',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['agency']),
            models.Index(fields=['patient']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f"AI Analysis – {self.patient} – {self.created_at.date()}"


class AnalysisJob(models.Model):
    """
    Tracks an async document analysis job (Celery) until an AIAnalysisResult exists.
    """

    STATUS_PENDING = "pending"
    STATUS_RUNNING = "running"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_RUNNING, "Running"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    celery_task_id = models.CharField(max_length=255, blank=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="analysis_jobs",
    )
    agency = models.ForeignKey(
        "agencies.Agency",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="analysis_jobs",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="analysis_jobs",
    )
    document_ids = models.JSONField(
        default=list,
        help_text="List of AuditDocument UUID strings included in this job",
    )
    openai_model = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True
    )
    progress = models.PositiveSmallIntegerField(default=0)
    error_message = models.TextField(blank=True)
    analysis_result = models.OneToOneField(
        AIAnalysisResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="analysis_job",
    )
    report_status = models.CharField(
        max_length=10,
        choices=[("Pass", "Pass"), ("Fail", "Fail")],
        blank=True,
        help_text="Pass/Fail snapshot after completion for UI routing",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["agency"]),
            models.Index(fields=["patient"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"AnalysisJob {self.id} ({self.status})"


class ChartIntakeJob(models.Model):
    """
    Tracks an async chart intake job for "upload chart for new patient".

    This stores the uploaded file temporarily until the user explicitly confirms
    patient creation + document attachment.
    """

    STATUS_PENDING = "pending"
    STATUS_RUNNING = "running"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_RUNNING, "Running"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    celery_task_id = models.CharField(max_length=255, blank=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chart_intake_jobs",
    )
    agency = models.ForeignKey(
        "agencies.Agency",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chart_intake_jobs",
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True
    )
    progress = models.PositiveSmallIntegerField(default=0)
    error_message = models.TextField(blank=True)

    filename = models.CharField(max_length=255, blank=True)
    file_path = models.CharField(max_length=500, blank=True)
    file_size_mb = models.FloatField(null=True, blank=True)
    total_pages = models.IntegerField(null=True, blank=True)
    extraction_method = models.CharField(max_length=20, default="text")
    extracted_text = models.TextField(blank=True)

    extracted_patient = models.JSONField(
        null=True,
        blank=True,
        help_text="Structured extracted patient payload for review modal.",
    )
    ambiguous_candidates = models.JSONField(
        null=True,
        blank=True,
        help_text="When ambiguous, array of possible extracted patients.",
    )

    openai_model = models.CharField(max_length=100, default="gpt-5.4-mini")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["agency"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"ChartIntakeJob {self.id} ({self.status})"


class AssignedAuditReport(models.Model):
    """
    Tracks an AI analysis result assigned by an agency admin to a clinician.
    Also holds an optional uploaded document and completion status.
    """
    STATUS_CHOICES = [
        ('incomplete', 'Incomplete'),
        ('complete', 'Complete'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Associated agency for data isolation
    agency = models.ForeignKey(
        'agencies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_audit_reports'
    )

    analysis_result = models.ForeignKey(
        AIAnalysisResult,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_reports',
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_reports',
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='incomplete')

    # Uploaded document by admin after assignment
    uploaded_document = models.FileField(
        upload_to='assigned_report_docs/',
        null=True,
        blank=True,
    )
    uploaded_document_name = models.CharField(max_length=255, blank=True)

    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['agency']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['assigned_by']),
        ]

    def __str__(self):
        return f"Assignment – {self.analysis_result} → {self.assigned_to}"


class PromptTemplate(models.Model):
    """
    Stores system prompts used across the application.
    Allows super-admins to fine-tune AI behavior dynamically.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identifier = models.CharField(max_length=100, unique=True, help_text="Unique identifier used in code (e.g., 'chart_extraction')")
    name = models.CharField(max_length=200, help_text="Human-readable name")
    description = models.TextField(blank=True, help_text="What this prompt is used for")
    
    # We store the entire prompt text here. Constraints should be clearly marked or included.
    prompt_text = models.TextField(help_text="The actual prompt text sent to the AI. Use variables like {document_text} if applicable.")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_prompts'
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

