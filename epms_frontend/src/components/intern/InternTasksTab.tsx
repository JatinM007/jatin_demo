import React, { useState } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, Calendar,
  ExternalLink, UserCheck, ShieldAlert, RefreshCw, X, Send,
  FileCheck, HelpCircle
} from 'lucide-react';
import type { InternTaskItem } from '../../features/dashboard/dashboardTypes';
import { toast } from 'react-toastify';

interface InternTasksTabProps {
  tasks: InternTaskItem[];
  isLoading: boolean;
  onCompleteTask: (payload: {
    id: string;
    isCompleted: boolean;
    completedAt?: string;
    hoursSpent?: number;
    completionNotes?: string;
    artifactUrl?: string;
  }) => Promise<any>;
  onRefetch: () => void;
}

export const InternTasksTab: React.FC<InternTasksTabProps> = ({
  tasks = [],
  isLoading,
  onCompleteTask,
  onRefetch,
}) => {
  const [selectedTask, setSelectedTask] = useState<InternTaskItem | null>(null);
  const [completionDate, setCompletionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [hoursSpent, setHoursSpent] = useState<string>('3.5');
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [artifactUrl, setArtifactUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleOpenCompleteModal = (task: InternTaskItem) => {
    setSelectedTask(task);
    setCompletionDate(new Date().toISOString().split('T')[0]);
    setHoursSpent(task.hoursSpent ? String(task.hoursSpent) : '3.5');
    setCompletionNotes(task.completionNotes || '');
    setArtifactUrl(task.artifactUrl || '');
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const parsedHours = parseFloat(hoursSpent);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      toast.error('Please enter a valid positive number for hours spent.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onCompleteTask({
        id: selectedTask.id,
        isCompleted: true,
        completedAt: completionDate,
        hoursSpent: parsedHours,
        completionNotes: completionNotes.trim(),
        artifactUrl: artifactUrl.trim() || undefined,
      });

      const requiresReview = (selectedTask as any).requires_mentor_review ?? (selectedTask as any).requiresMentorReview;
      if (requiresReview) {
        toast.success('Task submitted for mentor review! Status is now SUBMITTED.');
      } else {
        toast.success('Task marked completed successfully!');
      }

      handleCloseModal();
      onRefetch();
    } catch {
      toast.error('Failed to submit task completion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (task: any) => {
    const st = task.status || (task.isCompleted ? 'COMPLETED' : 'IN_PROGRESS');
    switch (st) {
      case 'COMPLETED':
        return {
          label: 'Completed',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 size={13} />,
        };
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return {
          label: 'Submitted for Review',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <UserCheck size={13} />,
        };
      case 'OVERDUE':
        return {
          label: 'Overdue',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertCircle size={13} />,
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock size={13} />,
        };
      default:
        return {
          label: 'Assigned',
          className: 'bg-slate-50 text-slate-600 border-slate-200',
          icon: <Clock size={13} />,
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
        <ClipboardList size={44} className="mx-auto text-slate-300" />
        <h3 className="text-base font-bold text-slate-800">No Pending Tasks</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You currently have no tasks assigned. Any direct tasks, test suites, or tickets will appear here.
        </p>
        <button
          onClick={onRefetch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw size={12} /> Refresh tasks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task: any) => {
        const badge = getStatusBadge(task);
        const requiresReview = task.requires_mentor_review ?? task.requiresMentorReview;
        const reviewFeedback = task.review_feedback ?? task.reviewFeedback;
        const isFinished = task.isCompleted || task.status === 'COMPLETED';
        const isUnderReview = task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW';

        return (
          <div
            key={task.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 transition-all hover:border-slate-300"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{task.title}</h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                    {task.priority} Priority
                  </span>
                  {requiresReview && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                      <UserCheck size={11} />
                      Mentor Review Required
                    </span>
                  )}
                </div>

                {task.category && (
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Category: {task.category}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <div className="shrink-0">
                {!isFinished && !isUnderReview ? (
                  <button
                    onClick={() => handleOpenCompleteModal(task)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} />
                    {requiresReview ? 'Submit for Review' : 'Mark Completed'}
                  </button>
                ) : isUnderReview ? (
                  <button
                    onClick={() => handleOpenCompleteModal(task)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200 flex items-center gap-1"
                  >
                    Update Submission
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <FileCheck size={14} /> Verified Complete
                  </span>
                )}
              </div>
            </div>

            {/* Task instructions */}
            {task.instructions && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Instructions & Steps
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {task.instructions}
                </p>
              </div>
            )}

            {/* Revision feedback from mentor (if returned for revision) */}
            {reviewFeedback && !isFinished && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <AlertCircle size={13} /> Mentor Revision Feedback
                </span>
                <p className="text-xs text-amber-900 leading-relaxed">"{reviewFeedback}"</p>
              </div>
            )}

            {/* Footer with metadata */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-1">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  Due: <span className="font-semibold text-slate-700">{task.dueDate}</span>
                </span>

                {task.hoursSpent !== null && task.hoursSpent !== undefined && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    Logged: <span className="font-semibold text-slate-700">{task.hoursSpent} hrs</span>
                  </span>
                )}

                {task.artifactUrl && (
                  <a
                    href={task.artifactUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <ExternalLink size={12} />
                    Artifact PR/Link
                  </a>
                )}
              </div>

              {task.completedAt && (
                <span className="text-slate-400">
                  Completed on: {task.completedAt}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Completion Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Complete / Submit Task</h3>
                <p className="text-xs text-slate-500">{selectedTask.title}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCompletion} className="p-6 space-y-4">
              {((selectedTask as any).requires_mentor_review ?? (selectedTask as any).requiresMentorReview) && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                  <UserCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Mentor Review Required:</strong> This task requires mentor review. Upon submitting, it will transition to <strong>SUBMITTED</strong> state and notify your assigned mentor.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Completion Date</label>
                  <input
                    type="date"
                    required
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Hours Spent</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="100"
                    required
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Artifact / PR URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/org/repo/pull/123"
                  value={artifactUrl}
                  onChange={(e) => setArtifactUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Completion Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe your implementation, test results, or key deliverables..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  Confirm Submission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternTasksTab;
