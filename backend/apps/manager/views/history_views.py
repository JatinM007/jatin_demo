from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.performance.models import Appraisal
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# M-12: VIEW PREVIOUS REVIEWS & HISTORY
# =====================================================================
class ManagerHistoricalReviewsView(APIView):
    """
    Feature M-12: View Previous Reviews
    Provide access to previous performance reviews of assigned interns/employees.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        emp_filter = request.query_params.get('employee_id') or request.query_params.get('employeeId')

        appraisals = Appraisal.objects.filter(
            employee__id__in=report_ids
        ).select_related('employee__user', 'cycle', 'reviewer').prefetch_related('ratings__criterion').order_by('-cycle__start_date', '-created_at')

        if emp_filter:
            appraisals = appraisals.filter(
                Q(employee__id__iexact=str(emp_filter)) |
                Q(employee__user__id__iexact=str(emp_filter))
            )

        history_data = []
        for a in appraisals:
            history_data.append({
                'id': str(a.id),
                'employeeId': str(a.employee.id),
                'employeeName': a.employee.full_name,
                'employeeCode': a.employee.employee_code,
                'cycleName': a.cycle.name,
                'cycleStartDate': a.cycle.start_date.strftime('%Y-%m-%d'),
                'cycleEndDate': a.cycle.end_date.strftime('%Y-%m-%d'),
                'status': a.status,
                'statusDisplay': a.get_status_display(),
                'overallScore': float(a.overall_score) if a.overall_score else None,
                'reviewerName': a.reviewer.username if a.reviewer else 'Assigned Mentor',
                'reviewerComments': a.reviewer_comments,
                'selfComments': a.self_comments,
                'submittedAt': a.submitted_at.strftime('%Y-%m-%d %H:%M') if a.submitted_at else None,
                'criteriaRatings': [{
                    'criterionName': r.criterion.name,
                    'weight': float(r.criterion.weight),
                    'score': float(r.score),
                    'comments': r.comments,
                } for r in a.ratings.all()],
            })

        return Response({
            'code': 200,
            'message': 'Historical performance reviews retrieved.',
            'data': history_data
        })
