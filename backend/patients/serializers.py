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
        extra_kwargs = {
            # Optional fields - not required
            'last_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'emergency_contact_name': {'required': False, 'allow_blank': True},
            'emergency_contact_phone': {'required': False, 'allow_blank': True},
            'insurance_provider': {'required': False, 'allow_blank': True},
            'policy_number': {'required': False, 'allow_blank': True},
            'referring_physician': {'required': False, 'allow_blank': True},
            'admission_date': {'required': False, 'allow_null': True},
            'status': {'required': False},  # Has default value
        }


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
        extra_kwargs = {
            # Optional fields - not required on update
            'last_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'emergency_contact_name': {'required': False, 'allow_blank': True},
            'emergency_contact_phone': {'required': False, 'allow_blank': True},
            'insurance_provider': {'required': False, 'allow_blank': True},
            'policy_number': {'required': False, 'allow_blank': True},
            'referring_physician': {'required': False, 'allow_blank': True},
            'admission_date': {'required': False, 'allow_null': True},
            'status': {'required': False},
            # Required fields become optional on update (partial updates allowed)
            'first_name': {'required': False},
            'date_of_birth': {'required': False},
            'gender': {'required': False},
            'phone': {'required': False},
            'email': {'required': False},
            'address': {'required': False},
            'city': {'required': False},
            'state': {'required': False},
            'zip_code': {'required': False},
        }