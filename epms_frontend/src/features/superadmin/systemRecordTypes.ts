export type SystemRecordView = "SYSTEM" | "UPDATED" | "ATTENTION";

export interface SystemRecord {
  recordType: "EMPLOYEE" | "APPRAISAL" | "APPRAISAL_CYCLE";
  recordId: string;
  title: string;
  subtitle?: string | null;
  status: string;
  updatedAt?: string | null;
  attentionRequired: boolean;
  attentionReason?: string | null;
  managementPath: string;
}