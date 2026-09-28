import uuid
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q, Avg, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile


class IsManagerUser(permissions.BasePermission):
    """Allows access to Managers, HR partners, and Super Administrators."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and (
                request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


def get_manager_reports_qs(user):
    """Returns direct reports for managers, or all employees for HR/Admin."""
    qs = EmployeeProfile.objects.select_related('user', 'department', 'manager')
    if user.role in [UserRole.HR, UserRole.SUPER_ADMIN] or user.is_staff or user.is_superuser:
        return qs.all()
    return qs.filter(Q(manager=user) | Q(user=user))
