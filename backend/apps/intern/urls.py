from django.urls import path
from . import views

app_name = 'intern'

urlpatterns = [
    # Dashboard & Scorecard Overview
    path('overview/', views.InternOverviewView.as_view(), name='overview'),
    path('scorecard/', views.InternOverviewView.as_view(), name='scorecard'),
    path('dashboard/', views.InternOverviewView.as_view(), name='dashboard'),

    # Goals, Progress Sliders & Goal Comments
    path('my-goals/', views.InternGoalsView.as_view(), name='my_goals'),
    path('goals/', views.InternGoalsView.as_view(), name='goals_list'),
    path('my-goals/<uuid:pk>/', views.InternGoalDetailView.as_view(), name='my_goal_detail'),
    path('goals/<uuid:pk>/', views.InternGoalDetailView.as_view(), name='goal_detail'),
    path('my-goals/<uuid:pk>/progress/', views.InternUpdateProgressView.as_view(), name='update_progress'),
    path('goals/<uuid:pk>/progress/', views.InternUpdateProgressView.as_view(), name='update_goal_progress'),
    path('my-goals/<uuid:pk>/comments/', views.InternGoalCommentsView.as_view(), name='goal_comments'),
    path('goals/<uuid:pk>/comments/', views.InternGoalCommentsView.as_view(), name='goal_comments_alt'),

    # Evidence Submissions (File attachments, URLs, status)
    path('evidence/', views.InternEvidenceView.as_view(), name='evidence_list'),
    path('evidence/submit/', views.InternEvidenceView.as_view(), name='submit_evidence'),
    path('evidence/<uuid:pk>/', views.InternEvidenceDetailView.as_view(), name='evidence_detail'),

    # Assigned Tasks & Lifecycle
    path('tasks/', views.InternTasksView.as_view(), name='tasks_list'),
    path('tasks/<uuid:pk>/', views.InternTaskDetailView.as_view(), name='task_detail'),
    path('tasks/<uuid:pk>/complete/', views.InternCompleteTaskView.as_view(), name='complete_task'),
    path('tasks/<uuid:pk>/mentor-review/', views.InternTaskReviewView.as_view(), name='mentor_review_task'),

    # HR-Published Forms & Questionnaires
    path('forms/', views.InternFormsListView.as_view(), name='forms_list'),
    path('forms/<uuid:pk>/', views.InternFormDetailView.as_view(), name='form_detail'),
    path('forms/<uuid:pk>/submit/', views.InternFormSubmitView.as_view(), name='form_submit'),

    # Self-Rating & Reflection
    path('self-appraisal/', views.InternSelfAppraisalView.as_view(), name='self_appraisal'),
    path('evaluation/', views.InternSelfAppraisalView.as_view(), name='self_evaluation'),

    # Published Feedback, Scores, Classification, Improvement Areas & Reply
    path('published-feedback/', views.InternPublishedFeedbackView.as_view(), name='published_feedback'),
    path('results/', views.InternPublishedFeedbackView.as_view(), name='published_results'),
    path('published-feedback/reply/', views.InternFeedbackReplyView.as_view(), name='reply_feedback'),

    # Comprehensive Internship Journey & Milestones Roadmap (100% Dynamic)
    path('journey/', views.InternJourneyView.as_view(), name='journey'),
]

