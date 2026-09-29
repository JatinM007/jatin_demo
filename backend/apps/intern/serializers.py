import os
import re
from decimal import Decimal, InvalidOperation
from datetime import datetime
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.goals.models import Goal, GoalProgress
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.performance.models import PerformanceCycle, Appraisal, AppraisalStatus
from .models import (
    InternTask, TaskStatus, TaskPriority, TaskCategory,
    InternGoalComment, InternSelfAppraisalSubmission, InternFeedbackReply,
    InternForm, InternFormQuestion, InternFormSubmission,
    FormStatus, QuestionType
)

ALLOWED_FILE_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'zip', 'docx', 'txt'}
DISALLOWED_FILE_EXTENSIONS = {'exe', 'sh', 'bat', 'cmd', 'py', 'js', 'vbs', 'msi', 'bin', 'dll', 'com', 'scr', 'ps1'}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_file_attachment(file_obj):
    """Strict server-side validation for evidence file uploads."""
    if not file_obj:
        return
    if file_obj.size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(f"File size exceeds the 10MB limit (uploaded: {file_obj.size / (1024 * 1024):.1f}MB).")

    ext = os.path.splitext(file_obj.name)[1].lower().lstrip('.')
    if ext in DISALLOWED_FILE_EXTENSIONS:
        raise ValidationError(f"Security violation: executable or script file extension '.{ext}' is strictly forbidden.")
    if ext not in ALLOWED_FILE_EXTENSIONS:
        raise ValidationError(f"Unsupported file format '.{ext}'. Allowed types: {', '.join(sorted(ALLOWED_FILE_EXTENSIONS))}.")


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


class InternGoalListSerializer(serializers.ModelSerializer):
    progress = serializers.FloatField(source='completion_percentage', read_only=True)
    completionPercentage = serializers.FloatField(source='completion_percentage', read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    cycleName = serializers.CharField(source='cycle.name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True, default='HR Admin')
    assignedByName = serializers.CharField(source='assigned_by.username', read_only=True, default='HR Admin')
    comments_count = serializers.IntegerField(source='goal_comments.count', read_only=True)
    evidence_count = serializers.IntegerField(source='evidence_submissions.count', read_only=True)
    weight = serializers.SerializerMethodField()
    weightage = serializers.SerializerMethodField()
    dueDate = serializers.DateField(source='due_date', read_only=True)
    comments = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = (
            'id', 'title', 'description', 'due_date', 'dueDate', 'status', 'priority',
            'completion_percentage', 'completionPercentage', 'progress', 'weight', 'weightage',
            'cycle', 'cycle_name', 'cycleName',
            'assigned_by_name', 'assignedByName', 'comments_count', 'evidence_count', 'comments',
            'created_at', 'updated_at'
        )
        read_only_fields = fields

    def get_weight(self, obj):
        return float(getattr(obj, 'weight', 20.0) or 20.0)

    def get_weightage(self, obj):
        return float(getattr(obj, 'weight', 20.0) or 20.0)

    def get_comments(self, obj):
        if not hasattr(obj, 'goal_comments'):
            return []
        comments = []
        for c in obj.goal_comments.all().select_related('author').order_by('created_at'):
            author_role = getattr(c.author, 'role', 'MEMBER')
            comments.append({
                'id': str(c.id),
                'authorName': get_user_display_name(c.author),
                'authorRole': author_role,
                'comment': c.comment,
                'isMentor': author_role in ('MANAGER', 'HR', 'SUPER_ADMIN'),
                'createdAt': c.created_at.strftime('%Y-%m-%d %H:%M'),
                'parentId': str(c.parent_id) if c.parent_id else None
            })
        return comments


class InternGoalProgressUpdateSerializer(serializers.Serializer):
    progress = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal('0.00'),
        max_value=Decimal('100.00')
    )
    comment = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_progress(self, value):
        if value < Decimal('0.00') or value > Decimal('100.00'):
            raise ValidationError("Progress must be between 0.00 and 100.00 percent.")
        return value


class InternGoalCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(read_only=True)
    authorName = serializers.CharField(source='author_name', read_only=True)
    author_role = serializers.CharField(read_only=True)
    authorRole = serializers.CharField(source='author_role', read_only=True)
    is_mentor = serializers.BooleanField(read_only=True)
    isMentor = serializers.BooleanField(source='is_mentor', read_only=True)
    parentId = serializers.UUIDField(source='parent.id', read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True, format="%Y-%m-%d %H:%M")
    createdAt = serializers.DateTimeField(source='created_at', read_only=True, format="%Y-%m-%d %H:%M")

    class Meta:
        model = InternGoalComment
        fields = (
            'id', 'goal', 'author', 'author_name', 'authorName',
            'author_role', 'authorRole', 'comment', 'is_mentor', 'isMentor',
            'parent', 'parentId', 'created_at', 'createdAt'
        )
        read_only_fields = ('id', 'author', 'author_name', 'author_role', 'is_mentor', 'created_at')


class InternEvidenceSubmissionSerializer(serializers.ModelSerializer):
    goalId = serializers.UUIDField(source='goal.id', read_only=True, allow_null=True)
    goal_title = serializers.CharField(source='goal.title', read_only=True)
    goalTitle = serializers.CharField(source='goal.title', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True, default=None)
    reviewedByName = serializers.CharField(source='reviewed_by.username', read_only=True, default=None)
    reviewStatus = serializers.CharField(source='review_status', read_only=True)
    externalUrl = serializers.CharField(source='external_url', read_only=True, allow_null=True)
    fileAttachment = serializers.SerializerMethodField()
    fileName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True, format="%Y-%m-%d %H:%M")

    class Meta:
        model = EvidenceSubmission
        fields = (
            'id', 'goal', 'goalId', 'goal_title', 'goalTitle', 'title', 'description',
            'file_attachment', 'fileAttachment', 'fileName', 'external_url', 'externalUrl',
            'review_status', 'reviewStatus', 'review_notes', 'reviewed_by_name', 'reviewedByName',
            'reviewed_at', 'created_at', 'createdAt'
        )
        read_only_fields = ('id', 'review_status', 'review_notes', 'reviewed_by_name', 'reviewed_at', 'created_at')

    def get_fileName(self, obj):
        if obj.file_attachment:
            return os.path.basename(obj.file_attachment.name)
        return None

    def get_fileAttachment(self, obj):
        if obj.file_attachment:
            return obj.file_attachment.url
        return None

    def validate_file_attachment(self, value):
        validate_file_attachment(value)
        return value


