from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    """Serializer for Patient model."""
    
    class Meta:
        model = Patient
        fields = [
            'id',
            'first_name',
            'last_name',
            'date_of_birth',
            'gender',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'zip_code',
            'emergency_contact_name',
            'emergency_contact_phone',
            'insurance_provider',
            'policy_number',
            'referring_physician',
            'admission_date',
            'status',
            'created_at',
            'updated_at',
            'full_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_name']


class PatientCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new patient."""
    
    class Meta:
        model = Patient
        fields = [
            'first_name',
            'last_name',
            'date_of_birth',
            'gender',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'zip_code',
            'emergency_contact_name',
            'emergency_contact_phone',
            'insurance_provider',
            'policy_number',
            'referring_physician',
            'admission_date',
            'status'
        ]


class PatientUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating patient information."""
    
    class Meta:
        model = Patient
        fields = [
            'first_name',
            'last_name',
            'date_of_birth',
            'gender',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'zip_code',
            'emergency_contact_name',
            'emergency_contact_phone',
            'insurance_provider',
            'policy_number',
            'referring_physician',
            'admission_date',
            'status'
        ]