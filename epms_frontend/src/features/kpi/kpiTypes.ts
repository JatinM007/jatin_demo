// ==================== Enums ====================
export type KpiGoalStatus = 'DRAFT' | 'APPROVED' | 'LOCKED' | 'SCORED' | 'ARCHIVED';

export type KpiItemStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// ==================== Category ====================
export interface KpiCategory {
  id: number | string;
  name?: string;           // Depends on entity field
  categoryName?: string;   // Alternative name
}

// ==================== KPI Library ====================
export interface KpiLibraryDetailRequest {
  goalTitle: string;
  unit?: string;
  targetValue: number;
  weightPercent: number;
  categoryId: number | string;
  isCompliance?: boolean;
}

export interface KpiLibraryRequest {
  title: string;
  description?: string;
  positionId: number | string;
  targetLevelId?: number | string;
  details: KpiLibraryDetailRequest[];
}

export interface KpiLibraryDetailResponse {
  id: number | string;
  goalTitle: string;
  unit?: string;
  targetValue: number;
  weightPercent: number;
  isActive: boolean;
  categoryId?: number | string;
  categoryName?: string;
  isCompliance?: boolean;
}

export interface KpiLibraryResponse {
  id: number | string;
  title: string;
  description?: string;
  positionId?: number | string;
  positionName: string;
  targetLevelId?: number | string;
  levelName?: string;
  isActive: boolean;
  updatedAt?: string;
  details: KpiLibraryDetailResponse[];
}

export interface KpiImportResult {
  totalSectionsFound: number;
  successfulImports: number;
  failedImports: number;
  errors: string[];
}

// ==================== Goal Assignment ====================
export interface GoalAssignmentRequest {
  employeeId: number | string;
  libraryId?: number | string;
  appraisalCycleId: number | string;
  overwriteExisting?: boolean;
}

export interface BulkGoalAssignmentRequest {
  employeeIds: (number | string)[];
  libraryId: number | string;
  appraisalCycleId: number | string;
  overwriteExisting?: boolean;
}

export interface AssignmentResult {
  employeeId: number | string;
  employeeName: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  reason: string;
}

export interface BulkAssignmentResponse {
  totalProcessed: number;
  successfulCount: number;
  failedCount: number;
  skippedCount: number;
  results: AssignmentResult[];
}

// ==================== Goal Items ====================
export interface KpiGoalItemRequest {
  title: string;
  unit: string;
  targetValue: number;
  weightPercent: number;
  categoryId: number | string;
  isCompliance?: boolean;
}

export interface GoalItemResponse {
  id: number | string;
  title: string;
  description?: string;
  targetValue: number;
  unit?: string;
  weightPercent: number;
  status: KpiItemStatus;
  currentProgress?: number;
  categoryId?: number | string;
  categoryName?: string;
  scorePercent?: number;
  weightedScore?: number;
  isCompliance?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}


export interface KpiGoalBulkUpdateRequest {
  items: {
    id: number | string;
    title: string;
    unit: string;
    targetValue: number;
    weightPercent: number;
    categoryId: number | string;
  }[];
}

// ==================== Goal Set ====================
export interface GoalSetResponse {
  id: number | string;
  employeeId: number | string;
  employeeName: string;
  managerId?: number | string;
  managerName?: string;
  assignedBy?: number | string;
  assignedByName?: string;
  assignedAt?: string;
  appraisalCycleId: number | string;
  appraisalCycleName?: string;
  status: KpiGoalStatus;
  version?: number;
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  lockedAt?: string;
  items: GoalItemResponse[];
  score?: number;
  kpiItems?: GoalItemResponse[];
}

// ==================== Progress ====================
export interface ProgressRequest {
  goalItemId: number | string;
  actualValue: number;
  progressPercent: number;
  evidenceNote?: string;
}

export interface KpiProgressHistory {
  id: number | string;
  goalItemId: number | string;
  goalTitle: string;
  actualValue: number;
  progressPercent: number;
  evidenceNote?: string;
  updatedAt: string;
}

// ==================== Revision ====================
export interface KpiRevisionRequest {
  changeReason: string;
  updatedDetails: KpiLibraryDetailRequest;
}

// ==================== Score ====================
export interface KpiScoreResponse {
  id: number | string;
  employeeId: number | string;
  employeeName: string;
  cycleId: number | string;
  totalAchievementPercent?: number;
  weightedScore: number;
  calculatedAt: string;
}

// ==================== History Log ====================
export interface KpiHistoryLog {
  id: number | string;
  employeeId: number | string;
  oldVersionId?: number | string;
  newVersionId?: number | string;
  action: string;
  changeReason: string;
  changeDetails?: string;
  changedBy: number;
  createdAt: string;
}

// ==================== KPI Summary Report ====================
export interface GoalItemReportDTO {
  title: string;
  unit: string;
  targetValue: number;
  actualValue: number;
  weightPercent: number;
  scorePercent: number;
  weightedScore: number;
  status: string;
}

export interface KpiPhaseReportDTO {
  phaseNumber: number;
  startDate: string;
  endDate: string;
  days: number;
  weight: number;
  score: number;
  changeReason: string;
  status: string;
}

export interface CycleSummaryDTO {
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  kpiScore: number;
  performanceCategory: string;
  totalItems: number;
  achievedItems: number;
  goalItems: GoalItemReportDTO[];
  phases: KpiPhaseReportDTO[];
}
export interface KpiSummaryReportDTO {
  employeeName: string;
  departmentName: string;
  positionName: string;
  generatedDate: string;
  averageScore: number;
  overallCategory: string;
  cycles: CycleSummaryDTO[];
}

export interface KpiActualsEmployeeRowDTO {
  employeeId: number;
  employeeName: string;
  departmentName: string;
  positionName: string;
  totalKpiItems: number;
  overdueItemCount: number;
  lastUpdatedAt: string;
  daysSinceLastUpdate: number;
  isOverdue: boolean;
  status: string;
}

export interface KpiActualsCompletionReportDTO {
  generatedAt: string;
  cycleId: number;
  cycleName: string;
  thresholdDays: number;
  totalEmployees: number;
  overdueEmployeeCount: number;
  upToDateEmployeeCount: number;
  noGoalEmployeeCount: number;
  overdueRate: number;
  employeeRows: KpiActualsEmployeeRowDTO[];
}
