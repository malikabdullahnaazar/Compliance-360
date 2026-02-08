from rest_framework import serializers
from .models import Agency, AgencyAdmin
from django.contrib.auth import get_user_model


User = get_user_model()


class AgencySerializer(serializers.ModelSerializer):
    """Serializer for Agency model."""
    
    class Meta:
        model = Agency
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'website',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'zip_code',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class AgencyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new agency."""
    
    class Meta:
        model = Agency
        fields = [
            'name',
            'description',
            'website',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'zip_code'
        ]


class AgencyAdminSerializer(serializers.ModelSerializer):
    """Serializer for AgencyAdmin model."""
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    
    class Meta:
        model = AgencyAdmin
        fields = [
            'id',
            'agency',
            'user',
            'user_username',
            'user_email',
            'user_first_name',
            'user_last_name',
            'is_primary',
            'can_manage_users',
            'can_manage_patients',
            'can_manage_documents',
            'can_run_audits',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AgencyWithAdminsSerializer(serializers.ModelSerializer):
    """Serializer for Agency with admin information."""
    admins = AgencyAdminSerializer(source='agency_admins', many=True, read_only=True)
    
    class Meta:
        model = Agency
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'website',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'zip_code',
            'is_active',
            'created_at',
            'updated_at',
            'admins'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'admins']