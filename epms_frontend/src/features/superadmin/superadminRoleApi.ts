import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type {
  SuperAdminUser,
  SuperAdminRoleInfo,
  PermissionCatalogItem,
  PermissionMatrixData,
  UpdateRoleRequest,
  UpdateMatrixRoleRequest,
  UpdateFullMatrixRequest,
} from "./superadminRoleTypes";

export const superadminRoleApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSuperAdminUsers: builder.query<
      SuperAdminUser[],
      { search?: string; role?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "/superadmin/users/",
        params: params || {},
      }),
      transformResponse: (response: ApiResponse<SuperAdminUser[]> | any) =>
        response?.data ?? response ?? [],
      providesTags: ["SuperAdminUsers"],
    }),

    getSuperAdminRoles: builder.query<SuperAdminRoleInfo[], void>({
      query: () => "/superadmin/roles/",
      transformResponse: (response: ApiResponse<SuperAdminRoleInfo[]> | any) =>
        response?.data ?? response ?? [],
      providesTags: ["SuperAdminRoles"],
    }),

    getSuperAdminPermissionsMatrix: builder.query<PermissionMatrixData, void>({
      query: () => "/superadmin/permissions/matrix/",
      transformResponse: (response: ApiResponse<PermissionMatrixData> | any) =>
        response?.data ?? response ?? { matrix: {}, catalog: [] },
      providesTags: ["SuperAdminPermissionsMatrix"],
    }),

    getSuperAdminCatalog: builder.query<PermissionCatalogItem[], void>({
      query: () => "/superadmin/permissions/catalog/",
      transformResponse: (response: ApiResponse<PermissionCatalogItem[]> | any) =>
        response?.data ?? response ?? [],
    }),

    updateUserRole: builder.mutation<
      { code: number; message: string; data: any },
      UpdateRoleRequest
    >({
      query: ({ userId, role }) => ({
        url: `/superadmin/users/${userId}/role/`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: ["SuperAdminUsers", "SuperAdminRoles", "Employee", "Audit"],
    }),

    updateRolePermissions: builder.mutation<
      { code: number; message: string; data: any },
      UpdateMatrixRoleRequest
    >({
      query: (body) => ({
        url: "/superadmin/permissions/matrix/",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SuperAdminPermissionsMatrix", "SuperAdminRoles"],
    }),

    updateFullMatrix: builder.mutation<
      { code: number; message: string; data: any },
      UpdateFullMatrixRequest
    >({
      query: (body) => ({
        url: "/superadmin/permissions/matrix/",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SuperAdminPermissionsMatrix", "SuperAdminRoles"],
    }),

    resetPermissions: builder.mutation<
      { code: number; message: string; data: any },
      { role?: string } | void
    >({
      query: (body) => ({
        url: "/superadmin/permissions/matrix/reset/",
        method: "POST",
        body: body || {},
      }),
      invalidatesTags: ["SuperAdminPermissionsMatrix", "SuperAdminRoles"],
    }),
  }),
});

export const {
  useGetSuperAdminUsersQuery,
  useGetSuperAdminRolesQuery,
  useGetSuperAdminPermissionsMatrixQuery,
  useGetSuperAdminCatalogQuery,
  useUpdateUserRoleMutation,
  useUpdateRolePermissionsMutation,
  useUpdateFullMatrixMutation,
  useResetPermissionsMutation,
} = superadminRoleApi;
