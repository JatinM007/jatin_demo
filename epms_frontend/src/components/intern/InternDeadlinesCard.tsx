import React, { useState } from 'react';
import { Calendar, AlertCircle, Clock, CheckCircle2, ChevronRight, Filter } from 'lucide-react';
import type { InternDeadlineItem } from '../../features/dashboard/dashboardTypes';

interface InternDeadlinesCardProps {
  deadlines: InternDeadlineItem[];
  onNavigateToTab?: (tab: string) => void;
}

export const InternDeadlinesCard: React.FC<InternDeadlinesCardProps> = ({
  deadlines = [],
  onNavigateToTab,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = deadlines.filter((d) => {
    if (filterType === 'ALL') return true;
    return d.type === filterType;
  });

  const getStatusBadge = (item: InternDeadlineItem) => {
    if (item.daysLeft < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle size={12} />
          Overdue ({Math.abs(item.daysLeft)}d ago)
        </span>
      );
    }
    if (item.daysLeft === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={12} />
          Due Today
        </span>
      );
    }
    if (item.daysLeft <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
          <Clock size={12} />
          {item.daysLeft} days left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
        <Calendar size={12} />
        {item.daysLeft} days left
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TASK':
        return '📋';
      case 'GOAL':
        return '🎯';
      case 'EVALUATION':
        return '📝';
      default:
        return '📌';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Upcoming Deadlines & Milestones</h3>
            <p className="text-xs text-slate-500">Real-time tracker for deliverables, self-assessments, and task cutoffs</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'TASK', 'GOAL', 'EVALUATION'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                filterType === t
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-slate-400 space-y-2">
          <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
          <p className="text-sm font-medium text-slate-600">No pending deadlines in this category</p>
          <p className="text-xs text-slate-400">All current milestones and deliverables are up to date.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xl shrink-0 mt-0.5">{getTypeIcon(item.type)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Due: {item.dueDate}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] tracking-wider font-semibold text-slate-500">
                      {item.type}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {getStatusBadge(item)}
                {onNavigateToTab && (
                  <button
                    onClick={() => {
                      if (item.type === 'TASK') onNavigateToTab('tasks');
                      else if (item.type === 'GOAL') onNavigateToTab('goals');
                      else if (item.type === 'EVALUATION') onNavigateToTab('evaluation');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="View section"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InternDeadlinesCard;
