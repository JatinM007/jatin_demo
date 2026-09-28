export interface SuperAdminUser {
  id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'HR' | 'MANAGER' | 'INTERN' | string;
  isActive: boolean;
  isSuperUser: boolean;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  phone: string;
  dateJoined: string | null;
  effectivePermissionsCount: number;
}

export interface SuperAdminRoleInfo {
  role: string;
  label: string;
  userCount: number;
  activeUserCount: number;
  permissionsCount: number;
  permissions: string[];
}

export interface PermissionCatalogItem {
  code: string;
  name: string;
  category: string;
  description: string;
}

export interface PermissionMatrixData {
  matrix: Record<string, string[]>;
  catalog: PermissionCatalogItem[];
  roles?: Array<{ role: string; label: string }>;
}

export interface UpdateRoleRequest {
  userId: string;
  role: string;
}

export interface UpdateMatrixRoleRequest {
  role: string;
  permissions: string[];
}

export interface UpdateFullMatrixRequest {
  matrix: Record<string, string[]>;
}
