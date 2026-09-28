from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q

from apps.goals.models import Goal, GoalStatus
from apps.intern.models import InternTask, TaskStatus, InternForm, FormStatus, InternFormSubmission, InternSelfAppraisalSubmission
from apps.performance.models import PerformanceCycle, CycleStatus
from apps.notifications.services import NotificationService
from apps.notifications.models import Notification, NotificationType


class Command(BaseCommand):
    help = "Processes upcoming deadlines and marks overdue tasks, dispatching notifications idempotently."

    def handle(self, *args, **options):
        today = date.today()
        self.stdout.write(self.style.NOTICE(f"Processing deadlines and reminders for date: {today}"))

        overdue_tasks_count = 0
        reminders_sent = 0

        # 1. Mark Overdue Tasks
        overdue_tasks = InternTask.objects.filter(
            due_date__lt=today,
            status__in=[TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]
        )
        for task in overdue_tasks:
            task.status = TaskStatus.OVERDUE
            task.save(update_fields=['status'])
            overdue_tasks_count += 1
            NotificationService.create_notification(
                recipient=task.intern.user,
                title=f"Task Overdue: {task.title}",
                message=f"Your task '{task.title}' was due on {task.due_date} and is now marked Overdue.",
                notification_type=NotificationType.TASK_STATUS_CHANGED
            )

        # 2. Upcoming Task Deadlines (1 to 3 days remaining)
        upcoming_tasks = InternTask.objects.filter(
            due_date__gte=today,
            due_date__lte=today + timedelta(days=3),
            status__in=[TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]
        )
        for task in upcoming_tasks:
            days_left = (task.due_date - today).days
            # Idempotency check: don't send duplicate reminder on the same day
            already_sent = Notification.objects.filter(
                recipient=task.intern.user,
                notification_type=NotificationType.DEADLINE_APPROACHING,
                title__contains=task.title,
                created_at__date=today
            ).exists()
            if not already_sent:
                NotificationService.notify_deadline_approaching(
                    recipient=task.intern.user,
                    item_title=task.title,
                    item_type="task",
                    due_date=task.due_date,
                    days_left=days_left
                )
                reminders_sent += 1

        # 3. Upcoming Goal Deadlines (1 to 3 days remaining)
        upcoming_goals = Goal.objects.filter(
            due_date__gte=today,
            due_date__lte=today + timedelta(days=3)
        ).exclude(status=GoalStatus.COMPLETED)
        for goal in upcoming_goals:
            days_left = (goal.due_date - today).days
            already_sent = Notification.objects.filter(
                recipient=goal.employee.user,
                notification_type=NotificationType.DEADLINE_APPROACHING,
                title__contains=goal.title,
                created_at__date=today
            ).exists()
            if not already_sent:
                NotificationService.notify_deadline_approaching(
                    recipient=goal.employee.user,
                    item_title=goal.title,
                    item_type="goal",
                    due_date=goal.due_date,
                    days_left=days_left
                )
                reminders_sent += 1

        # 4. Cycle Self-Assessment Deadlines (1 to 3 days remaining)
        active_cycles = PerformanceCycle.objects.filter(
            status__in=[CycleStatus.ACTIVE, CycleStatus.REVIEW_PERIOD],
            self_assessment_deadline__gte=today,
            self_assessment_deadline__lte=today + timedelta(days=3)
        )
        for cycle in active_cycles:
            days_left = (cycle.self_assessment_deadline - today).days
            from apps.employees.models import EmployeeProfile
            interns = EmployeeProfile.objects.filter(employment_status='ACTIVE')
            for intern in interns:
                has_submitted = InternSelfAppraisalSubmission.objects.filter(
                    intern=intern,
                    cycle=cycle,
                    is_submitted=True
                ).exists()
                if not has_submitted:
                    already_sent = Notification.objects.filter(
                        recipient=intern.user,
                        notification_type=NotificationType.DEADLINE_APPROACHING,
                        title__contains=cycle.name,
                        created_at__date=today
                    ).exists()
                    if not already_sent:
                        NotificationService.notify_deadline_approaching(
                            recipient=intern.user,
                            item_title=f"Self-Assessment for {cycle.name}",
                            item_type="cycle self-evaluation",
                            due_date=cycle.self_assessment_deadline,
                            days_left=days_left
                        )
                        reminders_sent += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully updated {overdue_tasks_count} overdue tasks and dispatched {reminders_sent} deadline reminders."
        ))
