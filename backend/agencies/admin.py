from django.contrib import admin
from .models import Agency, AgencyAdmin


@admin.register(Agency)
class AgencyModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'slug', 'email')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AgencyAdmin)
class AgencyAdminModelAdmin(admin.ModelAdmin):
    list_display = ('agency', 'user', 'is_primary', 'created_at')
    list_filter = ('is_primary', 'created_at', 'can_manage_users', 'can_manage_patients', 'can_manage_documents', 'can_run_audits')
    search_fields = ('agency__name', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')