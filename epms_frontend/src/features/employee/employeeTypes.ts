export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export type Gender = "M" | "F";

export type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";

export type EmployeeStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "TERMINATED";

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CreateEmployeeRequest {
  staffName: string;
  otherName?: string;
  email: string;
  phoneNo: string;
  profileImage?: string;
  stateCode?: number;
  township?: string;
  nrcType?: string;
  number?: string;
  gender?: Gender;
  dateOfBirth?: string; // ISO string (yyyy-MM-dd)
  positionId: number;
  salary?: number;
  currency?: string;
  roleId: number;
  parentDepartmentId?: number | string;
  currentDepartmentId?: number | string;
  directManagerId?: number | string;
}

export interface EmployeeImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: string[];
}

export interface SetPasswordRequest {
  token: string;
  password: string;
}

export interface UpdateEmployeeRequest {
  staffName: string;
  otherName?: string;
  stateCode?: number;
  township?: string;
  nrcType?: string;
  number?: string;

  gender?: Gender;
  race?: string;
  religion?: string;

  dateOfBirth?: string;
  birthPlace?: string;

  contactAddress?: string;
  permanentAddress?: string;

  email?: string;
  phoneNo?: string;
  profileImage?: string;

  maritalStatus?: MaritalStatus;
  spouseName?: string;
  fatherName?: string;

  positionId: number;

  salary?: number;
  currency?: string;

  dateOfAppointment?: string;
  dateOfConfirmation?: string;
  dateOfPromotion?: string;

  status?: EmployeeStatus;
  isActive?: boolean;

  roleIds?: number[];
  directManagerId?: number;
}

export interface UpdateProfileRequest {
  staffName: string;
  otherName?: string;

  contactAddress?: string;
  permanentAddress?: string;

  email?: string;
  phoneNo?: string;
  profileImage?: string;

  maritalStatus?: MaritalStatus;
  spouseName?: string;
  fatherName?: string;
}

export interface EmployeeResponse {
  id: number;
  employeeCode: string;
  staffName: string;
  otherName?: string;
  email: string;
  phoneNo: string;
  profileImage?: string;

  stateCode?: number;
  township?: string;
  nrcType?: string;
  number?: string;

  gender?: Gender;
  race?: string;
  religion?: string;
  dateOfBirth?: string;
  birthPlace?: string;

  contactAddress?: string;
  permanentAddress?: string;

  maritalStatus?: MaritalStatus;
  spouseName?: string;
  fatherName?: string;

  positionName: string;
  positionId: number;
  levelName: string;
  levelRank: number;

  currentDepartmentName?: string;
  currentDepartmentId?: number;
  parentDepartmentName?: string;
  parentDepartmentId?: number;

  salary?: number;
  currency?: string;

  dateOfAppointment?: string;
  dateOfConfirmation?: string;
  dateOfPromotion?: string;

  status?: EmployeeStatus;
  isActive?: boolean;
  accountLocked?: boolean;

  directManagerId?: number;
  directManagerName?: string;
  roles: string[];
  permissions: string[];
}
