import os
import uuid
from decimal import Decimal
from datetime import date, datetime, timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound

from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.goals.models import Goal, GoalStatus, GoalPriority, GoalProgress, GoalSet, GoalItem, KpiProgressEntry
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.performance.models import (
    PerformanceCycle, Appraisal, AppraisalType, AppraisalStatus, CycleStatus
)
from apps.performance.services.scoring import ScoringService
from apps.notifications.services import NotificationService
from apps.notifications.models import Notification, NotificationType

from .models import (
    InternTask, TaskCategory, TaskPriority, TaskStatus,
    InternGoalComment, InternSelfAppraisalSubmission, InternFeedbackReply,
    InternForm, InternFormQuestion, InternFormSubmission,
    FormStatus, QuestionType
)
from .serializers import (
    InternGoalListSerializer, InternGoalProgressUpdateSerializer,
    InternGoalCommentSerializer, InternEvidenceSubmissionSerializer,
    InternTaskSerializer, InternTaskCompleteSerializer, InternTaskReviewSerializer,
    InternFormListSerializer, InternFormDetailSerializer, InternFormSubmitSerializer,
    InternSelfAppraisalSerializer, InternFeedbackReplySerializer,
    validate_file_attachment
)


def get_authenticated_intern_profile(user):
    """
    Resolves the EmployeeProfile for the authenticated user.
    Raises NotFound if no profile exists for this account.
    """
    profile = getattr(user, 'profile', None)
    if not profile:
        profile = EmployeeProfile.objects.filter(user=user).first()
    if not profile:
        raise NotFound("Employee profile not found for this account.")
    return profile


def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def get_user_display_name(user):
    if not user:
        return 'HR Admin'
    profile = getattr(user, 'profile', None)
    if profile and profile.full_name:
        return profile.full_name
    first = getattr(user, 'first_name', '')
    last = getattr(user, 'last_name', '')
    if first or last:
        return f"{first} {last}".strip()
    return getattr(user, 'username', 'HR Admin')


def get_performance_classification(score):
    """Returns official performance classification based on calibrated score."""
    if score is None:
        return None
    val = float(score)
    if val >= 90.0:
        return "Outstanding Contributor"
    elif val >= 80.0:
        return "Exceeds Expectations"
    elif val >= 70.0:
        return "Meets Expectations"
    elif val >= 60.0:
        return "Needs Improvement"
    else:
        return "Unsatisfactory / Review Required"


