export interface DepartmentRequest {
  departmentCode: string;
  departmentName: string;
}

export interface DepartmentResponse {
  id: number;
  departmentCode: string;
  departmentName: string;
  isActive: boolean;
}

export interface RoleRequest {
  roleName: string; // Using string to match RoleType enum name
}

export interface RoleResponse {
  roleId: number;
  roleName: string;
}

export interface JobLevelRequest {
  levelCode: string;
  levelName: string;
  levelRank: number;
}

export interface JobLevelResponse {
  levelId: number;
  levelCode: string;
  levelName: string;
  levelRank: number;
}

export interface PositionRequest {
  positionCode: string;
  positionName: string;
  levelId: number;
}

export interface PositionResponse {
  positionId: number;
  positionCode: string;
  positionName: string;
  levelId: number;
  levelName: string;
}

export interface AssignDepartmentRequest {
  currentDepartmentId: number;
  parentDepartmentId?: number;
}

export interface AssignRoleRequest {
  roleId: number;
}

export interface EmployeeDepartmentResponse {
  id: number;
  employeeId: number;
  currentDepartmentId: number;
  currentDepartmentName: string;
  parentDepartmentId?: number;
  parentDepartmentName?: string;
  isCurrent: boolean;
  createdAt: string; // ISO string
}

export interface PermissionRequest {
  permissionName: string;
}

export interface PermissionResponse {
  permissionId: number;
  permissionName: string;
}

export interface AssignPermissionRequest {
  roleId: number;
  levelId: number;
  permissionId: number;
}

export interface RoleLevelPermissionResponse {
  id: number;
  roleId: number;
  roleName: string;
  levelId: number;
  levelName: string;
  permissionId: number;
  permissionName: string;
}

export interface TeamRequest {
  teamName: string;
  departmentId: string | number;
  managerId?: string | number;
}

export interface TeamResponse {
  teamId: string | number;
  id?: string | number;
  teamName: string;
  departmentName: string;
  departmentId: string | number;
  memberCount?: number;
  managerName?: string | null;
  description?: string;
}

export interface TeamAssignmentRequest {
  employeeId: string | number;
  teamId: string | number;
  isPrimary?: boolean;
}

export interface TeamMemberResponse {
  employeeId: string | number;
  staffName: string;
  employeeCode?: string;
  positionName: string | null;
  isPrimary: boolean;
  joinedAt?: string;
}

export interface RoleLevelMapping {
  roleId: number;
  levelId: number;
  permissionIds: number[];
}

export interface PermissionMatrixResponse {
  roles: RoleResponse[];
  levels: JobLevelResponse[];
  permissions: PermissionResponse[];
  matrix: RoleLevelMapping[];
}

export interface UpdatePermissionMatrixRequest {
  roleId: number;
  levelId: number;
  permissionIds: number[];
}


