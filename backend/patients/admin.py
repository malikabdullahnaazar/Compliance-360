from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'date_of_birth', 'gender', 'status', 'agency', 'created_at')
    list_filter = ('status', 'gender', 'agency', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    readonly_fields = ('id', 'created_at', 'updated_at', 'created_by')
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Information', {
            'fields': ('first_name', 'last_name', 'date_of_birth', 'gender')
        }),
        ('Contact Information', {
            'fields': ('phone', 'email'),
            'classes': ('collapse',)
        }),
        ('Address Information', {
            'fields': ('address', 'city', 'state', 'zip_code'),
            'classes': ('collapse',)
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone'),
            'classes': ('collapse',)
        }),
        ('Insurance Information', {
            'fields': ('insurance_provider', 'policy_number'),
            'classes': ('collapse',)
        }),
        ('Medical Information', {
            'fields': ('referring_physician', 'admission_date'),
            'classes': ('collapse',)
        }),
        ('Status & Metadata', {
            'fields': ('status', 'agency', 'created_by', 'id', 'created_at', 'updated_at')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
