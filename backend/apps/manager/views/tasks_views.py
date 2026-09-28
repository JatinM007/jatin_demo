from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.goals.models import Goal, KPI, GoalProgress, GoalStatus, GoalPriority
from apps.performance.models import PerformanceCycle
from apps.employees.models import EmployeeProfile
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# M-02 & M-03: ASSIGN & MANAGE TASKS AND GOALS
# =====================================================================
class ManagerTasksView(APIView):
    """
    Feature M-02: Assign Tasks
    Feature M-03: Manage Tasks & Goals
    Create, list, and manage assigned tasks and goals for mentees.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        tasks = Goal.objects.filter(employee__id__in=report_ids).select_related(
            'employee__user', 'cycle', 'assigned_by'
        ).prefetch_related('kpis', 'progress_updates')

        employee_param = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        status_param = request.query_params.get('status')
        priority_param = request.query_params.get('priority')

        if employee_param:
            tasks = tasks.filter(
                Q(employee__id__iexact=str(employee_param)) |
                Q(employee__user__id__iexact=str(employee_param)) |
                Q(employee__employee_code__iexact=str(employee_param))
            )

        if status_param and status_param.upper() != 'ALL':
            tasks = tasks.filter(status=status_param.upper())

        if priority_param and priority_param.upper() != 'ALL':
            tasks = tasks.filter(priority=priority_param.upper())

        data = []
        for t in tasks:
            kpi_item = t.kpis.first()
            data.append({
                'id': str(t.id),
                'employeeId': str(t.employee.id),
                'employeeName': t.employee.full_name,
                'employeeCode': t.employee.employee_code,
                'employeeEmail': t.employee.user.email,
                'title': t.title,
                'description': t.description,
                'dueDate': t.due_date.strftime('%Y-%m-%d') if t.due_date else None,
                'status': t.status,
                'statusDisplay': t.get_status_display(),
                'priority': t.priority,
                'completionPercentage': float(t.completion_percentage),
                'assignedByName': (t.assigned_by.profile.full_name if hasattr(t.assigned_by, 'profile') else t.assigned_by.username) if t.assigned_by else 'Mentor',
                'kpi': {
                    'name': kpi_item.name if kpi_item else None,
                    'targetValue': float(kpi_item.target_value) if kpi_item else None,
                    'achievedValue': float(kpi_item.achieved_value) if kpi_item else None,
                    'unit': kpi_item.unit if kpi_item else '%',
                } if kpi_item else None,
                'progressUpdatesCount': t.progress_updates.count(),
                'createdAt': t.created_at.strftime('%Y-%m-%d %H:%M'),
            })

        return Response({
            'code': 200,
            'message': 'Tasks retrieved successfully.',
            'data': data
        })

    def post(self, request):
        """M-02: Create and assign a new task to an intern/employee."""
        emp_id = request.data.get('employee_id') or request.data.get('employeeId')
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()
        due_date = request.data.get('due_date') or request.data.get('dueDate')
        priority = request.data.get('priority', GoalPriority.MEDIUM).upper()
        target_value = request.data.get('target_value') or request.data.get('targetValue')
        unit = request.data.get('unit', '%')

        if not emp_id or not title:
            return Response(
                {'code': 400, 'message': 'employee_id and title are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(user__id__iexact=str(emp_id)) |
            Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Intern/Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()
        if not active_cycle:
            # Auto-create active cycle if none exists
            today = timezone.localdate()
            active_cycle = PerformanceCycle.objects.create(
                name=f"Cycle {today.year}",
                start_date=today,
                end_date=today + timezone.timedelta(days=180),
                status='ACTIVE',
                created_by=request.user
            )

        if not due_date:
            due_date = timezone.localdate() + timezone.timedelta(days=30)

        task = Goal.objects.create(
            employee=profile,
            cycle=active_cycle,
            assigned_by=request.user,
            title=title,
            description=description,
            due_date=due_date,
            priority=priority,
            status=GoalStatus.NOT_STARTED,
            completion_percentage=Decimal('0.00'),
        )

        if target_value is not None:
            KPI.objects.create(
                goal=task,
                name=f"{title} Milestone",
                target_value=Decimal(str(target_value)),
                achieved_value=Decimal('0.00'),
                unit=unit,
            )

        return Response({
            'code': 201,
            'message': f'Task "{task.title}" successfully assigned to {profile.full_name}.',
            'data': {
                'id': str(task.id),
                'title': task.title,
                'employeeId': str(profile.id),
                'employeeName': profile.full_name,
                'dueDate': str(task.due_date),
                'status': task.status,
                'priority': task.priority,
            }
        }, status=status.HTTP_201_CREATED)


class ManagerTaskDetailView(APIView):
    """
    Feature M-03: Manage Tasks & Goals
    Update status, progress percentage, or append mentor check-in notes.
    """
    permission_classes = [IsManagerUser]

    def patch(self, request, pk):
        task = Goal.objects.filter(id=pk).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        progress_pct = request.data.get('completion_percentage') or request.data.get('completionPercentage')
        comment = request.data.get('comment', '').strip()

        if new_status and hasattr(GoalStatus, new_status.upper()):
            task.status = new_status.upper()
            if task.status == GoalStatus.COMPLETED and progress_pct is None:
                task.completion_percentage = Decimal('100.00')

        if progress_pct is not None:
            try:
                pct = Decimal(str(progress_pct))
                task.completion_percentage = min(Decimal('100.00'), max(Decimal('0.00'), pct))
                if task.completion_percentage == Decimal('100.00'):
                    task.status = GoalStatus.COMPLETED
                elif task.completion_percentage > Decimal('0.00') and task.status == GoalStatus.NOT_STARTED:
                    task.status = GoalStatus.IN_PROGRESS
            except Exception:
                pass

        task.save()

        if comment:
            GoalProgress.objects.create(
                goal=task,
                updated_by=request.user,
                progress_percentage=task.completion_percentage,
                comment=f"[Mentor Update] {comment}"
            )

        return Response({
            'code': 200,
            'message': f'Task updated successfully. Status: {task.status}',
            'data': {
                'id': str(task.id),
                'title': task.title,
                'status': task.status,
                'completionPercentage': float(task.completion_percentage),
            }
        })
