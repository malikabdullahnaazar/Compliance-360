from django.db import IntegrityError
from rest_framework import serializers

from .models import CustomUser


def _integrity_error_field(exc):
    """Map DB unique violations to serializer fields. Never use bare 'unique' (matches all constraints)."""
    err = str(exc).lower()
    if any(
        s in err
        for s in (
            'email_key',
            '_email_key',
            'users_customuser.email',
            'users_customuser_email',
            'customuser_unique_email',
        )
    ) or (' email' in err and 'unique' in err):
        return 'email'
    if any(
        s in err
        for s in (
            'customuser_unique_username',
            'users_customuser.username',
        )
    ):
        return 'username'
    return None


class UserSerializer(serializers.ModelSerializer):
    agency_name = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'agency', 'agency_name', 'is_active', 'password',
        )
        read_only_fields = ('id',)

    def validate_email(self, value):
        email = (value or '').strip()
        if not email:
            return value
        qs = CustomUser.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('User with this email already exists')
        return email

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        agency = attrs['agency'] if 'agency' in attrs else (instance.agency if instance else None)
        username = attrs['username'] if 'username' in attrs else (instance.username if instance else None)

        if not username:
            return attrs
        if agency is not None:
            qs = CustomUser.objects.filter(agency=agency, username=username)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'username': ['A user with this username already exists in this agency.'],
                })
        else:
            qs = CustomUser.objects.filter(agency__isnull=True, username=username)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'username': ['A user with this username already exists for accounts without an agency.'],
                })
        return attrs

    def get_agency_name(self, obj):
        # Superadmins don't belong to any agency
        if obj.role == 'superadmin':
            return None
        return obj.agency.name if obj.agency else None

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        try:
            user = super().create(validated_data)
        except IntegrityError as exc:
            field = _integrity_error_field(exc)
            if field == 'email':
                raise serializers.ValidationError(
                    {'email': ['User with this email already exists']}
                ) from exc
            if field == 'username':
                raise serializers.ValidationError({
                    'username': ['A user with this username already exists in this agency.'],
                }) from exc
            raise
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        try:
            user = super().update(instance, validated_data)
        except IntegrityError as exc:
            field = _integrity_error_field(exc)
            if field == 'email':
                raise serializers.ValidationError(
                    {'email': ['User with this email already exists']}
                ) from exc
            if field == 'username':
                raise serializers.ValidationError({
                    'username': ['A user with this username already exists in this agency.'],
                }) from exc
            raise
        if password:
            user.set_password(password)
            user.save()
        return user


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'first_name', 'last_name')

    def validate_username(self, value):
        if CustomUser.objects.filter(agency__isnull=True, username=value).exists():
            raise serializers.ValidationError(
                'A user with this username already exists.'
            )
        return value

    def validate_email(self, value):
        email = (value or '').strip()
        if not email:
            return value
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('User with this email already exists')
        return email

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user
