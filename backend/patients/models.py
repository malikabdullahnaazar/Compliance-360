from django.db import models
from django.conf import settings
import uuid


class Patient(models.Model):
    """
    Patient model for storing patient information.
    """
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
        ('Prefer not to say', 'Prefer not to say'),
    ]

    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Pending', 'Pending'),
        ('Inactive', 'Inactive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Basic Information (Required)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, default='')
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES)

    # Contact Information (Optional)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    # Address Information (Optional)
    address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=10, blank=True, null=True)

    # Emergency Contact (Optional)
    emergency_contact_name = models.CharField(max_length=200, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)

    # Insurance Information (Optional)
    insurance_provider = models.CharField(max_length=200, blank=True, null=True)
    policy_number = models.CharField(max_length=100, blank=True, null=True)

    # Medical Information (Optional)
    referring_physician = models.CharField(max_length=200, blank=True, null=True)
    admission_date = models.DateField(null=True, blank=True)

    # Status (Optional - has default)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active', blank=True)

    # Created by
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patients_created'
    )
    
    # Associated agency (through the user who created it)
    agency = models.ForeignKey(
        'agencies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patients'
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['first_name', 'last_name']),
            models.Index(fields=['email']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
