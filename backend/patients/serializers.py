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
            # Optional fields - not required (aligned with frontend validation)
            'phone': {'required': False, 'allow_blank': True, 'allow_null': True},
            'email': {'required': False, 'allow_blank': True, 'allow_null': True},
            'address': {'required': False, 'allow_blank': True, 'allow_null': True},
            'city': {'required': False, 'allow_blank': True, 'allow_null': True},
            'state': {'required': False, 'allow_blank': True, 'allow_null': True},
            'zip_code': {'required': False, 'allow_blank': True, 'allow_null': True},
            'emergency_contact_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'emergency_contact_phone': {'required': False, 'allow_blank': True, 'allow_null': True},
            'insurance_provider': {'required': False, 'allow_blank': True, 'allow_null': True},
            'policy_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'referring_physician': {'required': False, 'allow_blank': True, 'allow_null': True},
            'admission_date': {'required': False, 'allow_null': True},
            'status': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def run_validation(self, data=serializers.empty):
        """Convert empty strings to None for optional fields."""
        if data is not serializers.empty and isinstance(data, dict):
            nullable_fields = [
                'phone', 'email', 'address', 'city',
                'state', 'zip_code', 'emergency_contact_name',
                'emergency_contact_phone', 'insurance_provider',
                'policy_number', 'referring_physician', 'admission_date', 'status'
            ]
            for field in nullable_fields:
                if field in data and data[field] == '':
                    data[field] = None
        return super().run_validation(data)


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
            # All fields optional on update (partial updates)
            'first_name': {'required': False},
            'last_name': {'required': False},
            'date_of_birth': {'required': False},
            'gender': {'required': False},
            'phone': {'required': False, 'allow_blank': True, 'allow_null': True},
            'email': {'required': False, 'allow_blank': True, 'allow_null': True},
            'address': {'required': False, 'allow_blank': True, 'allow_null': True},
            'city': {'required': False, 'allow_blank': True, 'allow_null': True},
            'state': {'required': False, 'allow_blank': True, 'allow_null': True},
            'zip_code': {'required': False, 'allow_blank': True, 'allow_null': True},
            'emergency_contact_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'emergency_contact_phone': {'required': False, 'allow_blank': True, 'allow_null': True},
            'insurance_provider': {'required': False, 'allow_blank': True, 'allow_null': True},
            'policy_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'referring_physician': {'required': False, 'allow_blank': True, 'allow_null': True},
            'admission_date': {'required': False, 'allow_null': True},
            'status': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def run_validation(self, data=serializers.empty):
        """Convert empty strings to None for optional fields."""
        if data is not serializers.empty and isinstance(data, dict):
            nullable_fields = [
                'phone', 'email', 'address', 'city',
                'state', 'zip_code', 'emergency_contact_name',
                'emergency_contact_phone', 'insurance_provider',
                'policy_number', 'referring_physician', 'admission_date', 'status'
            ]
            for field in nullable_fields:
                if field in data and data[field] == '':
                    data[field] = None
        return super().run_validation(data)