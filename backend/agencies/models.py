from django.db import models
from django.conf import settings
import uuid


class Agency(models.Model):
    """
    Agency model for managing healthcare agencies.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    # Address Information
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Created by
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agencies_created'
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            from django.utils.text import slugify
            base = slugify(self.name)
            self.slug = base
            n = 1
            while Agency.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f'{base}-{n}'
                n += 1
        super().save(*args, **kwargs)


class AgencyAdmin(models.Model):
    """
    Model to track agency administrators.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    agency = models.ForeignKey(
        Agency,
        on_delete=models.CASCADE,
        related_name='agency_admins'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='agency_admin_roles'
    )
    is_primary = models.BooleanField(default=False)
    
    # Permissions
    can_manage_users = models.BooleanField(default=True)
    can_manage_patients = models.BooleanField(default=True)
    can_manage_documents = models.BooleanField(default=True)
    can_run_audits = models.BooleanField(default=True)

    class Meta:
        unique_together = ['agency', 'user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.agency.name} Admin"
