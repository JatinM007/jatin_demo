import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { DepartmentRequest, DepartmentResponse } from "./orgTypes";

export const departmentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDepartments: builder.query<DepartmentResponse[], void>({
      query: () => "/departments",
      transformResponse: (res: ApiResponse<DepartmentResponse[]>) => res.data,
      providesTags: ["Department"],
    }),

    getDepartmentById: builder.query<DepartmentResponse, number>({
      query: (id) => `/org/departments/${id}`,
      transformResponse: (res: ApiResponse<DepartmentResponse>) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Department", id }],
    }),

    createDepartment: builder.mutation<DepartmentResponse, DepartmentRequest>({
      query: (body) => ({
        url: "/departments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Department"],
    }),

    updateDepartment: builder.mutation<
      DepartmentResponse,
      { id: number; body: DepartmentRequest }
    >({
      query: ({ id, body }) => ({
        url: `/departments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Department", id },
        "Department",
      ],
    }),

    deleteDepartment: builder.mutation<void, number>({
      query: (id) => ({
        url: `/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Department"],
    }),

    getActiveDepartments: builder.query<DepartmentResponse[], void>({
      query: () => "/departments/active",
      transformResponse: (res: ApiResponse<DepartmentResponse[]>) => res.data,
      providesTags: ["Department"],
    }),

    getDepartmentHeadcount: builder.query<number, number>({
      query: (id) => `/departments/${id}/headcount`,
      transformResponse: (res: ApiResponse<number>) => res.data,
    }),

    addDepartmentMember: builder.mutation<
      any,
      { departmentId: string | number; employeeId: string | number }
    >({
      query: ({ departmentId, employeeId }) => ({
        url: `/departments/${departmentId}/members`,
        method: "POST",
        body: { employeeId, action: "add_member" },
      }),
      invalidatesTags: ["Department", "Employee"],
    }),

    assignDepartmentManager: builder.mutation<
      any,
      { departmentId: string | number; managerId: string | number }
    >({
      query: ({ departmentId, managerId }) => ({
        url: `/departments/${departmentId}/members`,
        method: "POST",
        body: { managerId, action: "assign_manager" },
      }),
      invalidatesTags: ["Department", "Employee"],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useGetActiveDepartmentsQuery,
  useGetDepartmentHeadcountQuery,
  useGetDepartmentByIdQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useAddDepartmentMemberMutation,
  useAssignDepartmentManagerMutation,
} = departmentApi;
