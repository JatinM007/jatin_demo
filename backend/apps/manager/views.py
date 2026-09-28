"""
Tech Manager Module Views Facade
All views have been sorted and organized into the `apps.manager.views` package:
  - mentees_views.py              (M-01: View Assigned Interns/Employees)
  - tasks_views.py                (M-02: Assign Tasks, M-03: Manage Tasks & Goals)
  - technical_parameters_views.py (M-04: Manage Technical Capability Parameters)
  - technical_reviews_views.py    (M-05: Review Technical Capability Matrix)
  - evidence_views.py             (M-06: View & Review Evidence Submissions)
  - feedback_views.py             (M-07: Give Feedback, M-08: Review Employee Feedback)
  - appraisal_views.py            (M-09: Conduct Review, M-10: Save Draft, M-11: Submit Review)
  - history_views.py              (M-12: View Previous Reviews & Archive)
  - dashboard_views.py            (Manager Telemetry & Overview Dashboard)
"""

from .views import (
    IsManagerUser,
    get_manager_reports_qs,
    ManagerMenteesView,
    ManagerTasksView,
    ManagerTaskDetailView,
    ManagerTechnicalParametersView,
    ManagerTechnicalParameterDetailView,
    ManagerTechnicalReviewsView,
    ManagerEvidenceView,
    ManagerEvidenceDecisionView,
    ManagerGiveFeedbackView,
    ManagerEmployeeFeedbacksView,
    ManagerAppraisalSubmissionsView,
    ManagerSaveAppraisalDraftView,
    ManagerSubmitAppraisalView,
    ManagerHistoricalReviewsView,
    ManagerDashboardView,
)

__all__ = [
    'IsManagerUser',
    'get_manager_reports_qs',
    'ManagerMenteesView',
    'ManagerTasksView',
    'ManagerTaskDetailView',
    'ManagerTechnicalParametersView',
    'ManagerTechnicalParameterDetailView',
    'ManagerTechnicalReviewsView',
    'ManagerEvidenceView',
    'ManagerEvidenceDecisionView',
    'ManagerGiveFeedbackView',
    'ManagerEmployeeFeedbacksView',
    'ManagerAppraisalSubmissionsView',
    'ManagerSaveAppraisalDraftView',
    'ManagerSubmitAppraisalView',
    'ManagerHistoricalReviewsView',
    'ManagerDashboardView',
]
