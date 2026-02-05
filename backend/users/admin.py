from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Agency, CustomUser


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'slug')


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
