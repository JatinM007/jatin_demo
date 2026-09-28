from decimal import Decimal
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.evidence.models import EvidenceSubmission
from apps.performance.models import PerformanceCycle, TechnicalCapabilityParameter, TechnicalCapabilityReview
from apps.employees.models import EmployeeProfile
from .base import IsManagerUser


# =====================================================================
# M-05: REVIEW TECHNICAL CAPABILITY
# =====================================================================
class ManagerTechnicalReviewsView(APIView):
    """
    Feature M-05: Review Technical Capability
    Review the intern/employee against configured technical capability parameters.
    Save or submit technical assessments with mentor observations and evidence links.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        emp_id = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        if not emp_id:
            return Response({'code': 400, 'message': 'employee_id parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(user__id__iexact=str(emp_id)) |
            Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Intern/Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        params = TechnicalCapabilityParameter.objects.filter(is_active=True).order_by('category', 'name')
        existing_reviews = {
            str(r.parameter_id): r
            for r in TechnicalCapabilityReview.objects.filter(employee=profile)
        }

        # Also grab submitted evidence to easily link
        submitted_evidence = EvidenceSubmission.objects.filter(employee=profile).values('id', 'title', 'external_url')

        data = []
        scores = []
        for p in params:
            rev = existing_reviews.get(str(p.id))
            score_val = float(rev.score) if rev and rev.score else 0.0
            if rev and rev.score:
                scores.append(score_val)

            data.append({
                'parameterId': str(p.id),
                'name': p.name,
                'category': p.category,
                'description': p.description,
                'benchmarkScore': float(p.benchmark_score),
                'weight': float(p.weight),
                'review': {
                    'id': str(rev.id) if rev else None,
                    'score': score_val,
                    'mentorAssessment': rev.mentor_assessment if rev else '',
                    'evidenceUrl': rev.evidence_url if rev else '',
                    'status': rev.status if rev else 'DRAFT',
                    'updatedAt': rev.updated_at.strftime('%Y-%m-%d %H:%M') if rev else None,
                }
            })

        avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0

        return Response({
            'code': 200,
            'message': 'Technical capability parameters and reviews loaded.',
            'data': {
                'employeeId': str(profile.id),
                'employeeName': profile.full_name,
                'employeeCode': profile.employee_code,
                'averageScore': avg_score,
                'parameters': data,
                'availableEvidence': list(submitted_evidence)
            }
        })

    def post(self, request):
        """Save or submit technical capability review for an intern."""
        emp_id = request.data.get('employee_id') or request.data.get('employeeId')
        review_status = request.data.get('status', 'DRAFT').upper()
        reviews_list = request.data.get('reviews', [])

        if not emp_id or not reviews_list:
            return Response(
                {'code': 400, 'message': 'employee_id and reviews array are required.'},
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

        saved_count = 0
        for item in reviews_list:
            param_id = item.get('parameter_id') or item.get('parameterId')
            score = item.get('score', 0)
            assessment = item.get('mentor_assessment') or item.get('mentorAssessment', '')
            evidence_url = item.get('evidence_url') or item.get('evidenceUrl', '')

            param = TechnicalCapabilityParameter.objects.filter(id=param_id).first()
            if not param:
                continue

            TechnicalCapabilityReview.objects.update_or_create(
                parameter=param,
                employee=profile,
                cycle=active_cycle,
                defaults={
                    'reviewer': request.user,
                    'score': Decimal(str(score)),
                    'mentor_assessment': assessment,
                    'evidence_url': evidence_url,
                    'status': review_status,
                }
            )
            saved_count += 1

        action_word = "submitted" if review_status == 'SUBMITTED' else "saved as draft"
        return Response({
            'code': 200,
            'message': f'Technical capability assessment successfully {action_word} for {profile.full_name} ({saved_count} parameters).',
            'data': {
                'employeeId': str(profile.id),
                'status': review_status,
                'savedParametersCount': saved_count
            }
        })
