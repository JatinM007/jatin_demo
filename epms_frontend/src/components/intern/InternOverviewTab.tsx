import React, { useState } from 'react';
import {
  Trophy, Target, Clock, ClipboardList, User, Award,
  Sparkles, Calendar, ChevronRight, Sliders, CheckCircle2,
  AlertCircle, ExternalLink, ArrowRight, ShieldCheck, Compass
} from 'lucide-react';
import type {
  InternOverviewData,
  InternScorecardResponse,
  InternMentorInfo,
  InternCycleInfo,
  InternPublishedResults
} from '../../features/dashboard/dashboardTypes';
import DashboardStatCard from '../dashboard/DashboardStatCard';
import InternDeadlinesCard from './InternDeadlinesCard';

interface InternOverviewTabProps {
  overviewData?: InternOverviewData;
  isLoading: boolean;
  onNavigateToTab: (tab: string) => void;
  onRefresh: () => void;
}

export const InternOverviewTab: React.FC<InternOverviewTabProps> = ({
  overviewData,
  isLoading,
  onNavigateToTab,
}) => {
  const [showWeightDetails, setShowWeightDetails] = useState(false);

  const scorecard = overviewData?.personalScorecard;
  const mentor = overviewData?.mentor;
  const cycle = overviewData?.cycle;
  const deadlines = overviewData?.deadlines || [];
  const publishedResults = overviewData?.publishedResults;

  const weightDist = publishedResults?.weightDistribution || scorecard?.weightDistribution || {
    goals_and_kpis: 40,
    manager_evaluation: 40,
    self_assessment: 20
  };

  const evalParams = publishedResults?.evaluationParameters || scorecard?.evaluationParameters || [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-100 rounded-2xl lg:col-span-2" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const scoreDisplay = publishedResults?.isPublished && publishedResults.overallScore !== null
    ? `${publishedResults.overallScore.toFixed(1)} / 100`
    : 'In Progress';

  const classificationDisplay = publishedResults?.isPublished && publishedResults.classification
    ? publishedResults.classification
    : 'Pending Publication';

  return (
    <div className="space-y-6">
      {/* Internship Journey Quick Access Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-emerald-800/40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Compass size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/20">
                Milestone Roadmap
              </span>
              <span className="text-xs text-emerald-200/80">Interactive Internship Trajectory</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              View Your End-to-End Internship Journey
            </h3>
            <p className="text-xs text-emerald-100/70 max-w-xl">
              Track your onboarding foundation, quarterly goal alignment, sprint deliverables, self-appraisal, and final performance calibration.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('journey')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs transition-colors shrink-0 shadow-xs"
        >
          <span>View My Journey</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 1. Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          title="Weighted Goal Progress"
          value={`${(scorecard?.averageProgress ?? 0).toFixed(0)}%`}
          subtitle={`${scorecard?.completedGoals ?? 0} of ${scorecard?.totalGoals ?? 0} goals completed`}
          color="indigo"
          icon={<Target size={20} />}
        />

        <DashboardStatCard
          title="Pending Tasks"
          value={scorecard?.pendingTasksCount ?? 0}
          subtitle="Action items under development"
          color="orange"
          icon={<ClipboardList size={20} />}
        />

        <DashboardStatCard
          title="Upcoming Deadlines"
          value={deadlines.filter(d => d.daysLeft >= 0).length}
          subtitle={`${deadlines.filter(d => d.daysLeft < 0).length} overdue items`}
          color={deadlines.some(d => d.daysLeft < 0) ? 'red' : 'green'}
          icon={<Clock size={20} />}
        />

        <DashboardStatCard
          title="Performance Score"
          value={scoreDisplay}
          subtitle={classificationDisplay}
          color="purple"
          icon={<Trophy size={20} />}
        />
      </div>

      {/* 2. Mentor & Cycle Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentor Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Mentor</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={12} />
                {mentor?.status || 'Active Mentorship'}
              </span>
            </div>

            {mentor ? (
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0 shadow-2xs">
                  {mentor.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || <User size={24} />}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-base truncate">{mentor.name}</h4>
                  <p className="text-xs text-indigo-600 font-medium truncate">{mentor.designation}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{mentor.department}</p>
                  <a
                    href={`mailto:${mentor.email}`}
                    className="text-xs text-slate-400 hover:text-indigo-600 transition-colors block mt-0.5 truncate"
                  >
                    {mentor.email}
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400">
                <User size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No mentor currently assigned</p>
                <p className="text-xs">HR will configure your direct mentor shortly.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => onNavigateToTab('goals')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View Mentor-Assigned Goals <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Active Cycle Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Evaluation Cycle</span>
              {cycle && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  <Calendar size={13} />
                  {cycle.status}
                </span>
              )}
            </div>

            {cycle ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <h4 className="text-lg font-bold text-slate-900">{cycle.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {cycle.description || 'Continuous performance appraisal and milestone tracking cycle for intern cohorts.'}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Period</span>
                      <span className="font-semibold">{cycle.startDate} → {cycle.endDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Current Phase</span>
                      <span className="font-semibold text-indigo-600">{cycle.currentPhase || 'Active Evaluation'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-slate-100">
                  <span className="text-3xl font-extrabold text-slate-900">{cycle.daysRemaining}</span>
                  <span className="text-xs font-medium text-slate-500 mt-1">Days Remaining</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Until cycle completion</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No active performance cycle</p>
                <p className="text-xs">You are currently outside an open evaluation cycle window.</p>
              </div>
            )}
          </div>

          {/* Quick link button to self-appraisal */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400">
              Cutoffs: Self-Assessment due{' '}
              <span className="font-semibold text-slate-700">{cycle?.endDate || 'End of Cycle'}</span>
            </span>
            <button
              onClick={() => onNavigateToTab('evaluation')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Go to Self-Assessment <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Deadlines & Milestones Tracker */}
      <InternDeadlinesCard deadlines={deadlines} onNavigateToTab={onNavigateToTab} />

      {/* 4. Flexible Scoring Weight Distribution Drawer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Evaluation Score Weight Distribution</h4>
              <p className="text-xs text-slate-500">Configured evaluation weightings decided by HR calibration</p>
            </div>
          </div>
          <button
            onClick={() => setShowWeightDetails(!showWeightDetails)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {showWeightDetails ? 'Hide Details' : 'View Criteria'}
          </button>
        </div>

        {/* 3-Part Weight Bar */}
        <div className="space-y-2">
          <div className="h-3.5 w-full bg-slate-100 rounded-full flex overflow-hidden p-0.5 gap-0.5 border border-slate-200">
            <div
              style={{ width: `${weightDist.goals_and_kpis}%` }}
              className="bg-indigo-500 rounded-full transition-all duration-300"
              title={`Goals & KPIs: ${weightDist.goals_and_kpis}%`}
            />
            <div
              style={{ width: `${weightDist.manager_evaluation}%` }}
              className="bg-emerald-500 rounded-full transition-all duration-300"
              title={`Mentor Evaluation: ${weightDist.manager_evaluation}%`}
            />
            <div
              style={{ width: `${weightDist.self_assessment}%` }}
              className="bg-amber-500 rounded-full transition-all duration-300"
              title={`Self-Assessment: ${weightDist.self_assessment}%`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Goals & Deliverables ({weightDist.goals_and_kpis}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Mentor Assessment ({weightDist.manager_evaluation}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Self-Appraisal ({weightDist.self_assessment}%)
            </span>
          </div>
        </div>

        {/* Expanded Evaluation Parameters */}
        {showWeightDetails && evalParams.length > 0 && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {evalParams.map((param) => (
              <div key={param.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">{param.name}</span>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {param.weight}%
                  </span>
                </div>
                {param.description && (
                  <p className="text-[11px] text-slate-500 leading-snug">{param.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Published Feedback Quick Preview Banner (if published) */}
      {publishedResults?.isPublished && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
              <ShieldCheck size={12} />
              Evaluation Results Published
            </span>
            <h4 className="text-base font-bold text-slate-900">
              Calibrated Score: {publishedResults.overallScore?.toFixed(1)}/100 — {publishedResults.classification}
            </h4>
            <p className="text-xs text-slate-600 max-w-2xl line-clamp-2">
              "{publishedResults.reviewerComments || 'Exceptional milestone delivery throughout this evaluation cycle.'}"
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('results')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
          >
            Read Full Evaluation & Reply <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default InternOverviewTab;
