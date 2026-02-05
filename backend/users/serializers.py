from rest_framework import serializers
from .models import Agency, CustomUser


class UserSerializer(serializers.ModelSerializer):
    agency_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'agency', 'agency_name',
        )
        read_only_fields = ('id', 'role')

    def get_agency_name(self, obj):
        return obj.agency.name if obj.agency else None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'first_name', 'last_name')

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ('id', 'name', 'slug', 'created_at')
        read_only_fields = ('id', 'slug', 'created_at')
