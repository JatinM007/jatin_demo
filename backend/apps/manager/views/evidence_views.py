from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# M-06: VIEW & REVIEW EVIDENCE
# =====================================================================
class ManagerEvidenceView(APIView):
    """
    Feature M-06: View Evidence
    Review supporting evidence submitted for tasks, goals, and performance assessment.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        evidence_qs = EvidenceSubmission.objects.filter(
            employee__id__in=report_ids
        ).select_related('employee__user', 'goal', 'reviewed_by').order_by('-created_at')

        emp_filter = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        status_filter = request.query_params.get('status')

        if emp_filter:
            evidence_qs = evidence_qs.filter(
                Q(employee__id__iexact=str(emp_filter)) |
                Q(employee__user__id__iexact=str(emp_filter))
            )

        if status_filter and status_filter.upper() != 'ALL':
            evidence_qs = evidence_qs.filter(review_status=status_filter.upper())

        data = [{
            'id': str(e.id),
            'employeeId': str(e.employee.id),
            'employeeName': e.employee.full_name,
            'employeeEmail': e.employee.user.email,
            'employeeCode': e.employee.employee_code,
            'goalTitle': e.goal.title if e.goal else 'General Milestone',
            'goalId': str(e.goal.id) if e.goal else None,
            'title': e.title,
            'description': e.description,
            'externalUrl': e.external_url,
            'fileAttachment': e.file_attachment.url if e.file_attachment else None,
            'reviewStatus': e.review_status,
            'reviewStatusDisplay': e.get_review_status_display(),
            'reviewNotes': e.review_notes,
            'reviewedByName': (e.reviewed_by.profile.full_name if hasattr(e.reviewed_by, 'profile') else e.reviewed_by.username) if e.reviewed_by else None,
            'reviewedAt': e.reviewed_at.strftime('%Y-%m-%d %H:%M') if e.reviewed_at else None,
            'createdAt': e.created_at.strftime('%Y-%m-%d %H:%M'),
        } for e in evidence_qs]

        return Response({
            'code': 200,
            'message': 'Evidence submissions retrieved successfully.',
            'data': data
        })


class ManagerEvidenceDecisionView(APIView):
    """
    Review decision for submitted evidence (Approve, Reject, Request Revision).
    """
    permission_classes = [IsManagerUser]

    def post(self, request, pk):
        evidence = EvidenceSubmission.objects.filter(id=pk).first()
        if not evidence:
            return Response({'code': 404, 'message': 'Evidence submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status', EvidenceReviewStatus.APPROVED).upper()
        notes = request.data.get('review_notes') or request.data.get('remarks') or request.data.get('notes', '')

        if hasattr(EvidenceReviewStatus, new_status):
            evidence.review_status = new_status
            evidence.review_notes = notes
            evidence.reviewed_by = request.user
            evidence.reviewed_at = timezone.now()
            evidence.save()

            return Response({
                'code': 200,
                'message': f'Evidence marked as {evidence.get_review_status_display()}.',
                'data': {
                    'id': str(evidence.id),
                    'reviewStatus': evidence.review_status,
                    'reviewNotes': evidence.review_notes,
                }
            })

        return Response({'code': 400, 'message': f'Invalid status: {new_status}'}, status=status.HTTP_400_BAD_REQUEST)
