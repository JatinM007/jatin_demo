import React, { useState } from 'react';
import {
  Award, Target, ClipboardList, FileText, UserCheck,
  Trophy, User, Bell, RefreshCw, Compass
} from 'lucide-react';
import {
  useGetInternOverviewQuery,
  useGetInternGoalsQuery,
  useUpdateInternGoalProgressMutation,
  useAddInternGoalCommentMutation,
  useGetInternTasksQuery,
  useCompleteInternTaskMutation,
  useGetInternEvidenceQuery,
  useSubmitInternEvidenceMutation,
  useGetInternSelfAppraisalQuery,
  useSubmitInternSelfAppraisalMutation,
  useGetInternPublishedFeedbackQuery,
  useReplyToMentorFeedbackMutation,
  useGetUnreadNotificationsCountQuery
} from '../features/dashboard/dashboardApi';
import { useAuth } from '../hooks/useAuth';
import InternOverviewTab from '../components/intern/InternOverviewTab';
import InternGoalsTab from '../components/intern/InternGoalsTab';
import InternTasksTab from '../components/intern/InternTasksTab';
import InternEvidenceTab from '../components/intern/InternEvidenceTab';
import InternEvaluationTab from '../components/intern/InternEvaluationTab';
import InternFormsTab from '../components/intern/InternFormsTab';
import InternResultsTab from '../components/intern/InternResultsTab';
import InternProfileTab from '../components/intern/InternProfileTab';
import { InternJourneyTab } from '../components/intern/InternJourneyTab';
import InternNotificationsModal from '../components/intern/InternNotificationsModal';

