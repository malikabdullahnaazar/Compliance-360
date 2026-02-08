from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'agency', 'is_staff')
    list_filter = ('role', 'agency')
    filter_horizontal = ()
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Agency', {'fields': ('role', 'agency')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'role', 'agency')}),
    )
