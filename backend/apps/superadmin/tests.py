from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.performance.models import Appraisal, PerformanceCycle
from apps.superadmin.views import SuperAdminSystemRecordsView


class SuperAdminSystemRecordsViewTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_user(
            email='admin@example.test',
            username='admin-records-test',
            password='test-password',
            role=UserRole.SUPER_ADMIN,
        )

    def test_records_endpoint_requires_superadmin(self):
        user = User.objects.create_user(
            email='user@example.test',
            username='regular-records-test',
            password='test-password',
            role=UserRole.INTERN,
        )
        request = self.factory.get('/api/superadmin/records/')
        force_authenticate(request, user=user)

        response = SuperAdminSystemRecordsView.as_view()(request)

        self.assertEqual(response.status_code, 403)

    def test_attention_view_returns_deactivated_employee_and_review_appraisal(self):
        employee_user = User.objects.create_user(
            email='inactive@example.test',
            username='inactive-records-test',
            password='test-password',
            role=UserRole.INTERN,
            is_active=False,
        )
        employee = EmployeeProfile.objects.create(
            user=employee_user,
            employee_code='REC-001',
            first_name='Inactive',
            last_name='Employee',
        )
        active_user = User.objects.create_user(
            email='active@example.test',
            username='active-records-test',
            password='test-password',
            role=UserRole.INTERN,
        )
        active_employee = EmployeeProfile.objects.create(
            user=active_user,
            employee_code='REC-002',
            first_name='Active',
            last_name='Employee',
        )
        cycle = PerformanceCycle.objects.create(
            name='Records test cycle',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
        )
        Appraisal.objects.create(
            employee=active_employee,
            cycle=cycle,
            status='SUBMITTED',
        )
        Appraisal.objects.create(
            employee=employee,
            cycle=cycle,
            status='DRAFT',
        )

        request = self.factory.get('/api/superadmin/records/', {'view': 'ATTENTION'})
        force_authenticate(request, user=self.admin)
        response = SuperAdminSystemRecordsView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {(record['recordType'], record['status']) for record in response.data['data']},
            {('EMPLOYEE', 'DEACTIVATED'), ('APPRAISAL', 'SUBMITTED')},
        )
        self.assertEqual(len(response.data['data']), 2)

    def test_invalid_view_is_rejected(self):
        request = self.factory.get('/api/superadmin/records/', {'view': 'ALL'})
        force_authenticate(request, user=self.admin)

        response = SuperAdminSystemRecordsView.as_view()(request)

        self.assertEqual(response.status_code, 400)


class PerformancePulseFeatureTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        # Organization & Users
        from apps.organization.models import Department
        from apps.feedback.models import Feedback, FeedbackType, FeedbackStatus
        from apps.goals.models import Goal, GoalStatus, KPI

        self.dept_eng = Department.objects.create(name='Engineering', description='Engineering Dept')
        self.dept_qa = Department.objects.create(name='Quality Assurance', description='QA Dept')

        self.admin = User.objects.create_user(
            email='admin@company.com',
            username='admin-pulse',
            password='Password123!',
            role=UserRole.SUPER_ADMIN,
        )

        self.intern = User.objects.create_user(
            email='intern@company.com',
            username='intern-pulse',
            password='Password123!',
            role=UserRole.INTERN,
        )

        self.manager = User.objects.create_user(
            email='manager@company.com',
            username='manager-pulse',
            password='Password123!',
            role=UserRole.MANAGER,
        )

        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern,
            employee_code='PULSE-001',
            first_name='Alex',
            last_name='Pulse',
            department=self.dept_eng,
            manager=self.manager
        )

        self.manager_profile = EmployeeProfile.objects.create(
            user=self.manager,
            employee_code='PULSE-002',
            first_name='Marcus',
            last_name='Manager',
            department=self.dept_eng
        )

        # Performance Cycle & Goal
        self.cycle = PerformanceCycle.objects.create(
            name='Q3 2026 Cycle',
            start_date=date.today() - timedelta(days=60),
            end_date=date.today() + timedelta(days=60),
        )

        self.goal = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            title='Implement Core Performance Module',
            description='Build out end-to-end features',
            due_date=date.today() + timedelta(days=15),
            status=GoalStatus.IN_PROGRESS,
            completion_percentage=85.0
        )

        self.kpi = KPI.objects.create(
            goal=self.goal,
            name='Code Coverage',
            target_value=90.0,
            achieved_value=88.5,
            unit='%'
        )

        # Feedbacks
        self.fb1 = Feedback.objects.create(
            sender=self.manager,
            recipient=self.intern,
            feedback_type=FeedbackType.PRAISE,
            message='Outstanding architecture work on continuous feedback.',
            status=FeedbackStatus.PUBLISHED,
            goal=self.goal
        )

        self.fb2 = Feedback.objects.create(
            sender=self.admin,
            recipient=self.intern,
            feedback_type=FeedbackType.CONSTRUCTIVE,
            message='Ensure proper integration tests are maintained.',
            status=FeedbackStatus.PUBLISHED
        )

    def test_pulse_endpoint_with_date_range_and_filters(self):
        from apps.superadmin.performance_pulse import PerformancePulseView

        request = self.factory.get('/performance-history/pulse', {
            'startDate': (date.today() - timedelta(days=7)).isoformat(),
            'endDate': (date.today() + timedelta(days=1)).isoformat(),
            'departmentId': str(self.dept_eng.id),
        })
        force_authenticate(request, user=self.admin)
        response = PerformancePulseView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        items = response.data.get('data', [])
        self.assertGreaterEqual(len(items), 2)
        sentiments = {item['feedbackType'] for item in items}
        self.assertIn('PRAISE', sentiments)
        self.assertIn('IMPROVEMENT', sentiments)

    def test_pulse_invalid_date_range_rejected(self):
        from apps.superadmin.performance_pulse import PerformancePulseView

        request = self.factory.get('/performance-history/pulse', {
            'startDate': '2026-10-01',
            'endDate': '2026-09-01',
        })
        force_authenticate(request, user=self.admin)
        response = PerformancePulseView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn('End date cannot precede start date', response.data.get('detail', ''))

    def test_department_benchmarks(self):
        from apps.superadmin.performance_pulse import PerformancePulseBenchmarksView

        request = self.factory.get('/performance-history/department-benchmarks')
        force_authenticate(request, user=self.admin)
        response = PerformancePulseBenchmarksView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        data = response.data.get('data', {})
        self.assertIn('companyAverage', data)
        self.assertIn('departments', data)

        eng_bench = next((d for d in data['departments'] if d['departmentId'] == str(self.dept_eng.id)), None)
        self.assertIsNotNone(eng_bench)
        self.assertEqual(eng_bench['headcount'], 2)
        self.assertGreaterEqual(eng_bench['totalActivities'], 2)
        self.assertGreater(eng_bench['activitiesPerEmployee'], 0)

        # Check edge case for department with zero headcount
        qa_bench = next((d for d in data['departments'] if d['departmentId'] == str(self.dept_qa.id)), None)
        self.assertIsNotNone(qa_bench)
        self.assertEqual(qa_bench['headcount'], 0)
        self.assertEqual(qa_bench['activitiesPerEmployee'], 0.0)

    def test_goals_overlay_endpoint(self):
        from apps.superadmin.performance_pulse import PerformancePulseGoalsOverlayView

        request = self.factory.get('/performance-history/goals-overlay', {
            'departmentId': str(self.dept_eng.id)
        })
        force_authenticate(request, user=self.admin)
        response = PerformancePulseGoalsOverlayView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        data = response.data.get('data', {})
        self.assertEqual(data['summary']['totalGoals'], 1)
        self.assertEqual(data['summary']['averageCompletionPercentage'], 85.0)
        self.assertGreater(len(data['monthlyOverlay']), 0)
        self.assertEqual(len(data['goals']), 1)
        self.assertEqual(data['goals'][0]['kpis'][0]['name'], 'Code Coverage')

    def test_export_unauthorized_for_intern(self):
        from apps.superadmin.performance_pulse import PerformancePulseExportView

        request = self.factory.get('/performance-history/export/', {'format': 'csv'})
        force_authenticate(request, user=self.intern)
        response = PerformancePulseExportView.as_view()(request)

        self.assertEqual(response.status_code, 403)

    def test_export_csv_authorized_superadmin(self):
        from apps.superadmin.performance_pulse import PerformancePulseExportView

        request = self.factory.get('/performance-history/export/', {'format': 'csv'})
        force_authenticate(request, user=self.admin)
        response = PerformancePulseExportView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')
        csv_content = response.content.decode('utf-8')
        self.assertIn('PERFORMAX PERFORMANCE PULSE REPORT', csv_content)
        self.assertIn('--- SUMMARY METRICS ---', csv_content)
        self.assertIn('--- DEPARTMENT BENCHMARK COMPARISONS ---', csv_content)
        self.assertIn('--- GOALS & KPIS STATUS ---', csv_content)
        self.assertIn('--- PERFORMANCE ACTIVITY AUDIT LOG ---', csv_content)

    def test_export_pdf_authorized_superadmin(self):
        from apps.superadmin.performance_pulse import PerformancePulseExportView

        request = self.factory.get('/performance-history/export/', {'format': 'pdf'})
        force_authenticate(request, user=self.admin)
        response = PerformancePulseExportView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF-1.4'))


class SuperAdminRolePermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.super_admin = User.objects.create_user(
            email='admin-rbac@test.com',
            username='super-admin-tester',
            password='password123',
            role=UserRole.SUPER_ADMIN,
        )
        self.intern = User.objects.create_user(
            email='intern-rbac@test.com',
            username='intern-tester',
            password='password123',
            role=UserRole.INTERN,
        )
        self.manager = User.objects.create_user(
            email='manager-rbac@test.com',
            username='manager-tester',
            password='password123',
            role=UserRole.MANAGER,
        )

    def test_users_list_requires_superadmin(self):
        from apps.superadmin.views import SuperAdminUsersListView
        request = self.factory.get('/api/superadmin/users/')
        force_authenticate(request, user=self.intern)
        response = SuperAdminUsersListView.as_view()(request)
        self.assertEqual(response.status_code, 403)

    def test_users_list_superadmin_success(self):
        from apps.superadmin.views import SuperAdminUsersListView
        request = self.factory.get('/api/superadmin/users/', {'search': 'intern-tester'})
        force_authenticate(request, user=self.super_admin)
        response = SuperAdminUsersListView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['username'], 'intern-tester')

    def test_update_user_role_success(self):
        from apps.superadmin.views import SuperAdminUserRoleUpdateView
        from apps.audit.models import AuditLog

        request = self.factory.patch(
            f'/api/superadmin/users/{self.intern.id}/role/',
            {'role': 'MANAGER'},
            format='json'
        )
        force_authenticate(request, user=self.super_admin)
        response = SuperAdminUserRoleUpdateView.as_view()(request, user_id=self.intern.id)
        self.assertEqual(response.status_code, 200)
        self.intern.refresh_from_db()
        self.assertEqual(self.intern.role, UserRole.MANAGER)

        audit = AuditLog.objects.filter(action='USER_ROLE_UPDATED', entity_id=str(self.intern.id)).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.metadata.get('new_role'), 'MANAGER')

    def test_update_user_role_invalid_role(self):
        from apps.superadmin.views import SuperAdminUserRoleUpdateView

        request = self.factory.patch(
            f'/api/superadmin/users/{self.intern.id}/role/',
            {'role': 'INVALID_ROLE'},
            format='json'
        )
        force_authenticate(request, user=self.super_admin)
        response = SuperAdminUserRoleUpdateView.as_view()(request, user_id=self.intern.id)
        self.assertEqual(response.status_code, 400)

    def test_lockout_protection_prevents_demoting_last_superadmin(self):
        from apps.superadmin.views import SuperAdminUserRoleUpdateView

        request = self.factory.patch(
            f'/api/superadmin/users/{self.super_admin.id}/role/',
            {'role': 'HR'},
            format='json'
        )
        force_authenticate(request, user=self.super_admin)
        response = SuperAdminUserRoleUpdateView.as_view()(request, user_id=self.super_admin.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn('Cannot demote the only active Super Admin', response.data['message'])

    def test_permissions_matrix_get_and_update(self):
        from apps.superadmin.views import SuperAdminPermissionsMatrixView
        from apps.accounts.models import RolePermission
        from apps.audit.models import AuditLog

        request = self.factory.get('/api/superadmin/permissions/matrix/')
        force_authenticate(request, user=self.super_admin)
        response = SuperAdminPermissionsMatrixView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('matrix', response.data['data'])
        self.assertIn('catalog', response.data['data'])

        new_perms = ['GOAL_ASSIGN', 'EVIDENCE_REVIEW', 'MEETING_MANAGE']
        update_request = self.factory.put(
            '/api/superadmin/permissions/matrix/',
            {'role': 'MANAGER', 'permissions': new_perms},
            format='json'
        )
        force_authenticate(update_request, user=self.super_admin)
        update_response = SuperAdminPermissionsMatrixView.as_view()(update_request)
        self.assertEqual(update_response.status_code, 200)

        db_perms = set(RolePermission.objects.filter(role='MANAGER').values_list('permission_code', flat=True))
        self.assertEqual(db_perms, set(new_perms))

        audit = AuditLog.objects.filter(action='ROLE_PERMISSIONS_UPDATED', entity_id='MANAGER').first()
        self.assertIsNotNone(audit)