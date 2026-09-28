import { api } from "../../services/api"
import type { ApiResponse } from "../../services/ApiResponse";
import type {
  EmployeeResponse,
  PagedResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  SetPasswordRequest,
  EmployeeImportResult,
} from "./employeeTypes";

// Extend base API
export const employeeApi = api.injectEndpoints({
  endpoints: (builder) => ({

    getAllEmployees: builder.query<EmployeeResponse[], void>({
      query: () => `/emp/all`,
      transformResponse: (response: ApiResponse<EmployeeResponse[]>) => response.data,
      providesTags: ["Employee"],
    }),
    // getEmployees: builder.query<PagedResponse<EmployeeResponse>, { page: number; size: number }>({
    //   query: ({ page, size }) => `/emp?page=${page}&size=${size}`,
    getEmployees: builder.query<PagedResponse<EmployeeResponse>, { page: number; size: number; excludeSelf?: boolean }>({
      query: ({ page, size, excludeSelf }) => `/emp?page=${page}&size=${size}${excludeSelf ? '&excludeSelf=true' : ''}`,
      transformResponse: (response: ApiResponse<PagedResponse<EmployeeResponse>>) =>
        response.data,
      providesTags: ["Employee"],
    }),

    searchEmployees: builder.query<PagedResponse<EmployeeResponse>, { query?: string; departmentId?: string; teamId?: string; page: number; size: number; excludeSelf?: boolean; sortBy?: string }>({
      query: ({ query, departmentId, teamId, page, size, excludeSelf, sortBy }) => {
        let url = `/emp/search?page=${page}&size=${size}`;
        if (query) url += `&query=${encodeURIComponent(query)}`;
        if (departmentId) url += `&departmentId=${departmentId}`;
        if (teamId) url += `&teamId=${teamId}`;
        if (excludeSelf) url += `&excludeSelf=true`;
        if (sortBy) url += `&sortBy=${encodeURIComponent(sortBy)}`;
        return url;
      },
      transformResponse: (response: ApiResponse<PagedResponse<EmployeeResponse>>) =>
        response.data,
      providesTags: ["Employee"],
    }),

    getDirectReports: builder.query<EmployeeResponse[], number | string>({
      query: (id) => `/emp/${id}/direct-reports`,
      transformResponse: (response: ApiResponse<EmployeeResponse[]>) =>
        response.data,
    }),

    getManager: builder.query<EmployeeResponse, number | string>({
      query: (id) => `/emp/${id}/manager`,
      transformResponse: (response: ApiResponse<EmployeeResponse>) =>
        response.data,
    }),

    getEmployeeById: builder.query<EmployeeResponse, number | string>({
      query: (id) => `/emp/${id}`,
      transformResponse: (response: ApiResponse<EmployeeResponse>) =>
        response.data,
      providesTags: (_result, _error, id) => [{ type: "Employee", id }],
    }),

    createEmployee: builder.mutation<
      EmployeeResponse,
      CreateEmployeeRequest
    >({
      query: (body) => ({
        url: "/emp",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<EmployeeResponse>) =>
        response.data,
      invalidatesTags: ["Employee"],
    }),

    importEmployees: builder.mutation<ApiResponse<EmployeeImportResult>, FormData>({
      query: (body) => ({
        url: "/emp/import",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Employee"],
    }),


    updateEmployee: builder.mutation<
      EmployeeResponse,
      { id: number; body: UpdateEmployeeRequest }
    >({
      query: ({ id, body }) => ({
        url: `/emp/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<EmployeeResponse>) =>
        response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Employee", id },
        "Employee",
      ],
    }),

    deleteEmployee: builder.mutation<void, number>({
      query: (id) => ({
        url: `/emp/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employee"],
    }),


    activateEmployee: builder.mutation<void, number>({
      query: (id) => ({
        url: `/emp/${id}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: ["Employee"],
    }),

    deactivateEmployee: builder.mutation<void, number>({
      query: (id) => ({
        url: `/emp/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: ["Employee"],
    }),

    getCurrentUser: builder.query<EmployeeResponse, void>({
      query: () => "/auth/me",
      transformResponse: (response: ApiResponse<EmployeeResponse>) =>
        response.data,
      providesTags: ["Profile"],
    }),


    updateProfile: builder.mutation<
      EmployeeResponse,
      UpdateProfileRequest
    >({
      query: (body) => ({
        url: `/emp/me/profile`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<EmployeeResponse>) =>
        response.data,
      invalidatesTags: ["Profile"],
    }),

    changePassword: builder.mutation<
      void,
      { id: number; body: ChangePasswordRequest }
    >({
      query: ({ id, body }) => ({
        url: `/emp/${id}/change-password`,
        method: "POST",
        body,
      }),
    }),

    setPassword: builder.mutation<
      void,
      SetPasswordRequest
    >({
      query: (body) => ({
        url: "/emp/set-password",
        method: "POST",
        body,
      }),
    }),

    uploadProfileImage: builder.mutation<
      ApiResponse<any>,
      { id: number; file: File }
    >({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/emp/me/profile`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Employee", id },
        "Employee",
        "Profile",
      ],
    }),

  }),
});

export const {
  useGetEmployeesQuery,
  useSearchEmployeesQuery,
  useGetDirectReportsQuery,
  useGetManagerQuery,
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useImportEmployeesMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useActivateEmployeeMutation,
  useDeactivateEmployeeMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useSetPasswordMutation,
  useGetAllEmployeesQuery,
  useUploadProfileImageMutation,
} = employeeApi;
