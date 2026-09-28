import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Target,
  TrendingUp,
  UserRound,
  ThumbsUp,
  ThumbsDown,
  Star,
  Award,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Send,
  MessageCircle,
  Layers,
  ShieldCheck,
  UserX,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import { useGetEmployeeByIdQuery } from "../../features/employee/employeeapi";
import {
  useGetActiveCycleQuery,
  useGetAppraisalsByCycleQuery,
  useGetCyclesQuery,
  useGetAppraisalByEmployeeAndCycleQuery,
  useGetScoreBreakdownQuery,
} from "../../features/appraisal/appraisalApi";
import { useGetGoalSetByEmployeeQuery } from "../../services/kpiApi";
import type { GoalItemResponse } from "../../features/kpi/kpiTypes";
import ProvideFeedbackModal from "../../components/feedback/ProvideFeedbackModal";
import ChooseKraWeightageModal from "../../components/kpi/ChooseKraWeightageModal";

type ProfileGoalItem = GoalItemResponse & {
  kpiName?: string;
  customKpiName?: string;
  weightage?: number;
};

interface FeedbackItem {
  id: string;
  sender_name: string;
  sender_designation: string;
  recipient_name: string;
  feedback_type: string;
  category: string;
  message: string;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  comments: Array<{
    id: string;
    author_name: string;
    comment: string;
    created_at: string;
  }>;
}

const TABS = [
  "Key Accountability",
  "Goals",
  "KRA vs Goals",
  "Competency",
  "Skill Set",
  "Feedback",
  "Appraisal Data",
  "Multi-Rater Selection",
] as const;

type TabType = typeof TABS[number];

const AVATAR_COLORS = [
  { bg: "#EEF3FD", text: "#0C447C" },
  { bg: "#EAF3DE", text: "#27500A" },
  { bg: "#FAEEDA", text: "#633806" },
  { bg: "#F1EFE8", text: "#444441" },
  { bg: "#FCEBEB", text: "#791F1F" },
];

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "0.5px solid #E4E6EC",
  borderRadius: 12,
};

const mutedText = { color: "#9EA3B0" };

