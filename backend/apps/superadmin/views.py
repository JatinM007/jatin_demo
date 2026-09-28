from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.accounts.models import User, UserRole
from apps.audit.models import AuditLog
from apps.audit.services import AuditService
from apps.accounts.services.role_permission_service import (
    RolePermissionService,
    SYSTEM_PERMISSIONS_CATALOG,
    VALID_PERMISSION_CODES,
)
from apps.employees.models import EmployeeProfile
from apps.organization.models import Department, Team
from apps.performance.models import PerformanceCycle, Appraisal
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta


class IsSuperAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role == UserRole.SUPER_ADMIN or request.user.is_superuser
        ))


class SuperAdminDashboardView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        total_interns = User.objects.filter(role=UserRole.INTERN).count()
        total_managers = User.objects.filter(role=UserRole.MANAGER).count()
        total_hr = User.objects.filter(role=UserRole.HR).count()
        total_departments = Department.objects.count()
        total_teams = Team.objects.count()
        recent_audit_logs = list(AuditLog.objects.order_by('-timestamp')[:10].values(
            'id', 'action', 'entity_type', 'timestamp', 'actor__username'
        ))

        return Response({
            'code': 200,
            'message': 'Super Admin Dashboard Analytics retrieved successfully',
            'data': {
                'metrics': {
                    'totalUsers': total_users,
                    'totalInterns': total_interns,
                    'totalManagers': total_managers,
                    'totalHr': total_hr,
                    'totalDepartments': total_departments,
                    'totalTeams': total_teams,
                },
                'recentAuditLogs': recent_audit_logs,
            }
        })


class SuperAdminAuditLogsView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        limit = int(request.query_params.get('limit', 50))
        logs = AuditLog.objects.select_related('actor').order_by('-timestamp')[:limit]
        data = [{
            'id': str(log.id),
            'actor': log.actor.username if log.actor else 'System',
            'action': log.action,
            'entityType': log.entity_type,
            'entityId': log.entity_id,
            'metadata': log.metadata,
            'createdAt': log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else None,
        } for log in logs]

        return Response({
            'code': 200,
            'total': len(data),
            'data': data
        })


