import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  Calendar, 
  Award, 
  Target, 
  Briefcase, 
  UserCheck, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  Compass,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useGetInternJourneyQuery } from '../../features/dashboard/dashboardApi';

interface InternJourneyTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const InternJourneyTab: React.FC<InternJourneyTabProps> = ({ onNavigateTab }) => {
  const { data: journeyData, isLoading, error, refetch } = useGetInternJourneyQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading your internship journey roadmap...</p>
      </div>
    );
  }

  if (error || !journeyData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold text-red-800">Unable to load internship journey</h3>
        <p className="text-sm text-red-600 max-w-md mx-auto">
          We encountered an issue fetching your live milestone progression. Please verify your connection or try again.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const { intern, mentor, cycle, currentStage, overallProgressPercent, milestones, stats } = journeyData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <Sparkles className="w-3.5 h-3.5 text-gray-400" />
            Upcoming
          </span>
        );
    }
  };

  const getStageAction = (stage: number) => {
    if (!onNavigateTab) return null;
    switch (stage) {
      case 2:
        return (
          <button
            onClick={() => onNavigateTab('goals')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Review Goals <ArrowRight className="w-3.5 h-3.5" />
          </button>
        );
      case 3:
        return (
          <button
            onClick={() => onNavigateTab('tasks')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Manage Tasks & Evidence <ArrowRight className="w-3.5 h-3.5" />
          </button>
        );
      case 4:
        return (
          <button
            onClick={() => onNavigateTab('evaluation')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Open Self-Appraisal <ArrowRight className="w-3.5 h-3.5" />
          </button>
        );
      case 5:
        return (
          <button
            onClick={() => onNavigateTab('results')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            View Calibrated Results <ArrowRight className="w-3.5 h-3.5" />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Banner & Trajectory Overview */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 rounded-2xl text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500 opacity-10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
              <Compass className="w-3.5 h-3.5 text-emerald-300" />
              <span>Internship Trajectory & Growth Roadmap</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {intern.name}'s Professional Journey
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-xl">
              Tracking your end-to-end milestone progression from onboarding setup through sprint deliverables, self-reflection, and final performance calibration.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-white/15 flex flex-col min-w-[240px]">
            <div className="flex justify-between items-center text-xs text-emerald-200 mb-1 font-medium">
              <span>Overall Roadmap Completion</span>
              <span className="font-bold text-white text-sm">{overallProgressPercent}%</span>
            </div>
            <div className="w-full bg-emerald-950/60 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-emerald-200/90 pt-2 border-t border-white/10">
              <span>Active Stage:</span>
              <span className="font-semibold text-white">Stage {currentStage} of 5</span>
            </div>
          </div>
        </div>

        {/* Quick Intern Meta Badges */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-emerald-200/70 block">Department</span>
            <span className="font-semibold text-white text-sm">{intern.department}</span>
          </div>
          <div>
            <span className="text-emerald-200/70 block">Employee Code</span>
            <span className="font-semibold text-white text-sm">{intern.employeeCode || 'Registered'}</span>
          </div>
          <div>
            <span className="text-emerald-200/70 block">Tenure in Role</span>
            <span className="font-semibold text-white text-sm">{intern.daysActive} Days Active</span>
          </div>
          <div>
            <span className="text-emerald-200/70 block">Mentor</span>
            <span className="font-semibold text-white text-sm">{mentor?.name || 'Assigned Lead'}</span>
          </div>
        </div>
      </div>

      {/* 2. Key Performance Indicators Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Goal Alignment</p>
            <h4 className="text-xl font-bold text-gray-900 mt-1">
              {stats.goalsCompleted} / {stats.goalsTotal}
            </h4>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {stats.goalsWeightedProgress.toFixed(1)}% Weighted Progress
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint Tasks</p>
            <h4 className="text-xl font-bold text-gray-900 mt-1">
              {stats.tasksCompleted} / {stats.tasksTotal}
            </h4>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {stats.tasksUnderReview} currently under review
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Artifacts & Proof</p>
            <h4 className="text-xl font-bold text-gray-900 mt-1">
              {stats.evidenceTotal} Files / Links
            </h4>
            <p className="text-xs text-teal-600 font-medium mt-1">
              {stats.evidenceApproved} Verified by Mentor
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Final Calibration</p>
            <h4 className="text-xl font-bold text-gray-900 mt-1">
              {stats.isResultsPublished ? 'Published' : (stats.selfEvaluationSubmitted ? 'In Calibration' : 'Pending')}
            </h4>
            <p className="text-xs text-purple-600 font-medium mt-1">
              {stats.selfEvaluationSubmitted ? 'Self-Eval Submitted' : 'Self-Eval Open'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Chronological Milestone Roadmap */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-gray-100 gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Stage-by-Stage Progression Roadmap
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Live milestones computed dynamically from your authenticated assignments and evaluations.
            </p>
          </div>
          {cycle && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Cycle: <strong className="text-gray-900">{cycle.name}</strong></span>
            </div>
          )}
        </div>

        {/* Milestone Steps */}
        <div className="relative">
          {/* Vertical Track Line */}
          <div className="absolute top-4 left-6 sm:left-8 bottom-8 w-0.5 bg-gray-200" />

          <div className="space-y-8">
            {milestones.map((m) => {
              const isCompleted = m.status === 'COMPLETED';
              const isInProgress = m.status === 'IN_PROGRESS';

              return (
                <div key={m.key} className="relative flex items-start gap-4 sm:gap-6 group">
                  {/* Step Circle Indicator */}
                  <div 
                    className={`relative z-10 flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-bold text-base transition-all duration-300 shadow-md ${
                      isCompleted 
                        ? 'bg-emerald-600 text-white shadow-emerald-200 ring-4 ring-emerald-50' 
                        : isInProgress
                        ? 'bg-blue-600 text-white shadow-blue-200 ring-4 ring-blue-50 animate-pulse'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    ) : isInProgress ? (
                      <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    ) : (
                      <span>0{m.stage}</span>
                    )}
                  </div>

                  {/* Card Container */}
                  <div className={`flex-1 rounded-xl p-5 sm:p-6 border transition-all duration-200 ${
                    isInProgress 
                      ? 'bg-blue-50/40 border-blue-200 shadow-sm' 
                      : isCompleted
                      ? 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-200'
                      : 'bg-gray-50/50 border-gray-200/80 opacity-80'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-200/60 text-gray-700">
                          {m.category}
                        </span>
                        <h4 className="text-base sm:text-lg font-bold text-gray-900">
                          {m.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3">
                        {m.date && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {m.date}
                          </span>
                        )}
                        {getStatusBadge(m.status)}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {m.description}
                    </p>

                    {/* Metrics Chips */}
                    {m.metrics && m.metrics.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200/60 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {m.metrics.map((met, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-2.5 border border-gray-200/70 shadow-xs">
                            <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">{met.label}</span>
                            <span className="text-sm font-bold text-gray-900 mt-0.5 block">{met.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action link */}
                    <div className="mt-4 flex justify-end">
                      {getStageAction(m.stage)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Mentorship Support Footnote */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">
              Assigned Mentorship & Continuous Growth
            </h4>
            <p className="text-sm text-gray-600 mt-0.5">
              {mentor ? (
                <>Your mentor <strong className="text-gray-900">{mentor.name}</strong> ({mentor.designation}) is actively reviewing your tasks and quarterly deliverables.</>
              ) : (
                'Your mentor is actively assigned to oversee your task submissions and evaluation milestones.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('evaluation')}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Self-Appraisal Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