type DashboardTab = 'overview' | 'journey' | 'goals' | 'tasks' | 'evidence' | 'evaluation' | 'forms' | 'results' | 'profile';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [evidencePreselectedGoalId, setEvidencePreselectedGoalId] = useState<string>('');

  // Primary Queries
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useGetInternOverviewQuery();

  const {
    data: goals = [],
    isLoading: isGoalsLoading,
    refetch: refetchGoals,
  } = useGetInternGoalsQuery();

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useGetInternTasksQuery();

  const {
    data: evidenceList = [],
    isLoading: isEvidenceLoading,
    refetch: refetchEvidence,
  } = useGetInternEvidenceQuery();

  const {
    data: selfAppraisal,
    isLoading: isAppraisalLoading,
    refetch: refetchSelfAppraisal,
  } = useGetInternSelfAppraisalQuery();

  const {
    data: publishedFeedback,
    isLoading: isFeedbackLoading,
    refetch: refetchFeedback,
  } = useGetInternPublishedFeedbackQuery();

  const {
    data: unreadNotifs,
    refetch: refetchUnreadNotifs,
  } = useGetUnreadNotificationsCountQuery();

  // Primary Mutations
  const [updateGoalProgress] = useUpdateInternGoalProgressMutation();
  const [addGoalComment] = useAddInternGoalCommentMutation();
  const [completeTask] = useCompleteInternTaskMutation();
  const [submitEvidence] = useSubmitInternEvidenceMutation();
  const [submitSelfAppraisal] = useSubmitInternSelfAppraisalMutation();
  const [replyToFeedback] = useReplyToMentorFeedbackMutation();

  const handleOpenEvidenceForGoal = (goalId: string) => {
    setEvidencePreselectedGoalId(goalId);
    setActiveTab('evidence');
  };

  const handleRefreshAll = () => {
    refetchOverview();
    refetchGoals();
    refetchTasks();
    refetchEvidence();
    refetchSelfAppraisal();
    refetchFeedback();
    refetchUnreadNotifs();
  };

  const internName = user?.staffName || (user as any)?.username || (user as any)?.profile?.full_name || 'Intern';

  const tabs: Array<{ id: DashboardTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <Award size={16} /> },
    { id: 'journey', label: 'My Journey', icon: <Compass size={16} /> },
    { id: 'goals', label: 'Goals & Milestones', icon: <Target size={16} />, badge: goals.length },
    { id: 'tasks', label: 'Tasks & Sprints', icon: <ClipboardList size={16} />, badge: tasks.filter((t: any) => !t.isCompleted && t.status !== 'COMPLETED').length },
    { id: 'evidence', label: 'Deliverables & Evidence', icon: <FileText size={16} />, badge: evidenceList.length },
    { id: 'evaluation', label: 'Self-Appraisal', icon: <UserCheck size={16} /> },
    { id: 'forms', label: 'HR Surveys', icon: <FileText size={16} /> },
    { id: 'results', label: 'Published Results', icon: <Trophy size={16} /> },
    { id: 'profile', label: 'My Placement', icon: <User size={16} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="text-amber-500" size={26} />
            Welcome back, {internName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {overviewData?.cycle?.name || 'Active Performance Evaluation'} • {overviewData?.cycle?.currentPhase || 'Active Milestone Sprint'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View My Journey Quick Action */}
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
              activeTab === 'journey'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="View your comprehensive internship journey roadmap"
          >
            <Compass size={14} />
            <span>View My Journey</span>
          </button>

          {/* Notification Button */}
          <button
            onClick={() => setIsNotifModalOpen(true)}
            className="relative p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadNotifs && unreadNotifs.unread_count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifs.unread_count}
              </span>
            )}
          </button>

          {/* Refresh Data Button */}
          <button
            onClick={handleRefreshAll}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh dashboard data"
          >
            <RefreshCw size={18} />
          </button>

          <span className="bg-amber-50 text-amber-700 font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
            Intern Scope
          </span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80 select-none scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'evidence') setEvidencePreselectedGoalId('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <main className="transition-opacity duration-150">
        {activeTab === 'overview' && (
          <InternOverviewTab
            overviewData={overviewData}
            isLoading={isOverviewLoading}
            onNavigateToTab={(t) => setActiveTab(t as DashboardTab)}
            onRefresh={refetchOverview}
          />
        )}

        {activeTab === 'journey' && (
          <InternJourneyTab
            onNavigateTab={(t) => setActiveTab(t as DashboardTab)}
          />
        )}

        {activeTab === 'goals' && (
          <InternGoalsTab
            goals={goals}
            isLoading={isGoalsLoading}
            onUpdateProgress={async (goalId, progress, comment) => {
              return updateGoalProgress({ id: goalId, progress, comment }).unwrap();
            }}
            onAddComment={async (goalId, comment, parentId) => {
              return addGoalComment({ id: goalId, comment, parentId }).unwrap();
            }}
            onOpenEvidenceModal={handleOpenEvidenceForGoal}
            onRefetch={refetchGoals}
          />
        )}

        {activeTab === 'tasks' && (
          <InternTasksTab
            tasks={tasks}
            isLoading={isTasksLoading}
            onCompleteTask={async (payload) => {
              return completeTask(payload).unwrap();
            }}
            onRefetch={refetchTasks}
          />
        )}

        {activeTab === 'evidence' && (
          <InternEvidenceTab
            evidenceList={evidenceList}
            goals={goals}
            isLoading={isEvidenceLoading}
            onSubmitEvidence={async (fd) => {
              return submitEvidence(fd).unwrap();
            }}
            preselectedGoalId={evidencePreselectedGoalId}
            onRefetch={refetchEvidence}
            onCloseDirectModal={() => setEvidencePreselectedGoalId('')}
          />
        )}

        {activeTab === 'evaluation' && (
          <InternEvaluationTab
            selfAppraisal={selfAppraisal}
            isLoading={isAppraisalLoading}
            onSubmitSelfAppraisal={async (payload) => {
              return submitSelfAppraisal(payload).unwrap();
            }}
            onRefetch={refetchSelfAppraisal}
          />
        )}

        {activeTab === 'forms' && <InternFormsTab />}

        {activeTab === 'results' && (
          <InternResultsTab
            feedbackData={publishedFeedback}
            isLoading={isFeedbackLoading}
            onReplyToFeedback={async (replyText) => {
              return replyToFeedback({ replyText }).unwrap();
            }}
            onRefetch={refetchFeedback}
          />
        )}

        {activeTab === 'profile' && (
          <InternProfileTab
            user={user}
            mentor={overviewData?.mentor}
            cycleName={overviewData?.cycle?.name}
          />
        )}
      </main>

      {/* Notifications Modal */}
      <InternNotificationsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={[]}
        onRefetch={refetchUnreadNotifs}
      />
    </div>
  );
};

export default EmployeeDashboard;
