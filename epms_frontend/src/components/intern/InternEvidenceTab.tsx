import React, { useState } from 'react';
import {
  FileText, UploadCloud, Link as LinkIcon, ExternalLink, CheckCircle2,
  AlertCircle, Clock, Plus, X, RefreshCw, Paperclip, ShieldCheck
} from 'lucide-react';
import type { InternEvidenceItem, InternGoalItem } from '../../features/dashboard/dashboardTypes';
import { toast } from 'react-toastify';

interface InternEvidenceTabProps {
  evidenceList: InternEvidenceItem[];
  goals: InternGoalItem[];
  isLoading: boolean;
  onSubmitEvidence: (formData: FormData) => Promise<any>;
  onRefetch: () => void;
  isOpenModalDirectly?: boolean;
  preselectedGoalId?: string;
  onCloseDirectModal?: () => void;
}

const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'zip', 'docx', 'txt'];
const DISALLOWED_EXTENSIONS = ['exe', 'sh', 'bat', 'cmd', 'py', 'js', 'vbs', 'msi'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const InternEvidenceTab: React.FC<InternEvidenceTabProps> = ({
  evidenceList = [],
  goals = [],
  isLoading,
  onSubmitEvidence,
  onRefetch,
  isOpenModalDirectly = false,
  preselectedGoalId = '',
  onCloseDirectModal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(isOpenModalDirectly);
  const [selectedGoalId, setSelectedGoalId] = useState(preselectedGoalId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync if preselectedGoalId changes externally
  React.useEffect(() => {
    if (preselectedGoalId) {
      setSelectedGoalId(preselectedGoalId);
      setIsModalOpen(true);
    }
  }, [preselectedGoalId]);

  const handleOpenModal = (goalId?: string) => {
    if (goalId) setSelectedGoalId(goalId);
    else if (goals.length > 0 && !selectedGoalId) setSelectedGoalId(goals[0].id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    onCloseDirectModal?.();
    setTitle('');
    setDescription('');
    setExternalUrl('');
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }
    const file = e.target.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (DISALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Executable or script file type (.${ext}) is strictly prohibited for security.`);
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`File extension .${ext} is not allowed. Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId) {
      toast.error('Please select an assigned goal to attach this evidence to.');
      return;
    }
    if (!title.trim()) {
      toast.error('Evidence title is required.');
      return;
    }
    if (!selectedFile && !externalUrl.trim()) {
      toast.error('Please either upload an artifact file or provide an external verification URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.append('goalId', selectedGoalId);
      fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());
      if (externalUrl.trim()) fd.append('externalUrl', externalUrl.trim());
      if (selectedFile) fd.append('file', selectedFile);

      await onSubmitEvidence(fd);
      toast.success('Evidence submitted successfully! Mentor verification pending.');
      handleCloseModal();
      onRefetch();
    } catch {
      toast.error('Failed to submit evidence. Please check file validity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReviewBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return {
          label: 'Approved',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 size={12} />,
        };
      case 'REVISION_REQUESTED':
        return {
          label: 'Revision Needed',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertCircle size={12} />,
        };
      default:
        return {
          label: 'Pending Review',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock size={12} />,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <FileText className="text-indigo-600" size={20} />
            Evidence & Deliverables Hub
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Submit pull requests, design links, and testing reports to verify goal milestone completion.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus size={15} /> Submit New Evidence
        </button>
      </div>

      {/* Evidence List */}
      {evidenceList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
          <FileText size={44} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Evidence Submitted Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You haven't submitted any deliverables yet. Attach pull request URLs, test execution PDFs, or design artifacts against your assigned goals.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={13} /> Submit your first artifact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceList.map((item) => {
            const badge = getReviewBadge(item.reviewStatus);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 truncate max-w-[220px]">
                      {item.goalTitle || 'General Goal'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.className}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  {item.description && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Review Notes from Mentor */}
                {item.reviewNotes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-0.5">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block">
                      Mentor Feedback {item.reviewedBy && `(${item.reviewedBy})`}
                    </span>
                    <p className="italic">"{item.reviewNotes}"</p>
                  </div>
                )}

                {/* Links & Footer */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    {item.externalUrl && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline font-medium flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        View URL
                      </a>
                    )}
                    {item.fileAttachment && (
                      <a
                        href={item.fileAttachment}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-700 hover:text-indigo-600 font-medium flex items-center gap-1"
                      >
                        <Paperclip size={12} />
                        {item.fileName || 'Attachment'}
                      </a>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">{item.createdAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Submit Work Evidence</h3>
                <p className="text-xs text-slate-500">Attach proof of work against an assigned goal</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Associated Goal *</label>
                <select
                  required
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                >
                  <option value="" disabled>Select an assigned goal...</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} {g.weightage ? `(${g.weightage}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Evidence Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit Test Coverage Report PR #42"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">External URL (GitHub PR / Drive / Figma)</label>
                <input
                  type="url"
                  placeholder="https://github.com/org/repo/pull/123"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  File Attachment (PDF, Images, ZIP, DOCX — Max 10MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.zip,.docx,.txt"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description & Context</label>
                <textarea
                  rows={3}
                  placeholder="Explain your approach, testing methodology, or relevant milestone details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                    <UploadCloud size={13} />
                  )}
                  Submit Proof of Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternEvidenceTab;
