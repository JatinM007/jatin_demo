import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, blank=True, null=True)
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        ordering = ['name']

    def __str__(self):
        return self.name

class JobLevel(models.Model):
    level_code = models.CharField(max_length=50, unique=True, db_index=True)
    level_name = models.CharField(max_length=100)
    level_rank = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Job Level'
        verbose_name_plural = 'Job Levels'
        ordering = ['level_rank', 'level_code']

    def __str__(self):
        return f"{self.level_name} ({self.level_code})"

class Position(models.Model):
    position_code = models.CharField(max_length=50, unique=True, db_index=True)
    position_name = models.CharField(max_length=100)
    level = models.ForeignKey(
        JobLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='positions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Position'
        verbose_name_plural = 'Positions'
        ordering = ['position_name']

    def __str__(self):
        return f"{self.position_name} ({self.position_code})"

class Role(models.Model):
    role_name = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'
        ordering = ['role_name']

    def __str__(self):
        return self.role_name

class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='teams'
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_teams'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Team'
        verbose_name_plural = 'Teams'
        unique_together = ('department', 'name')
        ordering = ['department', 'name']

    def __str__(self):
        return f"{self.name} ({self.department.name})"

class TeamMembership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='team_memberships'
    )
    is_lead = models.BooleanField(default=False)
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Team Membership'
        verbose_name_plural = 'Team Memberships'
        unique_together = ('team', 'employee')

    def __str__(self):
        return f"{self.employee.full_name} -> {self.team.name}"


class Permission(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Permission'
        verbose_name_plural = 'Permissions'
        ordering = ['name']

    def __str__(self):
        return self.name


class RoleLevelPermission(models.Model):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='level_permissions'
    )
    level = models.ForeignKey(
        JobLevel,
        on_delete=models.CASCADE,
        related_name='role_permissions'
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='role_level_assignments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Role Level Permission'
        verbose_name_plural = 'Role Level Permissions'
        unique_together = ('role', 'level', 'permission')

    def __str__(self):
        return f"{self.role.role_name} - {self.level.level_code} - {self.permission.name}"


class FinancialYear(models.Model):
    STATUS_CHOICES = (
        ('NOT_USED', 'Not Used'),
        ('CURRENT', 'Current'),
        ('HISTORICAL', 'Historical'),
    )
    title = models.CharField(max_length=100, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_USED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Financial Year'
        verbose_name_plural = 'Financial Years'
        ordering = ['-start_date']

    def __str__(self):
        return self.title


class PerformanceCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    min_score = models.IntegerField(default=0)
    max_score = models.IntegerField(default=100)
    rating_value = models.IntegerField(default=3)
    grade = models.CharField(max_length=50, default='MEETS_EXPECTATIONS')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Performance Category'
        verbose_name_plural = 'Performance Categories'
        ordering = ['-rating_value', '-min_score']

    def __str__(self):
        return f"{self.name} ({self.min_score}-{self.max_score})"