class InternTaskSerializer(serializers.ModelSerializer):
    isCompleted = serializers.BooleanField(source='is_completed', read_only=True)
    completedAt = serializers.DateField(source='completed_at', read_only=True, allow_null=True)
    hoursSpent = serializers.FloatField(source='hours_spent', read_only=True, allow_null=True)
    completionNotes = serializers.CharField(source='completion_notes', read_only=True)
    artifactUrl = serializers.CharField(source='artifact_url', read_only=True)
    dueDate = serializers.DateField(source='due_date', read_only=True)
    requiresMentorReview = serializers.BooleanField(source='requires_mentor_review', read_only=True)
    isPermittedToComplete = serializers.BooleanField(source='is_permitted_to_complete', read_only=True)
    reviewedByName = serializers.CharField(source='reviewed_by.username', read_only=True, default=None)

    class Meta:
        model = InternTask
        fields = (
            'id', 'title', 'category', 'instructions', 'priority', 'due_date', 'dueDate',
            'status', 'requires_mentor_review', 'requiresMentorReview',
            'is_completed', 'isCompleted', 'completed_at', 'completedAt',
            'hours_spent', 'hoursSpent', 'completion_notes', 'completionNotes',
            'artifact_url', 'artifactUrl', 'is_permitted_to_complete', 'isPermittedToComplete',
            'reviewed_by', 'reviewedByName', 'reviewed_at', 'review_feedback', 'created_at'
        )
        read_only_fields = (
            'id', 'title', 'category', 'instructions', 'priority', 'due_date',
            'requires_mentor_review', 'is_permitted_to_complete', 'reviewed_by',
            'reviewed_at', 'review_feedback', 'created_at'
        )


class InternTaskCompleteSerializer(serializers.Serializer):
    hours_spent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, min_value=Decimal('0.00'), default=Decimal('0.00'))
    hoursSpent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, min_value=Decimal('0.00'), default=None)
    completion_notes = serializers.CharField(required=False, allow_blank=True, default='')
    completionNotes = serializers.CharField(required=False, allow_blank=True, default=None)
    artifact_url = serializers.CharField(required=False, allow_blank=True, default='')
    artifactUrl = serializers.CharField(required=False, allow_blank=True, default=None)
    completed_at = serializers.DateField(required=False, default=None)
    completedAt = serializers.DateField(required=False, default=None)

    def validate(self, attrs):
        if attrs.get('hoursSpent') is not None and attrs.get('hours_spent') == Decimal('0.00'):
            attrs['hours_spent'] = attrs['hoursSpent']
        if attrs.get('completionNotes') is not None and not attrs.get('completion_notes'):
            attrs['completion_notes'] = attrs['completionNotes']
        if attrs.get('artifactUrl') is not None and not attrs.get('artifact_url'):
            attrs['artifact_url'] = attrs['artifactUrl']
        if attrs.get('completedAt') is not None and attrs.get('completed_at') is None:
            attrs['completed_at'] = attrs['completedAt']
        return attrs
    completed_at = serializers.DateField(required=False, default=None)


class InternTaskReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['APPROVE', 'REVISE'])
    feedback = serializers.CharField(required=False, allow_blank=True, default='')


class InternFormQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternFormQuestion
        fields = (
            'id', 'label', 'description', 'question_type', 'is_required',
            'order', 'options', 'min_value', 'max_value'
        )


