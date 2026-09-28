import logging
import threading
import time
from django.db import transaction, connection
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.notifications.models import (
    Notification,
    ScheduledNotification,
    NotificationType,
    AudienceType,
    NotificationStatus,
)

logger = logging.getLogger(__name__)
User = get_user_model()

_scheduler_started = False
_lock = threading.Lock()


def get_audience_queryset(audience_type: str, specific_recipients=None):
    """
    Returns the queryset of active users targeted by the audience type.
    """
    base_users = User.objects.filter(is_active=True)
    if audience_type == AudienceType.EVERYONE:
        return base_users
    elif audience_type == AudienceType.HR:
        return base_users.filter(role='HR')
    elif audience_type == AudienceType.MENTORS:
        # In PerforMax, managers serve as mentors
        return base_users.filter(role='MANAGER')
    elif audience_type == AudienceType.INTERNS:
        return base_users.filter(role='INTERN')
    elif audience_type == AudienceType.SPECIFIC:
        if specific_recipients is not None:
            return specific_recipients.filter(is_active=True)
        return base_users.none()
    return base_users.none()


def dispatch_scheduled_notification(scheduled_notification_id, trigger_time=None) -> bool:
    """
    Atomically delivers a scheduled notification to its intended audience.
    Uses select_for_update to avoid duplicate delivery across concurrent requests or retries.
    """
    now = trigger_time or timezone.now()
    try:
        with transaction.atomic():
            sn = (
                ScheduledNotification.objects.select_for_update(skip_locked=True)
                .filter(id=scheduled_notification_id)
                .first()
            )
            if not sn:
                return False

            if sn.status not in [NotificationStatus.SCHEDULED, NotificationStatus.DRAFT]:
                return False

            recipients = get_audience_queryset(sn.audience_type, sn.specific_recipients)
            notifications_to_create = []

            for recipient in recipients:
                notifications_to_create.append(
                    Notification(
                        recipient=recipient,
                        sender=sn.sender,
                        scheduled_notification=sn,
                        title=sn.title,
                        message=sn.message,
                        notification_type=NotificationType.SYSTEM,
                        delivery_time=now,
                        is_read=False,
                    )
                )

            if notifications_to_create:
                Notification.objects.bulk_create(notifications_to_create)

            sn.status = NotificationStatus.SENT
            sn.sent_at = now
            sn.recipient_count = len(notifications_to_create)
            sn.failure_reason = ''
            sn.save(update_fields=['status', 'sent_at', 'recipient_count', 'failure_reason', 'updated_at'])
            logger.info("Successfully delivered notification '%s' (id: %s) to %d recipients.", sn.title, sn.id, len(notifications_to_create))
            return True

    except Exception as exc:
        logger.exception("Failed to dispatch scheduled notification %s: %s", scheduled_notification_id, exc)
        try:
            ScheduledNotification.objects.filter(id=scheduled_notification_id).update(
                status=NotificationStatus.FAILED,
                failure_reason=str(exc)
            )
        except Exception:
            pass
        return False


def process_due_scheduled_notifications() -> int:
    """
    Checks for all SCHEDULED notifications whose scheduled_for time is <= now,
    and dispatches them. Returns the number of successfully delivered notifications.
    """
    now = timezone.now()
    due_ids = list(
        ScheduledNotification.objects.filter(
            status=NotificationStatus.SCHEDULED,
            scheduled_for__lte=now,
        ).values_list('id', flat=True)
    )

    if not due_ids:
        return 0

    delivered_count = 0
    for sn_id in due_ids:
        if dispatch_scheduled_notification(sn_id, trigger_time=now):
            delivered_count += 1

    return delivered_count


def start_scheduler_thread():
    """
    Starts a background daemon thread that periodically checks and delivers due notifications.
    Safe against multiple calls.
    """
    global _scheduler_started
    with _lock:
        if _scheduler_started:
            return
        _scheduler_started = True

    def _worker():
        logger.info("Started background worker for scheduled notifications.")
        while True:
            try:
                connection.close_if_unusable_or_obsolete()
                process_due_scheduled_notifications()
            except Exception as e:
                logger.error("Error in scheduled notification worker loop: %s", e)
            time.sleep(5)

    thread = threading.Thread(target=_worker, daemon=True, name="ScheduledNotificationDaemon")
    thread.start()


