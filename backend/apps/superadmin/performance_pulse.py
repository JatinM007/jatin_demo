import io
import csv
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List

from django.db.models import Q, Avg, Count
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse

from apps.accounts.models import User, UserRole
from apps.accounts.permissions import is_admin_user, IsSuperAdmin
from apps.feedback.models import Feedback, FeedbackType, FeedbackStatus
from apps.goals.models import Goal, GoalStatus, KPI
from apps.employees.models import EmployeeProfile
from apps.organization.models import Department


def parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        # Handle ISO strings like 2026-09-28 or 2026-09-28T00:00:00Z
        clean_str = date_str.split('T')[0].strip()
        return datetime.strptime(clean_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None


def map_feedback_type_to_sentiment(fb_type: str) -> str:
    fb_upper = (fb_type or '').upper()
    if fb_upper in ['PRAISE', 'POSITIVE', 'REWARDS', 'SATISFACTORY']:
        return 'PRAISE'
    elif fb_upper in ['NEGATIVE', 'WARNING']:
        return 'WARNING'
    else:
        return 'IMPROVEMENT'


def get_pulse_query_filters(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    source_type: Optional[str] = None
) -> Q:
    q = Q(status=FeedbackStatus.PUBLISHED)
    if start_date:
        q &= Q(created_at__date__gte=start_date)
    if end_date:
        q &= Q(created_at__date__lte=end_date)
    if department_id and department_id != 'ALL':
        q &= (
            Q(recipient__profile__department_id=department_id) |
            Q(sender__profile__department_id=department_id)
        )
    if employee_id and employee_id != 'ALL':
        q &= (
            Q(recipient__profile__id=employee_id) |
            Q(sender__profile__id=employee_id) |
            Q(recipient__id=employee_id) |
            Q(sender__id=employee_id)
        )
    return q


def fetch_pulse_history(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    source_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    # 1. Fetch Feedback records
    fb_q = get_pulse_query_filters(start_date, end_date, department_id, employee_id, source_type)
    feedbacks = Feedback.objects.filter(fb_q).select_related(
        'sender', 'recipient', 'sender__profile', 'recipient__profile', 'goal'
    ).order_by('-created_at')

    history_items: List[Dict[str, Any]] = []

    for idx, fb in enumerate(feedbacks):
        sender_profile = getattr(fb.sender, 'profile', None)
        recipient_profile = getattr(fb.recipient, 'profile', None)

        sender_name = sender_profile.full_name if sender_profile and sender_profile.full_name else fb.sender.username
        recipient_name = recipient_profile.full_name if recipient_profile and recipient_profile.full_name else fb.recipient.username

        emp_id = str(recipient_profile.id) if recipient_profile else str(fb.recipient.id)
        performer_id = str(sender_profile.id) if sender_profile else str(fb.sender.id)

        sentiment = map_feedback_type_to_sentiment(fb.feedback_type)

        history_items.append({
            "historyId": idx + 1,
            "id": str(fb.id),
            "employeeId": emp_id,
            "employeeName": recipient_name,
            "managerId": performer_id,
            "managerName": sender_name,
            "performerId": performer_id,
            "performerName": sender_name,
            "sourceType": "FEEDBACK",
            "sourceId": str(fb.id),
            "title": f"Continuous Feedback: {fb.get_feedback_type_display() if hasattr(fb, 'get_feedback_type_display') else fb.feedback_type}",
            "description": fb.message,
            "feedbackType": sentiment,
            "rawFeedbackType": fb.feedback_type,
            "tagName": "Performance Review" if not fb.goal else f"Goal: {fb.goal.title}",
            "createdAt": fb.created_at.isoformat() if fb.created_at else timezone.now().isoformat()
        })

    return history_items


def compute_department_benchmarks(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    departments = Department.objects.all().order_by('name')

    total_company_headcount = EmployeeProfile.objects.count()
    total_company_feedbacks = Feedback.objects.filter(status=FeedbackStatus.PUBLISHED)
    if start_date:
        total_company_feedbacks = total_company_feedbacks.filter(created_at__date__gte=start_date)
    if end_date:
        total_company_feedbacks = total_company_feedbacks.filter(created_at__date__lte=end_date)

    total_activity_count = total_company_feedbacks.count()
    company_rate = round(total_activity_count / total_company_headcount, 1) if total_company_headcount > 0 else 0.0

    all_goals = Goal.objects.all()
    if start_date:
        all_goals = all_goals.filter(due_date__gte=start_date)
    if end_date:
        all_goals = all_goals.filter(due_date__lte=end_date)
    
    total_goals_count = all_goals.count()
    completed_goals_count = all_goals.filter(status=GoalStatus.COMPLETED).count()
    avg_goal_completion = round(float(all_goals.aggregate(Avg('completion_percentage'))['completion_percentage__avg'] or 0.0), 1)

    dept_benchmarks = []

    for dept in departments:
        dept_employees = dept.employees.all()
        headcount = dept_employees.count()

        dept_feedbacks = total_company_feedbacks.filter(
            Q(recipient__profile__department=dept) | Q(sender__profile__department=dept)
        ).distinct()

        dept_activity_count = dept_feedbacks.count()
        rate_per_employee = round(dept_activity_count / headcount, 1) if headcount > 0 else 0.0

        praise_cnt = 0
        improve_cnt = 0
        warning_cnt = 0

        for fb in dept_feedbacks:
            s = map_feedback_type_to_sentiment(fb.feedback_type)
            if s == 'PRAISE':
                praise_cnt += 1
            elif s == 'WARNING':
                warning_cnt += 1
            else:
                improve_cnt += 1

        total_sent = praise_cnt + improve_cnt + warning_cnt
        praise_pct = round((praise_cnt / total_sent) * 100, 1) if total_sent > 0 else 0.0
        improve_pct = round((improve_cnt / total_sent) * 100, 1) if total_sent > 0 else 0.0
        warning_pct = round((warning_cnt / total_sent) * 100, 1) if total_sent > 0 else 0.0

        dept_goals = all_goals.filter(employee__department=dept)
        d_goals_count = dept_goals.count()
        d_completed_goals = dept_goals.filter(status=GoalStatus.COMPLETED).count()
        d_avg_completion = round(float(dept_goals.aggregate(Avg('completion_percentage'))['completion_percentage__avg'] or 0.0), 1)
        d_goal_completion_rate = round((d_completed_goals / d_goals_count) * 100, 1) if d_goals_count > 0 else 0.0

        dept_benchmarks.append({
            "departmentId": str(dept.id),
            "departmentName": dept.name,
            "headcount": headcount,
            "totalActivities": dept_activity_count,
            "activitiesPerEmployee": rate_per_employee,
            "sentimentDistribution": {
                "praise": praise_cnt,
                "improvement": improve_cnt,
                "warning": warning_cnt,
                "praisePercentage": praise_pct,
                "improvementPercentage": improve_pct,
                "warningPercentage": warning_pct,
            },
            "goals": {
                "total": d_goals_count,
                "completed": d_completed_goals,
                "completionRate": d_goal_completion_rate,
                "averageCompletionPercentage": d_avg_completion
            }
        })

    return {
        "companyAverage": {
            "totalHeadcount": total_company_headcount,
            "totalActivities": total_activity_count,
            "activitiesPerEmployee": company_rate,
            "totalGoals": total_goals_count,
            "completedGoals": completed_goals_count,
            "averageGoalCompletionPercentage": avg_goal_completion,
            "goalCompletionRate": round((completed_goals_count / total_goals_count) * 100, 1) if total_goals_count > 0 else 0.0
        },
        "departments": dept_benchmarks
    }


def compute_goals_kpi_overlay(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[str] = None,
    employee_id: Optional[str] = None
) -> Dict[str, Any]:
    goals_qs = Goal.objects.all().select_related('employee', 'employee__user', 'employee__department').prefetch_related('kpis')

    if department_id and department_id != 'ALL':
        goals_qs = goals_qs.filter(employee__department_id=department_id)
    if employee_id and employee_id != 'ALL':
        goals_qs = goals_qs.filter(
            Q(employee__id=employee_id) | Q(employee__user__id=employee_id)
        )
    if start_date:
        goals_qs = goals_qs.filter(Q(due_date__gte=start_date) | Q(created_at__date__gte=start_date))
    if end_date:
        goals_qs = goals_qs.filter(Q(due_date__lte=end_date) | Q(created_at__date__lte=end_date))

    total_goals = goals_qs.count()
    completed_goals = goals_qs.filter(status=GoalStatus.COMPLETED).count()
    in_progress_goals = goals_qs.filter(status=GoalStatus.IN_PROGRESS).count()
    not_started_goals = goals_qs.filter(status=GoalStatus.NOT_STARTED).count()

    avg_completion = round(float(goals_qs.aggregate(Avg('completion_percentage'))['completion_percentage__avg'] or 0.0), 1)

    # Compute monthly trends for overlay chart
    # Determine the timeline window (default last 6 months if not specified)
    now = timezone.now().date()
    effective_start = start_date or (now - timedelta(days=180))
    effective_end = end_date or now

    # Generate months between effective_start and effective_end
    current = date(effective_start.year, effective_start.month, 1)
    monthly_overlay = []

    while current <= effective_end:
        next_month = date(current.year + (current.month // 12), ((current.month % 12) + 1), 1)
        month_end = next_month - timedelta(days=1)

        m_goals = goals_qs.filter(
            created_at__date__lte=month_end,
            due_date__gte=current
        )
        m_avg = round(float(m_goals.aggregate(Avg('completion_percentage'))['completion_percentage__avg'] or 0.0), 1)
        m_completed = m_goals.filter(status=GoalStatus.COMPLETED).count()
        m_total = m_goals.count()

        monthly_overlay.append({
            "name": current.strftime('%b'),
            "year": current.year,
            "month": current.month - 1, # 0-indexed for JS Date matching
            "averageProgress": m_avg,
            "totalGoals": m_total,
            "completedGoals": m_completed
        })

        current = next_month

    # Individual goals details list
    goal_items = []
    for g in goals_qs[:20]:
        kpi_list = []
        for k in g.kpis.all():
            kpi_list.append({
                "id": str(k.id),
                "name": k.name,
                "targetValue": float(k.target_value),
                "achievedValue": float(k.achieved_value),
                "unit": k.unit
            })

        goal_items.append({
            "id": str(g.id),
            "title": g.title,
            "employeeName": g.employee.full_name or g.employee.user.username,
            "departmentName": g.employee.department.name if g.employee.department else "General",
            "dueDate": g.due_date.isoformat(),
            "status": g.status,
            "completionPercentage": float(g.completion_percentage),
            "priority": g.priority,
            "kpis": kpi_list
        })

    return {
        "summary": {
            "totalGoals": total_goals,
            "completedGoals": completed_goals,
            "inProgressGoals": in_progress_goals,
            "notStartedGoals": not_started_goals,
            "averageCompletionPercentage": avg_completion,
            "completionRate": round((completed_goals / total_goals) * 100, 1) if total_goals > 0 else 0.0
        },
        "monthlyOverlay": monthly_overlay,
        "goals": goal_items
    }


def generate_performance_pulse_csv(
    history: List[Dict[str, Any]],
    benchmarks: Dict[str, Any],
    goals_data: Dict[str, Any],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_name: Optional[str] = None,
    employee_name: Optional[str] = None
) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    # 1. REPORT HEADER & SCOPE
    writer.writerow(["PERFORMAX PERFORMANCE PULSE REPORT"])
    writer.writerow(["Generated At", timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC")])
    writer.writerow(["Date Range", f"{start_date or 'Earliest'} to {end_date or 'Latest'}"])
    writer.writerow(["Department Filter", department_name or "All Departments"])
    writer.writerow(["Employee Filter", employee_name or "All Employees"])
    writer.writerow([])

    # 2. SUMMARY METRICS SECTION
    writer.writerow(["--- SUMMARY METRICS ---"])
    total_feedbacks = len(history)
    praise_count = sum(1 for h in history if h.get("feedbackType") == "PRAISE")
    improve_count = sum(1 for h in history if h.get("feedbackType") == "IMPROVEMENT")
    warning_count = sum(1 for h in history if h.get("feedbackType") == "WARNING")

    praise_pct = round((praise_count / total_feedbacks * 100), 1) if total_feedbacks > 0 else 0.0
    improve_pct = round((improve_count / total_feedbacks * 100), 1) if total_feedbacks > 0 else 0.0
    warning_pct = round((warning_count / total_feedbacks * 100), 1) if total_feedbacks > 0 else 0.0

    writer.writerow(["Total Activities", total_feedbacks])
    writer.writerow(["Praise Count", praise_count, f"{praise_pct}%"])
    writer.writerow(["Improvement Count", improve_count, f"{improve_pct}%"])
    writer.writerow(["Correction/Warning Count", warning_count, f"{warning_pct}%"])
    writer.writerow(["Average Goal Progress", f"{goals_data.get('summary', {}).get('averageCompletionPercentage', 0.0)}%"])
    writer.writerow(["Goal Completion Rate", f"{goals_data.get('summary', {}).get('completionRate', 0.0)}%"])
    writer.writerow([])

    # 3. DEPARTMENT BENCHMARKS SECTION
    writer.writerow(["--- DEPARTMENT BENCHMARK COMPARISONS ---"])
    writer.writerow([
        "Department Name",
        "Headcount",
        "Total Activities",
        "Activities / Employee",
        "Praise %",
        "Improvement %",
        "Warning %",
        "Goal Completion Rate %",
        "Avg Goal Progress %"
    ])
    for d in benchmarks.get("departments", []):
        s = d.get("sentimentDistribution", {})
        g = d.get("goals", {})
        writer.writerow([
            d.get("departmentName"),
            d.get("headcount"),
            d.get("totalActivities"),
            d.get("activitiesPerEmployee"),
            f"{s.get('praisePercentage', 0.0)}%",
            f"{s.get('improvementPercentage', 0.0)}%",
            f"{s.get('warningPercentage', 0.0)}%",
            f"{g.get('completionRate', 0.0)}%",
            f"{g.get('averageCompletionPercentage', 0.0)}%"
        ])
    writer.writerow([])

    # 4. GOALS AND KPIS PROGRESS SECTION
    writer.writerow(["--- GOALS & KPIS STATUS ---"])
    writer.writerow([
        "Goal ID",
        "Goal Title",
        "Employee",
        "Department",
        "Due Date",
        "Status",
        "Completion %",
        "KPIs Target vs Achieved"
    ])
    for g in goals_data.get("goals", []):
        kpi_summary = "; ".join([
            f"{k['name']}: {k['achievedValue']}/{k['targetValue']} {k['unit']}"
            for k in g.get("kpis", [])
        ]) or "N/A"
        writer.writerow([
            g.get("id"),
            g.get("title"),
            g.get("employeeName"),
            g.get("departmentName"),
            g.get("dueDate"),
            g.get("status"),
            f"{g.get('completionPercentage')}%",
            kpi_summary
        ])
    writer.writerow([])

    # 5. ACTIVITY LOG SECTION
    writer.writerow(["--- PERFORMANCE ACTIVITY AUDIT LOG ---"])
    writer.writerow([
        "Timestamp",
        "Performer",
        "Recipient",
        "Activity Type",
        "Sentiment Category",
        "Tag / Goal",
        "Message"
    ])
    for h in history:
        writer.writerow([
            h.get("createdAt"),
            h.get("performerName"),
            h.get("employeeName"),
            h.get("sourceType"),
            h.get("feedbackType"),
            h.get("tagName"),
            h.get("description", "").replace("\n", " ")
        ])

    return output.getvalue()


def generate_performance_pulse_pdf(
    history: List[Dict[str, Any]],
    benchmarks: Dict[str, Any],
    goals_data: Dict[str, Any],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_name: Optional[str] = None,
    employee_name: Optional[str] = None
) -> bytes:
    """
    Generates a clean, multi-section PDF document compliant with PDF 1.4 specification
    without requiring external C extensions.
    """
    total_feedbacks = len(history)
    praise_count = sum(1 for h in history if h.get("feedbackType") == "PRAISE")
    improve_count = sum(1 for h in history if h.get("feedbackType") == "IMPROVEMENT")
    warning_count = sum(1 for h in history if h.get("feedbackType") == "WARNING")
    praise_pct = round((praise_count / total_feedbacks * 100), 1) if total_feedbacks > 0 else 0.0
    improve_pct = round((improve_count / total_feedbacks * 100), 1) if total_feedbacks > 0 else 0.0
    warning_pct = round((warning_count / total_feedbacks * 100), 1) if total_feedbacks > 0 else 0.0

    goals_summary = goals_data.get("summary", {})
    avg_goal_pct = goals_summary.get("averageCompletionPercentage", 0.0)
    goal_comp_rate = goals_summary.get("completionRate", 0.0)

    lines: List[str] = [
        "PERFORMAX PERFORMANCE MANAGEMENT SYSTEM",
        "SUPER ADMIN - PERFORMANCE PULSE & BENCHMARK REPORT",
        "================================================================================",
        f"Generated At: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Date Range:   {start_date or 'All Time'} to {end_date or 'Present'}",
        f"Department:   {department_name or 'All Departments'}    |    Employee: {employee_name or 'All Employees'}",
        "--------------------------------------------------------------------------------",
        "",
        "[1] EXECUTIVE SUMMARY & KEY METRICS",
        f"  * Total Published Interactions: {total_feedbacks}",
        f"  * Praise Sentiment:             {praise_count} ({praise_pct}%)",
        f"  * Improvement Sentiment:        {improve_count} ({improve_pct}%)",
        f"  * Warning / Correction:         {warning_count} ({warning_pct}%)",
        f"  * Average Goal Completion:      {avg_goal_pct}%",
        f"  * Goals Fully Completed Rate:   {goal_comp_rate}% ({goals_summary.get('completedGoals', 0)}/{goals_summary.get('totalGoals', 0)} goals)",
        "",
        "[2] DEPARTMENT BENCHMARK COMPARISONS",
        "  Dept Name         | Headcount | Activity | Act/Emp | Praise% | Imprv% | Goal Comp%",
        "  ------------------+-----------+----------+---------+---------+--------+-----------",
    ]

    for d in benchmarks.get("departments", [])[:8]:
        d_name = (d.get("departmentName") or "General")[:17].ljust(17)
        hc = str(d.get("headcount", 0)).rjust(9)
        act = str(d.get("totalActivities", 0)).rjust(8)
        rate = f"{d.get('activitiesPerEmployee', 0.0):.1f}".rjust(7)
        s = d.get("sentimentDistribution", {})
        p_pct = f"{s.get('praisePercentage', 0.0):.0f}%".rjust(7)
        i_pct = f"{s.get('improvementPercentage', 0.0):.0f}%".rjust(6)
        g = d.get("goals", {})
        g_rate = f"{g.get('completionRate', 0.0):.0f}%".rjust(9)
        lines.append(f"  {d_name} | {hc} | {act} | {rate} | {p_pct} | {i_pct} | {g_rate}")

    lines.extend([
        "",
        "[3] RECENT GOALS & KPI ALIGNMENT",
        "  Title                             | Employee       | Status      | Progress",
        "  ----------------------------------+----------------+-------------+---------",
    ])

    for g in goals_data.get("goals", [])[:6]:
        g_title = (g.get("title") or "")[:32].ljust(32)
        emp = (g.get("employeeName") or "")[:14].ljust(14)
        stat = (g.get("status") or "")[:11].ljust(11)
        prog = f"{g.get('completionPercentage', 0):.0f}%".rjust(7)
        lines.append(f"  {g_title} | {emp} | {stat} | {prog}")

    lines.extend([
        "",
        "[4] RECENT PERFORMANCE INTERACTIONS (AUDIT LOG)",
        "  Timestamp        | Performer -> Recipient       | Sentiment | Description",
        "  -----------------+------------------------------+-----------+-----------------------",
    ])

    for h in history[:10]:
        t_str = h.get("createdAt", "")[:16].replace("T", " ").ljust(16)
        part = f"{h.get('performerName', '')[:12]} -> {h.get('employeeName', '')[:12]}".ljust(28)
        sent = (h.get("feedbackType") or "")[:9].ljust(9)
        desc = (h.get("description") or "").replace("\n", " ")[:25]
        lines.append(f"  {t_str} | {part} | {sent} | {desc}")

    # Build PDF Content Stream
    content_lines = []
    y = 750
    for idx, line in enumerate(lines[:50]):
        # Sanitize text for PDF string literal
        sanitized = (
            str(line)
            .replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
        )
        is_heading = line.startswith("[") or "PERFORMAX" in line or "SUPER ADMIN" in line
        font_name = "F2" if is_heading else "F1"
        font_size = "11" if is_heading else "8.5"
        content_lines.append(f"BT /{font_name} {font_size} Tf 40 {y} Td ({sanitized}) Tj ET")
        y -= 14.5

    stream_content = "\n".join(content_lines).encode("latin-1", errors="replace")
    stream_len = len(stream_content)

    pdf_body = (
        b"%PDF-1.4\n"
        b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
        b"3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R /F2 5 0 R>>>> /MediaBox [0 0 612 792] /Contents 6 0 R>> endobj\n"
        b"4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Courier>> endobj\n"
        b"5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Courier-Bold>> endobj\n"
        + f"6 0 obj <</Length {stream_len}>> stream\n".encode("ascii")
        + stream_content
        + b"\nendstream\nendobj\n"
        b"xref\n0 7\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000240 00000 n \n0000000311 00000 n \n0000000387 00000 n \n"
        b"trailer <</Size 7 /Root 1 0 R>>\nstartxref\n"
        + f"{450 + stream_len}\n%%EOF\n".encode("ascii")
    )
    return pdf_body


# =====================================================================
# API VIEWS
# =====================================================================

def ok_response(data, message="Success"):
    return Response({
        "code": 200,
        "message": message,
        "data": data,
        **({} if not isinstance(data, dict) else data)
    }, status=status.HTTP_200_OK)


class PerformancePulseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = parse_date(request.query_params.get('startDate') or request.query_params.get('start_date'))
        end_date = parse_date(request.query_params.get('endDate') or request.query_params.get('end_date'))

        if start_date and end_date and start_date > end_date:
            return Response(
                {"detail": "Invalid date range: End date cannot precede start date.", "code": 400},
                status=status.HTTP_400_BAD_REQUEST
            )

        department_id = request.query_params.get('departmentId') or request.query_params.get('department_id')
        employee_id = request.query_params.get('employeeId') or request.query_params.get('employee_id')
        source_type = request.query_params.get('sourceType') or request.query_params.get('source_type')

        history_items = fetch_pulse_history(
            start_date=start_date,
            end_date=end_date,
            department_id=department_id,
            employee_id=employee_id,
            source_type=source_type
        )
        return ok_response(history_items)


class PerformanceHistoryAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        start_date = parse_date(request.query_params.get('startDate') or request.query_params.get('start_date'))
        end_date = parse_date(request.query_params.get('endDate') or request.query_params.get('end_date'))

        if start_date and end_date and start_date > end_date:
            return Response(
                {"detail": "Invalid date range: End date cannot precede start date.", "code": 400},
                status=status.HTTP_400_BAD_REQUEST
            )

        department_id = request.query_params.get('departmentId') or request.query_params.get('department_id')
        employee_id = kwargs.get('employee_id') or request.query_params.get('employeeId') or request.query_params.get('employee_id')
        source_type = request.query_params.get('sourceType') or request.query_params.get('source_type')

        page = int(request.query_params.get("page", 0))
        size = int(request.query_params.get("size", 10))

        items = fetch_pulse_history(
            start_date=start_date,
            end_date=end_date,
            department_id=department_id,
            employee_id=employee_id,
            source_type=source_type
        )

        total = len(items)
        start = page * size
        end = start + size
        page_items = items[start:end]
        total_pages = max(1, (total + size - 1) // size) if total > 0 else 1

        return ok_response({
            "content": page_items,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": total_pages,
            "last": (page + 1) >= total_pages
        })


class PerformancePulseBenchmarksView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = parse_date(request.query_params.get('startDate') or request.query_params.get('start_date'))
        end_date = parse_date(request.query_params.get('endDate') or request.query_params.get('end_date'))

        if start_date and end_date and start_date > end_date:
            return Response(
                {"detail": "Invalid date range: End date cannot precede start date.", "code": 400},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = compute_department_benchmarks(start_date=start_date, end_date=end_date)
        return ok_response(data)


class PerformancePulseGoalsOverlayView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = parse_date(request.query_params.get('startDate') or request.query_params.get('start_date'))
        end_date = parse_date(request.query_params.get('endDate') or request.query_params.get('end_date'))

        if start_date and end_date and start_date > end_date:
            return Response(
                {"detail": "Invalid date range: End date cannot precede start date.", "code": 400},
                status=status.HTTP_400_BAD_REQUEST
            )

        department_id = request.query_params.get('departmentId') or request.query_params.get('department_id')
        employee_id = request.query_params.get('employeeId') or request.query_params.get('employee_id')

        data = compute_goals_kpi_overlay(
            start_date=start_date,
            end_date=end_date,
            department_id=department_id,
            employee_id=employee_id
        )
        return ok_response(data)


class PerformancePulseExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def perform_content_negotiation(self, request, force=False):
        # Allow custom binary and text downloads (CSV/PDF) without DRF renderer rejection
        renderers = self.get_renderers()
        return (renderers[0], renderers[0].media_type)

    def get(self, request, *args, **kwargs):
        # Strict authorization: must be Super Admin or HR
        if not is_admin_user(request.user) and request.user.role not in [UserRole.SUPER_ADMIN, UserRole.HR]:
            return Response(
                {"detail": "Forbidden: Export privileges require Super Admin or HR permissions.", "code": 403},
                status=status.HTTP_403_FORBIDDEN
            )

        start_date = parse_date(request.query_params.get('startDate') or request.query_params.get('start_date'))
        end_date = parse_date(request.query_params.get('endDate') or request.query_params.get('end_date'))

        if start_date and end_date and start_date > end_date:
            return Response(
                {"detail": "Invalid date range: End date cannot precede start date.", "code": 400},
                status=status.HTTP_400_BAD_REQUEST
            )

        department_id = request.query_params.get('departmentId') or request.query_params.get('department_id')
        employee_id = request.query_params.get('employeeId') or request.query_params.get('employee_id')
        source_type = request.query_params.get('sourceType') or request.query_params.get('source_type')
        export_format = (kwargs.get('fmt') or request.query_params.get('format') or request.query_params.get('fmt') or 'csv').lower()

        # Lookup friendly names for report header
        dept_name = None
        if department_id and department_id != 'ALL':
            dept_obj = Department.objects.filter(id=department_id).first()
            if dept_obj:
                dept_name = dept_obj.name

        emp_name = None
        if employee_id and employee_id != 'ALL':
            emp_obj = EmployeeProfile.objects.filter(id=employee_id).first()
            if emp_obj:
                emp_name = emp_obj.full_name or emp_obj.user.username

        history = fetch_pulse_history(
            start_date=start_date,
            end_date=end_date,
            department_id=department_id,
            employee_id=employee_id,
            source_type=source_type
        )
        benchmarks = compute_department_benchmarks(start_date=start_date, end_date=end_date)
        goals_data = compute_goals_kpi_overlay(
            start_date=start_date,
            end_date=end_date,
            department_id=department_id,
            employee_id=employee_id
        )

        timestamp_slug = timezone.now().strftime("%Y%m%d_%H%M%S")

        if export_format == 'pdf':
            pdf_bytes = generate_performance_pulse_pdf(
                history=history,
                benchmarks=benchmarks,
                goals_data=goals_data,
                start_date=start_date,
                end_date=end_date,
                department_name=dept_name,
                employee_name=emp_name
            )
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="performance_pulse_report_{timestamp_slug}.pdf"'
            return response
        else:
            csv_str = generate_performance_pulse_csv(
                history=history,
                benchmarks=benchmarks,
                goals_data=goals_data,
                start_date=start_date,
                end_date=end_date,
                department_name=dept_name,
                employee_name=emp_name
            )
            response = HttpResponse(csv_str, content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="performance_pulse_report_{timestamp_slug}.csv"'
            return response


DEFAULT_MEETINGS_DATA = [
    {
        "meetingId": 1,
        "employeeId": 1,
        "employeeName": "intern_alex",
        "managerId": 2,
        "managerName": "manager_marcus",
        "meetingTitle": "Bi-Weekly PMS Strategic Alignment",
        "meetingDate": "2026-09-22",
        "meetingTime": "10:30",
        "discussionPoints": "Review quarterly deliverables, production deployment checklist, and OKR progress.",
        "keyIssues": "Database indexing optimization for enterprise audit trail query volume.",
        "actionItems": [
            {
                "id": 1,
                "content": "Verify zero 404 endpoint routing coverage",
                "status": "DONE",
                "assignedToId": 1,
                "assignedToName": "intern_alex",
                "dueDate": "2026-09-21",
                "completedAt": "2026-09-21T16:00:00Z"
            },
            {
                "id": 2,
                "content": "Confirm Dailoqa glassmorphism styling across submodules",
                "status": "PENDING",
                "assignedToId": 1,
                "assignedToName": "intern_alex",
                "dueDate": "2026-09-23"
            }
        ],
        "status": "PUBLISHED",
        "createdBy": 2,
        "commentCount": 2,
        "createdAt": "2026-09-20T10:00:00Z",
        "publishedAt": "2026-09-20T10:00:00Z"
    },
    {
        "meetingId": 2,
        "employeeId": 2,
        "employeeName": "intern_liam",
        "managerId": 1,
        "managerName": "manager_elena",
        "meetingTitle": "Monthly Growth & KRA Sync",
        "meetingDate": "2026-09-25",
        "meetingTime": "14:00",
        "discussionPoints": "Review sprint milestones, team mentorship goals, and technical capability progress.",
        "keyIssues": "Cross-service API contract harmonization.",
        "actionItems": [
            {
                "id": 3,
                "content": "Automated regression testing calibration",
                "status": "DONE",
                "assignedToId": 2,
                "assignedToName": "intern_liam",
                "dueDate": "2026-09-26",
                "completedAt": "2026-09-26T12:00:00Z"
            }
        ],
        "status": "PUBLISHED",
        "createdBy": 1,
        "commentCount": 1,
        "createdAt": "2026-09-19T11:00:00Z",
        "publishedAt": "2026-09-19T11:00:00Z"
    }
]


class PerformanceHistoryMeetingPulseCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = parse_date(request.query_params.get('startDate') or request.query_params.get('start_date'))
        end_date = parse_date(request.query_params.get('endDate') or request.query_params.get('end_date'))

        if start_date and end_date and start_date > end_date:
            return Response(
                {"detail": "Invalid date range: End date cannot precede start date.", "code": 400},
                status=status.HTTP_400_BAD_REQUEST
            )

        emp_id = request.query_params.get('employeeId') or request.query_params.get('employee_id')

        meetings = []
        action_items = []
        for m in DEFAULT_MEETINGS_DATA:
            m_date = parse_date(m.get("meetingDate") or m.get("createdAt"))
            if start_date and m_date and m_date < start_date:
                continue
            if end_date and m_date and m_date > end_date:
                continue
            if emp_id and emp_id != 'ALL' and str(m.get("employeeId")) != str(emp_id):
                continue
            meetings.append(m)
            action_items.extend(m.get("actionItems", []))

        total_actions = len(action_items)
        done_actions = sum(1 for ai in action_items if ai.get("status") == "DONE")

        meeting_history = [
            {
                "historyId": 500 + m["meetingId"],
                "id": str(m["meetingId"]),
                "employeeId": m["employeeId"],
                "employeeName": m["employeeName"],
                "managerId": m["managerId"],
                "managerName": m["managerName"],
                "performerId": m["managerId"],
                "performerName": m["managerName"],
                "sourceType": "MEETING",
                "sourceId": m["meetingId"],
                "title": m["meetingTitle"],
                "description": m.get("discussionPoints", ""),
                "tagName": "1-on-1 Sync",
                "createdAt": m.get("createdAt", "2026-09-20T10:00:00Z")
            }
            for m in meetings
        ]

        return ok_response({
            "totalActionItems": total_actions,
            "completedActionItems": done_actions,
            "actionItems": action_items,
            "meetingHistory": meeting_history
        })


