import React, { useState } from 'react';
import {
  FileText, CheckCircle2, Clock, AlertCircle, Calendar,
  ArrowRight, X, Save, Send, RefreshCw, Lock, Star
} from 'lucide-react';
import {
  useGetInternFormsQuery,
  useGetInternFormDetailQuery,
  useSubmitInternFormMutation,
} from '../../features/dashboard/dashboardApi';
import type { InternFormItem, InternFormQuestion } from '../../features/dashboard/dashboardTypes';
import { toast } from 'react-toastify';

export const InternFormsTab: React.FC = () => {
  const { data: forms = [], isLoading, refetch } = useGetInternFormsQuery();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const {
    data: formDetail,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useGetInternFormDetailQuery(selectedFormId || '', {
    skip: !selectedFormId,
  });

  const [submitForm, { isLoading: isSubmitting }] = useSubmitInternFormMutation();
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Sync draft answers when detail loads
  React.useEffect(() => {
    if (formDetail?.current_submission?.answers) {
      setAnswers(formDetail.current_submission.answers);
    } else {
      setAnswers({});
    }
  }, [formDetail]);

  const handleOpenForm = (formId: string) => {
    setSelectedFormId(formId);
  };

  const handleCloseModal = () => {
    setSelectedFormId(null);
    setAnswers({});
  };

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleSubmit = async (isFinal: boolean) => {
    if (!selectedFormId || !formDetail) return;

    if (isFinal) {
      // Validate required questions
      for (const q of formDetail.questions) {
        if (q.is_required) {
          const ans = answers[q.id];
          if (ans === undefined || ans === null || String(ans).trim() === '') {
            toast.error(`Please answer the required question: "${q.label}"`);
            return;
          }
        }
      }

      const confirmSubmit = window.confirm(
        'Are you sure you want to finalize your submission? Once finalized, your responses are locked.'
      );
      if (!confirmSubmit) return;
    }

    try {
      await submitForm({
        formId: selectedFormId,
        is_submitted: isFinal,
        answers,
      }).unwrap();

      toast.success(isFinal ? 'Form submitted successfully! Locked.' : 'Draft answers saved.');
      refetch();
      refetchDetail();
      if (isFinal) handleCloseModal();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to submit form responses.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return {
          label: 'Submitted',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 size={12} />,
        };
      case 'DRAFT':
        return {
          label: 'Draft Saved',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock size={12} />,
        };
      default:
        return {
          label: 'Not Started',
          className: 'bg-slate-50 text-slate-600 border-slate-200',
          icon: <Clock size={12} />,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-36 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <FileText className="text-indigo-600" size={20} />
            HR Questionnaires & Feedback Surveys
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configurable questionnaires published by People Operations for cohort evaluations and check-ins.
          </p>
        </div>
      </div>

      {/* Forms List */}
      {forms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
          <FileText size={44} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No HR Forms Published Currently</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are currently no active questionnaires or mid-term surveys open for your cohort.
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <RefreshCw size={12} /> Refresh Surveys
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((f: InternFormItem) => {
            const badge = getStatusBadge(f.submission_status);

            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                      {f.cycle_name || 'Active Cycle'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base">{f.title}</h4>
                  {f.description && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {f.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>{f.questions_count} questions</span>
                    {f.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Due: {f.due_date}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenForm(f.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1"
                  >
                    {f.submission_status === 'SUBMITTED' ? 'View Submission' : (f.submission_status === 'DRAFT' ? 'Continue Draft' : 'Open Form')}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Answering Modal */}
      {selectedFormId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{formDetail?.title || 'Form'}</h3>
                <p className="text-xs text-slate-500">{formDetail?.description || 'Fill in the questionnaire below.'}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Questions Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-slate-100 rounded-xl" />
                  ))}
                </div>
              ) : formDetail?.questions?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">This questionnaire contains no active questions.</p>
              ) : (
                formDetail?.questions?.map((q: InternFormQuestion, idx: number) => {
                  const isLocked = formDetail?.current_submission?.is_submitted;
                  const currentVal = answers[q.id] ?? '';

                  return (
                    <div key={q.id} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                      <label className="text-xs font-bold text-slate-900 flex items-start gap-1">
                        <span className="text-slate-400 font-mono text-[11px]">{idx + 1}.</span>
                        <span>{q.label}</span>
                        {q.is_required && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      {q.description && (
                        <p className="text-[11px] text-slate-500">{q.description}</p>
                      )}

                      {/* Question type renderers */}
                      {q.question_type === 'TEXT' && (
                        <input
                          type="text"
                          disabled={isLocked}
                          value={currentVal}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="Your answer..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 disabled:bg-slate-100"
                        />
                      )}

                      {q.question_type === 'LONG_TEXT' && (
                        <textarea
                          rows={3}
                          disabled={isLocked}
                          value={currentVal}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="Detailed response..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 resize-none disabled:bg-slate-100"
                        />
                      )}

                      {q.question_type === 'NUMERIC' && (
                        <input
                          type="number"
                          min={q.min_value ?? undefined}
                          max={q.max_value ?? undefined}
                          disabled={isLocked}
                          value={currentVal}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-48 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 disabled:bg-slate-100"
                        />
                      )}

                      {q.question_type === 'DATE' && (
                        <input
                          type="date"
                          disabled={isLocked}
                          value={currentVal}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-48 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 disabled:bg-slate-100"
                        />
                      )}

                      {q.question_type === 'RATING' && (
                        <div className="flex items-center gap-1.5 pt-1">
                          {Array.from(
                            { length: Number(q.max_value || 5) - Number(q.min_value || 1) + 1 },
                            (_, i) => Number(q.min_value || 1) + i
                          ).map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleAnswerChange(q.id, String(val))}
                              className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                                String(currentVal) === String(val)
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}

                      {q.question_type === 'CHOICE' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options?.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                currentVal === opt
                                  ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                disabled={isLocked}
                                value={opt}
                                checked={currentVal === opt}
                                onChange={() => handleAnswerChange(q.id, opt)}
                                className="accent-indigo-600"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {formDetail?.current_submission?.is_submitted ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <Lock size={14} />
                  Submission locked on {formDetail.current_submission.submitted_at?.split('T')[0]}
                </div>
              ) : (
                <span className="text-xs text-slate-400">Save draft or submit permanently</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>

                {!formDetail?.current_submission?.is_submitted && (
                  <>
                    {formDetail?.allow_draft_save && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSubmit(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                      >
                        <Save size={13} />
                        Save Draft
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSubmit(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                      Submit Final Responses
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternFormsTab;