class InternFormListSerializer(serializers.ModelSerializer):
    cycle_name = serializers.CharField(source='cycle.name', read_only=True, default=None)
    department_name = serializers.CharField(source='department.name', read_only=True, default='All Cohorts')
    questions_count = serializers.IntegerField(source='questions.count', read_only=True)
    submission_status = serializers.SerializerMethodField()

    class Meta:
        model = InternForm
        fields = (
            'id', 'title', 'description', 'cycle', 'cycle_name',
            'department_name', 'due_date', 'allow_draft_save',
            'questions_count', 'submission_status', 'published_at'
        )

    def get_submission_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'NOT_STARTED'
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return 'NOT_STARTED'
        sub = InternFormSubmission.objects.filter(form=obj, intern=profile).first()
        if not sub:
            return 'NOT_STARTED'
        return 'SUBMITTED' if sub.is_submitted else 'DRAFT'


class InternFormDetailSerializer(serializers.ModelSerializer):
    questions = InternFormQuestionSerializer(many=True, read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True, default=None)
    current_submission = serializers.SerializerMethodField()

    class Meta:
        model = InternForm
        fields = (
            'id', 'title', 'description', 'cycle', 'cycle_name',
            'due_date', 'allow_draft_save', 'published_at',
            'questions', 'current_submission'
        )

    def get_current_submission(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return None
        sub = InternFormSubmission.objects.filter(form=obj, intern=profile).first()
        if not sub:
            return None
        return {
            'id': str(sub.id),
            'is_submitted': sub.is_submitted,
            'submitted_at': sub.submitted_at.isoformat() if sub.submitted_at else None,
            'answers': sub.answers
        }


class InternFormSubmitSerializer(serializers.Serializer):
    is_submitted = serializers.BooleanField(default=False)
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True))

    def validate_answers(self, answers):
        form = self.context.get('form')
        if not form:
            raise ValidationError("Form context missing.")
        if form.status != FormStatus.PUBLISHED:
            raise ValidationError("Cannot submit answers to an un-published or archived form.")

        questions = {str(q.id): q for q in form.questions.all()}
        is_final = self.initial_data.get('is_submitted', False)

        for q_id, val in answers.items():
            if q_id not in questions:
                raise ValidationError(f"Invalid question ID '{q_id}' does not belong to this form.")
            q = questions[q_id]
            val_clean = str(val).strip()

            if val_clean:
                # Type-specific validation
                if q.question_type in [QuestionType.NUMERIC, QuestionType.RATING]:
                    try:
                        num_val = Decimal(val_clean)
                    except (InvalidOperation, ValueError):
                        raise ValidationError(f"Question '{q.label}': '{val}' is not a valid number.")
                    if q.min_value is not None and num_val < q.min_value:
                        raise ValidationError(f"Question '{q.label}': value must be at least {q.min_value}.")
                    if q.max_value is not None and num_val > q.max_value:
                        raise ValidationError(f"Question '{q.label}': value cannot exceed {q.max_value}.")

                elif q.question_type == QuestionType.DATE:
                    try:
                        datetime.strptime(val_clean, '%Y-%m-%d')
                    except ValueError:
                        raise ValidationError(f"Question '{q.label}': date '{val}' must be formatted as YYYY-MM-DD.")

                elif q.question_type == QuestionType.CHOICE:
                    if q.options and val_clean not in q.options:
                        raise ValidationError(
                            f"Question '{q.label}': selection '{val}' is not among allowed choices: {', '.join(q.options)}."
                        )

        # If final submission, enforce required questions
        if is_final:
            for q_id, q in questions.items():
                if q.is_required:
                    ans = answers.get(q_id, '')
                    if ans is None or str(ans).strip() == '':
                        raise ValidationError(f"Required question '{q.label}' has not been answered.")

        return answers


class InternSelfAppraisalSerializer(serializers.ModelSerializer):
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)

    class Meta:
        model = InternSelfAppraisalSubmission
        fields = (
            'id', 'cycle', 'cycle_name', 'self_rating', 'achievements',
            'challenges', 'skills_acquired', 'mentorship_needs',
            'reflection_summary', 'is_submitted', 'submitted_at',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'cycle', 'cycle_name', 'submitted_at', 'created_at', 'updated_at')

    def validate_self_rating(self, value):
        if value < Decimal('1.0') or value > Decimal('10.0'):
            raise ValidationError("Self-rating must be between 1.0 and 10.0.")
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['selfRating'] = float(instance.self_rating) if instance.self_rating is not None else None
        ret['isSubmitted'] = instance.is_submitted
        ret['submittedAt'] = instance.submitted_at.isoformat() if instance.submitted_at else None
        ret['skillsAcquired'] = instance.skills_acquired
        ret['mentorshipNeeds'] = instance.mentorship_needs
        ret['reflectionSummary'] = instance.reflection_summary
        return ret


class InternFeedbackReplySerializer(serializers.ModelSerializer):
    class Meta:
        model = InternFeedbackReply
        fields = ('id', 'appraisal', 'reply_text', 'created_at')
        read_only_fields = ('id', 'appraisal', 'created_at')
