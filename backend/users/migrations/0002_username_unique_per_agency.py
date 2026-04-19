# Generated manually for per-agency username uniqueness

import django.contrib.auth.validators
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='username',
            field=models.CharField(
                error_messages={
                    'unique': 'A user with that username already exists in this agency.',
                },
                help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
                max_length=150,
                unique=False,
                validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                verbose_name='username',
            ),
        ),
        migrations.AddConstraint(
            model_name='customuser',
            constraint=models.UniqueConstraint(
                condition=Q(agency__isnull=False),
                fields=('agency', 'username'),
                name='customuser_unique_username_per_agency',
            ),
        ),
        migrations.AddConstraint(
            model_name='customuser',
            constraint=models.UniqueConstraint(
                condition=Q(agency__isnull=True),
                fields=('username',),
                name='customuser_unique_username_without_agency',
            ),
        ),
    ]
