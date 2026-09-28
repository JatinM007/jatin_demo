import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class CycleStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    ACTIVE = 'ACTIVE', 'Active'
    REVIEW_PERIOD = 'REVIEW_PERIOD', 'Review Period'
    CLOSED = 'CLOSED', 'Closed'

class PerformanceCycle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=CycleStatus.choices,
        default=CycleStatus.DRAFT,
        db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_cycles'
    )
    goals_weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('40.00'),
        help_text='Weight in percentage for Goals & Deliverables component (0-100)',
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    manager_weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('40.00'),
        help_text='Weight in percentage for Mentor/Manager Evaluation component (0-100)',
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    self_weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('20.00'),
        help_text='Weight in percentage for Intern Self Assessment component (0-100)',
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    self_assessment_deadline = models.DateField(
        null=True,
        blank=True,
        help_text='Cutoff date for intern/employee self-appraisal submissions'
    )
    evidence_deadline = models.DateField(
        null=True,
        blank=True,
        help_text='Cutoff date for deliverables and evidence submissions'
    )
    current_phase = models.CharField(
        max_length=50,
        blank=True,
        default='Active Evaluation',
        help_text='Current cycle milestone phase label'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Performance Cycle'
        verbose_name_plural = 'Performance Cycles'
        ordering = ['-start_date']
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gte=models.F('start_date')),
                name='cycle_end_date_gte_start_date'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

class EvaluationCriterion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='criteria',
        help_text='Specific cycle this criterion belongs to, or null for global/cohort default'
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    maximum_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('100.00'),
        validators=[MinValueValidator(Decimal('1.00'))]
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='Weight in percentage (e.g. 25.00 for 25%)',
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Evaluation Criterion'
        verbose_name_plural = 'Evaluation Criteria'
        ordering = ['-weight', 'name']

    def __str__(self):
        return f"{self.name} (Weight: {self.weight}%, Max: {self.maximum_score})"

class AppraisalType(models.TextChoices):
    SELF = 'SELF', 'Self Assessment'
    MANAGER = 'MANAGER', 'Manager Evaluation'
    ANNUAL_REVIEW = 'ANNUAL_REVIEW', 'Annual Review'

class AppraisalStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    HR_APPROVED = 'HR_APPROVED', 'HR Approved'
    PUBLISHED = 'PUBLISHED', 'Published'

class Appraisal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='appraisals',
        db_index=True
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        related_name='appraisals',
        db_index=True
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_appraisals'
    )
    appraisal_type = models.CharField(
        max_length=20,
        choices=AppraisalType.choices,
        default=AppraisalType.MANAGER
    )
    status = models.CharField(
        max_length=20,
        choices=AppraisalStatus.choices,
        default=AppraisalStatus.DRAFT,
        db_index=True
    )
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    classification = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='Published performance classification'
    )
    strengths = models.JSONField(
        default=list,
        blank=True,
        help_text='List of key evaluated strengths and accomplishments'
    )
    areas_for_improvement = models.JSONField(
        default=list,
        blank=True,
        help_text='List of actionable recommendations and growth focus areas'
    )
    recommendations = models.TextField(
        blank=True,
        null=True,
        help_text='Long-form development recommendations from reviewer/mentor'
    )
    allow_intern_reply = models.BooleanField(
        default=True,
        help_text='Whether the intern can submit replies to published feedback'
    )
    self_comments = models.TextField(blank=True, null=True)
    reviewer_comments = models.TextField(blank=True, null=True)
    final_comments = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Appraisal'
        verbose_name_plural = 'Appraisals'
        unique_together = ('employee', 'cycle', 'appraisal_type')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_appraisal_type_display()} - {self.employee.full_name} ({self.cycle.name}) [{self.get_status_display()}]"

class AppraisalRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appraisal = models.ForeignKey(
        Appraisal,
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    criterion = models.ForeignKey(
        EvaluationCriterion,
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    comments = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Appraisal Rating'
        verbose_name_plural = 'Appraisal Ratings'
        unique_together = ('appraisal', 'criterion')

    def __str__(self):
        return f"{self.appraisal.employee.full_name} - {self.criterion.name}: {self.score}"

class PipStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SUCCESSFUL = 'SUCCESSFUL', 'Successful'
    EXTENDED = 'EXTENDED', 'Extended'
    TERMINATED = 'TERMINATED', 'Terminated'

class PerformanceImprovementPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='pips',
        db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reason = models.TextField()
    objectives = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=PipStatus.choices,
        default=PipStatus.ACTIVE,
        db_index=True
    )
    review_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Performance Improvement Plan'
        verbose_name_plural = 'Performance Improvement Plans'
        ordering = ['-created_at']

    def __str__(self):
        return f"PIP: {self.employee.full_name} ({self.get_status_display()})"

class RecognitionReward(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rewards',
        db_index=True
    )
    awarded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='given_rewards'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Recognition & Reward'
        verbose_name_plural = 'Recognition & Rewards'
        ordering = ['-awarded_at']

    def __str__(self):
        return f"{self.title} awarded to {self.recipient.username}"


class TechnicalCapabilityParameter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100, default='Technical Capability')
    description = models.TextField(blank=True, default='')
    benchmark_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('5.00'),
        help_text='Expected benchmark score out of 5.0'
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('20.00'),
        help_text='Weight in percentage'
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='technical_parameters'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tech_parameters'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Technical Capability Parameter'
        verbose_name_plural = 'Technical Capability Parameters'
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.category} - {self.weight}%)"


class TechnicalCapabilityReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parameter = models.ForeignKey(
        TechnicalCapabilityParameter,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='technical_reviews'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='given_technical_reviews'
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='technical_reviews'
    )
    score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('5.00'))]
    )
    mentor_assessment = models.TextField(blank=True, default='')
    evidence_url = models.URLField(max_length=500, blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=[('DRAFT', 'Draft'), ('SUBMITTED', 'Submitted')],
        default='DRAFT'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Technical Capability Review'
        verbose_name_plural = 'Technical Capability Reviews'
        unique_together = ('parameter', 'employee', 'cycle')
        ordering = ['parameter__name']

    def __str__(self):
        return f"{self.employee.full_name} - {self.parameter.name}: {self.score}/5"


