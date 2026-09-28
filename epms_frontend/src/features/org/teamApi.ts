import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { TeamRequest, TeamResponse, TeamAssignmentRequest, TeamMemberResponse } from "./orgTypes";

export const teamApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTeams: builder.query<TeamResponse[], void>({
      query: () => "/teams",
      transformResponse: (res: ApiResponse<TeamResponse[]>) => res.data,
      providesTags: ["Teams"],
    }),
    createTeam: builder.mutation<any, TeamRequest>({
      query: (body) => ({
        url: "/teams",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Teams"],
    }),
    assignEmployee: builder.mutation<any, TeamAssignmentRequest>({
      query: (body) => ({
        url: "/teams/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeamMembers", "Teams"],
    }),
    getTeamMembers: builder.query<TeamMemberResponse[], string | number>({
      query: (teamId) => `/teams/${teamId}/members`,
      transformResponse: (res: ApiResponse<TeamMemberResponse[]>) => res.data,
      providesTags: ["TeamMembers"],
    }),
    getEmployeeTeams: builder.query<TeamResponse[], string | number>({
      query: (employeeId) => `/teams/employee/${employeeId}`,
      transformResponse: (res: ApiResponse<TeamResponse[]>) => res.data,
      providesTags: ["EmployeeTeams"],
    }),
    updateTeam: builder.mutation<any, { id: string | number; body: TeamRequest }>({
      query: ({ id, body }) => ({
        url: `/teams/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Teams"],
    }),
    deleteTeam: builder.mutation<any, string | number>({
      query: (id) => ({
        url: `/teams/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teams", "TeamMembers"],
    }),
    removeTeamMember: builder.mutation<any, { teamId: string | number; employeeId: string | number }>({
      query: ({ teamId, employeeId }) => ({
        url: `/teams/${teamId}/members/${employeeId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TeamMembers", "Teams"],
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useRemoveTeamMemberMutation,
  useAssignEmployeeMutation,
  useGetTeamMembersQuery,
  useGetEmployeeTeamsQuery,
} = teamApi;
