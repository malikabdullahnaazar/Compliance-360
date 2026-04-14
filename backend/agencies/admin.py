from django.contrib import admin
from .models import Agency, AgencyAdmin

@admin.register(Agency)
class AgencyModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'is_active', 'created_at')
    search_fields = ('name', 'city', 'email')
    list_filter = ('is_active', 'state')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(AgencyAdmin)
class AgencyAdminRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'agency', 'is_primary', 'can_manage_users')
    list_filter = ('agency', 'is_primary')
    search_fields = ('user__username', 'agency__name')