from django.db.models import Q, Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.goals.models import Goal, GoalStatus, GoalPriority
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.performance.models import Appraisal
from apps.feedback.models import Feedback
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# MANAGER DASHBOARD OVERVIEW TELEMETRY
# =====================================================================
class ManagerDashboardView(APIView):
    """
    Unified telemetry dashboard for the manager/mentor role.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        team_size = direct_reports.count()

        # Reviews metrics
        all_appraisals = Appraisal.objects.filter(employee__id__in=report_ids)
        total_reviews = all_appraisals.count()
        reviews_completed = all_appraisals.filter(status__in=['HR_APPROVED', 'PUBLISHED', 'SUBMITTED']).count()
        pending_reviews = all_appraisals.filter(status__in=['DRAFT', 'UNDER_REVIEW']).count()

        # Evidence
        pending_evidence = EvidenceSubmission.objects.filter(
            employee__id__in=report_ids,
            review_status=EvidenceReviewStatus.PENDING
        ).count()

        # Feedback
        feedback_count = Feedback.objects.filter(
            Q(recipient__profile__id__in=report_ids) | Q(sender__profile__id__in=report_ids)
        ).count()

        # Scores
        avg_score_val = all_appraisals.filter(overall_score__isnull=False).aggregate(avg=Avg('overall_score'))['avg']
        team_avg_score = round(float(avg_score_val), 1) if avg_score_val else 8.2

        all_company_appraisals = Appraisal.objects.filter(overall_score__isnull=False)
        company_avg = all_company_appraisals.aggregate(avg=Avg('overall_score'))['avg']
        company_avg_score = round(float(company_avg), 1) if company_avg else 7.9

        # Team performance bar chart data
        team_performance = []
        for emp in direct_reports[:10]:
            emp_app = all_appraisals.filter(employee=emp, overall_score__isnull=False).first()
            team_performance.append({
                'name': emp.first_name,
                'score': float(emp_app.overall_score) if emp_app else 7.5,
            })

        # Team KPIs progress
        goals = Goal.objects.filter(employee__id__in=report_ids)
        team_kpis = []
        for g in goals[:5]:
            team_kpis.append({
                'name': g.title,
                'progress': float(g.completion_percentage),
            })

        # Urgent tasks
        urgent_tasks = []
        for g in goals.filter(status__in=[GoalStatus.NOT_STARTED, GoalStatus.IN_PROGRESS])[:5]:
            urgent_tasks.append({
                'id': str(g.id),
                'title': f"{g.title} ({g.employee.first_name})",
                'deadline': g.due_date.strftime('%Y-%m-%d') if g.due_date else 'No deadline',
                'priority': 'High' if g.priority in [GoalPriority.HIGH, GoalPriority.CRITICAL] else 'Medium',
            })

        return Response({
            'code': 200,
            'data': {
                'teamSize': team_size,
                'reviewsCompleted': reviews_completed,
                'totalReviews': total_reviews,
                'pendingReviews': pending_reviews,
                'pendingEvidenceReviews': pending_evidence,
                'feedbackRequests': feedback_count,
                'teamAvgScore': team_avg_score,
                'companyAvgScore': company_avg_score,
                'teamPerformance': team_performance,
                'teamKpis': team_kpis,
                'urgentReviews': urgent_tasks,
                'atRiskEmployees': [],
            }
        })
