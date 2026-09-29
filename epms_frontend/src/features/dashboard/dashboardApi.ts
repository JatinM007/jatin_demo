import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { 
  HrDashboardResponse, 
  AdminDashboardResponse,
  EmployeeDashboardResponse,
  ManagerDashboardResponse,
  InternScorecardResponse,
  InternOverviewData,
  InternGoalItem,
  InternTaskItem,
  InternEvidenceItem,
  InternSelfAppraisalData,
  InternPublishedFeedbackData,
  InternAppraisalItem,
  InternFormItem,
  InternFormDetail,
  InternJourneyData
} from "./dashboardTypes";


export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getHrDashboard: builder.query<HrDashboardResponse, void>({
      query: () => "/dashboard/hr",
      transformResponse: (res: ApiResponse<HrDashboardResponse>) => res.data,
    }),
    getAdminDashboard: builder.query<AdminDashboardResponse, void>({
      query: () => "/dashboard/admin",
      transformResponse: (res: ApiResponse<AdminDashboardResponse>) => res.data,
    }),
    getEmployeeDashboard: builder.query<EmployeeDashboardResponse, void>({
      query: () => "/dashboard/employee",
      transformResponse: (res: ApiResponse<EmployeeDashboardResponse>) => res.data,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getManagerDashboard: builder.query<ManagerDashboardResponse, void>({
      query: () => "/dashboard/manager",
      transformResponse: (res: ApiResponse<ManagerDashboardResponse>) => res.data,
    }),

    // Comprehensive Intern Module Endpoints
    getInternOverview: builder.query<InternOverviewData, void>({
      query: () => "/intern/overview/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getInternJourney: builder.query<InternJourneyData, void>({
      query: () => "/intern/journey/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getInternScorecard: builder.query<InternScorecardResponse, void>({
      query: () => "/intern/scorecard/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet", "Appraisal"],
    }),
    getInternGoals: builder.query<InternGoalItem[], void>({
      query: () => "/intern/my-goals/",
      transformResponse: (res: any) => {
        const raw = res?.data ?? res ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((g: any) => ({
          ...g,
          dueDate: g.dueDate || g.due_date || null,
          cycleName: g.cycleName || g.cycle_name || 'Current Term',
          progress: Number(g.progress ?? g.completion_percentage ?? g.current_progress ?? 0),
          completionPercentage: Number(g.completionPercentage ?? g.completion_percentage ?? g.progress ?? 0),
          weightage: Number(g.weightage ?? g.weight ?? g.weight_percent ?? 20),
          assignedByName: g.assignedByName || g.assigned_by_name || 'HR Admin',
          comments: g.comments || [],
        }));
      },
      providesTags: ["GoalSet"],
    }),
    assignGoal: builder.mutation<any, { employee: string; title: string; description?: string; due_date?: string; priority?: string; cycle?: string }>({
      query: (body) => ({
        url: "/goals/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Employee", "Profile"],
    }),
    getAllAssignedGoals: builder.query<any[], void>({
      query: () => "/goals/",
      transformResponse: (res: any) => {
        const raw = res?.results ?? res?.data ?? res ?? [];
        return Array.isArray(raw) ? raw : [];
      },
      providesTags: ["GoalSet"],
    }),
    updateInternGoalProgress: builder.mutation<any, { id: string; progress: number; comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/my-goals/${id}/progress/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Appraisal", "Profile"],
    }),
    addInternGoalComment: builder.mutation<any, { id: string; comment: string; parentId?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/my-goals/${id}/comments/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet"],
    }),
    getInternTasks: builder.query<InternTaskItem[], void>({
      query: () => "/intern/tasks/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet", "Profile"],
    }),
    completeInternTask: builder.mutation<any, { id: string; isCompleted: boolean; completedAt?: string; hoursSpent?: number; completionNotes?: string; artifactUrl?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/tasks/${id}/complete/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Profile"],
    }),
    getInternEvidence: builder.query<InternEvidenceItem[], void>({
      query: () => "/intern/evidence/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet"],
    }),
    submitInternEvidence: builder.mutation<any, FormData | { goalId?: string; title: string; description?: string; externalUrl?: string }>({
      query: (body) => ({
        url: "/intern/evidence/submit/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet"],
    }),
    getInternSelfAppraisal: builder.query<InternSelfAppraisalData, void>({
      query: () => "/intern/self-appraisal/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    submitInternSelfAppraisal: builder.mutation<any, { selfRating?: number; achievements?: string; challenges?: string; skillsAcquired?: string; mentorshipNeeds?: string; reflectionSummary?: string; isDraft?: boolean }>({
      query: (body) => ({
        url: "/intern/self-appraisal/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal", "Profile"],
    }),
    getInternPublishedFeedback: builder.query<InternPublishedFeedbackData, void>({
      query: () => "/intern/published-feedback/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    replyToMentorFeedback: builder.mutation<any, { replyText: string }>({
      query: (body) => ({
        url: "/intern/published-feedback/reply/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal"],
    }),
    getInternAppraisals: builder.query<InternAppraisalItem[], void>({
      query: () => "/intern/my-appraisals/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),

    // HR Flexible Scoring Parameters & Weightages
    getScoringParameters: builder.query<any, string | void>({
      query: (cycleId) => cycleId ? `/performance/cycles/${cycleId}/scoring-parameters/` : "/performance/cycles/scoring-parameters/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    updateScoringParameters: builder.mutation<any, { cycleId?: string; componentWeights?: any; evaluationParameters?: any[]; deleteParameterIds?: string[]; recalculate?: boolean }>({
      query: ({ cycleId, ...body }) => ({
        url: cycleId ? `/performance/cycles/${cycleId}/scoring-parameters/` : "/performance/cycles/scoring-parameters/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal", "Profile", "GoalSet"],
    }),

    // HR-Published Forms for Interns
    getInternForms: builder.query<InternFormItem[], void>({
      query: () => "/intern/forms/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    getInternFormDetail: builder.query<InternFormDetail, string>({
      query: (formId) => `/intern/forms/${formId}/`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    submitInternForm: builder.mutation<any, { formId: string; is_submitted: boolean; answers: Record<string, any> }>({
      query: ({ formId, ...body }) => ({
        url: `/intern/forms/${formId}/submit/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal", "Profile"],
    }),

    // Notification Endpoints
    getUnreadNotificationsCount: builder.query<{ unread_count: number }, void>({
      query: () => "/notifications/unread-count/",
      transformResponse: (res: any) => res?.data ?? res,
    }),
    markNotificationRead: builder.mutation<any, string>({
      query: (id) => ({
        url: `/notifications/${id}/mark_read/`,
        method: "POST",
      }),
    }),
    markAllNotificationsRead: builder.mutation<any, void>({
      query: () => ({
        url: "/notifications/read-all/",
        method: "POST",
      }),
    }),
  }),
});

export const { 
  useGetHrDashboardQuery, 
  useGetAdminDashboardQuery,
  useGetEmployeeDashboardQuery,
  useGetManagerDashboardQuery,
  useGetInternOverviewQuery,
  useGetInternJourneyQuery,
  useGetInternScorecardQuery,
  useGetInternGoalsQuery,
  useAssignGoalMutation,
  useGetAllAssignedGoalsQuery,
  useUpdateInternGoalProgressMutation,
  useAddInternGoalCommentMutation,
  useGetInternTasksQuery,
  useCompleteInternTaskMutation,
  useGetInternEvidenceQuery,
  useSubmitInternEvidenceMutation,
  useGetInternSelfAppraisalQuery,
  useSubmitInternSelfAppraisalMutation,
  useGetInternPublishedFeedbackQuery,
  useReplyToMentorFeedbackMutation,
  useGetInternAppraisalsQuery,
  useGetScoringParametersQuery,
  useUpdateScoringParametersMutation,
  useGetInternFormsQuery,
  useGetInternFormDetailQuery,
  useSubmitInternFormMutation,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = dashboardApi;