class SuperAdminSystemRecordsView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        view = request.query_params.get('view', 'SYSTEM').upper()
        if view not in {'SYSTEM', 'UPDATED', 'ATTENTION'}:
            return Response(
                {'code': 400, 'message': 'view must be SYSTEM, UPDATED, or ATTENTION'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            limit = int(request.query_params.get('limit', 50))
        except (TypeError, ValueError):
            limit = 50
        limit = max(1, min(limit, 100))

        recent_since = timezone.now() - timedelta(days=30)
        profiles = EmployeeProfile.objects.select_related('user')
        appraisals = Appraisal.objects.select_related('employee', 'cycle')
        cycles = PerformanceCycle.objects.all()

        if view == 'ATTENTION':
            profiles = profiles.filter(user__is_active=False)
            appraisals = appraisals.filter(status__in=['SUBMITTED', 'HR_APPROVED'])
            cycles = cycles.none()
        elif view == 'UPDATED':
            profiles = profiles.filter(Q(updated_at__gte=recent_since) | Q(user__updated_at__gte=recent_since))
            appraisals = appraisals.filter(updated_at__gte=recent_since)
            cycles = cycles.filter(updated_at__gte=recent_since)

        records = []
        for profile in profiles.order_by('-updated_at')[:limit]:
            active = profile.user.is_active
            updated_at = max(profile.updated_at, profile.user.updated_at)
            records.append({
                'recordType': 'EMPLOYEE',
                'recordId': str(profile.id),
                'title': profile.full_name,
                'subtitle': profile.employee_code,
                'status': profile.employment_status if active else 'DEACTIVATED',
                'updatedAt': updated_at.isoformat() if updated_at else None,
                'attentionRequired': not active,
                'attentionReason': 'Account is deactivated' if not active else None,
                'managementPath': '/employees',
                '_updatedAt': updated_at,
            })

        for appraisal in appraisals.order_by('-updated_at')[:limit]:
            attention_reason = {
                'SUBMITTED': 'Review required',
                'HR_APPROVED': 'Ready to publish',
            }.get(appraisal.status)
            records.append({
                'recordType': 'APPRAISAL',
                'recordId': str(appraisal.id),
                'title': appraisal.employee.full_name,
                'subtitle': appraisal.cycle.name,
                'status': appraisal.status,
                'updatedAt': appraisal.updated_at.isoformat() if appraisal.updated_at else None,
                'attentionRequired': attention_reason is not None,
                'attentionReason': attention_reason,
                'managementPath': '/appraisal',
                '_updatedAt': appraisal.updated_at,
            })

        for cycle in cycles.order_by('-updated_at')[:limit]:
            records.append({
                'recordType': 'APPRAISAL_CYCLE',
                'recordId': str(cycle.id),
                'title': cycle.name,
                'subtitle': f'{cycle.start_date} to {cycle.end_date}',
                'status': cycle.status,
                'updatedAt': cycle.updated_at.isoformat() if cycle.updated_at else None,
                'attentionRequired': False,
                'attentionReason': None,
                'managementPath': '/financial-years',
                '_updatedAt': cycle.updated_at,
            })

        records.sort(key=lambda record: record['_updatedAt'], reverse=True)
        for record in records:
            record.pop('_updatedAt', None)

        return Response({'code': 200, 'data': records[:limit]})


class SuperAdminEmployeesView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        profiles = EmployeeProfile.objects.select_related('user', 'department', 'manager').all()
        data = [{
            'id': str(p.id),
            'userId': str(p.user.id),
            'employeeCode': p.employee_code,
            'fullName': p.full_name,
            'email': p.user.email,
            'role': p.user.role,
            'department': p.department.name if p.department else 'Unassigned',
            'designation': p.designation,
            'isActive': p.user.is_active,
            'joiningDate': str(p.joining_date),
        } for p in profiles]

        return Response({'code': 200, 'total': len(data), 'data': data})


class SuperAdminToggleLockView(APIView):
    permission_classes = [IsSuperAdminUser]

    def post(self, request, pk):
        profile = EmployeeProfile.objects.filter(id=pk).first()
        if not profile:
            return Response({'code': 404, 'message': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

        user = profile.user
        user.is_active = not user.is_active
        user.save()
        return Response({
            'code': 200,
            'message': f"Employee status updated to {'Active' if user.is_active else 'Deactivated'}",
            'isActive': user.is_active
        })


class SuperAdminSecurityMatrixView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        roles_matrix = RolePermissionService.get_matrix()
        return Response({'code': 200, 'data': roles_matrix})

    def put(self, request):
        return SuperAdminPermissionsMatrixView()._save_matrix(request)

    def post(self, request):
        return SuperAdminPermissionsMatrixView()._save_matrix(request)


class SuperAdminUsersListView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        search = (request.query_params.get('search') or '').strip()
        role_filter = (request.query_params.get('role') or '').strip().upper()
        status_filter = (request.query_params.get('status') or '').strip().lower()

        queryset = User.objects.all().select_related('profile', 'profile__department').order_by('username')

        if role_filter and role_filter != 'ALL':
            queryset = queryset.filter(role=role_filter)

        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(profile__first_name__icontains=search) |
                Q(profile__last_name__icontains=search) |
                Q(profile__employee_code__icontains=search)
            )

        data = []
        for u in queryset:
            profile = getattr(u, 'profile', None)
            dept_name = profile.department.name if (profile and profile.department) else 'Unassigned'
            data.append({
                'id': str(u.id),
                'username': u.username,
                'email': u.email,
                'role': u.role,
                'isActive': u.is_active,
                'isSuperUser': u.is_superuser,
                'employeeCode': profile.employee_code if profile else 'DLQ-000',
                'fullName': profile.full_name if profile else u.username,
                'department': dept_name,
                'designation': profile.designation if (profile and profile.designation) else u.role,
                'phone': profile.phone_number if profile else '',
                'dateJoined': u.date_joined.strftime('%Y-%m-%d') if u.date_joined else None,
                'effectivePermissionsCount': len(RolePermissionService.get_effective_permissions_for_user(u)),
            })

        return Response({
            'code': 200,
            'total': len(data),
            'data': data
        })


class SuperAdminUserRoleUpdateView(APIView):
    permission_classes = [IsSuperAdminUser]

    def patch(self, request, user_id):
        return self._update_role(request, user_id)

    def put(self, request, user_id):
        return self._update_role(request, user_id)

    def _update_role(self, request, user_id):
        new_role = (request.data.get('role') or '').strip().upper()
        valid_roles = dict(UserRole.choices)

        if new_role not in valid_roles:
            return Response({
                'code': 400,
                'message': f"Invalid role '{new_role}'. Valid roles are: {list(valid_roles.keys())}"
            }, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({
                'code': 404,
                'message': f"User with ID '{user_id}' was not found."
            }, status=status.HTTP_404_NOT_FOUND)

        old_role = user.role
        if old_role == new_role:
            return Response({
                'code': 200,
                'message': f"User already has role {new_role}.",
                'data': {
                    'id': str(user.id),
                    'username': user.username,
                    'role': user.role,
                }
            })

        # Lockout prevention: Cannot demote the last active SUPER_ADMIN
        if old_role == UserRole.SUPER_ADMIN and new_role != UserRole.SUPER_ADMIN:
            active_superadmins = User.objects.filter(
                role=UserRole.SUPER_ADMIN,
                is_active=True
            ).exclude(id=user.id).count()

            if active_superadmins < 1:
                return Response({
                    'code': 400,
                    'message': "Action forbidden: Cannot demote the only active Super Admin in the organization. At least one Super Admin must remain to maintain system governance."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Update role and staff/superuser flags
        user.role = new_role
        if new_role == UserRole.SUPER_ADMIN:
            user.is_staff = True
            user.is_superuser = True
        elif old_role == UserRole.SUPER_ADMIN:
            user.is_staff = False
            user.is_superuser = False
        user.save()

        # Audit logging
        AuditService.log(
            actor=request.user,
            action='USER_ROLE_UPDATED',
            entity_type='User',
            entity_id=str(user.id),
            metadata={
                'username': user.username,
                'email': user.email,
                'previous_role': old_role,
                'new_role': new_role,
                'performed_by': request.user.username,
            },
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'code': 200,
            'message': f"Successfully updated role for {user.username} from {old_role} to {new_role}.",
            'data': {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'effectivePermissions': RolePermissionService.get_effective_permissions_for_user(user),
            }
        })


class SuperAdminRolesListView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        RolePermissionService.ensure_default_permissions_seeded()
        data = []
        for role_code, role_label in UserRole.choices:
            user_count = User.objects.filter(role=role_code).count()
            active_count = User.objects.filter(role=role_code, is_active=True).count()
            perms = RolePermissionService.get_permissions_for_role(role_code)
            data.append({
                'role': role_code,
                'label': role_label,
                'userCount': user_count,
                'activeUserCount': active_count,
                'permissionsCount': len(perms),
                'permissions': perms,
            })

        return Response({
            'code': 200,
            'data': data
        })


class SuperAdminPermissionsCatalogView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        return Response({
            'code': 200,
            'data': SYSTEM_PERMISSIONS_CATALOG
        })


class SuperAdminPermissionsMatrixView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        matrix = RolePermissionService.get_matrix()
        return Response({
            'code': 200,
            'data': {
                'matrix': matrix,
                'catalog': SYSTEM_PERMISSIONS_CATALOG,
                'roles': [
                    {'role': r, 'label': l}
                    for r, l in UserRole.choices
                ]
            }
        })

    def put(self, request):
        return self._save_matrix(request)

    def post(self, request):
        return self._save_matrix(request)

    def _save_matrix(self, request):
        target_role = request.data.get('role')
        permissions_list = request.data.get('permissions')
        matrix_data = request.data.get('matrix')

        if target_role:
            target_role = target_role.strip().upper()
            if target_role not in dict(UserRole.choices):
                return Response({
                    'code': 400,
                    'message': f"Invalid role: {target_role}"
                }, status=status.HTTP_400_BAD_REQUEST)

            if not isinstance(permissions_list, list):
                return Response({
                    'code': 400,
                    'message': "'permissions' must be a list of permission codes."
                }, status=status.HTTP_400_BAD_REQUEST)

            updated = RolePermissionService.update_role_permissions(target_role, permissions_list)
            AuditService.log(
                actor=request.user,
                action='ROLE_PERMISSIONS_UPDATED',
                entity_type='RolePermission',
                entity_id=target_role,
                metadata={
                    'role': target_role,
                    'permissions_count': len(updated),
                    'permissions': updated,
                    'performed_by': request.user.username,
                },
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({
                'code': 200,
                'message': f"Permissions for role '{target_role}' successfully saved to database.",
                'data': {
                    'role': target_role,
                    'permissions': updated,
                    'matrix': RolePermissionService.get_matrix(),
                    'catalog': SYSTEM_PERMISSIONS_CATALOG,
                }
            })

        if matrix_data and isinstance(matrix_data, dict):
            updated_roles = []
            for role_key, perms in matrix_data.items():
                role_upper = role_key.strip().upper()
                if role_upper in dict(UserRole.choices) and isinstance(perms, list):
                    RolePermissionService.update_role_permissions(role_upper, perms)
                    updated_roles.append(role_upper)

            AuditService.log(
                actor=request.user,
                action='PERMISSIONS_MATRIX_UPDATED',
                entity_type='RolePermission',
                entity_id='MATRIX',
                metadata={
                    'roles_updated': updated_roles,
                    'performed_by': request.user.username,
                },
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({
                'code': 200,
                'message': f"Permissions matrix successfully updated for roles: {', '.join(updated_roles)}.",
                'data': {
                    'matrix': RolePermissionService.get_matrix(),
                    'catalog': SYSTEM_PERMISSIONS_CATALOG,
                }
            })

        return Response({
            'code': 400,
            'message': "Must provide either 'role' with 'permissions' or 'matrix' dictionary."
        }, status=status.HTTP_400_BAD_REQUEST)


class SuperAdminPermissionsResetView(APIView):
    permission_classes = [IsSuperAdminUser]

    def post(self, request):
        role = request.data.get('role')
        if role:
            role = role.strip().upper()
            if role not in dict(UserRole.choices):
                return Response({'code': 400, 'message': f"Invalid role '{role}'"}, status=status.HTTP_400_BAD_REQUEST)
            RolePermissionService.reset_role_to_defaults(role=role)
            msg = f"Permissions for role '{role}' successfully reset to system defaults."
        else:
            RolePermissionService.reset_role_to_defaults()
            msg = "All role permissions successfully reset to system defaults."

        AuditService.log(
            actor=request.user,
            action='ROLE_PERMISSIONS_RESET',
            entity_type='RolePermission',
            entity_id=role or 'ALL',
            metadata={'role': role or 'ALL', 'performed_by': request.user.username},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'code': 200,
            'message': msg,
            'data': {
                'matrix': RolePermissionService.get_matrix(),
                'catalog': SYSTEM_PERMISSIONS_CATALOG,
            }
        })
