import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Users,
  Target,
  Award,
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  useGetAssignedMenteesQuery,
  useGetManagerTasksQuery,
  useAssignTaskMutation,
  useUpdateTaskStatusMutation,
  useGetTechnicalParametersQuery,
  useCreateTechnicalParameterMutation,
  useGetTechnicalReviewsQuery,
  useSaveTechnicalReviewsMutation,
  useGetManagerEvidenceQuery,
  useReviewEvidenceDecisionMutation,
  useGiveManagerFeedbackMutation,
  useGetEmployeeFeedbacksQuery,
  useCommentOnEmployeeFeedbackMutation,
  useGetHistoricalReviewsQuery,
} from '../../features/manager/managerApi';
import type { MenteeItem } from '../../features/manager/managerApi';

export const ManagerHubPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'mentees';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const navigate = useNavigate();

  // Search & Filter state for Mentees
  const [menteeSearch, setMenteeSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Mentee for detail or action
  const [selectedMentee, setSelectedMentee] = useState<MenteeItem | null>(null);

  // Modals state
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isGiveFeedbackOpen, setIsGiveFeedbackOpen] = useState(false);
  const [isAddParamOpen, setIsAddParamOpen] = useState(false);
  const [isReviewEvidenceOpen, setIsReviewEvidenceOpen] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  // Assign Task Form State
  const [taskForm, setTaskForm] = useState({
    employee_id: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    due_date: '',
    target_value: 100,
    unit: '%',
  });

  // Give Feedback Form State
  const [feedbackForm, setFeedbackForm] = useState({
    employee_id: '',
    feedback_type: 'POSITIVE',
    message: '',
    visibility: 'PUBLIC',
  });

  // New Technical Parameter Form State
  const [paramForm, setParamForm] = useState({
    name: '',
    category: 'Software Engineering',
    description: '',
    benchmark_score: 5.0,
    weight: 20.0,
  });

  // Evidence Review Form State
  const [evidenceDecision, setEvidenceDecision] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
    remarks: '',
  });

  // Queries
  const { data: mentees = [], isLoading: menteesLoading, refetch: refetchMentees } = useGetAssignedMenteesQuery({
    search: menteeSearch,
    status: statusFilter,
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useGetManagerTasksQuery();
  const { refetch: refetchParams } = useGetTechnicalParametersQuery();
  const { data: evidenceList = [], refetch: refetchEvidence } = useGetManagerEvidenceQuery();
  const { data: employeeFeedbacks = [], refetch: refetchFeedbacks } = useGetEmployeeFeedbacksQuery(undefined);
  const { data: historicalReviews = [] } = useGetHistoricalReviewsQuery(selectedMentee?.id);

  // Selected Mentee for Technical Review Tab
  const [techReviewMenteeId, setTechReviewMenteeId] = useState<string>('');
  const activeTechMenteeId = techReviewMenteeId || (mentees.length > 0 ? mentees[0].id : '');
  const { data: techDossier, refetch: refetchTechReviews } = useGetTechnicalReviewsQuery(activeTechMenteeId, {
    skip: !activeTechMenteeId,
  });

  // Technical Review Scores State
  const [techScores, setTechScores] = useState<Record<string, { score: number; assessment: string; evidenceUrl: string }>>({});

  // Mutations
  const [assignTask, { isLoading: isAssigningTask }] = useAssignTaskMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [createParam, { isLoading: isCreatingParam }] = useCreateTechnicalParameterMutation();
  const [saveTechnicalReviews, { isLoading: isSavingTechReview }] = useSaveTechnicalReviewsMutation();
  const [reviewEvidence, { isLoading: isReviewingEvidence }] = useReviewEvidenceDecisionMutation();
  const [giveFeedback, { isLoading: isSendingFeedback }] = useGiveManagerFeedbackMutation();
  const [commentOnFeedback] = useCommentOnEmployeeFeedbackMutation();

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Sync tech scores when techDossier arrives
  React.useEffect(() => {
    if (techDossier?.parameters) {
      const initial: Record<string, { score: number; assessment: string; evidenceUrl: string }> = {};
      techDossier.parameters.forEach((p) => {
        initial[p.parameterId] = {
          score: p.review.score || p.benchmarkScore || 4.0,
          assessment: p.review.mentorAssessment || '',
          evidenceUrl: p.review.evidenceUrl || '',
        };
      });
      setTechScores(initial);
    }
  }, [techDossier]);

  // Handlers
  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.employee_id || !taskForm.title) {
      toast.warning('Please select an intern and enter a task title.');
      return;
    }
    try {
      await assignTask(taskForm).unwrap();
      toast.success('Task successfully assigned to intern!');
      setIsAssignTaskOpen(false);
      setTaskForm({
        employee_id: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
        target_value: 100,
        unit: '%',
      });
      refetchTasks();
      refetchMentees();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to assign task.');
    }
  };

  const handleGiveFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.employee_id || !feedbackForm.message) {
      toast.warning('Please select an intern and enter feedback.');
      return;
    }
    try {
      await giveFeedback(feedbackForm).unwrap();
      toast.success('Feedback recorded and delivered!');
      setIsGiveFeedbackOpen(false);
      setFeedbackForm({
        employee_id: '',
        feedback_type: 'POSITIVE',
        message: '',
        visibility: 'PUBLIC',
      });
      refetchFeedbacks();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to send feedback.');
    }
  };

  const handleCreateParamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramForm.name) {
      toast.warning('Parameter name is required.');
      return;
    }
    try {
      await createParam(paramForm).unwrap();
      toast.success('Technical parameter configured successfully!');
      setIsAddParamOpen(false);
      setParamForm({
        name: '',
        category: 'Software Engineering',
        description: '',
        benchmark_score: 5.0,
        weight: 20.0,
      });
      refetchParams();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to add parameter.');
    }
  };

  const handleSaveTechReviews = async (reviewStatus: 'DRAFT' | 'SUBMITTED') => {
    if (!activeTechMenteeId) return;
    const reviewsPayload = Object.entries(techScores).map(([paramId, data]) => ({
      parameter_id: paramId,
      score: data.score,
      mentor_assessment: data.assessment,
      evidence_url: data.evidenceUrl,
    }));

    try {
      await saveTechnicalReviews({
        employee_id: activeTechMenteeId,
        status: reviewStatus,
        reviews: reviewsPayload,
      }).unwrap();
      toast.success(
        reviewStatus === 'SUBMITTED'
          ? 'Technical capability review finalized and submitted!'
          : 'Technical evaluation draft saved!'
      );
      refetchTechReviews();
      refetchMentees();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save technical review.');
    }
  };

  const handleReviewEvidenceSubmit = async () => {
    if (!selectedEvidenceId) return;
    try {
      await reviewEvidence({
        id: selectedEvidenceId,
        status: evidenceDecision.status,
        remarks: evidenceDecision.remarks,
      }).unwrap();
      toast.success(`Evidence marked as ${evidenceDecision.status.toLowerCase().replace('_', ' ')}.`);
      setIsReviewEvidenceOpen(false);
      setSelectedEvidenceId(null);
      setEvidenceDecision({ status: 'APPROVED', remarks: '' });
      refetchEvidence();
      refetchMentees();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to submit evidence decision.');
    }
  };

  // Metrics summary
  const totalMentees = mentees.length;
  const totalActiveTasks = tasks.filter((t) => t.status !== 'COMPLETED').length;
  const totalPendingEvidence = evidenceList.filter((e) => e.reviewStatus === 'PENDING').length;
  const pendingAppraisals = mentees.filter((m) => m.activeAppraisal?.status === 'SUBMITTED' || m.activeAppraisal?.status === 'UNDER_REVIEW').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wider uppercase mb-3 border border-white/15">
              <ShieldCheck size={14} className="text-emerald-400" />
              Mentor & Manager Workspace
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Assigned Interns & Performance Operations
            </h1>
            <p className="text-indigo-200 text-sm mt-1.5 max-w-2xl">
              Supervise assigned mentees, set technical capability benchmarks, assign sprint tasks, inspect evidence, and conduct weighted appraisals.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setTaskForm((prev) => ({ ...prev, employee_id: mentees[0]?.id || '' }));
                setIsAssignTaskOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs shadow-md hover:bg-indigo-50 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} className="text-indigo-600" />
              Assign Task
            </button>
            <button
              onClick={() => {
                setFeedbackForm((prev) => ({ ...prev, employee_id: mentees[0]?.userId || '' }));
                setIsGiveFeedbackOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 text-white font-bold text-xs border border-indigo-500/40 transition-all cursor-pointer active:scale-95"
            >
              <MessageSquare size={16} />
              Give Feedback
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-200 font-medium">Assigned Mentees</span>
              <Users size={16} className="text-indigo-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{totalMentees}</div>
            <div className="text-[11px] text-indigo-200/80 mt-1">Directly reporting interns</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-200 font-medium">Active Tasks</span>
              <Target size={16} className="text-amber-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{totalActiveTasks}</div>
            <div className="text-[11px] text-indigo-200/80 mt-1">In-flight deliverables</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-200 font-medium">Pending Evidence</span>
              <FolderOpen size={16} className="text-rose-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{totalPendingEvidence}</div>
            <div className="text-[11px] text-indigo-200/80 mt-1">Submissions awaiting sign-off</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-200 font-medium">Pending Appraisals</span>
              <Award size={16} className="text-emerald-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{pendingAppraisals}</div>
            <div className="text-[11px] text-indigo-200/80 mt-1">Reviews ready for manager scoring</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (M-01 to M-12) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { key: 'mentees', label: 'Assigned Mentees (M-01)', icon: Users },
          { key: 'tasks', label: 'Tasks & Goals (M-02, M-03)', icon: Target },
          { key: 'capabilities', label: 'Technical Capabilities (M-04, M-05)', icon: Sparkles },
          { key: 'evidence', label: 'Evidence Review (M-06)', icon: FolderOpen },
          { key: 'feedback', label: 'Feedback & Reflections (M-07, M-08)', icon: MessageSquare },
          { key: 'history', label: 'Previous Reviews (M-12)', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ASSIGNED MENTEES / EMPLOYEES (M-01) */}
      {/* ========================================================================= */}
      {activeTab === 'mentees' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search mentee name, code, or email..."
                value={menteeSearch}
                onChange={(e) => setMenteeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="">All Employment Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <button
                onClick={() => refetchMentees()}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Refresh Mentees"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Mentees Grid */}
          {menteesLoading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading assigned mentees...</div>
          ) : mentees.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Users size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Mentees Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No interns match your current search filters or are assigned under your manager portfolio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentees.map((mentee) => (
                <div
                  key={mentee.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 transition-all p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Avatar & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm shrink-0">
                          {mentee.firstName?.[0]}
                          {mentee.lastName?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{mentee.fullName}</h3>
                          <div className="text-slate-400 text-[11px] font-mono">{mentee.employeeCode}</div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          mentee.employmentStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {mentee.employmentStatus}
                      </span>
                    </div>

                    {/* Department & Email */}
                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Layers size={13} className="text-slate-400" />
                        <span>{mentee.designation} • {mentee.department}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{mentee.email}</div>
                    </div>

                    {/* Performance Telemetry Mini-Strip */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 rounded-xl p-2">
                        <div className="text-[10px] font-medium text-slate-400">Goals</div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {mentee.metrics.completedGoals}/{mentee.metrics.totalGoals}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <div className="text-[10px] font-medium text-slate-400">Tech Score</div>
                        <div className="text-xs font-bold text-indigo-700 mt-0.5">
                          {mentee.metrics.technicalCapabilityAvg ? `${mentee.metrics.technicalCapabilityAvg}/5` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <div className="text-[10px] font-medium text-slate-400">Evidence</div>
                        <div className="text-xs font-bold text-amber-600 mt-0.5">
                          {mentee.metrics.pendingEvidence} Pending
                        </div>
                      </div>
                    </div>

                    {/* Active Appraisal Indicator */}
                    {mentee.activeAppraisal && (
                      <div className="mt-3 bg-indigo-50/60 rounded-xl p-2.5 border border-indigo-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-indigo-900 block text-[11px]">
                            {mentee.activeAppraisal.cycleName}
                          </span>
                          <span className="text-[10px] text-indigo-600">
                            Status: {mentee.activeAppraisal.statusDisplay}
                          </span>
                        </div>
                        {mentee.activeAppraisal.overallScore && (
                          <span className="font-black text-xs text-indigo-900 px-2 py-0.5 bg-white rounded-lg shadow-2xs">
                            {mentee.activeAppraisal.overallScore}/100
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Matrix */}
                  <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        setTaskForm((prev) => ({ ...prev, employee_id: mentee.id }));
                        setIsAssignTaskOpen(true);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all text-center"
                    >
                      Assign Task
                    </button>
                    <button
                      onClick={() => {
                        setTechReviewMenteeId(mentee.id);
                        handleTabChange('capabilities');
                      }}
                      className="px-2 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-all text-center"
                    >
                      Rate Tech
                    </button>
                    <button
                      onClick={() => {
                        if (mentee.activeAppraisal?.id) {
                          navigate(`/appraisal/${mentee.activeAppraisal.id}/manager-evaluation`);
                        } else {
                          navigate('/appraisal');
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all text-center shadow-2xs"
                    >
                      Appraisal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TASKS & GOALS MANAGEMENT (M-02, M-03) */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assigned Tasks & Sprint Goals</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Create new tasks, adjust milestone completion, and track intern progress.
              </p>
            </div>
            <button
              onClick={() => {
                setTaskForm((prev) => ({ ...prev, employee_id: mentees[0]?.id || '' }));
                setIsAssignTaskOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer"
            >
              <Plus size={16} />
              Assign New Task
            </button>
          </div>

          {tasksLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Target size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Tasks Assigned Yet</h3>
              <p className="text-xs text-slate-500 mt-1">Assign deliverables to mentees to start tracking progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{task.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.priority === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : task.priority === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {task.statusDisplay}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                      <span>
                        Mentee: <strong className="text-slate-700 font-semibold">{task.employeeName}</strong>
                      </span>
                      <span>
                        Due: <strong className="text-slate-700 font-semibold">{task.dueDate || 'No due date'}</strong>
                      </span>
                      <span>
                        Assigned by: <strong className="text-slate-700 font-semibold">{task.assignedByName}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Progress & Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Progress</span>
                        <span>{task.completionPercentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${task.completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.status !== 'COMPLETED' && (
                        <button
                          onClick={async () => {
                            await updateTaskStatus({
                              id: task.id,
                              status: 'COMPLETED',
                              completion_percentage: 100,
                              comment: 'Verified and marked completed by mentor.',
                            });
                            toast.success(`Task "${task.title}" marked as Completed!`);
                            refetchTasks();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Check size={14} />
                          Approve
                        </button>
                      )}
                      {task.status === 'NOT_STARTED' && (
                        <button
                          onClick={async () => {
                            await updateTaskStatus({
                              id: task.id,
                              status: 'IN_PROGRESS',
                              completion_percentage: 25,
                              comment: 'Task initiated.',
                            });
                            toast.success('Task marked In Progress!');
                            refetchTasks();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-all cursor-pointer"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TECHNICAL CAPABILITIES (M-04 & M-05) */}
      {/* ========================================================================= */}
      {activeTab === 'capabilities' && (
        <div className="space-y-6">
          {/* Top Mentee Selection & Parameter Configuration Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Technical Capability Evaluation Matrix</h2>
                <p className="text-xs text-slate-500">
                  Rate assigned interns on technical dimensions (1-5 scale) with evidence links and mentor remarks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Evaluating Mentee:</span>
                <select
                  value={activeTechMenteeId}
                  onChange={(e) => setTechReviewMenteeId(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  {mentees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsAddParamOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                <Plus size={14} />
                Configure Parameters
              </button>
            </div>
          </div>

          {/* Technical Evaluation Sheet */}
          {techDossier ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {techDossier.employeeName}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Code: {techDossier.employeeCode} • Average Capability Score:
                    <strong className="text-indigo-600 ml-1 font-bold text-sm">
                      {techDossier.averageScore ? `${techDossier.averageScore} / 5.0` : 'Pending evaluation'}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isSavingTechReview}
                    onClick={() => handleSaveTechReviews('DRAFT')}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Save Draft (M-10)
                  </button>
                  <button
                    disabled={isSavingTechReview}
                    onClick={() => handleSaveTechReviews('SUBMITTED')}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-100 cursor-pointer"
                  >
                    Submit Review (M-05)
                  </button>
                </div>
              </div>

              {/* Parameter Rows */}
              <div className="space-y-4">
                {techDossier.parameters.map((param) => {
                  const current = techScores[param.parameterId] || {
                    score: param.review.score || 4.0,
                    assessment: param.review.mentorAssessment || '',
                    evidenceUrl: param.review.evidenceUrl || '',
                  };

                  return (
                    <div
                      key={param.parameterId}
                      className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4 hover:border-indigo-200 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-slate-900">{param.name}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                              {param.category}
                            </span>
                            <span className="text-slate-400 text-xs">Weight: {param.weight}%</span>
                          </div>
                          <p className="text-xs text-slate-500">{param.description}</p>
                        </div>

                        {/* Rating Buttons (1 to 5) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setTechScores((prev) => ({
                                  ...prev,
                                  [param.parameterId]: { ...current, score: val },
                                }));
                              }}
                              className={`w-9 h-9 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                Math.round(current.score) === val
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mentor Remarks & Evidence Input */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Mentor Assessment & Observations
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Observations regarding code quality, velocity, and design adherence..."
                            value={current.assessment}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTechScores((prev) => ({
                                ...prev,
                                [param.parameterId]: { ...current, assessment: val },
                              }));
                            }}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Supporting Evidence URL / Artifact
                          </label>
                          <input
                            type="url"
                            placeholder="https://github.com/... or PR link"
                            value={current.evidenceUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTechScores((prev) => ({
                                ...prev,
                                [param.parameterId]: { ...current, evidenceUrl: val },
                              }));
                            }}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                          {current.evidenceUrl && (
                            <a
                              href={current.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 mt-1 font-semibold"
                            >
                              <ExternalLink size={12} />
                              Open Linked Evidence
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400">Loading evaluation matrix...</div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EVIDENCE REVIEW (M-06) */}
      {/* ========================================================================= */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Intern Evidence & Deliverables</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted test automation suites, PR artifacts, and documentation.
              </p>
            </div>
            <button
              onClick={() => refetchEvidence()}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {evidenceList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <FolderOpen size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Evidence Submissions Found</h3>
              <p className="text-xs text-slate-500 mt-1">Direct reports have not submitted evidence for review yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidenceList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                        <div className="text-xs text-slate-500">
                          Submitted by: <strong className="text-slate-800 font-semibold">{item.employeeName}</strong>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.reviewStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.reviewStatus === 'REVISION_REQUESTED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : item.reviewStatus === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {item.reviewStatusDisplay}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{item.description}</p>

                    <div className="text-[11px] text-slate-400">
                      Goal/Task: <span className="font-semibold text-slate-700">{item.goalTitle}</span>
                    </div>

                    {item.externalUrl && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-indigo-600 hover:bg-slate-100 transition-colors"
                      >
                        <ExternalLink size={13} />
                        View Attached Artifact / PR
                      </a>
                    )}

                    {item.reviewNotes && (
                      <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700 border border-slate-100">
                        <span className="font-bold block text-[10px] text-slate-400 uppercase">Mentor Review Remarks:</span>
                        {item.reviewNotes}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{item.createdAt}</span>
                    <button
                      onClick={() => {
                        setSelectedEvidenceId(item.id);
                        setEvidenceDecision({ status: 'APPROVED', remarks: item.reviewNotes || '' });
                        setIsReviewEvidenceOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs"
                    >
                      Conduct Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FEEDBACK & REFLECTIONS (M-07, M-08) */}
      {/* ========================================================================= */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Continuous Feedback & Employee Reflections</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Issue coaching notes to interns and inspect reflections/feedback submitted by direct reports.
              </p>
            </div>
            <button
              onClick={() => {
                setFeedbackForm((prev) => ({ ...prev, employee_id: mentees[0]?.userId || '' }));
                setIsGiveFeedbackOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer"
            >
              <MessageSquare size={14} />
              Give Feedback (M-07)
            </button>
          </div>

          {employeeFeedbacks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <MessageSquare size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Feedback Records Yet</h3>
              <p className="text-xs text-slate-500 mt-1">Start by sending coaching feedback to your mentees.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employeeFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 transition-all shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {fb.senderName?.[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{fb.senderName}</h4>
                        <span className="text-[10px] text-slate-400">Code: {fb.senderCode} • {fb.createdAt}</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                      {fb.feedbackType}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{fb.message}"
                  </p>

                  {/* Mentor Comments on Employee Feedback (M-08) */}
                  {fb.comments.length > 0 && (
                    <div className="space-y-1.5 pl-4 border-l-2 border-indigo-200">
                      {fb.comments.map((c) => (
                        <div key={c.id} className="text-xs text-slate-600">
                          <strong className="text-indigo-800">{c.author}:</strong> {c.comment}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={async () => {
                        const note = window.prompt('Enter mentor acknowledgment / feedback comment:');
                        if (note) {
                          await commentOnFeedback({ id: fb.id, comment: note });
                          toast.success('Acknowledgment added!');
                          refetchFeedbacks();
                        }
                      }}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      + Acknowledge / Reply (M-08)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PREVIOUS REVIEWS & HISTORY (M-12) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Historical Performance Reviews (M-12)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect archived appraisal cycles, past scores, and competency ratings for direct reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Filter Mentee:</span>
              <select
                value={selectedMentee?.id || ''}
                onChange={(e) => {
                  const m = mentees.find((item) => item.id === e.target.value) || null;
                  setSelectedMentee(m);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="">All Mentees</option>
                {mentees.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {historicalReviews.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Historical Reviews Available</h3>
              <p className="text-xs text-slate-500 mt-1">Completed reviews from past cycles will be archived here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historicalReviews.map((hist) => (
                <div key={hist.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{hist.employeeName}</h4>
                      <span className="text-xs text-slate-400">
                        {hist.cycleName} ({hist.cycleStartDate} to {hist.cycleEndDate})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                        Score: {hist.overallScore ? `${hist.overallScore}/100` : 'Pending'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 uppercase">
                        {hist.statusDisplay}
                      </span>
                    </div>
                  </div>

                  {hist.reviewerComments && (
                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl">
                      <strong className="block text-slate-500 uppercase text-[10px] mb-0.5">Manager Final Comments:</strong>
                      {hist.reviewerComments}
                    </div>
                  )}

                  {/* Criteria Breakdown */}
                  {hist.criteriaRatings.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">Evaluation Criteria Scores:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {hist.criteriaRatings.map((crit, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                            <span className="text-slate-600 font-medium">{crit.criterionName}</span>
                            <span className="font-bold text-indigo-700">{crit.score}/5</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN TASK (M-02) */}
      {/* ========================================================================= */}
      {isAssignTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Assign New Task (M-02)</h3>
              <button onClick={() => setIsAssignTaskOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignTaskSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Mentee *</label>
                <select
                  required
                  value={taskForm.employee_id}
                  onChange={(e) => setTaskForm({ ...taskForm, employee_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="">-- Choose Assigned Intern --</option>
                  {mentees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement API Test Suite for Auth"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Deliverables</label>
                <textarea
                  rows={3}
                  placeholder="Detailed instructions, acceptance criteria, or target repository..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignTaskOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningTask}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  {isAssigningTask ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GIVE FEEDBACK (M-07) */}
      {/* ========================================================================= */}
      {isGiveFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Provide Mentee Feedback (M-07)</h3>
              <button onClick={() => setIsGiveFeedbackOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGiveFeedbackSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Mentee *</label>
                <select
                  required
                  value={feedbackForm.employee_id}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, employee_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="">-- Choose Intern --</option>
                  {mentees.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName} ({m.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Feedback Category</label>
                <select
                  value={feedbackForm.feedback_type}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="POSITIVE">Positive Praise</option>
                  <option value="COACHING">Coaching & Guidance</option>
                  <option value="CONSTRUCTIVE">Constructive Feedback</option>
                  <option value="TRAINING">Training & Skill Need</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Feedback Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share constructive observations or acknowledge outstanding velocity..."
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGiveFeedbackOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingFeedback}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  {isSendingFeedback ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD TECHNICAL PARAMETER (M-04) */}
      {/* ========================================================================= */}
      {isAddParamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Configure Technical Parameter (M-04)</h3>
              <button onClick={() => setIsAddParamOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateParamSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Parameter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microservices & Distributed Architecture"
                  value={paramForm.name}
                  onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={paramForm.category}
                  onChange={(e) => setParamForm({ ...paramForm, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Criteria evaluated under this technical parameter..."
                  value={paramForm.description}
                  onChange={(e) => setParamForm({ ...paramForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Benchmark Score (Max 5)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={paramForm.benchmark_score}
                    onChange={(e) => setParamForm({ ...paramForm, benchmark_score: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weight (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={paramForm.weight}
                    onChange={(e) => setParamForm({ ...paramForm, weight: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddParamOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingParam}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  {isCreatingParam ? 'Configuring...' : 'Save Parameter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REVIEW EVIDENCE DECISION (M-06) */}
      {/* ========================================================================= */}
      {isReviewEvidenceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Evidence Review Decision (M-06)</h3>
              <button onClick={() => setIsReviewEvidenceOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Decision</label>
                <select
                  value={evidenceDecision.status}
                  onChange={(e) =>
                    setEvidenceDecision({
                      ...evidenceDecision,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="APPROVED">Approve Evidence</option>
                  <option value="REVISION_REQUESTED">Request Revision</option>
                  <option value="REJECTED">Reject Evidence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mentor Remarks / Feedback</label>
                <textarea
                  rows={3}
                  placeholder="Notes on code coverage, test quality, or required fixes..."
                  value={evidenceDecision.remarks}
                  onChange={(e) => setEvidenceDecision({ ...evidenceDecision, remarks: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReviewEvidenceOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isReviewingEvidence}
                  onClick={handleReviewEvidenceSubmit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  {isReviewingEvidence ? 'Saving...' : 'Submit Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerHubPage;
