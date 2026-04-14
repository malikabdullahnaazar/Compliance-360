from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Only allow users with role 'superadmin'."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'superadmin'
        )

class IsSuperAdminOrAgencyAdmin(permissions.BasePermission):
    """Only allow users with role 'superadmin', 'agency_admin' or 'qa_compliance'."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) in ['superadmin', 'agency_admin', 'qa_compliance']
        )