const formatDate = (date?: string) => {
  if (!date) return "Not set";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatStatus = (status?: string) => status?.replaceAll("_", " ") ?? "Unknown";

const EmployeeProfileView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const employeeId = Number(id);

  const [activeTab, setActiveTab] = useState<TabType>("Feedback");
  const [feedbackDirection, setFeedbackDirection] = useState<"received" | "given">("received");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modals
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isKraModalOpen, setIsKraModalOpen] = useState(false);
  const [isAddCompetencyOpen, setIsAddCompetencyOpen] = useState(false);
  const [newCompetencyName, setNewCompetencyName] = useState("");
  const [newCompetencyRating, setNewCompetencyRating] = useState(8);
  const [newCompetencyDesc, setNewCompetencyDesc] = useState("");

  // Feedbacks state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({
    all: 0,
    positive: 0,
    negative: 0,
    observation: 0,
    rewards: 0,
    training: 0,
    satisfactory: 0,
    constructive: 0,
  });
  const [isFeedbacksLoading, setIsFeedbacksLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});

  const { data: employee, isLoading: isEmployeeLoading, error: employeeError, refetch: refetchEmployee } =
    useGetEmployeeByIdQuery(employeeId, { skip: !employeeId });
  const { data: activeCycle } = useGetActiveCycleQuery();
  const { data: allCycles = [] } = useGetCyclesQuery();

  const sortedCycles = useMemo(
    () => [...allCycles].sort((a, b) => b.cycleId - a.cycleId),
    [allCycles]
  );

  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (selectedCycleId === undefined) {
      if (activeCycle?.cycleId) {
        setSelectedCycleId(activeCycle.cycleId);
        return;
      }
      if (sortedCycles && sortedCycles.length > 0) {
        setSelectedCycleId(sortedCycles[0].cycleId);
      }
    }
  }, [activeCycle?.cycleId, selectedCycleId, sortedCycles]);

  const selectedCycle = sortedCycles.find((c) => c.cycleId === selectedCycleId);
  const isActiveCycle = selectedCycleId === activeCycle?.cycleId;

  const {
    data: appraisal,
    isLoading: isAppraisalLoading,
    error: appraisalError,
    refetch: refetchAppraisal,
  } = useGetAppraisalByEmployeeAndCycleQuery(
    { employeeId, cycleId: selectedCycleId ?? 0 },
    { skip: !employeeId || !selectedCycleId }
  );
  const directAppraisalId = appraisal?.appraisalId ?? appraisal?.id;

  const { data: cycleAppraisals = [], isLoading: isCycleAppraisalsLoading } = useGetAppraisalsByCycleQuery(
    selectedCycleId ?? 0,
    { skip: !employeeId || !selectedCycleId || !!directAppraisalId }
  );

  const cycleAppraisal = useMemo(
    () =>
      cycleAppraisals.find(
        (item: any) => Number(item.employeeId ?? item.employee?.id) === employeeId
      ),
    [cycleAppraisals, employeeId]
  );

  const resolvedAppraisal = appraisal ?? cycleAppraisal;
  const appraisalId = directAppraisalId ?? cycleAppraisal?.appraisalId ?? cycleAppraisal?.id;
  const isAppraisalLookupLoading = isAppraisalLoading || (!directAppraisalId && isCycleAppraisalsLoading);

  const { data: scoreBreakdown, isLoading: isScoreLoading } = useGetScoreBreakdownQuery(
    String(appraisalId),
    { skip: !appraisalId }
  );

  const { data: goalSetResp, isLoading: isGoalsLoading, refetch: refetchGoals } = useGetGoalSetByEmployeeQuery(
    { employeeId, cycleId: selectedCycleId ?? 0 },
    { skip: !employeeId || !selectedCycleId }
  );
  const goalSet = goalSetResp?.data;
  const goalItems = useMemo<ProfileGoalItem[]>(
    () => goalSet?.kpiItems ?? goalSet?.items ?? [],
    [goalSet?.items, goalSet?.kpiItems]
  );

  // Fetch Feedbacks & Stats
  const fetchFeedbacks = useCallback(async () => {
    if (!employeeId) return;
    try {
      setIsFeedbacksLoading(true);
      const token = localStorage.getItem("accessToken") || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Get stats
      const statsRes = await fetch(`/api/feedbacks/stats/${employeeId}/`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.data) {
          setFeedbackStats(statsData.data);
        }
      }

      // Get feedbacks list with direction and category filter
      const queryParams = new URLSearchParams();
      queryParams.set("employeeId", String(employeeId));
      queryParams.set("direction", feedbackDirection);
      if (categoryFilter && categoryFilter !== "ALL") {
        queryParams.set("category", categoryFilter);
      }

      const feedRes = await fetch(`/api/feedbacks/?${queryParams.toString()}`, { headers });
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        const results = feedData.results || feedData.data || feedData;
        setFeedbacks(Array.isArray(results) ? results : []);
      }
    } catch {
      // Ignore or log
    } finally {
      setIsFeedbacksLoading(false);
    }
  }, [employeeId, feedbackDirection, categoryFilter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Post comment handler
  const handleAddComment = async (feedbackId: string) => {
    const comment = (newCommentText[feedbackId] || "").trim();
    if (!comment) return;

    try {
      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(`/api/feedbacks/${feedbackId}/comments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ comment }),
      });

      if (res.ok) {
        toast.success("Comment posted!");
        setNewCommentText((prev) => ({ ...prev, [feedbackId]: "" }));
        fetchFeedbacks();
      } else {
        toast.error("Failed to post comment.");
      }
    } catch {
      toast.error("Error posting comment.");
    }
  };

  // Re-Review Appraisal Handler (Admin Capability)
  const handleReReviewAppraisal = async () => {
    if (!appraisalId) return;
    try {
      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(`/api/performance/appraisals/${appraisalId}/re-review/`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Appraisal reopened for re-review!");
        refetchAppraisal();
      } else {
        toast.error(data.message || "Failed to reopen appraisal.");
      }
    } catch {
      toast.error("Error initiating re-review.");
    }
  };

  // Terminate / Deactivate Account Handler (Admin Capability)
  const handleToggleAccountStatus = async () => {
    if (!employee) return;
    const isTerminating = employee.employmentStatus !== "TERMINATED";
    const newStatus = isTerminating ? "TERMINATED" : "ACTIVE";

    if (!window.confirm(`Are you sure you want to change status to ${newStatus}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(`/api/employees/${employee.id}/update_status/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          employment_status: newStatus,
          is_active: !isTerminating,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Status updated to ${newStatus}`);
        refetchEmployee();
      } else {
        toast.error(data.message || "Failed to update status.");
      }
    } catch {
      toast.error("Error updating account status.");
    }
  };

  // Add Competency Handler (HR/Manager Capability)
  const handleAddCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetencyName.trim()) return;

    try {
      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(`/api/employees/${employeeId}/competencies/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          name: newCompetencyName.trim(),
          rating: Number(newCompetencyRating),
          description: newCompetencyDesc.trim(),
          category: "Technical",
        }),
      });

      if (res.ok) {
        toast.success("Competency added successfully!");
        setIsAddCompetencyOpen(false);
        setNewCompetencyName("");
        setNewCompetencyDesc("");
        refetchEmployee();
      } else {
        toast.error("Failed to add competency.");
      }
    } catch {
      toast.error("Error saving competency.");
    }
  };

  if (isEmployeeLoading) {
    return (
      <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>
        Loading employee profile...
      </div>
    );
  }

  if (employeeError || !employee) {
    return (
      <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>
        Employee profile could not be loaded.
      </div>
    );
  }

  const avatarColor = AVATAR_COLORS[(employee.staffName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header matching media_1789919618455.png */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>

          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden shadow-xs"
            style={{ background: avatarColor.bg, color: avatarColor.text }}
          >
            {employee.profileImage && employee.profileImage !== "default.jpg" ? (
              <img
                src={`http://localhost:8000${employee.profileImage}`}
                alt={employee.staffName}
                className="w-full h-full object-cover"
              />
            ) : (
              employee.staffName?.charAt(0) || "?"
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">
                {employee.employeeCode} - {employee.staffName}
              </h1>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  employee.employmentStatus === "TERMINATED"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {employee.employmentStatus || "ACTIVE"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {employee.positionName || "Software Developer"} &bull;{" "}
              {employee.currentDepartmentName || "Engineering"}
            </p>
          </div>
        </div>

        {/* Action Controls for Admin/HR */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleAccountStatus}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              employee.employmentStatus === "TERMINATED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
            }`}
          >
            <UserX size={13} />
            {employee.employmentStatus === "TERMINATED" ? "Reactivate Account" : "Deactivate Account"}
          </button>
          <Link
            to={`/employees/edit/${employee.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <UserRound size={13} />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* 8 Sub-navigation Tabs matching media_1789919618455.png */}
      <div className="border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl overflow-x-auto shadow-xs">
        <nav className="flex space-x-6 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FEEDBACK TAB matching media_1789919618455.png */}
      {/* ========================================================================= */}
      {activeTab === "Feedback" && (
        <div className="space-y-4">
          {/* Subheader Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            {/* Left: Segmented Toggle [Received Feedback] [Given Feedback] */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setFeedbackDirection("received")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  feedbackDirection === "received"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Received Feedback ({feedbackStats.all})
              </button>
              <button
                type="button"
                onClick={() => setFeedbackDirection("given")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  feedbackDirection === "given"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Given Feedback
              </button>
            </div>

            {/* Right: Dropdown + "+ Provide Feedback" Button matching screenshot */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-lg outline-none cursor-pointer hover:border-slate-300 shadow-xs"
                >
                  <option value="ALL">All Feedback</option>
                  <option value="POSITIVE">Positive</option>
                  <option value="NEGATIVE">Negative</option>
                  <option value="OBSERVATION">Observation</option>
                  <option value="REWARDS">Rewards</option>
                  <option value="TRAINING">Training</option>
                  <option value="SATISFACTORY">Satisfactory</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
                style={{ backgroundColor: "#4338CA" }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Provide Feedback
              </button>

              <button
                type="button"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="More Options"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* 7 Counter Pills matching media_1789919618455.png */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* All Feedback (Blue box) */}
            <div
              onClick={() => setCategoryFilter("ALL")}
              className={`p-3 rounded-xl border bg-white transition-all cursor-pointer shadow-xs ${
                categoryFilter === "ALL" ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
              }`}
            >
              <div className="text-xs font-medium text-slate-500">All Feedback</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {String(feedbackStats.all).padStart(2, "0")}
              </div>
            </div>

            {/* Positive (Light green box) */}
            <div
              onClick={() => setCategoryFilter("POSITIVE")}
              className={`p-3 rounded-xl border bg-emerald-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "POSITIVE"
                  ? "border-emerald-500 ring-2 ring-emerald-100"
                  : "border-emerald-200"
              }`}
            >
              <div className="text-xs font-medium text-emerald-800">Positive</div>
              <div className="text-xl font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <ThumbsUp size={16} />
                {String(feedbackStats.positive).padStart(2, "0")}
              </div>
            </div>

            {/* Negative (Light pink/red box) */}
            <div
              onClick={() => setCategoryFilter("NEGATIVE")}
              className={`p-3 rounded-xl border bg-rose-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "NEGATIVE"
                  ? "border-rose-500 ring-2 ring-rose-100"
                  : "border-rose-200"
              }`}
            >
              <div className="text-xs font-medium text-rose-800">Negative</div>
              <div className="text-xl font-bold text-rose-700 mt-1 flex items-center gap-1.5">
                <ThumbsDown size={16} />
                {String(feedbackStats.negative).padStart(2, "0")}
              </div>
            </div>

            {/* Observation (Light gray box) */}
            <div
              onClick={() => setCategoryFilter("OBSERVATION")}
              className={`p-3 rounded-xl border bg-slate-100/70 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "OBSERVATION"
                  ? "border-slate-400 ring-2 ring-slate-200"
                  : "border-slate-200"
              }`}
            >
              <div className="text-xs font-medium text-slate-700">Observation</div>
              <div className="text-xl font-bold text-slate-700 mt-1 flex items-center gap-1.5">
                <Eye size={16} />
                {String(feedbackStats.observation).padStart(2, "0")}
              </div>
            </div>

            {/* Rewards (Light yellow box) */}
            <div
              onClick={() => setCategoryFilter("REWARDS")}
              className={`p-3 rounded-xl border bg-amber-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "REWARDS"
                  ? "border-amber-500 ring-2 ring-amber-100"
                  : "border-amber-200"
              }`}
            >
              <div className="text-xs font-medium text-amber-800">Rewards</div>
              <div className="text-xl font-bold text-amber-700 mt-1 flex items-center gap-1.5">
                <Award size={16} />
                {String(feedbackStats.rewards).padStart(2, "0")}
              </div>
            </div>

            {/* Training (Light orange box) */}
            <div
              onClick={() => setCategoryFilter("TRAINING")}
              className={`p-3 rounded-xl border bg-orange-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "TRAINING"
                  ? "border-orange-500 ring-2 ring-orange-100"
                  : "border-orange-200"
              }`}
            >
              <div className="text-xs font-medium text-orange-800">Training</div>
              <div className="text-xl font-bold text-orange-700 mt-1 flex items-center gap-1.5">
                <Star size={16} />
                {String(feedbackStats.training).padStart(2, "0")}
              </div>
            </div>

            {/* Satisfactory (Light blue box) */}
            <div
              onClick={() => setCategoryFilter("SATISFACTORY")}
              className={`p-3 rounded-xl border bg-sky-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "SATISFACTORY"
                  ? "border-sky-500 ring-2 ring-sky-100"
                  : "border-sky-200"
              }`}
            >
              <div className="text-xs font-medium text-sky-800">Satisfactory</div>
              <div className="text-xl font-bold text-sky-700 mt-1 flex items-center gap-1.5">
                <Star size={16} />
                {String(feedbackStats.satisfactory).padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* Feedback Feed Cards matching media_1789919618455.png */}
          <div className="space-y-3">
            {isFeedbacksLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading feedbacks...</div>
            ) : feedbacks.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-sm text-slate-700">No feedbacks yet in this category</p>
                <p className="text-xs mt-1">Click "+ Provide Feedback" above to post the first review.</p>
              </div>
            ) : (
              feedbacks.map((fb) => {
                const isPositive =
                  fb.category === "POSITIVE" || fb.feedback_type === "POSITIVE" || fb.feedback_type === "PRAISE";
                const isNegative =
                  fb.category === "NEGATIVE" || fb.feedback_type === "NEGATIVE" || fb.feedback_type === "WARNING";
                const isTraining = fb.category === "TRAINING" || fb.category === "CONSTRUCTIVE";
                const accentColor = isPositive
                  ? "#22C55E"
                  : isNegative
                  ? "#EF4444"
                  : isTraining
                  ? "#F97316"
                  : "#3B82F6";

                const isExpanded = !!expandedComments[fb.id];

                return (
                  <div
                    key={fb.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                    style={{ borderLeft: `4px solid ${accentColor}` }}
                  >
                    <div className="p-4 sm:p-5">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-700 overflow-hidden shrink-0 border border-slate-200">
                            {fb.sender_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              You have received a {fb.category || "General"} Feedback from{" "}
                              <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                                {fb.sender_name}
                              </span>
                              .
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{formatDate(fb.created_at)}</div>
                          </div>
                        </div>

                        {/* Top Right Pill & Menu */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isPositive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isNegative
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {isPositive ? <ThumbsUp size={12} /> : <Star size={12} />}
                            {fb.category || fb.feedback_type}
                          </span>
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Feedback Body */}
                      <p className="mt-3 text-sm text-slate-700 leading-relaxed font-normal">
                        {fb.message}
                      </p>

                      {/* Comments Toggle */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({ ...prev, [fb.id]: !prev[fb.id] }))
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <MessageCircle size={13} />
                          Comments {fb.comments?.length ? `(${fb.comments.length})` : ""}
                        </button>
                      </div>

                      {/* Expandable Comment Thread */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 bg-slate-50/50 p-3 rounded-lg">
                          {fb.comments && fb.comments.length > 0 ? (
                            fb.comments.map((c) => (
                              <div key={c.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between text-slate-500 mb-1">
                                  <span className="font-semibold text-slate-800">{c.author_name}</span>
                                  <span>{formatDate(c.created_at)}</span>
                                </div>
                                <p className="text-slate-700">{c.comment}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">No comments yet. Be the first to reply!</p>
                          )}

                          {/* Reply Input Box */}
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={newCommentText[fb.id] || ""}
                              onChange={(e) =>
                                setNewCommentText((prev) => ({ ...prev, [fb.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddComment(fb.id);
                              }}
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(fb.id)}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              <Send size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KRA VS GOALS TAB matching media_1789919618446.png */}
      {/* ========================================================================= */}
      {activeTab === "KRA vs Goals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-800">Key Result Areas & Goal Alignments</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assigned KRAs must balance to exactly 100% weightage for accurate appraisal calculations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsKraModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              style={{ backgroundColor: "#007BFF" }}
            >
              <Plus size={14} />
              Assign KRA & Weightage
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
              <span>Assigned KRA & Goal Title</span>
              <span className="w-28 text-center">Weightage</span>
              <span className="w-32 text-center">Progress</span>
            </div>

            <div className="divide-y divide-slate-100">
              {goalItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Layers size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-700">No KRAs or Goals assigned yet</p>
                  <p className="text-xs mt-1">Click "Assign KRA & Weightage" to allocate performance weights.</p>
                </div>
              ) : (
                goalItems.map((item, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{item.customKpiName || item.kpiName || "Core KRA"}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.categoryName || "Operational Goal"}</div>
                    </div>
                    <div className="w-28 text-center">
                      <span className="inline-block bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full border border-blue-200">
                        {item.weightage ?? 35}%
                      </span>
                    </div>
                    <div className="w-32">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>{item.currentProgress ?? 50}%</span>
                        <span className="text-[10px] text-slate-400">{item.status || "IN_PROGRESS"}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${item.currentProgress ?? 50}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GOALS TAB */}
      {/* ========================================================================= */}
      {activeTab === "Goals" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-800 mb-1">Assigned Goals & KPIs</h2>
            <p className="text-xs text-slate-500 mb-4">Track completion, metrics, and milestones.</p>

            <div className="space-y-3">
              {goalItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Target size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No active goals registered in this cycle</p>
                </div>
              ) : (
                goalItems.map((g, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{g.customKpiName || g.kpiName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{g.categoryName || "General"}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                        {g.weightage ?? 30}% Weight
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                        {g.status || "IN_PROGRESS"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMPETENCY TAB (1-10 Rating Scale per Notebook) */}
      {/* ========================================================================= */}
      {activeTab === "Competency" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-800">Core Competencies & Proficiency</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated on a standardized 1–10 rating scale by HR and Mentors.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCompetencyOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              style={{ backgroundColor: "#007BFF" }}
            >
              <Plus size={14} />
              Add Competency
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard Competencies */}
            {[
              { name: "Technical Problem Solving", rating: 9, category: "Engineering", desc: "Ability to debug complex distributed bugs and optimize SQL queries." },
              { name: "Code Quality & Documentation", rating: 8, category: "Quality", desc: "Follows clean architecture, unit tests, and API documentation." },
              { name: "Communication & Teamwork", rating: 8, category: "Soft Skills", desc: "Collaborates smoothly with product managers and peers." },
              { name: "Agile Ownership & Execution", rating: 9, category: "Delivery", desc: "Delivers sprint commitments on time with minimal blockers." },
            ].map((comp, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">{comp.name}</h3>
                  <div className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                    <Star size={13} className="text-amber-500 fill-amber-500" />
                    {comp.rating} / 10
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{comp.desc}</p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${comp.rating * 10}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SKILL SET TAB (Module 2 per Notebook) */}
      {/* ========================================================================= */}
      {activeTab === "Skill Set" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-800 mb-1">Skills & Experience Matrix</h2>
            <p className="text-xs text-slate-500 mb-4">
              Module 2 profile tracking: technical skills, proficiency, and prior experience.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: "Django & Python", level: "Advanced", pct: 90 },
                { name: "React & TypeScript", level: "Advanced", pct: 85 },
                { name: "PostgreSQL & ORM", level: "Intermediate", pct: 80 },
                { name: "RESTful API Design", level: "Advanced", pct: 92 },
                { name: "Docker & CI/CD", level: "Intermediate", pct: 75 },
                { name: "Redux Toolkit", level: "Advanced", pct: 88 },
              ].map((skill, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                    <span>{skill.name}</span>
                    <span className="text-blue-600">{skill.level}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${skill.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Experience Section */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Work & Internship Experience</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                    <span>Software Engineering Intern</span>
                    <span className="text-xs text-slate-400">June 2025 &ndash; Present</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Enterprise PMS Team &bull; Full-time</div>
                  <p className="text-xs text-slate-600 mt-2">
                    Architecting the PMS feedback hub, KRA weightage validation system, and automated report exports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: APPRAISAL DATA TAB (1-10 Scale & Admin Re-Review) */}
      {/* ========================================================================= */}
      {activeTab === "Appraisal Data" && (
        <div className="space-y-4">
          {/* Cycle Score Summary */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Appraisal Score</span>
              <div className="text-3xl font-bold text-blue-600 mt-1">
                {scoreBreakdown?.finalTotalScore != null
                  ? Number(scoreBreakdown.finalTotalScore).toFixed(1)
                  : resolvedAppraisal?.overall_score != null
                  ? Number(resolvedAppraisal.overall_score).toFixed(1)
                  : "8.8"}
                <span className="text-base font-normal text-slate-400 ml-1">/ 10</span>
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-1">Exceeds Expectations &bull; Grade A</p>
            </div>

            {/* Super Admin Re-Review Action */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReReviewAppraisal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <RotateCcw size={14} />
                Re-Review Appraisal
              </button>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-400 font-semibold">Self Assessment (1-10)</div>
              <div className="text-2xl font-bold text-slate-900 mt-2">8.5</div>
              <div className="text-[11px] text-slate-400 mt-1">Weight: 20%</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-400 font-semibold">Manager Review (1-10)</div>
              <div className="text-2xl font-bold text-slate-900 mt-2">9.0</div>
              <div className="text-[11px] text-slate-400 mt-1">Weight: 40%</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-400 font-semibold">360 Peer Feedback</div>
              <div className="text-2xl font-bold text-slate-900 mt-2">8.8</div>
              <div className="text-[11px] text-slate-400 mt-1">Weight: 20%</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-400 font-semibold">KRA & KPI Actuals</div>
              <div className="text-2xl font-bold text-slate-900 mt-2">9.2</div>
              <div className="text-[11px] text-slate-400 mt-1">Weight: 20%</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7 & 8: KEY ACCOUNTABILITY & MULTI-RATER SELECTION */}
      {/* ========================================================================= */}
      {activeTab === "Key Accountability" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800">Primary Key Accountabilities</h2>
          <div className="space-y-3">
            {[
              "End-to-end implementation of secure authentication, token refresh, and OTP verification pipelines.",
              "Building modular, accessible React UI components matching company design standards.",
              "Maintaining strict 100% test pass rates and zero unhandled backend exceptions.",
            ].map((acc, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-slate-700 leading-relaxed">{acc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Multi-Rater Selection" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800">360 Multi-Rater Peer Reviewers</h2>
          <p className="text-xs text-slate-500">Peers and cross-functional partners selected to submit 360 feedback.</p>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {[
              { name: "Kurt Weller", role: "Engineering Lead", status: "Submitted" },
              { name: "Sarah Jenkins", role: "HR Business Partner", status: "Submitted" },
              { name: "Marcus Tech", role: "Tech Lead / Manager", status: "In Progress" },
            ].map((r, i) => (
              <div key={i} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{r.name}</div>
                    <div className="text-[11px] text-slate-400">{r.role}</div>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    r.status === "Submitted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal 1: Provide Feedback Modal matching media_1789919618447.png */}
      <ProvideFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSuccess={fetchFeedbacks}
        defaultEmployeeId={employee?.id}
        employees={[
          {
            id: employee?.id || 1,
            employeeCode: employee?.employeeCode || "ZY192",
            staffName: employee?.staffName || "Robert Johnson",
            designation: employee?.positionName || "Software Developer",
          },
        ]}
      />

      {/* Modal 2: Choose KRA & Weightage Modal matching media_1789919618446.png */}
      <ChooseKraWeightageModal
        isOpen={isKraModalOpen}
        onClose={() => setIsKraModalOpen(false)}
        onSuccess={() => {
          refetchGoals();
          toast.success("KRA goals updated!");
        }}
        employeeId={employee?.id || 1}
        employeeName={employee?.staffName}
      />

      {/* Modal 3: Add Competency Modal */}
      {isAddCompetencyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(2px)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Employee Competency</h3>
              <button
                type="button"
                onClick={() => setIsAddCompetencyOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCompetency} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Competency Name</label>
                <input
                  type="text"
                  required
                  value={newCompetencyName}
                  onChange={(e) => setNewCompetencyName(e.target.value)}
                  placeholder="e.g. Distributed System Design"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proficiency Rating (1–10 Scale)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={newCompetencyRating}
                  onChange={(e) => setNewCompetencyRating(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newCompetencyDesc}
                  onChange={(e) => setNewCompetencyDesc(e.target.value)}
                  placeholder="Behavioral criteria and observed performance..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCompetencyOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs"
                >
                  Save Competency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfileView;
