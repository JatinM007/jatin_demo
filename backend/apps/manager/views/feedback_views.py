from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.accounts.models import User
from apps.goals.models import Goal
from apps.feedback.models import Feedback, FeedbackVisibility, FeedbackStatus, FeedbackComment
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# M-07: GIVE FEEDBACK
# =====================================================================
class ManagerGiveFeedbackView(APIView):
    """
    Feature M-07: Give Feedback
    Provide performance-related feedback (Positive, Coaching, Praise, Constructive)
    directly to an assigned intern/employee.
    """
    permission_classes = [IsManagerUser]

    def post(self, request):
        emp_id = request.data.get('employee_id') or request.data.get('employeeId') or request.data.get('recipient_id')
        feedback_type = request.data.get('feedback_type') or request.data.get('category', 'POSITIVE')
        message = request.data.get('message', '').strip()
        visibility = request.data.get('visibility', FeedbackVisibility.PUBLIC).upper()
        goal_id = request.data.get('goal_id') or request.data.get('goalId')

        if not emp_id or not message:
            return Response(
                {'code': 400, 'message': 'employee_id and message are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_user = User.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(profile__id__iexact=str(emp_id)) |
            Q(profile__employee_code__iexact=str(emp_id))
        ).first()

        if not target_user:
            return Response({'code': 404, 'message': 'Target intern user not found.'}, status=status.HTTP_404_NOT_FOUND)

        goal = Goal.objects.filter(id=goal_id).first() if goal_id else None

        fb = Feedback.objects.create(
            sender=request.user,
            recipient=target_user,
            goal=goal,
            feedback_type=feedback_type.upper(),
            message=message,
            visibility=visibility,
            status=FeedbackStatus.PUBLISHED,
        )

        return Response({
            'code': 201,
            'message': f'Feedback successfully sent to {target_user.username}.',
            'data': {
                'id': str(fb.id),
                'recipient': target_user.username,
                'feedbackType': fb.feedback_type,
                'message': fb.message,
                'createdAt': fb.created_at.strftime('%Y-%m-%d %H:%M'),
            }
        }, status=status.HTTP_201_CREATED)


# =====================================================================
# M-08: REVIEW EMPLOYEE FEEDBACK
# =====================================================================
class ManagerEmployeeFeedbacksView(APIView):
    """
    Feature M-08: Review Employee Feedback
    View feedback provided by the intern/employee regarding their performance,
    tasks, or self-reflections, and record mentor acknowledgments/comments.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_user_ids = [p.user.id for p in direct_reports]

        feedbacks = Feedback.objects.filter(
            sender__id__in=report_user_ids
        ).select_related('sender__profile', 'recipient', 'goal').prefetch_related('comments__author').order_by('-created_at')

        emp_filter = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        if emp_filter:
            feedbacks = feedbacks.filter(
                Q(sender__profile__id__iexact=str(emp_filter)) |
                Q(sender__id__iexact=str(emp_filter))
            )

        data = [{
            'id': str(f.id),
            'senderId': str(f.sender.id),
            'senderName': f.sender.profile.full_name if hasattr(f.sender, 'profile') else f.sender.username,
            'senderCode': f.sender.profile.employee_code if hasattr(f.sender, 'profile') else '',
            'recipientName': f.recipient.username,
            'feedbackType': f.feedback_type,
            'message': f.message,
            'visibility': f.visibility,
            'goalTitle': f.goal.title if f.goal else None,
            'comments': [{
                'id': str(c.id),
                'author': c.author.username,
                'comment': c.comment,
                'createdAt': c.created_at.strftime('%Y-%m-%d %H:%M'),
            } for c in f.comments.all()],
            'createdAt': f.created_at.strftime('%Y-%m-%d %H:%M'),
        } for f in feedbacks]

        return Response({
            'code': 200,
            'message': 'Employee feedbacks retrieved successfully.',
            'data': data
        })

    def post(self, request, pk=None):
        """Mentor appends a review comment / acknowledgment to employee feedback."""
        feedback_id = pk or request.data.get('feedback_id') or request.data.get('feedbackId')
        comment_text = request.data.get('comment', '').strip()

        if not feedback_id or not comment_text:
            return Response({'code': 400, 'message': 'feedback_id and comment are required.'}, status=status.HTTP_400_BAD_REQUEST)

        feedback = Feedback.objects.filter(id=feedback_id).first()
        if not feedback:
            return Response({'code': 404, 'message': 'Feedback record not found.'}, status=status.HTTP_404_NOT_FOUND)

        comment_obj = FeedbackComment.objects.create(
            feedback=feedback,
            author=request.user,
            comment=f"[Mentor Review] {comment_text}"
        )

        return Response({
            'code': 201,
            'message': 'Mentor review comment posted successfully.',
            'data': {
                'id': str(comment_obj.id),
                'feedbackId': str(feedback.id),
                'comment': comment_obj.comment,
                'author': request.user.username,
            }
        }, status=status.HTTP_201_CREATED)