class NotificationService:
    """
    Centralized event-driven notification service for the Intern Portal and PerforMax.
    Ensures consistent message formats, correct recipient targeting, and idempotency.
    """

    @classmethod
    def create_notification(cls, recipient, title, message, notification_type=NotificationType.SYSTEM):
        if not recipient or not recipient.is_active:
            return None
        try:
            return Notification.objects.create(
                recipient=recipient,
                title=title[:255],
                message=message,
                notification_type=notification_type
            )
        except Exception as e:
            logger.error(f"Failed to create notification for {recipient.username}: {e}")
            return None

    @classmethod
    def notify_goal_assigned(cls, goal):
        recipient = goal.employee.user
        title = f"New Goal Assigned: {goal.title}"
        message = (
            f"You have been assigned a new goal: '{goal.title}' with weight {goal.weight}%. "
            f"Target completion deadline: {goal.due_date}."
        )
        return cls.create_notification(recipient, title, message, NotificationType.GOAL_ASSIGNED)

    @classmethod
    def notify_task_assigned(cls, task):
        recipient = task.intern.user
        title = f"New Task Assigned: {task.title}"
        message = (
            f"A new task '{task.title}' has been assigned to you. Priority: {task.get_priority_display()}. "
            f"Due date: {task.due_date}."
        )
        return cls.create_notification(recipient, title, message, NotificationType.TASK_ASSIGNED)

    @classmethod
    def notify_task_status_changed(cls, task, old_status, new_status, actor=None):
        if new_status == 'SUBMITTED' and task.intern.manager:
            title = f"Task Submitted for Review: {task.title}"
            message = (
                f"Intern {task.intern.full_name} has submitted '{task.title}' for your verification. "
                f"Hours logged: {task.hours_spent or 0}."
            )
            return cls.create_notification(task.intern.manager, title, message, NotificationType.TASK_STATUS_CHANGED)

        if new_status in ['COMPLETED', 'IN_PROGRESS'] and actor and actor != task.intern.user:
            status_text = "approved and marked Completed" if new_status == 'COMPLETED' else "returned for revision"
            title = f"Task Update: {task.title}"
            feedback_note = f" Review feedback: '{task.review_feedback}'." if task.review_feedback else ""
            message = f"Your task '{task.title}' was {status_text} by your mentor.{feedback_note}"
            return cls.create_notification(task.intern.user, title, message, NotificationType.TASK_STATUS_CHANGED)

        return None

    @classmethod
    def notify_evidence_submitted(cls, evidence):
        mentor = evidence.employee.manager
        if mentor:
            title = f"Evidence Submitted: {evidence.title}"
            message = (
                f"Intern {evidence.employee.full_name} submitted new proof of work "
                f"for goal '{evidence.goal.title}'."
            )
            return cls.create_notification(mentor, title, message, NotificationType.EVIDENCE_REVIEWED)
        return None

    @classmethod
    def notify_evidence_reviewed(cls, evidence):
        recipient = evidence.employee.user
        status_label = evidence.get_review_status_display()
        title = f"Evidence Reviewed: {evidence.title} [{status_label}]"
        notes = f" Notes: '{evidence.review_notes}'." if evidence.review_notes else ""
        message = f"Your submitted evidence '{evidence.title}' was reviewed by {evidence.reviewed_by.username if evidence.reviewed_by else 'your mentor'} with status: {status_label}.{notes}"
        return cls.create_notification(recipient, title, message, NotificationType.EVIDENCE_REVIEWED)

    @classmethod
    def notify_feedback_published(cls, appraisal):
        recipient = appraisal.employee.user
        title = "Performance Evaluation & Results Published"
        score_text = f"Calibrated Score: {appraisal.overall_score}%." if appraisal.overall_score else ""
        class_text = f" Tier: {appraisal.classification}." if appraisal.classification else ""
        message = (
            f"Your performance appraisal for cycle '{appraisal.cycle.name}' has been officially approved and published by HR. "
            f"{score_text}{class_text} You may now view your complete scorecard and growth recommendations."
        )
        return cls.create_notification(recipient, title, message, NotificationType.APPRAISAL_PUBLISHED)

    @classmethod
    def notify_form_published(cls, form, intern=None):
        recipients = [intern.user] if intern else []
        if not recipients:
            from apps.employees.models import EmployeeProfile
            qs = EmployeeProfile.objects.filter(employment_status='ACTIVE')
            if form.department:
                qs = qs.filter(department=form.department)
            recipients = [p.user for p in qs if p.user.is_active]

        title = f"New Evaluation Form Published: {form.title}"
        due_str = f" Due date: {form.due_date}." if form.due_date else ""
        message = f"A new questionnaire '{form.title}' has been published for your review.{due_str} Please complete your submission."
        
        created = []
        for r in recipients:
            notif = cls.create_notification(r, title, message, NotificationType.FORM_PUBLISHED)
            if notif:
                created.append(notif)
        return created

    @classmethod
    def notify_deadline_approaching(cls, recipient, item_title, item_type, due_date, days_left):
        title = f"Upcoming Deadline: {item_title}"
        urgency = "Due tomorrow!" if days_left <= 1 else f"{days_left} days remaining."
        message = f"Reminder: Your {item_type} '{item_title}' is due on {due_date} ({urgency})."
        return cls.create_notification(recipient, title, message, NotificationType.DEADLINE_APPROACHING)

