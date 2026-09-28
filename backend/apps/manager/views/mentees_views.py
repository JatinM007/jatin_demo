from django.db.models import Q, Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.goals.models import Goal, GoalStatus
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.performance.models import Appraisal, PerformanceCycle, TechnicalCapabilityReview
from apps.feedback.models import Feedback
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# M-01: VIEW ASSIGNED INTERNS / EMPLOYEES
# =====================================================================
class ManagerMenteesView(APIView):
    """
    Feature M-01: View Assigned Interns/Employees
    Provides the Mentor with access to assigned interns/employees profiles,
    status, active tasks, appraisal status, and quick performance summary.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)

        search_query = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        dept_filter = request.query_params.get('department', '').strip()

        if search_query:
            direct_reports = direct_reports.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(employee_code__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )

        if status_filter:
            direct_reports = direct_reports.filter(employment_status__iexact=status_filter)

        if dept_filter:
            direct_reports = direct_reports.filter(
                Q(department__id__iexact=dept_filter) |
                Q(department__name__icontains=dept_filter)
            )

        active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()

        mentees_data = []
        for emp in direct_reports:
            # Goals summary
            goals = Goal.objects.filter(employee=emp)
            total_goals = goals.count()
            completed_goals = goals.filter(status=GoalStatus.COMPLETED).count()
            avg_goal_pct = goals.aggregate(avg=Avg('completion_percentage'))['avg'] or 0.0

            # Evidence summary
            pending_evidence = EvidenceSubmission.objects.filter(
                employee=emp,
                review_status=EvidenceReviewStatus.PENDING
            ).count()

            # Active Appraisal summary
            appraisal = None
            if active_cycle:
                appraisal = Appraisal.objects.filter(employee=emp, cycle=active_cycle).first()
            if not appraisal:
                appraisal = Appraisal.objects.filter(employee=emp).order_by('-created_at').first()

            # Technical Capability Review summary
            tech_reviews = TechnicalCapabilityReview.objects.filter(employee=emp)
            avg_tech = tech_reviews.aggregate(avg=Avg('score'))['avg']
            tech_avg_score = round(float(avg_tech), 1) if avg_tech is not None else None

            # Feedback summary
            feedbacks_received = Feedback.objects.filter(recipient=emp.user).count()

            mentees_data.append({
                'id': str(emp.id),
                'userId': emp.user.id,
                'employeeCode': emp.employee_code,
                'firstName': emp.first_name,
                'lastName': emp.last_name,
                'fullName': emp.full_name,
                'email': emp.user.email,
                'designation': emp.designation,
                'department': emp.department.name if emp.department else 'General Engineering',
                'departmentId': str(emp.department.id) if emp.department else None,
                'employmentStatus': emp.employment_status,
                'joiningDate': emp.joining_date.strftime('%Y-%m-%d') if emp.joining_date else None,
                'skills': emp.skills or [],
                'competencies': emp.competencies or [],
                'metrics': {
                    'totalGoals': total_goals,
                    'completedGoals': completed_goals,
                    'avgGoalProgress': round(float(avg_goal_pct), 1),
                    'pendingEvidence': pending_evidence,
                    'feedbacksReceived': feedbacks_received,
                    'technicalCapabilityAvg': tech_avg_score,
                },
                'activeAppraisal': {
                    'id': str(appraisal.id) if appraisal else None,
                    'status': appraisal.status if appraisal else 'NOT_STARTED',
                    'statusDisplay': appraisal.get_status_display() if appraisal else 'Not Started',
                    'overallScore': float(appraisal.overall_score) if appraisal and appraisal.overall_score else None,
                    'cycleName': appraisal.cycle.name if appraisal else (active_cycle.name if active_cycle else 'Current Cycle'),
                } if appraisal or active_cycle else None,
            })

        return Response({
            'code': 200,
            'message': 'Assigned interns retrieved successfully.',
            'data': mentees_data,
            'total': len(mentees_data)
        })
