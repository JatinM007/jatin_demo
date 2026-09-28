export interface HrDashboardResponse {
  totalEmployeesUnderReview: number;
  appraisalCompletionRate: number;
  pendingSelfAssessments: number;
  pendingManagerReviews: number;
  openPips: number;
  promotionCandidates: number;
  departmentPerformance: DepartmentPerformance[];
  topPerformers: TopPerformer[];
  alerts: DashboardAlert[];
  currentCyclePhase?: string;
  cyclePhaseProgress?: number;
  nonCompliantManagers?: string[];
  pipByDepartment?: Record<string, PipSummary>;
  daysUntilCycleEnd?: number;
}

export interface DepartmentPerformance {
  departmentName: string;
  averageScore: number;
  employeeCount: number;
}

export interface TopPerformer {
  employeeName: string;
  department: string;
  score: number;
  photoUrl?: string;
}

export interface DashboardAlert {
  title: string;
  message: string;
  type: "info" | "warning" | "danger";
  timestamp: string;
}

export interface AdminDashboardResponse {
  totalEmployees: number;
  totalDepartments: number;
  totalManagers: number;
  activeUsers: number;
  lockedAccounts: number;
  activeCycles: number;
  recentActivities: RecentActivity[];
  securityAlerts: SecurityAlert[];
  failedLoginsLast24h?: number;
  accountsCreatedThisMonth?: number;
  accountsDeactivatedThisMonth?: number;
  activeCycleName?: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
}

export interface RecentActivity {
  action: string;
  user: string;
  timestamp: string;
  module: string;
}

export interface SecurityAlert {
  event: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  timestamp: string;
  details: string;
}

export interface EmployeeDashboardResponse {
  currentScore: number;
  kpiCompletionPercentage: number;
  pendingTasksCount: number;
  feedbackCount: number;
  performanceTrend: ScoreTrend[];
  kpiStatus: KpiProgress[];
  appraisalTimeline: UpcomingPhase[];
  tasks: DashboardTask[];
  managerLastScore?: number;
  managerLastComment?: string;
  daysUntilNextDeadline?: number;
  teamRank?: number;
  teamSize?: number;
  onPip?: boolean;
}

export interface ScoreTrend {
  period: string;
  score: number;
}

export interface KpiProgress {
  name: string;
  value: number;
}

export interface UpcomingPhase {
  phase: string;
  status: string;
  date: string;
  active: boolean;
}

export interface DashboardTask {
  id: number;
  title: string;
  deadline: string;
  priority: string;
}

export interface ScoringWeightDistribution {
  goals_and_kpis: number;
  manager_evaluation: number;
  self_assessment: number;
}

export interface EvaluationParameterItem {
  id: string;
  name: string;
  description: string;
  weight: number;
  maximumScore: number;
  isActive?: boolean;
}

export interface ScoringParametersResponse {
  cycle?: {
    id: string | null;
    name: string;
    status: string;
  };
  componentWeights: {
    goalsWeight: number;
    managerWeight: number;
    selfWeight: number;
    totalWeight: number;
  };
  evaluationParameters: EvaluationParameterItem[];
}

export interface InternScorecardResponse {
  totalGoals: number;
  completedGoals: number;
  inProgressGoals?: number;
  averageProgress: number;
  pendingTasksCount?: number;
  upcomingDeadlinesCount?: number;
  activeAppraisalStatus?: string;
  publishedScore: number | null;
  performanceClassification?: string | null;
  weightDistribution?: ScoringWeightDistribution;
  evaluationParameters?: EvaluationParameterItem[];
}

export interface InternComment {
  id: string;
  authorName: string;
  authorRole: string;
  comment: string;
  isMentor: boolean;
  createdAt: string;
  parentId?: string | null;
}

export interface InternGoalItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  completionPercentage: number;
  weightage?: number;
  status: string;
  priority: string;
  dueDate: string | null;
  cycleName: string;
  assignedByName?: string | null;
  comments?: InternComment[];
  evidenceCount?: number;
}

export interface InternTaskItem {
  id: string;
  title: string;
  category: string;
  instructions: string;
  priority: string;
  dueDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  hoursSpent: number | null;
  completionNotes: string;
  artifactUrl: string;
  isPermittedToComplete: boolean;
  isOverdue: boolean;
}

export interface InternEvidenceItem {
  id: string;
  goalId: string | null;
  goalTitle: string;
  title: string;
  description: string;
  externalUrl: string;
  fileAttachment: string | null;
  fileName: string | null;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';
  reviewNotes: string;
  reviewedBy: string | null;
  createdAt: string;
}

export interface InternMentorInfo {
  name: string;
  email: string;
  designation: string;
  department: string;
  avatar: string;
  status: string;
}

export interface InternCycleInfo {
  id: string | null;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  currentPhase: string;
  daysRemaining: number;
}

export interface InternDeadlineItem {
  id: string;
  title: string;
  type: 'TASK' | 'GOAL' | 'EVALUATION' | 'EVIDENCE';
  dueDate: string;
  daysLeft: number;
  isUrgent: boolean;
  status: string;
}

