from django.contrib.auth.models import AbstractUser
from django.db import models


class Agency(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Agencies'

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

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('superadmin', 'Superadmin'),
        ('qa_compliance', 'QA/Compliance'),
        ('clinical_leadership', 'Clinical Leadership'),
        ('clinician', 'Clinician'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='clinician')
    agency = models.ForeignKey(
        Agency,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )

    def __str__(self):
        return self.username
