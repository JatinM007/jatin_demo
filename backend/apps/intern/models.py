import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class TaskCategory(models.TextChoices):
    TECHNICAL = 'TECHNICAL', 'Technical Implementation'
    ONBOARDING = 'ONBOARDING', 'Onboarding & Setup'
    DOCUMENTATION = 'DOCUMENTATION', 'Documentation & Spec'
    EVALUATION = 'EVALUATION', 'Appraisal & Review'


class TaskPriority(models.TextChoices):
    HIGH = 'HIGH', 'High Priority'
    MEDIUM = 'MEDIUM', 'Medium Priority'
    LOW = 'LOW', 'Low Priority'


class TaskStatus(models.TextChoices):
    ASSIGNED = 'ASSIGNED', 'Assigned'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SUBMITTED = 'SUBMITTED', 'Submitted for Review'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    COMPLETED = 'COMPLETED', 'Completed'
    OVERDUE = 'OVERDUE', 'Overdue'


class InternTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='intern_tasks',
        db_index=True
    )
    title = models.CharField(max_length=255)
    category = models.CharField(
        max_length=50,
        choices=TaskCategory.choices,
        default=TaskCategory.TECHNICAL
    )
    instructions = models.TextField(
        help_text="Detailed task guidelines, acceptance criteria, and instructions from mentor."
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM
    )
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.ASSIGNED,
        db_index=True
    )
    requires_mentor_review = models.BooleanField(
        default=False,
        help_text="If true, task requires mentor review before final completion."
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_intern_tasks'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_feedback = models.TextField(blank=True, default="")
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateField(null=True, blank=True)
    hours_spent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    completion_notes = models.TextField(blank=True, default="")
    artifact_url = models.CharField(max_length=500, blank=True, default="")
    is_permitted_to_complete = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Intern Task'
        verbose_name_plural = 'Intern Tasks'
        ordering = ['is_completed', 'due_date', '-priority']

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title} ({self.intern.user.username})"

    def save(self, *args, **kwargs):
        if self.status == TaskStatus.COMPLETED:
            self.is_completed = True
        else:
            self.is_completed = False
        super().save(*args, **kwargs)


class InternGoalComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(
        'goals.Goal',
        on_delete=models.CASCADE,
        related_name='goal_comments',
        db_index=True
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='intern_goal_comments'
    )
    author_name = models.CharField(max_length=255)
    author_role = models.CharField(max_length=50, default='INTERN')
    comment = models.TextField()
    is_mentor = models.BooleanField(default=False)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Intern Goal Comment'
        verbose_name_plural = 'Intern Goal Comments'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author_name} on {self.goal.title}: {self.comment[:40]}"


class InternSelfAppraisalSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='self_appraisal_submissions',
        db_index=True
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='intern_self_appraisals'
    )
    self_rating = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('8.5'))
    achievements = models.TextField(
        blank=True,
        default="",
        help_text="Key technical achievements and completed deliverables."
    )
    challenges = models.TextField(
        blank=True,
        default="",
        help_text="Challenges faced and problem-solving methodology."
    )
    skills_acquired = models.TextField(
        blank=True,
        default="",
        help_text="Frameworks, tools, and technical competencies developed."
    )
    mentorship_needs = models.TextField(
        blank=True,
        default="",
        help_text="Areas where guidance or mentorship is requested."
    )
    reflection_summary = models.TextField(
        blank=True,
        default="",
        help_text="Overall self-evaluation reflection summary."
    )
    is_submitted = models.BooleanField(default=False, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Intern Self-Appraisal Submission'
        verbose_name_plural = 'Intern Self-Appraisal Submissions'
        unique_together = ('intern', 'cycle')

    def __str__(self):
        status_label = "Submitted" if self.is_submitted else "Draft"
        return f"{self.intern.user.username} Self-Appraisal ({status_label}) - {self.self_rating}/10"


class InternFeedbackReply(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='feedback_replies'
    )
    appraisal = models.ForeignKey(
        'performance.Appraisal',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='intern_replies'
    )
    reply_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Intern Feedback Reply'
        verbose_name_plural = 'Intern Feedback Replies'
        ordering = ['created_at']

    def __str__(self):
        return f"Reply by {self.intern.user.username} ({self.created_at.strftime('%Y-%m-%d')})"


class FormStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    PUBLISHED = 'PUBLISHED', 'Published'
    ARCHIVED = 'ARCHIVED', 'Archived'


class QuestionType(models.TextChoices):
    TEXT = 'TEXT', 'Single Line Text'
    LONG_TEXT = 'LONG_TEXT', 'Multi-line Paragraph'
    NUMERIC = 'NUMERIC', 'Numeric Input'
    RATING = 'RATING', 'Rating Scale'
    DATE = 'DATE', 'Date Picker'
    CHOICE = 'CHOICE', 'Multiple Choice'


class InternForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='intern_forms'
    )
    target_role = models.CharField(max_length=50, default='INTERN')
    department = models.ForeignKey(
        'organization.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='intern_forms'
    )
    status = models.CharField(
        max_length=20,
        choices=FormStatus.choices,
        default=FormStatus.DRAFT,
        db_index=True
    )
    published_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    allow_draft_save = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_intern_forms'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Intern Form'
        verbose_name_plural = 'Intern Forms'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} [{self.get_status_display()}]"


class InternFormQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        InternForm,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    label = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.TEXT
    )
    is_required = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    options = models.JSONField(
        default=list,
        blank=True,
        help_text="List of string options for CHOICE question type."
    )
    min_value = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_value = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Intern Form Question'
        verbose_name_plural = 'Intern Form Questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Q{self.order}: {self.label} ({self.get_question_type_display()})"


class InternFormSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        InternForm,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='form_submissions'
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='intern_form_submissions'
    )
    is_submitted = models.BooleanField(default=False, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    answers = models.JSONField(
        default=dict,
        help_text="Mapping of question UUID strings to answered values."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Intern Form Submission'
        verbose_name_plural = 'Intern Form Submissions'
        unique_together = ('form', 'intern')
        ordering = ['-updated_at']

    def __str__(self):
        status_label = "Submitted" if self.is_submitted else "Draft"
        return f"{self.intern.user.username} - {self.form.title} [{status_label}]"
