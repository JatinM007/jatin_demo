import uuid
from django.db import models
from django.conf import settings

class NotificationType(models.TextChoices):
    GOAL_ASSIGNED = 'GOAL_ASSIGNED', 'Goal Assigned'
    EVIDENCE_REVIEWED = 'EVIDENCE_REVIEWED', 'Evidence Reviewed'
    APPRAISAL_PUBLISHED = 'APPRAISAL_PUBLISHED', 'Appraisal Published'
    TASK_ASSIGNED = 'TASK_ASSIGNED', 'Task Assigned'
    TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED', 'Task Status Changed'
    DEADLINE_APPROACHING = 'DEADLINE_APPROACHING', 'Deadline Approaching'
    MENTOR_FEEDBACK = 'MENTOR_FEEDBACK', 'Mentor Feedback Published'
    SELF_APPRAISAL_OPENED = 'SELF_APPRAISAL_OPENED', 'Self-Appraisal Opened'
    FORM_PUBLISHED = 'FORM_PUBLISHED', 'Form Published'
    EVALUATION_CYCLE_UPDATE = 'EVALUATION_CYCLE_UPDATE', 'Evaluation Cycle Update'
    SYSTEM = 'SYSTEM', 'System Alert'

class AudienceType(models.TextChoices):
    EVERYONE = 'EVERYONE', 'Everyone'
    HR = 'HR', 'HR Personnel'
    MENTORS = 'MENTORS', 'Mentors'
    INTERNS = 'INTERNS', 'Interns'
    SPECIFIC = 'SPECIFIC', 'Specific Users'

class NotificationStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    SENT = 'SENT', 'Sent'
    CANCELLED = 'CANCELLED', 'Cancelled'
    FAILED = 'FAILED', 'Failed'

class ScheduledNotification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    message = models.TextField()
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scheduled_notifications'
    )
    audience_type = models.CharField(
        max_length=30,
        choices=AudienceType.choices,
        default=AudienceType.EVERYONE
    )
    specific_recipients = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='targeted_scheduled_notifications'
    )
    status = models.CharField(
        max_length=20,
        choices=NotificationStatus.choices,
        default=NotificationStatus.DRAFT,
        db_index=True
    )
    scheduled_for = models.DateTimeField(null=True, blank=True, db_index=True)
    time_zone = models.CharField(max_length=50, default='UTC')
    sent_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True, default='')
    recipient_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Scheduled Notification'
        verbose_name_plural = 'Scheduled Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status}) - {self.audience_type}"

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='sent_notifications'
    )
    scheduled_notification = models.ForeignKey(
        ScheduledNotification,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='delivered_instances'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM
    )
    is_read = models.BooleanField(default=False, db_index=True)
    delivery_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_notification_type_display()}] {self.title} -> {self.recipient.username}"
