"""
Sorted Views Package for Tech Manager & Mentor Functionalities (M-01 to M-12)
"""

from .base import IsManagerUser, get_manager_reports_qs
from .mentees_views import ManagerMenteesView
from .tasks_views import ManagerTasksView, ManagerTaskDetailView
from .technical_parameters_views import ManagerTechnicalParametersView, ManagerTechnicalParameterDetailView
from .technical_reviews_views import ManagerTechnicalReviewsView
from .evidence_views import ManagerEvidenceView, ManagerEvidenceDecisionView
from .feedback_views import ManagerGiveFeedbackView, ManagerEmployeeFeedbacksView
from .appraisal_views import (
    ManagerAppraisalSubmissionsView,
    ManagerSaveAppraisalDraftView,
    ManagerSubmitAppraisalView,
)
from .history_views import ManagerHistoricalReviewsView
from .dashboard_views import ManagerDashboardView

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
