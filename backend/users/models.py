from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('superadmin', 'Superadmin'),
        ('agency_admin', 'Agency Admin'),
        ('qa_compliance', 'QA/Compliance'),
        ('clinical_leadership', 'Clinical Leadership'),
        ('clinician', 'Clinician'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='clinician')
    agency = models.ForeignKey(
        'agencies.Agency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )

    def __str__(self):
        return self.username

    @property
    def is_agency_admin(self):
        """Check if user is an agency admin."""
        return self.role == 'agency_admin'

    @property
    def is_superadmin(self):
        """Check if user is a superadmin."""
        return self.role == 'superadmin'

    def can_access_agency(self, agency):
        """Check if user can access a specific agency."""
        if self.is_superadmin:
            return True
        if self.is_agency_admin and self.agency == agency:
            return True
        return False
