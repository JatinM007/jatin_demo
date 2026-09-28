import { api } from "../../services/api";

export interface MenteeMetrics {
  totalGoals: number;
  completedGoals: number;
  avgGoalProgress: number;
  pendingEvidence: number;
  feedbacksReceived: number;
  technicalCapabilityAvg: number | null;
}

export interface MenteeAppraisalSummary {
  id: string | null;
  status: string;
  statusDisplay: string;
  overallScore: number | null;
  cycleName: string;
}

export interface MenteeItem {
  id: string;
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  designation: string;
  department: string;
  departmentId: string | null;
  employmentStatus: string;
  joiningDate: string | null;
  skills: string[];
  competencies: Array<{ name: string; rating: number; category?: string }>;
  metrics: MenteeMetrics;
  activeAppraisal: MenteeAppraisalSummary | null;
}

export interface ManagerTaskItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: string;
  statusDisplay: string;
  priority: string;
  completionPercentage: number;
  assignedByName: string;
  kpi: {
    name: string | null;
    targetValue: number | null;
    achievedValue: number | null;
    unit: string;
  } | null;
  progressUpdatesCount: number;
  createdAt: string;
}

export interface TechnicalParameterItem {
  id: string;
  name: string;
  category: string;
  description: string;
  benchmarkScore: number;
  weight: number;
  cycleId?: string | null;
  cycleName?: string;
  createdAt?: string;
}

export interface TechnicalReviewItem {
  parameterId: string;
  name: string;
  category: string;
  description: string;
  benchmarkScore: number;
  weight: number;
  review: {
    id: string | null;
    score: number;
    mentorAssessment: string;
    evidenceUrl: string;
    status: string;
    updatedAt: string | null;
  };
}

export interface TechnicalReviewDossier {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  averageScore: number;
  parameters: TechnicalReviewItem[];
  availableEvidence: Array<{ id: string; title: string; external_url?: string }>;
}

export interface EvidenceItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeCode: string;
  goalTitle: string;
  goalId: string | null;
  title: string;
  description: string;
  externalUrl?: string | null;
  fileAttachment?: string | null;
  reviewStatus: string;
  reviewStatusDisplay: string;
  reviewNotes?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface HistoricalReviewItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  status: string;
  statusDisplay: string;
  overallScore: number | null;
  reviewerName: string;
  reviewerComments?: string | null;
  selfComments?: string | null;
  submittedAt?: string | null;
  criteriaRatings: Array<{
    criterionName: string;
    weight: number;
    score: number;
    comments?: string | null;
  }>;
}