# ==============================================================================
# 1. PERSONAL DASHBOARD & SCORECARD OVERVIEW
# ==============================================================================
class InternOverviewView(APIView):
    """
    Returns authentic dashboard scorecard, assigned mentor, active cycle,
    upcoming deadlines, and published results. Strictly data-driven (no mock injection).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = get_authenticated_intern_profile(user)
        except NotFound:
            return Response({
                'code': 404,
                'message': 'No profile found for authenticated account.',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        # 1. Mentor Info
        mentor = profile.manager
        mentor_data = None
        if mentor:
            mentor_profile = getattr(mentor, 'profile', None)
            mentor_data = {
                'id': str(mentor.id),
                'name': mentor_profile.full_name if mentor_profile else mentor.username,
                'email': mentor.email,
                'designation': mentor_profile.designation if mentor_profile else 'Assigned Mentor',
                'department': mentor_profile.department.name if mentor_profile and mentor_profile.department else (profile.department.name if profile.department else 'Engineering'),
                'status': 'Active Mentorship'
            }

        # 2. Active Evaluation Cycle
        today = date.today()
        active_cycle = PerformanceCycle.objects.filter(
            Q(status=CycleStatus.ACTIVE) | Q(status=CycleStatus.REVIEW_PERIOD),
            start_date__lte=today,
            end_date__gte=today
        ).order_by('-start_date').first()

        cycle_data = None
        if active_cycle:
            days_remaining = max(0, (active_cycle.end_date - today).days)
            cycle_data = {
                'id': str(active_cycle.id),
                'name': active_cycle.name,
                'description': active_cycle.description or '',
                'startDate': active_cycle.start_date.isoformat(),
                'endDate': active_cycle.end_date.isoformat(),
                'status': active_cycle.status,
                'currentPhase': active_cycle.current_phase or ('Review Period' if active_cycle.status == CycleStatus.REVIEW_PERIOD else 'Self-Evaluation Open'),
                'daysRemaining': days_remaining,
                'selfAssessmentDeadline': active_cycle.self_assessment_deadline.isoformat() if active_cycle.self_assessment_deadline else active_cycle.end_date.isoformat(),
                'evidenceDeadline': active_cycle.evidence_deadline.isoformat() if active_cycle.evidence_deadline else active_cycle.end_date.isoformat()
            }

        # 3. Assigned Goals (Authentic data: both direct Goals and HR-assigned GoalItems)
        goals_qs = Goal.objects.filter(employee=profile)
        total_goals = goals_qs.count()
        completed_goals = goals_qs.filter(
            Q(status=GoalStatus.COMPLETED) | Q(completion_percentage=Decimal('100.00'))
        ).count()
        if total_goals > 0:
            avg_progress = float(sum(g.completion_percentage for g in goals_qs) / Decimal(total_goals))
        else:
            avg_progress = 0.0

        goal_items_qs = GoalItem.objects.filter(goal_set__employee=profile)
        gi_count = goal_items_qs.count()
        if gi_count > 0:
            gi_completed = goal_items_qs.filter(Q(status='COMPLETED') | Q(current_progress__gte=Decimal('100.00'))).count()
            gi_scores = [float(gi.score_percent) for gi in goal_items_qs]
            gi_avg = sum(gi_scores) / gi_count if gi_count else 0.0

            if total_goals > 0:
                total_goals += gi_count
                completed_goals += gi_completed
                avg_progress = round((avg_progress * (total_goals - gi_count) + gi_avg * gi_count) / total_goals, 1)
            else:
                total_goals = gi_count
                completed_goals = gi_completed
                avg_progress = round(gi_avg, 1)

        # 4. Assigned Tasks
        tasks_qs = InternTask.objects.filter(intern=profile)
        total_tasks = tasks_qs.count()
        pending_tasks = tasks_qs.exclude(status=TaskStatus.COMPLETED).count()

        # 5. Published Results (Privacy-shielded)
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).order_by('-published_at', '-created_at').first()

        results_data = None
        if published_appraisal:
            calc_score = ScoringService.calculate_cycle_score(profile, published_appraisal.cycle)
            results_data = {
                'isPublished': True,
                'overallScore': float(published_appraisal.overall_score) if published_appraisal.overall_score is not None else float(calc_score.get('overall_score', 0)),
                'classification': published_appraisal.classification or get_performance_classification(published_appraisal.overall_score),
                'reviewerComments': published_appraisal.reviewer_comments,
                'strengths': published_appraisal.strengths,
                'areasForImprovement': published_appraisal.areas_for_improvement,
                'recommendations': published_appraisal.recommendations,
                'publishedAt': published_appraisal.published_at.isoformat() if published_appraisal.published_at else None,
                'allowInternReply': published_appraisal.allow_intern_reply
            }
        else:
            results_data = {
                'isPublished': False,
                'overallScore': None,
                'classification': None,
                'reviewerComments': None,
                'strengths': [],
                'areasForImprovement': [],
                'recommendations': None,
                'publishedAt': None,
                'allowInternReply': False
            }

        # 6. Deadlines Tracker (Dynamic)
        deadlines = []
        for g in goals_qs.exclude(status=GoalStatus.COMPLETED).order_by('due_date')[:5]:
            days_left = (g.due_date - today).days
            st = 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'UPCOMING')
            deadlines.append({
                'id': str(g.id),
                'title': g.title,
                'type': 'GOAL',
                'dueDate': g.due_date.isoformat(),
                'daysLeft': days_left,
                'status': st
            })

        for gi in goal_items_qs.exclude(status='COMPLETED')[:5]:
            cycle_end = gi.goal_set.cycle.end_date if (gi.goal_set.cycle and gi.goal_set.cycle.end_date) else None
            if cycle_end:
                days_left = (cycle_end - today).days
                st = 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'UPCOMING')
                deadlines.append({
                    'id': f"gi-{gi.id}",
                    'title': gi.title,
                    'type': 'GOAL',
                    'dueDate': cycle_end.isoformat(),
                    'daysLeft': days_left,
                    'status': st
                })

        for t in tasks_qs.exclude(status=TaskStatus.COMPLETED).order_by('due_date')[:5]:
            days_left = (t.due_date - today).days
            st = 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'UPCOMING')
            deadlines.append({
                'id': str(t.id),
                'title': t.title,
                'type': 'TASK',
                'dueDate': t.due_date.isoformat(),
                'daysLeft': days_left,
                'status': st
            })

        if active_cycle and active_cycle.self_assessment_deadline:
            days_left = (active_cycle.self_assessment_deadline - today).days
            st = 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'UPCOMING')
            deadlines.append({
                'id': f"cycle-self-{active_cycle.id}",
                'title': f"Self-Assessment Cutoff ({active_cycle.name})",
                'type': 'EVALUATION',
                'dueDate': active_cycle.self_assessment_deadline.isoformat(),
                'daysLeft': days_left,
                'status': st
            })

        deadlines.sort(key=lambda d: d['daysLeft'])

        # Weight distribution parameters
        target_cycle = published_appraisal.cycle if published_appraisal else active_cycle
        calc_score = ScoringService.calculate_cycle_score(profile, target_cycle) if target_cycle else {}
        weight_dist = calc_score.get('weight_distribution', {
            'goals_and_kpis': 40.0,
            'manager_evaluation': 40.0,
            'self_assessment': 20.0
        })
        eval_params = calc_score.get('evaluation_parameters', [])

        return Response({
            'code': 200,
            'message': 'Success',
            'data': {
                'profile': {
                    'name': profile.full_name,
                    'email': user.email,
                    'employeeCode': profile.employee_code,
                    'designation': profile.designation,
                    'department': profile.department.name if profile.department else 'General'
                },
                'mentor': mentor_data,
                'cycle': cycle_data,
                'scorecard': {
                    'totalGoals': total_goals,
                    'completedGoals': completed_goals,
                    'averageProgress': avg_progress,
                    'totalTasks': total_tasks,
                    'pendingTasksCount': pending_tasks,
                    'weightDistribution': weight_dist,
                    'evaluationParameters': eval_params
                },
                'personalScorecard': {
                    'totalGoals': total_goals,
                    'completedGoals': completed_goals,
                    'averageProgress': avg_progress,
                    'totalTasks': total_tasks,
                    'pendingTasksCount': pending_tasks,
                    'weightDistribution': weight_dist,
                    'evaluationParameters': eval_params
                },
                'deadlines': deadlines,
                'publishedResults': results_data
            }
        })


# ==============================================================================
# 2. GOALS & PROGRESS
# ==============================================================================
class InternGoalsView(APIView):
    """
    List all assigned goals for the authenticated intern.
    Combines both direct Goal records and HR-assigned GoalSet / GoalItem records.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        direct_goals = Goal.objects.filter(employee=profile).select_related('cycle', 'assigned_by').order_by('due_date')
        direct_data = list(InternGoalListSerializer(direct_goals, many=True).data)

        # Also load all GoalItems assigned via HR KPI Library / GoalSets
        goal_items = GoalItem.objects.filter(
            goal_set__employee=profile
        ).select_related('goal_set__cycle', 'goal_set__assigned_by', 'category').order_by('id')

        items_data = []
        for gi in goal_items:
            cycle_name = gi.goal_set.cycle.name if gi.goal_set.cycle else 'Active Term'
            cycle_end = gi.goal_set.cycle.end_date.isoformat() if (gi.goal_set.cycle and gi.goal_set.cycle.end_date) else None
            assigned_by_user = gi.goal_set.assigned_by
            assigned_name = get_user_display_name(assigned_by_user)

            score_val = float(gi.score_percent)
            target_val = float(gi.target_value) if gi.target_value else 100.0
            unit = gi.unit or '%'

            desc = gi.description or f"Target: {target_val} {unit}"
            if gi.category and gi.category.name:
                desc = f"[{gi.category.name}] {desc}"

            # Collect any progress entries as comments
            entries = []
            for pe in gi.progress_entries.all().select_related('logged_by').order_by('created_at'):
                logged_name = pe.logged_by.username if pe.logged_by else 'Intern'
                entries.append({
                    'id': f"pe-{pe.id}",
                    'authorName': logged_name,
                    'authorRole': getattr(pe.logged_by, 'role', 'INTERN') if pe.logged_by else 'INTERN',
                    'comment': pe.evidence_note or f"Updated progress to {float(pe.progress_percent)}%",
                    'isMentor': False,
                    'createdAt': pe.created_at.strftime('%Y-%m-%d %H:%M'),
                    'parentId': None
                })

            items_data.append({
                'id': str(gi.id),
                'title': gi.title,
                'description': desc,
                'due_date': cycle_end,
                'dueDate': cycle_end,
                'status': 'COMPLETED' if gi.status == 'COMPLETED' or score_val >= 100.0 else ('IN_PROGRESS' if score_val > 0.0 or gi.status == 'IN_PROGRESS' else 'NOT_STARTED'),
                'priority': 'HIGH' if gi.weight_percent >= 30 else 'MEDIUM',
                'completion_percentage': score_val,
                'completionPercentage': score_val,
                'progress': score_val,
                'weight': gi.weight_percent,
                'weightage': gi.weight_percent,
                'cycle': str(gi.goal_set.cycle.id) if gi.goal_set.cycle else None,
                'cycle_name': cycle_name,
                'cycleName': cycle_name,
                'assigned_by_name': assigned_name,
                'assignedByName': assigned_name,
                'comments_count': len(entries),
                'evidence_count': 0,
                'comments': entries,
                'created_at': gi.created_at.isoformat() if gi.created_at else None,
                'updated_at': gi.updated_at.isoformat() if gi.updated_at else None,
            })

        combined_goals = direct_data + items_data
        return Response({'code': 200, 'data': combined_goals})


