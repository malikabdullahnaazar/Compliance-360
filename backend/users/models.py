from django.contrib.auth.models import AbstractUser
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class CustomUser(AbstractUser):
    # Login and USERNAME_FIELD use email (see auth.E003: USERNAME_FIELD must be unique).
    # Usernames stay unique per agency via constraints below.
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    email = models.EmailField(_('email address'), unique=True, blank=True)

    username = models.CharField(
        'username',
        max_length=150,
        unique=False,
        help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
        validators=[UnicodeUsernameValidator()],
        error_messages={
            'unique': 'A user with that username already exists in this agency.',
        },
    )
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

    class Meta(AbstractUser.Meta):
        abstract = False
        constraints = [
            models.UniqueConstraint(
                fields=['agency', 'username'],
                condition=models.Q(agency__isnull=False),
                name='customuser_unique_username_per_agency',
            ),
            models.UniqueConstraint(
                fields=['username'],
                condition=models.Q(agency__isnull=True),
                name='customuser_unique_username_without_agency',
            ),
        ]
