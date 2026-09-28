import React, { useState } from 'react';
import {
  Target, Calendar, Clock, MessageSquare, ChevronDown, ChevronUp,
  Send, ExternalLink, CheckCircle2, AlertCircle, RefreshCw, Sliders
} from 'lucide-react';
import type { InternGoalItem } from '../../features/dashboard/dashboardTypes';
import { toast } from 'react-toastify';

interface InternGoalsTabProps {
  goals: InternGoalItem[];
  isLoading: boolean;
  onUpdateProgress: (goalId: string, progress: number, comment?: string) => Promise<any>;
  onAddComment: (goalId: string, comment: string, parentId?: string) => Promise<any>;
  onOpenEvidenceModal: (goalId: string) => void;
  onRefetch: () => void;
}

export const InternGoalsTab: React.FC<InternGoalsTabProps> = ({
  goals = [],
  isLoading,
  onUpdateProgress,
  onAddComment,
  onOpenEvidenceModal,
  onRefetch,
}) => {
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [replyParentId, setReplyParentId] = useState<Record<string, string | null>>({});
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<Record<string, number>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});

  const toggleComments = (goalId: string) => {
    setExpandedComments((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const handleSliderChange = (goalId: string, val: number) => {
    setSliderValue((prev) => ({ ...prev, [goalId]: val }));
  };

  const handleSaveProgress = async (goal: InternGoalItem) => {
    const val = sliderValue[goal.id] ?? goal.completionPercentage ?? goal.progress ?? 0;
    try {
      setUpdatingGoalId(goal.id);
      await onUpdateProgress(goal.id, val);
      toast.success(val === 100 ? 'Goal completed! Status updated to COMPLETED.' : `Progress updated to ${val}%.`);
      onRefetch();
    } catch {
      toast.error('Failed to update goal progress.');
    } finally {
      setUpdatingGoalId(null);
    }
  };

  const handlePostComment = async (goalId: string) => {
    const text = newCommentText[goalId]?.trim();
    if (!text) return;
    const parentId = replyParentId[goalId] || undefined;

    try {
      setIsSubmittingComment((prev) => ({ ...prev, [goalId]: true }));
      await onAddComment(goalId, text, parentId);
      toast.success('Comment posted successfully');
      setNewCommentText((prev) => ({ ...prev, [goalId]: '' }));
      setReplyParentId((prev) => ({ ...prev, [goalId]: null }));
      onRefetch();
    } catch {
      toast.error('Failed to post comment.');
    } finally {
      setIsSubmittingComment((prev) => ({ ...prev, [goalId]: false }));
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

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
        <Target size={44} className="mx-auto text-slate-300" />
        <h3 className="text-base font-bold text-slate-800">No Goals Assigned Yet</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Your direct mentor or manager will assign your core quarterly deliverables and goals for the active performance cycle.
        </p>
        <button
          onClick={onRefetch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw size={12} /> Check for updates
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const currentProgress = sliderValue[goal.id] ?? goal.completionPercentage ?? goal.progress ?? 0;
        const isCompleted = goal.status === 'COMPLETED' || currentProgress === 100;
        const isCommentsOpen = !!expandedComments[goal.id];
        const comments = goal.comments || [];

        return (
          <div
            key={goal.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 transition-all hover:border-slate-300"
          >
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{goal.title}</h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(goal.status)}`}>
                    {goal.status}
                  </span>
                  {goal.weightage !== undefined && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Weight: {goal.weightage}%
                    </span>
                  )}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(goal.priority)}`}>
                    {goal.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{goal.description}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenEvidenceModal(goal.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100 flex items-center gap-1.5"
                >
                  <ExternalLink size={13} />
                  Submit Evidence
                </button>
              </div>
            </div>

            {/* Progress Section */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sliders size={13} className="text-slate-400" />
                  Self-Reported Progress
                </span>
                <span className="font-bold text-slate-900">{currentProgress.toFixed(0)}%</span>
              </div>

              {/* Slider & Progress bar */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={currentProgress}
                  disabled={updatingGoalId === goal.id}
                  onChange={(e) => handleSliderChange(goal.id, parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>0% (Not Started)</span>
                  <span>50% (In Progress)</span>
                  <span>100% (Completed)</span>
                </div>
              </div>

              {/* Save progress button if changed */}
              {sliderValue[goal.id] !== undefined && sliderValue[goal.id] !== (goal.completionPercentage ?? goal.progress) && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleSaveProgress(goal)}
                    disabled={updatingGoalId === goal.id}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    {updatingGoalId === goal.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Save Progress ({sliderValue[goal.id]}%)
                  </button>
                </div>
              )}
            </div>

            {/* Due date & footer */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-4">
                {goal.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    Due: <span className="font-medium text-slate-700">{goal.dueDate}</span>
                  </span>
                )}
                {goal.cycleName && (
                  <span className="text-slate-400">Cycle: {goal.cycleName}</span>
                )}
              </div>

              <button
                onClick={() => toggleComments(goal.id)}
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5"
              >
                <MessageSquare size={14} />
                Discussion & Notes ({comments.length})
                {isCommentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Threaded Comments Section */}
            {isCommentsOpen && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Mentor & Intern Discussion Thread
                </h4>

                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No comments yet. Start a discussion with your mentor below.</p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          c.isMentor
                            ? 'bg-amber-50/80 border border-amber-200/80 text-amber-900 ml-4'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5">
                            {c.authorName}
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded-md bg-white border border-slate-200 text-slate-600">
                              {c.authorRole}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{c.comment}</p>
                        {c.isMentor && (
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={() => {
                                setReplyParentId((prev) => ({ ...prev, [goal.id]: c.id }));
                                setNewCommentText((prev) => ({
                                  ...prev,
                                  [goal.id]: prev[goal.id] || `@${c.authorName}: `
                                }));
                              }}
                              className="text-[11px] font-semibold text-indigo-600 hover:underline"
                            >
                              Reply to mentor
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input form */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newCommentText[goal.id] || ''}
                    onChange={(e) => setNewCommentText((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePostComment(goal.id);
                    }}
                    placeholder={
                      replyParentId[goal.id]
                        ? 'Replying to mentor...'
                        : 'Post a question or milestone update for your mentor...'
                    }
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white"
                  />
                  <button
                    onClick={() => handlePostComment(goal.id)}
                    disabled={isSubmittingComment[goal.id] || !newCommentText[goal.id]?.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-1"
                  >
                    <Send size={13} />
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InternGoalsTab;
