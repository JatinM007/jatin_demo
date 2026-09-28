import React, { useState, useEffect } from 'react';
import {
  UserCheck, ShieldCheck, CheckCircle2, Clock, AlertCircle,
  Save, Send, Sliders, RefreshCw, Lock
} from 'lucide-react';
import type { InternSelfAppraisalData } from '../../features/dashboard/dashboardTypes';
import { toast } from 'react-toastify';

interface InternEvaluationTabProps {
  selfAppraisal?: InternSelfAppraisalData;
  isLoading: boolean;
  onSubmitSelfAppraisal: (payload: {
    selfRating?: number;
    achievements?: string;
    challenges?: string;
    skillsAcquired?: string;
    mentorshipNeeds?: string;
    reflectionSummary?: string;
    isSubmitted?: boolean;
    is_submitted?: boolean;
  }) => Promise<any>;
  onRefetch: () => void;
}

export const InternEvaluationTab: React.FC<InternEvaluationTabProps> = ({
  selfAppraisal,
  isLoading,
  onSubmitSelfAppraisal,
  onRefetch,
}) => {
  const isSubmitted = selfAppraisal?.isSubmitted || false;

  const [selfRating, setSelfRating] = useState<number>(8.5);
  const [achievements, setAchievements] = useState<string>('');
  const [challenges, setChallenges] = useState<string>('');
  const [skillsAcquired, setSkillsAcquired] = useState<string>('');
  const [mentorshipNeeds, setMentorshipNeeds] = useState<string>('');
  const [reflectionSummary, setReflectionSummary] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (selfAppraisal) {
      if (selfAppraisal.selfRating) setSelfRating(selfAppraisal.selfRating);
      if (selfAppraisal.achievements) setAchievements(selfAppraisal.achievements);
      if (selfAppraisal.challenges) setChallenges(selfAppraisal.challenges);
      if (selfAppraisal.skillsAcquired) setSkillsAcquired(selfAppraisal.skillsAcquired);
      if (selfAppraisal.mentorshipNeeds) setMentorshipNeeds(selfAppraisal.mentorshipNeeds);
      if (selfAppraisal.reflectionSummary) setReflectionSummary(selfAppraisal.reflectionSummary);
    }
  }, [selfAppraisal]);

  const handleSubmit = async (isFinal: boolean) => {
    if (isFinal) {
      const confirmSubmit = window.confirm(
        'Are you sure you want to finalize your self-assessment? Once submitted, answers are permanently locked and sent to HR and your mentor.'
      );
      if (!confirmSubmit) return;
    }

    try {
      setIsSaving(true);
      await onSubmitSelfAppraisal({
        selfRating,
        achievements,
        challenges,
        skillsAcquired,
        mentorshipNeeds,
        reflectionSummary,
        isSubmitted: isFinal,
        is_submitted: isFinal,
      });

      if (isFinal) {
        toast.success('Self-assessment finalized successfully! Form is now locked.');
      } else {
        toast.success('Self-assessment draft saved successfully.');
      }
      onRefetch();
    } catch {
      toast.error('Failed to save self-assessment.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-slate-100 rounded-2xl" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <UserCheck className="text-indigo-600" size={20} />
            Self-Appraisal & Growth Reflection
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate your milestone achievements, core competencies gained, and guidance needed for calibration.
          </p>
        </div>

        {isSubmitted ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shrink-0">
            <Lock size={13} />
            Finalized on {selfAppraisal?.submittedAt?.split('T')[0] || 'File'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 shrink-0">
            <Clock size={13} />
            Open for Submission
          </span>
        )}
      </div>

      {/* Main Self-Assessment Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
        {/* Rating Slider (1.0 to 10.0 scale) */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 block">
                Overall Performance Self-Rating
              </span>
              <p className="text-xs text-slate-500">
                Rate your aggregate contribution, velocity, and code quality on a 1.0–10.0 scale.
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-indigo-700">{selfRating.toFixed(1)}</span>
              <span className="text-xs text-slate-400"> / 10.0</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              disabled={isSubmitted || isSaving}
              value={selfRating}
              onChange={(e) => setSelfRating(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-60"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>1.0 (Needs Substantial Improvement)</span>
              <span>5.0 (Meets Core Expectations)</span>
              <span>10.0 (Outstanding Contributor)</span>
            </div>
          </div>
        </div>

        {/* Qualitative Questions */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>1. Key Deliverables & Technical Achievements *</span>
              <span className="text-[11px] text-slate-400 font-normal">What shipped PRs or features are you most proud of?</span>
            </label>
            <textarea
              rows={3}
              disabled={isSubmitted || isSaving}
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="e.g. Modernized the authentication subsystem, added automated test suite with 100% coverage..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none disabled:bg-slate-100/70"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>2. Challenges & Engineering Obstacles *</span>
              <span className="text-[11px] text-slate-400 font-normal">What roadblocks did you navigate?</span>
            </label>
            <textarea
              rows={3}
              disabled={isSubmitted || isSaving}
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="e.g. Managing state synchronization between client and server, resolving race conditions..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none disabled:bg-slate-100/70"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>3. New Technical Competencies & Skills Acquired</span>
              <span className="text-[11px] text-slate-400 font-normal">Frameworks, architecture patterns, testing tools</span>
            </label>
            <textarea
              rows={3}
              disabled={isSubmitted || isSaving}
              value={skillsAcquired}
              onChange={(e) => setSkillsAcquired(e.target.value)}
              placeholder="e.g. Django REST Framework, Redux Toolkit Query, token-based authentication, Pytest..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none disabled:bg-slate-100/70"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>4. Mentorship & Next Steps Support</span>
              <span className="text-[11px] text-slate-400 font-normal">Where can your mentor or team support your trajectory?</span>
            </label>
            <textarea
              rows={3}
              disabled={isSubmitted || isSaving}
              value={mentorshipNeeds}
              onChange={(e) => setMentorshipNeeds(e.target.value)}
              placeholder="e.g. Deeper exposure to Kubernetes deployments, distributed caching with Redis..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none disabled:bg-slate-100/70"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>5. Overall Sprint Reflection</span>
              <span className="text-[11px] text-slate-400 font-normal">General thoughts on culture, learning, and pace</span>
            </label>
            <textarea
              rows={3}
              disabled={isSubmitted || isSaving}
              value={reflectionSummary}
              onChange={(e) => setReflectionSummary(e.target.value)}
              placeholder="e.g. Highly engaging sprint with rapid feedback loops and strong peer collaboration."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none disabled:bg-slate-100/70"
            />
          </div>
        </div>

        {/* Buttons / Actions */}
        {!isSubmitted ? (
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              You can save a draft anytime. Finalizing locks the submission.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSubmit(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={14} />
                Save Draft
              </button>

              <button
                type="button"
                disabled={isSaving || !achievements.trim() || !challenges.trim()}
                onClick={() => handleSubmit(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-40"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Finalize & Submit Self-Appraisal
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-600" />
              Your self-appraisal is submitted and verified. Form is locked for review calibration.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternEvaluationTab;