export interface InternPublishedResults {
  isPublished: boolean;
  overallScore: number | null;
  classification: string | null;
  reviewerComments: string | null;
  finalComments: string | null;
  areasForImprovement: string[];
  publishedAt: string | null;
  reviewerName?: string;
  weightDistribution?: ScoringWeightDistribution;
  evaluationParameters?: EvaluationParameterItem[];
  scoreBreakdown?: any;
}

export interface InternOverviewData {
  personalScorecard: InternScorecardResponse;
  mentor: InternMentorInfo;
  cycle: InternCycleInfo;
  deadlines: InternDeadlineItem[];
  publishedResults: InternPublishedResults;
}

export interface InternSelfAppraisalData {
  isEnabled: boolean;
  isSubmitted: boolean;
  submittedAt: string | null;
  selfRating: number;
  achievements: string;
  challenges: string;
  skillsAcquired: string;
  mentorshipNeeds: string;
  reflectionSummary: string;
  hrQuestions: Array<{
    id: string;
    category: string;
    question: string;
    placeholder: string;
  }>;
  cycleName: string;
}

export interface InternPublishedFeedbackData {
  isPublished: boolean;
  cycleName?: string;
  overallScore?: number;
  performanceClassification?: string;
  publishedAt?: string;
  mentorName?: string;
  mentorFeedback?: string;
  finalConclusion?: string;
  areasForImprovement?: string[];
  weightDistribution?: ScoringWeightDistribution;
  evaluationParameters?: EvaluationParameterItem[];
  scoreBreakdown?: any;
  replies?: Array<{
    id: string;
    replyText: string;
    createdAt: string;
  }>;
  isReplyPermitted?: boolean;
  message?: string;
}

export interface InternAppraisalItem {
  id: string;
  cycleName: string;
  appraisalType: string;
  status: string;
  overallScore: number | null;
  selfScore: number | null;
  managerScore: number | null;
  reviewerComments: string | null;
  finalComments: string | null;
  published: boolean;
}

export interface ManagerDashboardResponse {
  teamSize: number;
  reviewsCompleted: number;
  totalReviews: number;
  pendingReviews: number;
  feedbackRequests: number;
  teamPerformance: TeamMemberPerformance[];
  teamKpis: TeamKpiProgress[];
  urgentReviews: DashboardTask[];
  teamAvgScore?: number;
  companyAvgScore?: number;
  pendingSelfAssessmentNames?: string[];
  atRiskEmployees?: AtRiskEmployee[];
  overdueReviews?: OverdueReview[];
}

export interface TeamMemberPerformance {
  name: string;
  score: number;
}

export interface TeamKpiProgress {
  name: string;
  progress: number;
  color: string;
}

export interface AtRiskEmployee {
  name: string;
  currentScore: number;
  previousScore: number;
  delta: number;
}

export interface OverdueReview {
  employeeId: number;
  employeeName: string;
  daysOverdue: number;
}

export interface PipSummary {
  active: number;
  closed: number;
}

export interface InternFormQuestion {
  id: string;
  order: number;
  label: string;
  question_type: 'TEXT' | 'LONG_TEXT' | 'NUMERIC' | 'RATING' | 'DATE' | 'CHOICE';
  description?: string;
  is_required: boolean;
  min_value?: number | null;
  max_value?: number | null;
  options?: string[] | null;
}

export interface InternFormItem {
  id: string;
  title: string;
  description: string;
  cycle: string | null;
  cycle_name?: string;
  department_name?: string;
  due_date: string | null;
  allow_draft_save: boolean;
  questions_count: number;
  submission_status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
  published_at?: string;
}

export interface InternFormDetail extends InternFormItem {
  questions: InternFormQuestion[];
  current_submission?: {
    id: string;
    is_submitted: boolean;
    submitted_at: string | null;
    answers: Record<string, any>;
  } | null;
}

export interface InternMilestoneMetric {
  label: string;
  value: string;
}

export interface InternMilestoneItem {
  stage: number;
  key: string;
  title: string;
  category: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  date: string | null;
  description: string;
  metrics: InternMilestoneMetric[];
}

export interface InternJourneyData {
  intern: {
    name: string;
    email: string;
    employeeCode?: string;
    department: string;
    designation: string;
    joiningDate: string;
    daysActive: number;
  };
  mentor?: {
    id: string;
    name: string;
    email: string;
    designation: string;
    department: string;
  } | null;
  cycle?: {
    name: string;
    status: string;
    endDate: string | null;
  } | null;
  currentStage: number;
  overallProgressPercent: number;
  milestones: InternMilestoneItem[];
  stats: {
    goalsTotal: number;
    goalsCompleted: number;
    goalsWeightedProgress: number;
    tasksTotal: number;
    tasksCompleted: number;
    tasksUnderReview: number;
    evidenceTotal: number;
    evidenceApproved: number;
    formsSubmitted: number;
    selfEvaluationSubmitted: boolean;
    isResultsPublished: boolean;
  };
}

