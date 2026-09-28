import React, { useState } from 'react';
import {
  Trophy, Award, ShieldCheck, MessageSquare, Send, CheckCircle2,
  Clock, AlertCircle, Sparkles, RefreshCw, ChevronDown, ChevronUp,
  User, Layers, Lock
} from 'lucide-react';
import type { InternPublishedFeedbackData } from '../../features/dashboard/dashboardTypes';
import { toast } from 'react-toastify';

interface InternResultsTabProps {
  feedbackData?: InternPublishedFeedbackData;
  isLoading: boolean;
  onReplyToFeedback: (replyText: string) => Promise<any>;
  onRefetch: () => void;
}

export const InternResultsTab: React.FC<InternResultsTabProps> = ({
  feedbackData,
  isLoading,
  onReplyToFeedback,
  onRefetch,
}) => {
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const isPublished = feedbackData?.isPublished || false;
  const isReplyPermitted = feedbackData?.isReplyPermitted ?? true;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setIsSubmittingReply(true);
      await onReplyToFeedback(replyText.trim());
      toast.success('Your reply was successfully recorded and sent to your mentor.');
      setReplyText('');
      onRefetch();
    } catch {
      toast.error('Failed to submit reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  // Unpublished State
  if (!isPublished || !feedbackData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center space-y-4 max-w-2xl mx-auto my-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Clock size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">Your evaluation result has not been published yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Official evaluation calibration is currently in progress. Published results, calibrated ratings, performance classifications, and mentor growth recommendations will appear here once officially released by People Operations.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onRefetch}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <RefreshCw size={13} /> Check Publication Status
          </button>
        </div>
      </div>
    );
  }

  // Published State
  return (
    <div className="space-y-6">
      {/* Top Calibrated Score Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-850 to-slate-900 rounded-3xl text-white p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              <ShieldCheck size={14} /> Official Performance Appraisal Results
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {feedbackData.performanceClassification || 'Calibrated Evaluation'}
            </h2>
            <p className="text-xs text-indigo-200 max-w-xl">
              Cycle: {feedbackData.cycleName || 'Active Cohort PMS'} • Published on {feedbackData.publishedAt ? new Date(feedbackData.publishedAt).toLocaleDateString() : 'Official File'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center shrink-0">
            <span className="text-xs uppercase tracking-wider text-indigo-200 block font-semibold">
              Calibrated Score
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-4xl md:text-5xl font-extrabold text-white">
                {feedbackData.overallScore?.toFixed(1) ?? '--'}
              </span>
              <span className="text-indigo-300 text-sm font-bold">/ 100</span>
            </div>
            <span className="inline-block mt-2 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-400/40">
              Verified by HR
            </span>
          </div>
        </div>
      </div>

      {/* Mentor Feedback & Conclusion Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mentor Remarks */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assigned Mentor Remarks
            </h4>
            <span className="text-xs text-indigo-600 font-semibold">{feedbackData.mentorName || 'Mentor'}</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
            "{feedbackData.mentorFeedback || 'Outstanding dedication and high code delivery throughput.'}"
          </p>
        </div>

        {/* HR Committee Final Conclusion */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              HR Committee Calibration Conclusion
            </h4>
            <span className="text-xs text-emerald-700 font-semibold">Verified</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed italic bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            "{feedbackData.finalConclusion || 'HR Committee verified: Exceeds milestone expectations for current cohort.'}"
          </p>
        </div>
      </div>

      {/* Areas for Improvement & Growth Recommendations */}
      {feedbackData.areasForImprovement && feedbackData.areasForImprovement.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="text-amber-500" size={14} />
            Targeted Areas for Improvement & Trajectory Focus
          </h4>
          <div className="space-y-2">
            {feedbackData.areasForImprovement.map((area, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900"
              >
                <span className="font-bold shrink-0">{idx + 1}.</span>
                <span className="leading-relaxed">{area}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intern Feedback Reply Discussion Thread */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-indigo-600" size={18} />
            <h4 className="text-sm font-bold text-slate-900">Intern Discussion & Reply Thread</h4>
          </div>
          {!isReplyPermitted && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              <Lock size={12} /> Replies Closed
            </span>
          )}
        </div>

        {/* Existing Replies */}
        {feedbackData.replies && feedbackData.replies.length > 0 ? (
          <div className="space-y-2.5">
            {feedbackData.replies.map((reply) => (
              <div
                key={reply.id}
                className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-800 space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-700">You (Intern)</span>
                  <span className="text-[11px] text-slate-400">{reply.createdAt}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{reply.replyText}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No replies posted yet. You can respond to your mentor remarks below.</p>
        )}

        {/* Reply form */}
        {isReplyPermitted ? (
          <form onSubmit={handleSendReply} className="space-y-2 pt-2">
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Send an acknowledgement or response to your mentor regarding your evaluation..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingReply || !replyText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingReply ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                Send Reply to Mentor
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center gap-2">
            <Lock size={14} className="text-slate-400 shrink-0" />
            Replies to this feedback are not permitted at this stage.
          </div>
        )}
      </div>
    </div>
  );
};

export default InternResultsTab;