class InternGoalDetailView(APIView):
    """
    Retrieve single goal detail with complete audit progress updates and comment counts.
    Anti-IDOR: Returns 404 if goal does not belong to the authenticated intern.
    Supports both direct Goal models and GoalItem models.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        if is_valid_uuid(pk):
            goal = Goal.objects.filter(id=pk, employee=profile).select_related('cycle', 'assigned_by').first()
            if goal:
                serializer = InternGoalListSerializer(goal)
                progress_updates = [{
                    'id': str(p.id),
                    'progressPercentage': float(p.progress_percentage),
                    'comment': p.comment,
                    'updatedBy': p.updated_by.username if p.updated_by else 'Intern',
                    'createdAt': p.created_at.strftime('%Y-%m-%d %H:%M')
                } for p in goal.progress_updates.all().order_by('-created_at')]
                data = serializer.data
                data['progressUpdates'] = progress_updates
                return Response({'code': 200, 'data': data})

        # Try GoalItem
        goal_item = GoalItem.objects.filter(id=pk, goal_set__employee=profile).select_related('goal_set__cycle', 'goal_set__assigned_by', 'category').first()
        if goal_item:
            cycle_name = goal_item.goal_set.cycle.name if goal_item.goal_set.cycle else 'Active Term'
            cycle_end = goal_item.goal_set.cycle.end_date.isoformat() if (goal_item.goal_set.cycle and goal_item.goal_set.cycle.end_date) else None
            score_val = float(goal_item.score_percent)
            updates = [{
                'id': str(pe.id),
                'progressPercentage': float(pe.progress_percent),
                'comment': pe.evidence_note or '',
                'updatedBy': pe.logged_by.username if pe.logged_by else 'Intern',
                'createdAt': pe.created_at.strftime('%Y-%m-%d %H:%M')
            } for pe in goal_item.progress_entries.all().order_by('-created_at')]

            data = {
                'id': str(goal_item.id),
                'title': goal_item.title,
                'description': goal_item.description or '',
                'due_date': cycle_end,
                'dueDate': cycle_end,
                'status': goal_item.status,
                'priority': 'MEDIUM',
                'completion_percentage': score_val,
                'completionPercentage': score_val,
                'progress': score_val,
                'weight': goal_item.weight_percent,
                'weightage': goal_item.weight_percent,
                'cycle_name': cycle_name,
                'cycleName': cycle_name,
                'assigned_by_name': goal_item.goal_set.assigned_by.username if goal_item.goal_set.assigned_by else 'HR Admin',
                'progressUpdates': updates
            }
            return Response({'code': 200, 'data': data})

        return Response({'code': 404, 'message': 'Goal not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)


class InternUpdateProgressView(APIView):
    """
    Update goal progress percentage (0.00 to 100.00).
    Enforces that the intern can only update progress, not goal title, weight, or owner.
    Creates an auditable GoalProgress / KpiProgressEntry record.
    Supports both direct Goal models and GoalItem models.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        return self.post(request, pk)

    def post(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        serializer = InternGoalProgressUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'code': 400, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        new_progress = serializer.validated_data['progress']
        comment = serializer.validated_data.get('comment', '').strip()

        # 1. Try finding direct Goal
        if is_valid_uuid(pk):
            goal = Goal.objects.filter(id=pk, employee=profile).first()
            if goal:
                old_progress = goal.completion_percentage
                goal.completion_percentage = new_progress
                if new_progress >= Decimal('100.00'):
                    goal.status = GoalStatus.COMPLETED
                elif new_progress > Decimal('0.00') and goal.status == GoalStatus.NOT_STARTED:
                    goal.status = GoalStatus.IN_PROGRESS
                goal.save(update_fields=['completion_percentage', 'status', 'updated_at'])

                progress_record = GoalProgress.objects.create(
                    goal=goal,
                    updated_by=request.user,
                    progress_percentage=new_progress,
                    comment=comment or f"Progress updated from {old_progress}% to {new_progress}%"
                )
                return Response({
                    'code': 200,
                    'message': 'Goal progress updated successfully',
                    'data': {
                        'id': str(goal.id),
                        'progress': float(goal.completion_percentage),
                        'status': goal.status,
                        'auditId': str(progress_record.id)
                    }
                })

        # 2. Try finding GoalItem
        goal_item = GoalItem.objects.filter(id=pk, goal_set__employee=profile).first()
        if goal_item:
            goal_item.current_progress = (new_progress / Decimal('100.00')) * goal_item.target_value
            if new_progress >= Decimal('100.00'):
                goal_item.status = 'COMPLETED'
            elif new_progress > Decimal('0.00'):
                goal_item.status = 'IN_PROGRESS'
            goal_item.save(update_fields=['current_progress', 'status', 'updated_at'])

            entry = KpiProgressEntry.objects.create(
                goal_item=goal_item,
                actual_value=goal_item.current_progress,
                progress_percent=new_progress,
                evidence_note=comment or f"Progress updated to {new_progress}%",
                logged_by=request.user
            )
            return Response({
                'code': 200,
                'message': 'Goal progress updated successfully',
                'data': {
                    'id': str(goal_item.id),
                    'progress': float(goal_item.score_percent),
                    'status': goal_item.status,
                    'auditId': str(entry.id)
                }
            })

        return Response({'code': 404, 'message': 'Goal not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)


# ==============================================================================
# 3. GOAL COMMENTS
# ==============================================================================
class InternGoalCommentsView(APIView):
    """
    View comments thread on a goal or post a new progress note/reply to mentor.
    Anti-IDOR: Goal must belong to the authenticated intern (or assigned mentor).
    Supports both direct Goal models and GoalItem models.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        is_mentor = profile.manager == request.user or request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]

        if is_valid_uuid(pk):
            goal = Goal.objects.filter(id=pk).first()
            if goal and (goal.employee == profile or is_mentor):
                comments = InternGoalComment.objects.filter(goal=goal).order_by('created_at')
                serializer = InternGoalCommentSerializer(comments, many=True)
                return Response({'code': 200, 'data': serializer.data})

        goal_item = GoalItem.objects.filter(id=pk).first()
        if goal_item and (goal_item.goal_set.employee == profile or is_mentor):
            entries = []
            for pe in goal_item.progress_entries.all().select_related('logged_by').order_by('created_at'):
                entries.append({
                    'id': str(pe.id),
                    'authorName': pe.logged_by.username if pe.logged_by else 'Intern',
                    'authorRole': getattr(pe.logged_by, 'role', 'INTERN') if pe.logged_by else 'INTERN',
                    'comment': pe.evidence_note or '',
                    'isMentor': False,
                    'createdAt': pe.created_at.strftime('%Y-%m-%d %H:%M'),
                    'parentId': None
                })
            return Response({'code': 200, 'data': entries})

        return Response({'code': 404, 'message': 'Goal not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        is_mentor = profile.manager == request.user or request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]

        comment_text = request.data.get('comment', '').strip()
        if not comment_text:
            return Response({'code': 400, 'message': 'Comment text cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        if is_valid_uuid(pk):
            goal = Goal.objects.filter(id=pk).first()
            if goal and (goal.employee == profile or is_mentor):
                parent_id = request.data.get('parentId') or request.data.get('parent')
                parent_comment = None
                if parent_id:
                    parent_comment = InternGoalComment.objects.filter(id=parent_id, goal=goal).first()

                author_name = get_user_display_name(request.user)

                new_comment = InternGoalComment.objects.create(
                    goal=goal,
                    author=request.user,
                    author_name=author_name,
                    author_role='MENTOR' if is_mentor else 'INTERN',
                    comment=comment_text,
                    is_mentor=is_mentor,
                    parent=parent_comment
                )

                serializer = InternGoalCommentSerializer(new_comment)
                return Response({'code': 201, 'message': 'Comment posted successfully', 'data': serializer.data}, status=status.HTTP_201_CREATED)

        goal_item = GoalItem.objects.filter(id=pk).first()
        if goal_item and (goal_item.goal_set.employee == profile or is_mentor):
            entry = KpiProgressEntry.objects.create(
                goal_item=goal_item,
                actual_value=goal_item.current_progress,
                progress_percent=goal_item.score_percent,
                evidence_note=comment_text,
                logged_by=request.user
            )
            return Response({
                'code': 201,
                'message': 'Comment posted successfully',
                'data': {
                    'id': str(entry.id),
                    'authorName': get_user_display_name(request.user),
                    'authorRole': getattr(request.user, 'role', 'INTERN'),
                    'comment': comment_text,
                    'isMentor': is_mentor,
                    'createdAt': entry.created_at.strftime('%Y-%m-%d %H:%M'),
                    'parentId': None
                }
            }, status=status.HTTP_201_CREATED)

        return Response({'code': 404, 'message': 'Goal not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)


# ==============================================================================
# 4. EVIDENCE SUBMISSIONS
# ==============================================================================
class InternEvidenceView(APIView):
    """
    List submitted evidence and submit new proof of work against goals.
    Strict server-side validation:
    - Disallows executable/script file extensions (.exe, .sh, .py, etc.)
    - Limits file sizes to 10MB
    - Enforces goal ownership
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        evidence_list = EvidenceSubmission.objects.filter(employee=profile).select_related('goal', 'reviewed_by').order_by('-created_at')
        serializer = InternEvidenceSubmissionSerializer(evidence_list, many=True)
        return Response({'code': 200, 'data': serializer.data})

    def post(self, request):
        profile = get_authenticated_intern_profile(request.user)
        goal_id = request.data.get('goalId') or request.data.get('goal_id') or request.data.get('goal')
        if not goal_id:
            return Response({'code': 400, 'message': 'Goal ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        goal = Goal.objects.filter(id=goal_id, employee=profile).first()
        if not goal:
            return Response({'code': 400, 'message': 'Specified goal does not belong to your assigned goals.'}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title', '').strip()
        if not title:
            return Response({'code': 400, 'message': 'Evidence title is required.'}, status=status.HTTP_400_BAD_REQUEST)

        description = request.data.get('description', '').strip()
        external_url = request.data.get('external_url') or request.data.get('externalUrl', '')
        file_obj = request.FILES.get('file') or request.FILES.get('file_attachment')

        if not file_obj and not external_url:
            return Response({'code': 400, 'message': 'Please provide either a file attachment or an external URL.'}, status=status.HTTP_400_BAD_REQUEST)

        # File validation
        if file_obj:
            try:
                validate_file_attachment(file_obj)
            except ValidationError as ve:
                return Response({'code': 400, 'message': ve.detail[0] if isinstance(ve.detail, list) else str(ve.detail)}, status=status.HTTP_400_BAD_REQUEST)

        # Duplicate submission protection (same title and goal within 1 hour)
        recent_duplicate = EvidenceSubmission.objects.filter(
            employee=profile,
            goal=goal,
            title__iexact=title,
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).first()
        if recent_duplicate:
            return Response({
                'code': 400,
                'message': 'A duplicate evidence submission with this title was already submitted recently for this goal.'
            }, status=status.HTTP_400_BAD_REQUEST)

        evidence = EvidenceSubmission.objects.create(
            employee=profile,
            goal=goal,
            title=title,
            description=description,
            external_url=external_url.strip() if external_url else None,
            file_attachment=file_obj,
            review_status=EvidenceReviewStatus.PENDING
        )

        # Dispatch event notification to mentor
        NotificationService.notify_evidence_submitted(evidence)

        serializer = InternEvidenceSubmissionSerializer(evidence)
        return Response({
            'code': 201,
            'message': 'Evidence submitted successfully for mentor verification',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)


class InternEvidenceDetailView(APIView):
    """
    Single evidence detail. Anti-IDOR: Returns 404 if not owned.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        evidence = EvidenceSubmission.objects.filter(id=pk, employee=profile).select_related('goal', 'reviewed_by').first()
        if not evidence:
            return Response({'code': 404, 'message': 'Evidence submission not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = InternEvidenceSubmissionSerializer(evidence)
        return Response({'code': 200, 'data': serializer.data})


# ==============================================================================
# 5. ASSIGNED TASKS & LIFECYCLE
# ==============================================================================
class InternTasksView(APIView):
    """
    List all assigned tasks for the intern, filterable by ?status=...
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        tasks = InternTask.objects.filter(intern=profile).select_related('reviewed_by')
        status_filter = request.query_params.get('status')
        if status_filter:
            tasks = tasks.filter(status=status_filter.upper())
        serializer = InternTaskSerializer(tasks, many=True)
        return Response({'code': 200, 'data': serializer.data})


class InternTaskDetailView(APIView):
    """
    Retrieve single task detail or transition status (e.g. ASSIGNED -> IN_PROGRESS).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        task = InternTask.objects.filter(id=pk, intern=profile).select_related('reviewed_by').first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = InternTaskSerializer(task)
        return Response({'code': 200, 'data': serializer.data})

    def patch(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        task = InternTask.objects.filter(id=pk, intern=profile).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        target_status = request.data.get('status')
        if target_status == TaskStatus.IN_PROGRESS and task.status == TaskStatus.ASSIGNED:
            task.status = TaskStatus.IN_PROGRESS
            task.save()
            return Response({'code': 200, 'message': 'Task marked in progress', 'data': InternTaskSerializer(task).data})
        return Response({'code': 400, 'message': 'Invalid status transition requested.'}, status=status.HTTP_400_BAD_REQUEST)


class InternCompleteTaskView(APIView):
    """
    Submit completion for an assigned task.
    Enforces mentor review workflow:
    - If requires_mentor_review=True -> sets status=SUBMITTED (NOT completed).
    - If requires_mentor_review=False -> sets status=COMPLETED (if permitted).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        task = InternTask.objects.filter(id=pk, intern=profile).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InternTaskCompleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'code': 400, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        hours_spent = serializer.validated_data.get('hours_spent', Decimal('0.00'))
        completion_notes = serializer.validated_data.get('completion_notes', '')
        artifact_url = serializer.validated_data.get('artifact_url', '')
        completed_at = serializer.validated_data.get('completed_at') or date.today()

        old_status = task.status
        task.hours_spent = hours_spent
        task.completion_notes = completion_notes
        task.artifact_url = artifact_url
        task.completed_at = completed_at

        if task.requires_mentor_review:
            # Must be reviewed by mentor
            task.status = TaskStatus.SUBMITTED
            task.save()
            NotificationService.notify_task_status_changed(task, old_status, TaskStatus.SUBMITTED, actor=request.user)
            return Response({
                'code': 200,
                'message': 'Task submitted for mentor verification. Your mentor will review and finalize completion.',
                'data': InternTaskSerializer(task).data
            })
        else:
            if not task.is_permitted_to_complete:
                return Response({
                    'code': 403,
                    'message': 'You do not have permission to self-complete this task directly.'
                }, status=status.HTTP_403_FORBIDDEN)
            task.status = TaskStatus.COMPLETED
            task.save()
            NotificationService.notify_task_status_changed(task, old_status, TaskStatus.COMPLETED, actor=request.user)
            return Response({
                'code': 200,
                'message': 'Task completed successfully',
                'data': InternTaskSerializer(task).data
            })


class InternTaskReviewView(APIView):
    """
    Mentor/HR action to approve or request revision on a submitted task.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        task = InternTask.objects.filter(id=pk).select_related('intern__manager').first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Authorized only for assigned mentor, manager, or HR
        is_mentor = task.intern.manager == request.user or request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]
        if not is_mentor:
            return Response({'code': 403, 'message': 'Only the assigned mentor or HR can review submitted tasks.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = InternTaskReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'code': 400, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data['action']
        feedback = serializer.validated_data.get('feedback', '')

        old_status = task.status
        task.reviewed_by = request.user
        task.reviewed_at = timezone.now()
        task.review_feedback = feedback

        if action == 'APPROVE':
            task.status = TaskStatus.COMPLETED
            task.save()
            NotificationService.notify_task_status_changed(task, old_status, TaskStatus.COMPLETED, actor=request.user)
            return Response({'code': 200, 'message': 'Task approved and marked completed.', 'data': InternTaskSerializer(task).data})
        else:
            task.status = TaskStatus.IN_PROGRESS
            task.save()
            NotificationService.notify_task_status_changed(task, old_status, TaskStatus.IN_PROGRESS, actor=request.user)
            return Response({'code': 200, 'message': 'Task returned to intern for revision with feedback.', 'data': InternTaskSerializer(task).data})


# ==============================================================================
# 6. HR-PUBLISHED FORMS & QUESTIONNAIRES
# ==============================================================================
class InternFormsListView(APIView):
    """
    List all PUBLISHED forms targeted to this intern's role, cohort, and active cycle.
    Draft forms are strictly invisible.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)

        # Targeting: published status AND matching role AND (matching dept OR global)
        qs = InternForm.objects.filter(
            status=FormStatus.PUBLISHED,
            target_role__in=['INTERN', 'ALL']
        )
        if profile.department:
            qs = qs.filter(Q(department=profile.department) | Q(department__isnull=True))
        else:
            qs = qs.filter(department__isnull=True)

        serializer = InternFormListSerializer(qs, many=True, context={'request': request})
        return Response({'code': 200, 'data': serializer.data})


class InternFormDetailView(APIView):
    """
    Retrieve single published form with its structured questions and current intern submission (draft or final).
    Anti-IDOR: Access denied if form is not published or targeting does not match.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        form = InternForm.objects.filter(
            id=pk,
            status=FormStatus.PUBLISHED,
            target_role__in=['INTERN', 'ALL']
        ).prefetch_related('questions').first()

        if not form:
            return Response({'code': 404, 'message': 'Form not found or not published.'}, status=status.HTTP_404_NOT_FOUND)

        if form.department and form.department != profile.department:
            return Response({'code': 404, 'message': 'Form not targeted to your department.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InternFormDetailSerializer(form, context={'request': request})
        return Response({'code': 200, 'data': serializer.data})


class InternFormSubmitView(APIView):
    """
    Save draft or submit final answers to an HR-published form.
    Validates all answer types (numeric, rating, choice, date, text) server-side.
    Locks form against further edits once is_submitted=True.
    Anti-IDOR: intern is strictly derived from request.user.profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        form = InternForm.objects.filter(
            id=pk,
            status=FormStatus.PUBLISHED,
            target_role__in=['INTERN', 'ALL']
        ).first()

        if not form:
            return Response({'code': 404, 'message': 'Form not found or not published.'}, status=status.HTTP_404_NOT_FOUND)

        if form.department and form.department != profile.department:
            return Response({'code': 403, 'message': 'This form is not targeted to your department.'}, status=status.HTTP_403_FORBIDDEN)

        # Check existing submission
        submission = InternFormSubmission.objects.filter(form=form, intern=profile).first()
        if submission and submission.is_submitted:
            return Response({
                'code': 400,
                'message': 'You have already finalized your submission for this form. Further edits are locked.'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = InternFormSubmitSerializer(data=request.data, context={'form': form})
        if not serializer.is_valid():
            return Response({'code': 400, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        answers = serializer.validated_data['answers']
        is_submitted = serializer.validated_data.get('is_submitted', False)

        if not submission:
            submission = InternFormSubmission(
                form=form,
                intern=profile,
                cycle=form.cycle
            )

        submission.answers = answers
        submission.is_submitted = is_submitted
        if is_submitted:
            submission.submitted_at = timezone.now()
        submission.save()

        status_msg = "Form submitted successfully." if is_submitted else "Draft answers saved successfully."
        return Response({
            'code': 200,
            'message': status_msg,
            'data': {
                'id': str(submission.id),
                'isSubmitted': submission.is_submitted,
                'submittedAt': submission.submitted_at.isoformat() if submission.submitted_at else None
            }
        })


# ==============================================================================
# 7. SELF-ASSESSMENT & REFLECTION
# ==============================================================================
class InternSelfAppraisalView(APIView):
    """
    Retrieve or submit 1.0–10.0 self-rating and qualitative reflection answers.
    Enforces cycle self-assessment window and locks upon final submission.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        today = date.today()
        cycle = PerformanceCycle.objects.filter(
            Q(status=CycleStatus.ACTIVE) | Q(status=CycleStatus.REVIEW_PERIOD),
            start_date__lte=today,
            end_date__gte=today
        ).order_by('-start_date').first()

        if not cycle:
            return Response({
                'code': 200,
                'data': {
                    'isOpen': False,
                    'message': 'No active evaluation cycle currently open for self-assessment.'
                }
            })

        submission = InternSelfAppraisalSubmission.objects.filter(intern=profile, cycle=cycle).first()
        is_open = True
        if cycle.self_assessment_deadline and today > cycle.self_assessment_deadline:
            is_open = False

        data = {
            'isOpen': is_open,
            'cycleId': str(cycle.id),
            'cycleName': cycle.name,
            'deadline': cycle.self_assessment_deadline.isoformat() if cycle.self_assessment_deadline else cycle.end_date.isoformat(),
            'submission': InternSelfAppraisalSerializer(submission).data if submission else None
        }
        return Response({'code': 200, 'data': data})

    def post(self, request):
        profile = get_authenticated_intern_profile(request.user)
        today = date.today()
        cycle = PerformanceCycle.objects.filter(
            Q(status=CycleStatus.ACTIVE) | Q(status=CycleStatus.REVIEW_PERIOD),
            start_date__lte=today,
            end_date__gte=today
        ).order_by('-start_date').first()

        if not cycle:
            return Response({'code': 400, 'message': 'No active evaluation cycle open.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing submission immutability
        submission = InternSelfAppraisalSubmission.objects.filter(intern=profile, cycle=cycle).first()
        if submission and submission.is_submitted:
            return Response({
                'code': 400,
                'message': 'You have already finalized your self-assessment for this cycle. Editing is locked.'
            }, status=status.HTTP_400_BAD_REQUEST)

        self_rating = request.data.get('selfRating') or request.data.get('self_rating')
        if self_rating is None:
            return Response({'code': 400, 'message': 'Self-rating score is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rating_val = Decimal(str(self_rating))
        except (InvalidOperation, ValueError):
            return Response({'code': 400, 'message': 'Invalid rating number.'}, status=status.HTTP_400_BAD_REQUEST)

        if rating_val < Decimal('1.0') or rating_val > Decimal('10.0'):
            return Response({'code': 400, 'message': 'Self-rating must be between 1.0 and 10.0.'}, status=status.HTTP_400_BAD_REQUEST)

        is_sub = request.data.get('is_submitted')
        if is_sub is None:
            is_sub = request.data.get('isSubmitted')
        is_final = True if is_sub is None else bool(is_sub)

        if not submission:
            submission = InternSelfAppraisalSubmission(intern=profile, cycle=cycle)

        submission.self_rating = rating_val
        submission.achievements = request.data.get('achievements', '')
        submission.challenges = request.data.get('challenges', '')
        submission.skills_acquired = request.data.get('skillsAcquired', request.data.get('skills_acquired', ''))
        submission.mentorship_needs = request.data.get('mentorshipNeeds', request.data.get('mentorship_needs', ''))
        submission.reflection_summary = request.data.get('reflectionSummary', request.data.get('reflection_summary', ''))
        submission.is_submitted = is_final
        if is_final:
            submission.submitted_at = timezone.now()
        submission.save()

        return Response({
            'code': 200,
            'message': 'Self-assessment submitted successfully' if is_final else 'Self-assessment draft saved',
            'data': InternSelfAppraisalSerializer(submission).data
        })


# ==============================================================================
# 8. PUBLISHED RESULTS, FEEDBACK & REPLIES
# ==============================================================================
class InternPublishedFeedbackView(APIView):
    """
    Retrieve published mentor feedback, official calibrated score, classification,
    and growth recommendations. Strictly masked if status != PUBLISHED.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).select_related('cycle', 'reviewer').order_by('-published_at', '-created_at').first()

        if not published_appraisal:
            return Response({
                'code': 200,
                'data': {
                    'isPublished': False,
                    'message': 'Evaluation results have not been published yet.'
                }
            })

        calc_score = ScoringService.calculate_cycle_score(profile, published_appraisal.cycle)
        weight_dist = calc_score.get('weight_distribution', {
            'goals_and_kpis': 40.0,
            'manager_evaluation': 40.0,
            'self_assessment': 20.0
        })
        eval_params = calc_score.get('evaluation_parameters', [])

        replies = InternFeedbackReply.objects.filter(
            intern=profile,
            appraisal=published_appraisal
        ).order_by('created_at')

        reviewer_name = published_appraisal.reviewer.username if published_appraisal.reviewer else 'Assigned Mentor'
        if published_appraisal.reviewer and hasattr(published_appraisal.reviewer, 'profile') and published_appraisal.reviewer.profile:
            reviewer_name = published_appraisal.reviewer.profile.full_name or reviewer_name

        areas_for_improvement = published_appraisal.areas_for_improvement or []

        return Response({
            'code': 200,
            'data': {
                'isPublished': True,
                'cycleId': str(published_appraisal.cycle_id),
                'cycleName': published_appraisal.cycle.name,
                'overallScore': float(published_appraisal.overall_score) if published_appraisal.overall_score is not None else float(calc_score.get('overall_score', 0)),
                'classification': published_appraisal.classification or get_performance_classification(published_appraisal.overall_score),
                'performanceClassification': published_appraisal.classification or get_performance_classification(published_appraisal.overall_score),
                'reviewerName': reviewer_name,
                'reviewerComments': published_appraisal.reviewer_comments,
                'mentorFeedback': published_appraisal.reviewer_comments or '',
                'strengths': published_appraisal.strengths,
                'areasForImprovement': areas_for_improvement,
                'recommendations': published_appraisal.recommendations,
                'allowInternReply': published_appraisal.allow_intern_reply,
                'weightDistribution': weight_dist,
                'evaluationParameters': eval_params,
                'replies': [{
                    'id': str(r.id),
                    'replyText': r.reply_text,
                    'createdAt': r.created_at.strftime('%Y-%m-%d %H:%M')
                } for r in replies]
            }
        })

    def post(self, request):
        return InternFeedbackReplyView().post(request)


class InternFeedbackReplyView(APIView):
    """
    Reply to published mentor remarks where allow_intern_reply=True.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = get_authenticated_intern_profile(request.user)
        appraisal_id = request.data.get('appraisalId') or request.data.get('appraisal_id')

        query = Appraisal.objects.filter(employee=profile, status=AppraisalStatus.PUBLISHED)
        if appraisal_id:
            published_appraisal = query.filter(id=appraisal_id).first()
        else:
            published_appraisal = query.order_by('-published_at').first()

        if not published_appraisal:
            return Response({'code': 404, 'message': 'No published appraisal found to reply to.'}, status=status.HTTP_404_NOT_FOUND)

        if not published_appraisal.allow_intern_reply:
            return Response({'code': 403, 'message': 'Replies to this feedback are not currently permitted.'}, status=status.HTTP_403_FORBIDDEN)

        reply_text = request.data.get('replyText') or request.data.get('reply_text', '')
        if not reply_text.strip():
            return Response({'code': 400, 'message': 'Reply text cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        reply = InternFeedbackReply.objects.create(
            intern=profile,
            appraisal=published_appraisal,
            reply_text=reply_text.strip()
        )

        return Response({
            'code': 201,
            'message': 'Reply sent to your mentor',
            'data': {
                'id': str(reply.id),
                'replyText': reply.reply_text,
                'createdAt': reply.created_at.strftime('%Y-%m-%d %H:%M')
            }
        }, status=status.HTTP_201_CREATED)


# ==============================================================================
# 8. INTERNSHIP JOURNEY ROADMAP & MILESTONES (100% DATA-DRIVEN)
# ==============================================================================
class InternJourneyView(APIView):
    """
    Returns the comprehensive, end-to-end Internship Journey roadmap.
    100% data-driven from EmployeeProfile, Goals, InternTasks, Evidence, Self-Appraisal, and Published Appraisals.
    Zero mock data or hardcoded dates/scores.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = get_authenticated_intern_profile(user)
        except NotFound:
            return Response({
                'code': 404,
                'message': 'No profile found for authenticated account.',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        today = date.today()
        joining_date = profile.joining_date or (profile.created_at.date() if profile.created_at else today)
        days_active = max(1, (today - joining_date).days)

        # 1. Mentor Info
        mentor = profile.manager
        mentor_info = None
        if mentor:
            m_prof = getattr(mentor, 'profile', None)
            mentor_info = {
                'id': str(mentor.id),
                'name': m_prof.full_name if m_prof else mentor.username,
                'email': mentor.email,
                'designation': m_prof.designation if m_prof else 'Mentor',
                'department': m_prof.department.name if m_prof and m_prof.department else (profile.department.name if profile.department else 'Engineering')
            }

        # 2. Active Cycle
        active_cycle = PerformanceCycle.objects.filter(
            Q(status=CycleStatus.ACTIVE) | Q(status=CycleStatus.REVIEW_PERIOD),
            start_date__lte=today,
            end_date__gte=today
        ).order_by('-start_date').first()
        if not active_cycle:
            active_cycle = PerformanceCycle.objects.order_by('-start_date').first()

        # 3. Goals Stats
        goals_qs = Goal.objects.filter(employee=profile)
        total_goals = goals_qs.count()
        completed_goals = goals_qs.filter(
            Q(status=GoalStatus.COMPLETED) | Q(completion_percentage=Decimal('100.00'))
        ).count()
        avg_goal_progress = float(ScoringService.calculate_weighted_goal_progress(list(goals_qs)))

        # 4. Task Stats
        tasks_qs = InternTask.objects.filter(intern=profile)
        total_tasks = tasks_qs.count()
        completed_tasks = tasks_qs.filter(status=TaskStatus.COMPLETED).count()
        under_review_tasks = tasks_qs.filter(status=TaskStatus.UNDER_REVIEW).count()
        task_completion_rate = round((completed_tasks / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0

        # 5. Evidence Stats
        evidence_qs = EvidenceSubmission.objects.filter(employee=profile)
        total_evidence = evidence_qs.count()
        approved_evidence = evidence_qs.filter(review_status=EvidenceReviewStatus.APPROVED).count()

        # 6. Forms & Questionnaires Stats
        forms_submitted_count = InternFormSubmission.objects.filter(intern=profile).count()

        # 7. Self-Appraisal
        self_eval = None
        if active_cycle:
            self_eval = InternSelfAppraisalSubmission.objects.filter(intern=profile, cycle=active_cycle).first()
        if not self_eval:
            self_eval = InternSelfAppraisalSubmission.objects.filter(intern=profile).order_by('-updated_at').first()

        self_eval_submitted = bool(self_eval and self_eval.is_submitted)

        # 8. Published Appraisal / Results
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).order_by('-published_at', '-created_at').first()

        # Milestones Construction (Stages 1 through 5)
        # Stage 1: Placement & Onboarding
        milestone_1_status = 'COMPLETED'
        milestone_1_date = joining_date.isoformat()

        # Stage 2: Goal Alignment & Planning
        if total_goals > 0 and (completed_goals > 0 or avg_goal_progress >= 50.0):
            milestone_2_status = 'COMPLETED'
        elif total_goals > 0:
            milestone_2_status = 'IN_PROGRESS'
        else:
            milestone_2_status = 'PENDING'
        first_goal = goals_qs.order_by('created_at').first()
        milestone_2_date = first_goal.created_at.strftime('%Y-%m-%d') if first_goal else None

        # Stage 3: Sprints, Tasks & Deliverables
        if total_tasks > 0 and completed_tasks == total_tasks:
            milestone_3_status = 'COMPLETED'
        elif total_tasks > 0 or total_evidence > 0:
            milestone_3_status = 'IN_PROGRESS'
        else:
            milestone_3_status = 'PENDING'
        last_completed_task = tasks_qs.filter(status=TaskStatus.COMPLETED).order_by('-updated_at').first()
        milestone_3_date = last_completed_task.updated_at.strftime('%Y-%m-%d') if last_completed_task else None

        # Stage 4: Self-Appraisal & Growth Reflection
        if self_eval_submitted:
            milestone_4_status = 'COMPLETED'
            milestone_4_date = self_eval.submitted_at.strftime('%Y-%m-%d') if self_eval.submitted_at else None
        elif self_eval or forms_submitted_count > 0:
            milestone_4_status = 'IN_PROGRESS'
            milestone_4_date = None
        else:
            milestone_4_status = 'PENDING'
            milestone_4_date = None

        # Stage 5: Final Evaluation & Calibration
        if published_appraisal:
            milestone_5_status = 'COMPLETED'
            milestone_5_date = published_appraisal.published_at.strftime('%Y-%m-%d') if published_appraisal.published_at else None
        elif self_eval_submitted:
            milestone_5_status = 'IN_PROGRESS'
            milestone_5_date = None
        else:
            milestone_5_status = 'PENDING'
            milestone_5_date = None

        # Determine current stage (1 - 5)
        if milestone_5_status == 'COMPLETED':
            current_stage = 5
        elif milestone_4_status == 'COMPLETED' or milestone_5_status == 'IN_PROGRESS':
            current_stage = 5
        elif milestone_3_status == 'COMPLETED' or milestone_4_status == 'IN_PROGRESS':
            current_stage = 4
        elif milestone_2_status == 'COMPLETED' or milestone_3_status == 'IN_PROGRESS':
            current_stage = 3
        elif milestone_1_status == 'COMPLETED' or milestone_2_status == 'IN_PROGRESS':
            current_stage = 2
        else:
            current_stage = 1

        # Calculate Journey Progress Percentage
        completed_milestones = sum(1 for st in [milestone_1_status, milestone_2_status, milestone_3_status, milestone_4_status, milestone_5_status] if st == 'COMPLETED')
        in_prog_milestones = sum(1 for st in [milestone_1_status, milestone_2_status, milestone_3_status, milestone_4_status, milestone_5_status] if st == 'IN_PROGRESS')
        overall_progress = min(100, int((completed_milestones * 20.0) + (in_prog_milestones * 10.0)))

        dept_name = profile.department.name if profile.department else 'Engineering'
        milestones = [
            {
                'stage': 1,
                'key': 'ONBOARDING',
                'title': 'Placement & Onboarding',
                'category': 'Foundation',
                'status': milestone_1_status,
                'date': milestone_1_date,
                'description': f"Onboarded to {dept_name} as {profile.designation or 'Intern'}.",
                'metrics': [
                    {'label': 'Employee ID', 'value': profile.employee_code or 'Pending'},
                    {'label': 'Mentor', 'value': mentor_info['name'] if mentor_info else 'Unassigned'},
                    {'label': 'Start Date', 'value': joining_date.strftime('%b %d, %Y')}
                ]
            },
            {
                'stage': 2,
                'key': 'GOALS',
                'title': 'Quarterly Goal Alignment',
                'category': 'Commitment',
                'status': milestone_2_status,
                'date': milestone_2_date,
                'description': f"{total_goals} measurable performance objectives aligned with quarterly cycle.",
                'metrics': [
                    {'label': 'Total Goals', 'value': str(total_goals)},
                    {'label': 'Completed', 'value': str(completed_goals)},
                    {'label': 'Weighted Progress', 'value': f"{avg_goal_progress:.1f}%"}
                ]
            },
            {
                'stage': 3,
                'key': 'TASKS_EVIDENCE',
                'title': 'Sprint Deliverables & Evidence',
                'category': 'Execution',
                'status': milestone_3_status,
                'date': milestone_3_date,
                'description': f"Execution of assigned technical sprint tasks and artifact verification.",
                'metrics': [
                    {'label': 'Tasks Done', 'value': f"{completed_tasks}/{total_tasks}"},
                    {'label': 'Task Success Rate', 'value': f"{task_completion_rate}%"},
                    {'label': 'Evidence Artifacts', 'value': str(total_evidence)}
                ]
            },
            {
                'stage': 4,
                'key': 'SELF_APPRAISAL',
                'title': 'Self-Appraisal & Growth Reflection',
                'category': 'Reflection',
                'status': milestone_4_status,
                'date': milestone_4_date,
                'description': 'Submission of self-assessment rating, project achievements, and HR feedback questionnaires.',
                'metrics': [
                    {'label': 'Self-Evaluation', 'value': 'Submitted' if self_eval_submitted else ('In Draft' if self_eval else 'Pending')},
                    {'label': 'Self-Rating', 'value': f"{self_eval.self_rating}/10" if (self_eval and self_eval.self_rating) else 'Not Rated'},
                    {'label': 'Surveys Answered', 'value': str(forms_submitted_count)}
                ]
            },
            {
                'stage': 5,
                'key': 'FINAL_APPRAISAL',
                'title': 'Calibrated Evaluation & Recognition',
                'category': 'Outcome',
                'status': milestone_5_status,
                'date': milestone_5_date,
                'description': 'Multi-stakeholder review, mentor appraisal, and official performance calibration.',
                'metrics': [
                    {'label': 'Status', 'value': 'Published' if published_appraisal else ('In Calibration' if self_eval_submitted else 'Awaiting Review')},
                    {'label': 'Final Score', 'value': f"{published_appraisal.overall_score:.1f}%" if (published_appraisal and published_appraisal.overall_score is not None) else 'TBD'},
                    {'label': 'Classification', 'value': (published_appraisal.classification or get_performance_classification(published_appraisal.overall_score)) if published_appraisal else 'In Progress'}
                ]
            }
        ]

        return Response({
            'code': 200,
            'data': {
                'intern': {
                    'name': profile.full_name or get_user_display_name(profile.user),
                    'email': profile.user.email,
                    'employeeCode': profile.employee_code,
                    'department': dept_name,
                    'designation': profile.designation or 'Intern',
                    'joiningDate': joining_date.isoformat(),
                    'daysActive': days_active,
                },
                'mentor': mentor_info,
                'cycle': {
                    'name': active_cycle.name if active_cycle else 'Active Internship Period',
                    'status': active_cycle.status if active_cycle else 'ACTIVE',
                    'endDate': active_cycle.end_date.isoformat() if active_cycle else None,
                } if active_cycle else None,
                'currentStage': current_stage,
                'overallProgressPercent': overall_progress,
                'milestones': milestones,
                'stats': {
                    'goalsTotal': total_goals,
                    'goalsCompleted': completed_goals,
                    'goalsWeightedProgress': avg_goal_progress,
                    'tasksTotal': total_tasks,
                    'tasksCompleted': completed_tasks,
                    'tasksUnderReview': under_review_tasks,
                    'evidenceTotal': total_evidence,
                    'evidenceApproved': approved_evidence,
                    'formsSubmitted': forms_submitted_count,
                    'selfEvaluationSubmitted': self_eval_submitted,
                    'isResultsPublished': bool(published_appraisal)
                }
            }
        })
