import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  useCreateEmployeeMutation,
  useGetEmployeeByIdQuery,
  useUpdateEmployeeMutation,
  useGetEmployeesQuery,
  useUploadProfileImageMutation,
} from "../../features/employee/employeeapi";
import { useGetPositionsQuery } from "../../features/org/positionApi";
import { useGetRolesQuery } from "../../features/org/roleApi";
import { useGetActiveDepartmentsQuery } from "../../features/org/departmentApi";
import type {
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  Gender,
  MaritalStatus,
  EmployeeStatus,
} from "../../features/employee/employeeTypes";
import { CustomDateInput } from "../../components/common/CustomDateInput";

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8",
  border: "0.5px solid #E0E2E8",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 13,
  color: "#111827",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: "#9EA3B0",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 5,
};
const sectionStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "0.5px solid #E4E6EC",
  borderRadius: 12,
  padding: "18px 20px",
};

const EmployeeForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: employeeData, isLoading: isLoadingEmployee } =
    useGetEmployeeByIdQuery(id as any, { skip: !isEdit });
  const { data: roles } = useGetRolesQuery();
  const { data: departments } = useGetActiveDepartmentsQuery();
  const { data: employeesData } = useGetEmployeesQuery({ page: 0, size: 1000 });
  const employees = employeesData?.content || [];

  const [createEmployee, { isLoading: isCreating }] =
    useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] =
    useUpdateEmployeeMutation();
  const [uploadProfileImage, { isLoading: isUploading }] =
    useUploadProfileImageMutation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<
    Partial<CreateEmployeeRequest & UpdateEmployeeRequest>
  >({
    staffName: "",
    otherName: "",
    email: "",
    phoneNo: "",
    positionId: 0,
    roleId: 0,
    parentDepartmentId: "",
    currentDepartmentId: "",
    directManagerId: undefined,
    gender: undefined,
    dateOfBirth: "",
    salary: undefined,
    currency: "INR",
    profileImage: "",
    race: "",
    religion: "",
    birthPlace: "",
    contactAddress: "",
    permanentAddress: "",
    maritalStatus: undefined,
    spouseName: "",
    fatherName: "",
    dateOfAppointment: "",
    dateOfConfirmation: "",
    dateOfPromotion: "",
    status: undefined,
  });

  const availableManagers = useMemo(() => {
    return employees.filter((emp) => {
      // Exclude self if editing
      if (isEdit && String(emp.id) === String(id)) return false;
      const isManager = emp.roles?.some((r) =>
        r.toUpperCase().includes("MANAGER") || r.toUpperCase().includes("ADMIN")
      );
      const isManagerTitle =
        (emp.positionName || "").toLowerCase().includes("manager") ||
        (emp.levelName || "").toLowerCase().includes("manager") ||
        (emp.levelName || "").toLowerCase().includes("lead");
      return isManager || isManagerTitle || true;
    });
  }, [employees, isEdit, id]);

  const [selectedPositionLevel, setSelectedPositionLevel] = useState("");
  const { data: positions } = useGetPositionsQuery();

  useEffect(() => {
    if (isEdit && employeeData) {
      setFormData((prev) => ({
        ...prev,
        ...employeeData,
        currentDepartmentId: employeeData.currentDepartmentId || "",
        parentDepartmentId: employeeData.parentDepartmentId || "",
        directManagerId: employeeData.directManagerId || undefined,
        positionId: employeeData.positionId || 0,
        currency: employeeData.currency || "INR",
      }));
      setSelectedPositionLevel(employeeData.levelName);
    }
  }, [isEdit, employeeData, positions, departments]);

  const handlePositionChange = (posId: number) => {
    const pos = positions?.find((p) => p.positionId === posId);
    if (pos) {
      setFormData((prev) => ({ ...prev, positionId: posId }));
      setSelectedPositionLevel(pos.levelName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let targetId: any = id;
      const cleanedData = {
        ...formData,
        salary: (formData.salary as any) === "" ? undefined : formData.salary,
        currentDepartmentId: formData.currentDepartmentId || undefined,
        parentDepartmentId: formData.parentDepartmentId || formData.currentDepartmentId || undefined,
        directManagerId: formData.directManagerId || undefined,
      };

      if (isEdit) {
        await updateEmployee({
          id: id as any,
          body: cleanedData as UpdateEmployeeRequest,
        }).unwrap();
        toast.success("Staff profile updated successfully!");
      } else {
        const response = await createEmployee(
          cleanedData as CreateEmployeeRequest,
        ).unwrap();
        targetId = response.id;
        toast.success("Staff member registered successfully!");
      }
      if (selectedFile && targetId) {
        try {
          await uploadProfileImage({
            id: targetId,
            file: selectedFile,
          }).unwrap();
        } catch {
          // ignore optional image upload errors
        }
      }
      navigate("/employees");
    } catch (err: any) {
      console.error("Failed to save employee", err);
      const errMsg =
        err?.data?.detail ||
        err?.data?.message ||
        err?.message ||
        "Failed to save employee. Please check all required fields.";
      toast.error(errMsg);
    }
  };

  if (isEdit && isLoadingEmployee) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          fontSize: 13,
          color: "#9EA3B0",
        }}
      >
        Loading employee details...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>
          {isEdit ? "Edit Staff Member" : "Register New Staff Member"}
        </h1>
        <p style={{ fontSize: 12, color: "#9EA3B0", marginTop: 2 }}>
          {isEdit
            ? "Update the employee's comprehensive profile and organizational details."
            : "Fill in the required information to onboard a new employee to the system."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <section style={sectionStyle}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#111827",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg
              style={{ width: 16, height: 16, color: "#1A56DB", flexShrink: 0 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Basic Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                required
                style={inputStyle}
                placeholder="e.g. Rahul Sharma"
                value={formData.staffName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, staffName: e.target.value })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Other Name / Nickname</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Optional"
                value={formData.otherName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, otherName: e.target.value })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Corporate Email Address *</label>
              <input
                type="email"
                required
                style={inputStyle}
                placeholder="name@dailoqa.com"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Profile Image</label>
              <input
                type="file"
                accept="image/*"
                style={inputStyle}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0)
                    setSelectedFile(e.target.files[0]);
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="text"
                required
                style={inputStyle}
                placeholder="+91 98765 43210"
                value={formData.phoneNo || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNo: e.target.value })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Gender *</label>
              <select
                required
                style={inputStyle}
                value={formData.gender || ""}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as Gender })
                }
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <CustomDateInput
                style={inputStyle}
                value={formData.dateOfBirth || ""}
                onChange={(val) =>
                  setFormData({ ...formData, dateOfBirth: val })
                }
              />
            </div>
          </div>
        </section>

        {/* Organizational Role */}
        <section style={sectionStyle}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#111827",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg
              style={{ width: 16, height: 16, color: "#1A56DB", flexShrink: 0 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            Organizational Role & Hierarchy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>Position Designation *</label>
              <select
                required
                style={inputStyle}
                value={formData.positionId || ""}
                onChange={(e) => handlePositionChange(Number(e.target.value))}
              >
                <option value="">Select Position</option>
                {positions?.map((pos) => (
                  <option key={pos.positionId} value={pos.positionId}>
                    {pos.positionName} ({pos.positionCode})
                  </option>
                ))}
              </select>
              {selectedPositionLevel && (
                <p style={{ fontSize: 11, color: "#1A56DB", marginTop: 4 }}>
                  Seniority Level: <strong>{selectedPositionLevel}</strong>
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Current Department (ERP) *</label>
              <select
                required
                style={inputStyle}
                value={formData.currentDepartmentId ? String(formData.currentDepartmentId) : ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentDepartmentId: e.target.value,
                    parentDepartmentId: formData.parentDepartmentId || e.target.value,
                  })
                }
              >
                <option value="">Select Current Department</option>
                {departments?.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.departmentName} ({dept.departmentCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Parent Department (Banking) *</label>
              <select
                required
                style={inputStyle}
                value={formData.parentDepartmentId ? String(formData.parentDepartmentId) : ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parentDepartmentId: e.target.value,
                  })
                }
              >
                <option value="">Select Parent Department</option>
                {departments?.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.departmentName} ({dept.departmentCode})
                  </option>
                ))}
              </select>
            </div>

            {!isEdit && (
              <div>
                <label style={labelStyle}>System Role *</label>
                <select
                  required
                  style={inputStyle}
                  value={formData.roleId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, roleId: Number(e.target.value) })
                  }
                >
                  <option value="">Select Primary Role</option>
                  {roles?.map((role) => (
                    <option key={role.roleId} value={role.roleId}>
                      {role.roleName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={labelStyle}>Direct Manager / Reporting Lead</label>
              <select
                style={inputStyle}
                value={formData.directManagerId ? String(formData.directManagerId) : ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    directManagerId: e.target.value ? e.target.value : undefined,
                  })
                }
              >
                <option value="">No Direct Manager (Self-Managed)</option>
                {availableManagers?.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.staffName} ({emp.employeeCode}) — {emp.positionName || emp.currentDepartmentName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Salary Base (INR / ₹)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold text-xs">₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    style={{ ...inputStyle, paddingLeft: 22, textAlign: "right" }}
                    value={
                      formData.salary === undefined ||
                      formData.salary === null ||
                      (formData.salary as any) === ""
                        ? ""
                        : formData.salary
                    }
                    onKeyDown={(e) => {
                      if (e.key === "-") {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(
                        {
                          ...formData,
                          salary: val === "" ? "" : Math.max(0, Number(val)),
                        } as any,
                      );
                    }}
                  />
                </div>
                <select
                  style={{ ...inputStyle, width: 90 }}
                  value={formData.currency || "INR"}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            {isEdit && (
              <div>
                <label style={labelStyle}>Account Status</label>
                <select
                  style={inputStyle}
                  value={formData.status || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as EmployeeStatus,
                    })
                  }
                >
                  <option value="">Select Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Extended Details (edit only) */}
        {isEdit && (
          <section style={sectionStyle}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#111827",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                style={{ width: 16, height: 16, color: "#1A56DB", flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"
                />
              </svg>
              Extended Profile Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Contact Address</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: "none" }}
                  value={formData.contactAddress || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactAddress: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Permanent Address</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: "none" }}
                  value={formData.permanentAddress || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permanentAddress: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Marital Status</label>
                <select
                  style={inputStyle}
                  value={formData.maritalStatus || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maritalStatus: e.target.value as MaritalStatus,
                    })
                  }
                >
                  <option value="">Select Status</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Spouse Name</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.spouseName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, spouseName: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Father's Name</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.fatherName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fatherName: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Birth Place</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.birthPlace || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, birthPlace: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Date of Appointment</label>
                <CustomDateInput
                  style={inputStyle}
                  value={formData.dateOfAppointment || ""}
                  onChange={(val) =>
                    setFormData({ ...formData, dateOfAppointment: val })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Date of Confirmation</label>
                <CustomDateInput
                  style={inputStyle}
                  value={formData.dateOfConfirmation || ""}
                  onChange={(val) =>
                    setFormData({ ...formData, dateOfConfirmation: val })
                  }
                />
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/employees")}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 500,
              color: "#5A6070",
              background: "#F5F6F8",
              border: "0.5px solid #E4E6EC",
              borderRadius: 8,
              cursor: "pointer",
            }}
            className="hover:border-[#9EA3B0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating || isUploading}
            style={{
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 500,
              background: "#111827",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              opacity: isCreating || isUpdating || isUploading ? 0.5 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            className="hover:opacity-90 transition-opacity"
          >
            {isCreating || isUpdating || isUploading
              ? "Saving..."
              : isEdit
              ? "Update Employee"
              : "Register Employee"}
            {!(isCreating || isUpdating || isUploading) && (
              <svg
                style={{ width: 14, height: 14 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
