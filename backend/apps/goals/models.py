import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class GoalStatus(models.TextChoices):
    NOT_STARTED = 'NOT_STARTED', 'Not Started'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class GoalPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'

class KPIMeasurementType(models.TextChoices):
    NUMERIC = 'NUMERIC', 'Numeric'
    PERCENTAGE = 'PERCENTAGE', 'Percentage'
    CURRENCY = 'CURRENCY', 'Currency'
    BOOLEAN = 'BOOLEAN', 'Boolean'

class Goal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='goals',
        db_index=True
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='goals',
        db_index=True
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_goals'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=GoalStatus.choices,
        default=GoalStatus.NOT_STARTED,
        db_index=True
    )
    priority = models.CharField(
        max_length=10,
        choices=GoalPriority.choices,
        default=GoalPriority.MEDIUM
    )
    completion_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Goal'
        verbose_name_plural = 'Goals'
        ordering = ['due_date', '-priority']
        constraints = [
            models.CheckConstraint(
                check=models.Q(completion_percentage__gte=Decimal('0.00')) & models.Q(completion_percentage__lte=Decimal('100.00')),
                name='goal_valid_completion_percentage'
            )
        ]

    def __str__(self):
        return f"{self.title} ({self.employee.full_name} - {self.get_status_display()})"

class KPI(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name='kpis',
        db_index=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    target_value = models.DecimalField(max_digits=12, decimal_places=2)
    achieved_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    unit = models.CharField(max_length=50, default='%')
    measurement_type = models.CharField(
        max_length=20,
        choices=KPIMeasurementType.choices,
        default=KPIMeasurementType.NUMERIC
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'KPI'
        verbose_name_plural = 'KPIs'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.achieved_value}/{self.target_value} {self.unit}]"

    @property
    def achievement_percentage(self):
        if self.target_value and self.target_value > 0:
            pct = (self.achieved_value / self.target_value) * Decimal('100.00')
            return min(Decimal('100.00'), max(Decimal('0.00'), round(pct, 2)))
        return Decimal('0.00')

class GoalProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name='progress_updates',
        db_index=True
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Goal Progress Update'
        verbose_name_plural = 'Goal Progress Updates'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.goal.title}: {self.progress_percentage}% ({self.created_at.strftime('%Y-%m-%d')})"


class KpiCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'KPI Category'
        verbose_name_plural = 'KPI Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class KpiLibrary(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    position = models.ForeignKey(
        'organization.Position',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='kpi_libraries'
    )
    target_level = models.ForeignKey(
        'organization.JobLevel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='kpi_libraries'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'KPI Library'
        verbose_name_plural = 'KPI Libraries'
        ordering = ['-updated_at']

    def __str__(self):
        return self.title


class KpiLibraryDetail(models.Model):
    library = models.ForeignKey(
        KpiLibrary,
        on_delete=models.CASCADE,
        related_name='details'
    )
    category = models.ForeignKey(
        KpiCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='library_details'
    )
    goal_title = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, default='%')
    target_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('100.00'))
    weight_percent = models.IntegerField(default=20)
    is_compliance = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'KPI Library Detail'
        verbose_name_plural = 'KPI Library Details'

    def __str__(self):
        return f"{self.goal_title} ({self.weight_percent}%)"


class GoalSet(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('APPROVED', 'Approved'),
        ('LOCKED', 'Locked'),
        ('SCORED', 'Scored'),
        ('ARCHIVED', 'Archived'),
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='goal_sets'
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='goal_sets'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_goal_sets'
    )
    library = models.ForeignKey(
        KpiLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_sets'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    version = models.IntegerField(default=1)
    approved_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Goal Set'
        verbose_name_plural = 'Goal Sets'
        unique_together = ('employee', 'cycle')
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.employee.full_name} - {self.cycle.name} [{self.status}]"

    @property
    def score(self):
        items = list(self.items.all())
        total_w = sum(i.weight_percent for i in items)
        if total_w == 0:
            return 0.0
        w_sum = sum((float(i.current_progress) / max(1.0, float(i.target_value))) * float(i.weight_percent) for i in items)
        return round((w_sum / total_w) * 100.0, 1)


class GoalItem(models.Model):
    STATUS_CHOICES = (
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    )
    goal_set = models.ForeignKey(
        GoalSet,
        on_delete=models.CASCADE,
        related_name='items'
    )
    category = models.ForeignKey(
        KpiCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='goal_items'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    unit = models.CharField(max_length=50, default='%')
    target_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('100.00'))
    current_progress = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    weight_percent = models.IntegerField(default=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')
    is_compliance = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_goal_items'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Goal Item'
        verbose_name_plural = 'Goal Items'

    def __str__(self):
        return f"{self.title} ({self.current_progress}/{self.target_value} {self.unit})"

    @property
    def score_percent(self):
        if self.target_value and self.target_value > 0:
            pct = (self.current_progress / self.target_value) * Decimal('100.00')
            return min(Decimal('100.00'), max(Decimal('0.00'), round(pct, 2)))
        return Decimal('0.00')

    @property
    def weighted_score(self):
        return round((self.score_percent * Decimal(self.weight_percent)) / Decimal('100.00'), 2)


class KpiProgressEntry(models.Model):
    goal_item = models.ForeignKey(
        GoalItem,
        on_delete=models.CASCADE,
        related_name='progress_entries'
    )
    actual_value = models.DecimalField(max_digits=12, decimal_places=2)
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2)
    evidence_note = models.TextField(blank=True, null=True)
    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'KPI Progress Entry'
        verbose_name_plural = 'KPI Progress Entries'
        ordering = ['-created_at']


class KpiAuditTrail(models.Model):
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='kpi_audits'
    )
    goal_set = models.ForeignKey(
        GoalSet,
        on_delete=models.CASCADE,
        related_name='audit_logs',
        null=True,
        blank=True
    )
    action = models.CharField(max_length=100)
    change_reason = models.TextField(blank=True, null=True)
    change_details = models.TextField(blank=True, null=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'KPI Audit Trail'
        verbose_name_plural = 'KPI Audit Trails'
        ordering = ['-created_at']

