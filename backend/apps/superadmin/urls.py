from django.urls import path
from . import views

app_name = 'superadmin'

urlpatterns = [
    path('dashboard/', views.SuperAdminDashboardView.as_view(), name='dashboard'),
    path('audit-logs/', views.SuperAdminAuditLogsView.as_view(), name='audit_logs'),
    path('records/', views.SuperAdminSystemRecordsView.as_view(), name='records'),
    path('employees/', views.SuperAdminEmployeesView.as_view(), name='employees'),
    path('employees/<uuid:pk>/lock-status/', views.SuperAdminToggleLockView.as_view(), name='toggle_lock'),
    path('security-matrix/', views.SuperAdminSecurityMatrixView.as_view(), name='security_matrix'),
    # Role & Permission Management endpoints
    path('users/', views.SuperAdminUsersListView.as_view(), name='users_list'),
    path('users/<uuid:user_id>/role/', views.SuperAdminUserRoleUpdateView.as_view(), name='user_role_update'),
    path('roles/', views.SuperAdminRolesListView.as_view(), name='roles_list'),
    path('permissions/catalog/', views.SuperAdminPermissionsCatalogView.as_view(), name='permissions_catalog'),
    path('permissions/matrix/', views.SuperAdminPermissionsMatrixView.as_view(), name='permissions_matrix'),
    path('permissions/matrix/reset/', views.SuperAdminPermissionsResetView.as_view(), name='permissions_reset'),
]
