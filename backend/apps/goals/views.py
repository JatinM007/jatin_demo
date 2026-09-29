from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.accounts.permissions import IsManager, IsHR
from apps.goals.models import Goal, KPI, GoalProgress, GoalStatus
from apps.goals.serializers import (
    GoalSerializer,
    KPISerializer,
    GoalProgressSerializer,
    LogProgressSerializer,
)

class GoalViewSet(viewsets.ModelViewSet):
    serializer_class = GoalSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cycle', 'employee', 'status', 'priority']
    search_fields = ['title', 'description', 'employee__first_name', 'employee__last_name']
    ordering_fields = ['due_date', 'completion_percentage', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Goal.objects.none()

        base_qs = Goal.objects.select_related('employee__user', 'cycle', 'assigned_by').prefetch_related('kpis', 'progress_updates').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            return base_qs.filter(Q(employee__manager=user) | Q(employee__user=user))

        # Interns only see their assigned goals
        return base_qs.filter(employee__user=user)

    def perform_create(self, serializer):
        kwargs = {'assigned_by': self.request.user}
        if not serializer.validated_data.get('cycle'):
            from apps.performance.models import PerformanceCycle
            active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()
            if active_cycle:
                kwargs['cycle'] = active_cycle
        if not serializer.validated_data.get('due_date'):
            import datetime
            cycle = kwargs.get('cycle') or serializer.validated_data.get('cycle')
            if cycle and cycle.end_date:
                kwargs['due_date'] = cycle.end_date
            else:
                kwargs['due_date'] = datetime.date.today() + datetime.timedelta(days=90)
        serializer.save(**kwargs)

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='progress')
    def log_progress(self, request, pk=None):
        """Allows intern or manager to submit progress update."""
        goal = self.get_object()
        user = request.user

        # Authorization: Must be the goal's intern, manager, or HR
        is_owner = (hasattr(user, 'profile') and goal.employee == user.profile)
        is_mgr = (goal.employee.manager == user)
        is_admin = (user.is_hr or user.is_super_admin)

        if not (is_owner or is_mgr or is_admin):
            return Response(
                {"detail": "You do not have permission to update progress on this goal."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = LogProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pct = serializer.validated_data['progress_percentage']
        comment = serializer.validated_data['comment']

        progress = GoalProgress.objects.create(
            goal=goal,
            updated_by=user,
            progress_percentage=pct,
            comment=comment
        )

        # Update goal progress and status
        goal.completion_percentage = pct
        if pct == Decimal('100.00'):
            goal.status = GoalStatus.COMPLETED
        elif pct > Decimal('0.00') and goal.status == GoalStatus.NOT_STARTED:
            goal.status = GoalStatus.IN_PROGRESS
        goal.save()

        return Response(GoalProgressSerializer(progress).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='kra-library')
    def kra_library(self, request):
        """Library of standard KRAs matching media_1789919618446.png."""
        kras = [
            {"id": "kra-1", "title": "Campus Recruitment", "description": "Drive university hiring drives and intern intake pipeline."},
            {"id": "kra-2", "title": "Employee Hiring Experience", "description": "Streamline onboarding satisfaction and candidate response times."},
            {"id": "kra-3", "title": "Candidate interviewing", "description": "Conduct technical and behavioral candidate assessments with scorecards."},
            {"id": "kra-4", "title": "Candidate screening and selection", "description": "Review resumes, conduct background checks, and shortlist candidates."},
            {"id": "kra-5", "title": "Recruitment budgeting and cost reduction", "description": "Optimize hiring channels and reduce agency spend."},
            {"id": "kra-6", "title": "Employee wellness", "description": "Implement wellness initiatives and health engagement programs."},
            {"id": "kra-7", "title": "Software Architecture", "description": "Design modular, scalable, and secure microservices and database schemas."},
            {"id": "kra-8", "title": "Code Quality & Automated Testing", "description": "Maintain unit test coverage, code review standards, and CI/CD pipelines."},
            {"id": "kra-9", "title": "Continuous Improvement & Innovation", "description": "Lead technical refactoring, performance tuning, and developer tooling."},
            {"id": "kra-10", "title": "Customer Satisfaction & SLAs", "description": "Achieve high platform uptime and resolve critical client defects promptly."},
        ]
        return Response({'code': 200, 'data': kras})

    @action(detail=False, methods=['post'], url_path='assign-kras')
    def assign_kras(self, request):
        """Validates total weightage = 100% and assigns KRAs to employee."""
        employee_id = request.data.get('employee_id') or request.data.get('employeeId')
        cycle_id = request.data.get('cycle_id') or request.data.get('cycleId')
        kras = request.data.get('kras', [])

        if not employee_id:
            return Response({'code': 400, 'message': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not kras:
            return Response({'code': 400, 'message': 'At least one KRA must be selected.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate total weightage
        try:
            total_weight = sum(float(item.get('weightage', 0)) for item in kras)
        except (ValueError, TypeError):
            return Response({'code': 400, 'message': 'All weightages must be valid numbers.'}, status=status.HTTP_400_BAD_REQUEST)

        if round(total_weight, 2) != 100.0:
            return Response({
                'code': 400,
                'message': f'Total weightage of all KRAs should be equal to 100%. Currently it is {total_weight}%.'
            }, status=status.HTTP_400_BAD_REQUEST)

        from apps.employees.models import EmployeeProfile
        from apps.accounts.models import User
        from apps.performance.models import PerformanceCycle
        from datetime import date, timedelta

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(employee_id)) |
            Q(user__id__iexact=str(employee_id)) |
            Q(employee_code__iexact=str(employee_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        cycle = None
        if cycle_id:
            cycle = PerformanceCycle.objects.filter(id=cycle_id).first()
        if not cycle:
            cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()


        # Update or create goals for each KRA
        created_goals = []
        due = date.today() + timedelta(days=90)
        for item in kras:
            title = item.get('title', 'KRA Goal')
            w = Decimal(str(item.get('weightage', 0)))
            desc = item.get('description', f"Key Result Area: {title}")
            full_desc = f"{desc} | Assigned Weightage: {w}%"

            goal, _ = Goal.objects.update_or_create(
                employee=profile,
                cycle=cycle,
                title=title,
                defaults={
                    'description': full_desc,
                    'due_date': due,
                    'assigned_by': request.user,
                }
            )

            # Ensure KPI exists with the weightage target
            KPI.objects.update_or_create(
                goal=goal,
                name=f"{title} Target",
                defaults={
                    'description': f"Weight: {w}%",
                    'target_value': w,
                    'unit': '%',
                    'measurement_type': 'PERCENTAGE',
                }
            )

            created_goals.append({
                'id': str(goal.id),
                'title': goal.title,
                'weightage': float(w),
                'completion_percentage': float(goal.completion_percentage),
            })

        return Response({
            'code': 200,
            'message': f'Successfully assigned {len(kras)} KRAs with 100% weightage.',
            'data': {
                'employee_id': str(profile.id),
                'total_weightage': 100.0,
                'assigned_kras': created_goals
            }
        })



class KPIViewSet(viewsets.ModelViewSet):
    queryset = KPI.objects.select_related('goal').all()
    serializer_class = KPISerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['goal', 'measurement_type']

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]