export interface EmployeeFeedbackItem {
  id: string;
  senderId: string;
  senderName: string;
  senderCode: string;
  recipientName: string;
  feedbackType: string;
  message: string;
  visibility: string;
  goalTitle?: string | null;
  comments: Array<{
    id: string;
    author: string;
    comment: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export const managerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // M-01: View Assigned Interns/Employees
    getAssignedMentees: builder.query<
      MenteeItem[],
      { search?: string; status?: string; department?: string } | void
    >({
      query: (params) => ({
        url: "manager/mentees/",
        params: params || {},
      }),
      transformResponse: (res: any) => res?.data || [],
      providesTags: ["Manager"],
    }),

    // M-02 & M-03: Manage Tasks & Goals
    getManagerTasks: builder.query<
      ManagerTaskItem[],
      { employeeId?: string; status?: string; priority?: string } | void
    >({
      query: (params) => ({
        url: "manager/tasks/",
        params: params ? {
          employee_id: params.employeeId,
          status: params.status,
          priority: params.priority,
        } : {},
      }),
      transformResponse: (res: any) => res?.data || [],
      providesTags: ["Manager"],
    }),

    assignTask: builder.mutation<
      any,
      {
        employee_id: string;
        title: string;
        description: string;
        due_date?: string;
        priority?: string;
        target_value?: number;
        unit?: string;
      }
    >({
      query: (body) => ({
        url: "manager/tasks/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Manager"],
    }),

    updateTaskStatus: builder.mutation<
      any,
      {
        id: string;
        status?: string;
        completion_percentage?: number;
        comment?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `manager/tasks/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Manager"],
    }),

    // M-04: Manage Technical Capability Parameters
    getTechnicalParameters: builder.query<TechnicalParameterItem[], void>({
      query: () => "manager/technical-parameters/",
      transformResponse: (res: any) => res?.data || [],
      providesTags: ["Manager"],
    }),

    createTechnicalParameter: builder.mutation<
      any,
      {
        name: string;
        category?: string;
        description?: string;
        benchmark_score?: number;
        weight?: number;
        cycle_id?: string;
      }
    >({
      query: (body) => ({
        url: "manager/technical-parameters/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Manager"],
    }),

    // M-05: Review Technical Capability
    getTechnicalReviews: builder.query<TechnicalReviewDossier, string>({
      query: (employeeId) => ({
        url: "manager/technical-reviews/",
        params: { employee_id: employeeId },
      }),
      transformResponse: (res: any) => res?.data,
      providesTags: ["Manager"],
    }),

    saveTechnicalReviews: builder.mutation<
      any,
      {
        employee_id: string;
        status: "DRAFT" | "SUBMITTED";
        reviews: Array<{
          parameter_id: string;
          score: number;
          mentor_assessment?: string;
          evidence_url?: string;
        }>;
      }
    >({
      query: (body) => ({
        url: "manager/technical-reviews/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Manager"],
    }),

    // M-06: View Evidence & Review
    getManagerEvidence: builder.query<
      EvidenceItem[],
      { employeeId?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "manager/evidence/",
        params: params ? {
          employee_id: params.employeeId,
          status: params.status,
        } : {},
      }),
      transformResponse: (res: any) => res?.data || [],
      providesTags: ["Manager"],
    }),

    reviewEvidenceDecision: builder.mutation<
      any,
      {
        id: string;
        status: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
        remarks?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `manager/evidence/${id}/decision/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Manager"],
    }),

    // M-07: Give Feedback
    giveManagerFeedback: builder.mutation<
      any,
      {
        employee_id: string;
        feedback_type?: string;
        message: string;
        visibility?: string;
        goal_id?: string;
      }
    >({
      query: (body) => ({
        url: "manager/feedback/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Manager", "ContinuousFeedback"],
    }),

    // M-08: Review Employee Feedback
    getEmployeeFeedbacks: builder.query<
      EmployeeFeedbackItem[],
      string | undefined
    >({
      query: (employeeId) => ({
        url: "manager/employee-feedbacks/",
        params: employeeId ? { employee_id: employeeId } : {},
      }),
      transformResponse: (res: any) => res?.data || [],
      providesTags: ["Manager"],
    }),

    commentOnEmployeeFeedback: builder.mutation<
      any,
      { id: string; comment: string }
    >({
      query: ({ id, ...body }) => ({
        url: `manager/employee-feedbacks/${id}/comment/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Manager"],
    }),

    // M-12: View Previous Reviews
    getHistoricalReviews: builder.query<
      HistoricalReviewItem[],
      string | undefined
    >({
      query: (employeeId) => ({
        url: "manager/historical-reviews/",
        params: employeeId ? { employee_id: employeeId } : {},
      }),
      transformResponse: (res: any) => res?.data || [],
      providesTags: ["Manager"],
    }),
  }),
});

export const {
  useGetAssignedMenteesQuery,
  useGetManagerTasksQuery,
  useAssignTaskMutation,
  useUpdateTaskStatusMutation,
  useGetTechnicalParametersQuery,
  useCreateTechnicalParameterMutation,
  useGetTechnicalReviewsQuery,
  useSaveTechnicalReviewsMutation,
  useGetManagerEvidenceQuery,
  useReviewEvidenceDecisionMutation,
  useGiveManagerFeedbackMutation,
  useGetEmployeeFeedbacksQuery,
  useCommentOnEmployeeFeedbackMutation,
  useGetHistoricalReviewsQuery,
} = managerApi;
