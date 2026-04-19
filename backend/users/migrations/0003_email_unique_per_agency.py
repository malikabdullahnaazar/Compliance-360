# Email is globally unique (USERNAME_FIELD) so login by email is unambiguous.
# Per-agency rules for QA/Clinician are enforced for username via 0002 constraints.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_username_unique_per_agency'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='email',
            field=models.EmailField(
                blank=True,
                max_length=254,
                unique=True,
                verbose_name='email address',
            ),
        ),
    ]
