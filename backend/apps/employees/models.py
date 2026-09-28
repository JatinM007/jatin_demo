import uuid
from django.db import models
from django.conf import settings
from django.utils.timezone import localdate

class EmploymentStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    PROBATION = 'PROBATION', 'Probation'
    COMPLETED = 'COMPLETED', 'Completed'
    TERMINATED = 'TERMINATED', 'Terminated'

class EmployeeProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    employee_code = models.CharField(max_length=50, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    other_name = models.CharField(max_length=100, blank=True, null=True)
    department = models.ForeignKey(
        'organization.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    parent_department = models.ForeignKey(
        'organization.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='parent_department_employees'
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reporting_employees'
    )
    position = models.ForeignKey(
        'organization.Position',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    designation = models.CharField(max_length=100, default='Intern')
    joining_date = models.DateField(default=localdate)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact = models.TextField(blank=True, null=True)
    
    # Identification (NRC) fields
    nrc_state_code = models.IntegerField(null=True, blank=True)
    nrc_township = models.CharField(max_length=50, null=True, blank=True)
    nrc_type = models.CharField(max_length=10, default='(N)', blank=True)
    nrc_number = models.CharField(max_length=50, null=True, blank=True)

    # Financial & Compensation
    salary = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default='MMK', blank=True)

    # Personal details
    marital_status = models.CharField(max_length=20, blank=True, null=True)
    spouse_name = models.CharField(max_length=100, blank=True, null=True)
    father_name = models.CharField(max_length=100, blank=True, null=True)
    race = models.CharField(max_length=100, blank=True, null=True)
    religion = models.CharField(max_length=100, blank=True, null=True)
    birth_place = models.CharField(max_length=100, blank=True, null=True)
    contact_address = models.TextField(blank=True, null=True)
    permanent_address = models.TextField(blank=True, null=True)

    # Career Milestones
    date_of_appointment = models.DateField(null=True, blank=True)
    date_of_confirmation = models.DateField(null=True, blank=True)
    date_of_promotion = models.DateField(null=True, blank=True)

    skills = models.JSONField(default=list, blank=True)
    experience = models.JSONField(default=list, blank=True)
    competencies = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Employee Profile'
        verbose_name_plural = 'Employee Profiles'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.full_name} ({self.employee_code}) - {self.designation}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def email(self):
        return self.user.email
