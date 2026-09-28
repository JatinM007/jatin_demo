import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { SystemRecord, SystemRecordView } from "./systemRecordTypes";

export const systemRecordApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSystemRecords: builder.query<SystemRecord[], { view: SystemRecordView; limit: number }>({
      query: ({ view, limit }) => ({
        url: "/superadmin/records/",
        params: { view, limit },
      }),
      transformResponse: (response: ApiResponse<SystemRecord[]> | SystemRecord[]) =>
        Array.isArray(response) ? response : response.data,
    }),
  }),
});

export const { useGetSystemRecordsQuery } = systemRecordApi;