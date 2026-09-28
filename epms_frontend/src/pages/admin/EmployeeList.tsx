import {
  useSearchEmployeesQuery,
  useActivateEmployeeMutation,
  useDeactivateEmployeeMutation,
  useImportEmployeesMutation,
} from "../../features/employee/employeeapi";
import { useUnlockEmployeeMutation } from "../../features/auth/authApi";
import type { EmployeeImportResult } from "../../features/employee/employeeTypes";
import {
  useGetRolesQuery,
  useAssignRoleToEmployeeMutation,
  useRemoveRoleFromEmployeeMutation,
} from "../../features/org/roleApi";
import { useGetActiveDepartmentsQuery } from "../../features/org/departmentApi";
import { useGetTeamsQuery } from "../../features/org/teamApi";
import { useDownloadReportMutation } from "../../features/report/reportApi";
import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Eye,
  Building2,
  Download,
  Search,
  Settings2,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Can } from "../../components/Can";

const AVATAR_COLORS = [
  { bg: "#EEF3FD", text: "#0C447C" },
  { bg: "#EAF3DE", text: "#27500A" },
  { bg: "#FAEEDA", text: "#633806" },
  { bg: "#F1EFE8", text: "#444441" },
  { bg: "#FCEBEB", text: "#791F1F" },
];

const selectStyle: React.CSSProperties = {
  background: "#F5F6F8",
  border: "0.5px solid #E0E2E8",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  color: "#111827",
  fontFamily: "inherit",
  outline: "none",
};

const EmployeeList = () => {
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [selectedEmp, setSelectedEmp] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<EmployeeImportResult | null>(
    null,
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const {
    data: pagedData,
    isLoading,
    error,
  } = useSearchEmployeesQuery({
    query: searchQuery,
    departmentId: selectedDeptId,
    teamId: selectedTeamId,
    sortBy,
    page,
    size,
  });
  const employees = pagedData?.content;
  const { data: allRoles } = useGetRolesQuery();
  const { data: departments } = useGetActiveDepartmentsQuery();
  const { data: teams } = useGetTeamsQuery();
  const [downloadReport, { isLoading: isDownloading }] =
    useDownloadReportMutation();
  const [activateEmployee] = useActivateEmployeeMutation();
  const [deactivateEmployee] = useDeactivateEmployeeMutation();
  const [unlockEmployee] = useUnlockEmployeeMutation();
  const [importEmployees, { isLoading: isImporting }] =
    useImportEmployeesMutation();
  const [assignRole] = useAssignRoleToEmployeeMutation();
  const [removeRole] = useRemoveRoleFromEmployeeMutation();

  const handleDownload = async (format: "pdf" | "xlsx") => {
    try {
      await downloadReport({
        endpoint: "employees",
        fileName: `Employee_List.${format}`,
        params: {
          format,
          ...(selectedDeptId && { departmentId: selectedDeptId }),
          ...(selectedTeamId && { teamId: selectedTeamId }),
        },
      }).unwrap();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleRoleToggle = async (
    empId: number,
    roleId: number,
    hasRole: boolean,
  ) => {
    try {
      if (hasRole) await removeRole({ employeeId: empId, roleId }).unwrap();
      else await assignRole({ employeeId: empId, body: { roleId } }).unwrap();
    } catch (err) {
      console.error("Failed to update role", err);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
    setIsDragging(false);
    if (importInputRef.current) importInputRef.current.value = "";
  };

  const closeImport = () => {
    setIsImportOpen(false);
    resetImport();
  };

  const setSelectedImportFile = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setImportError("Only .xlsx files are supported.");
      setImportFile(null);
      return;
    }
    setImportFile(file);
    setImportError(null);
    setImportResult(null);
  };

  const handleImportUpload = async () => {
    if (!importFile) return;

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const response = await importEmployees(formData).unwrap();
      setImportResult(response.data);
      setImportError(null);
      setPage(0);
    } catch (err: any) {
      const errors = err?.data?.errors;
      if (Array.isArray(errors)) {
        setImportResult({
          totalRows: 0,
          successfulImports: 0,
          failedImports: errors.length,
          errors,
        });
      } else {
        setImportError("Employee import failed.");
      }
    }
  };

  if (isLoading)
    return (
      <div
        className="py-16 text-center"
        style={{ color: "#9EA3B0", fontSize: 13 }}
      >
        Loading employees…
      </div>
    );
  if (error)
    return (
      <div
        className="py-16 text-center"
        style={{ color: "#791F1F", fontSize: 13 }}
      >
        Error loading employees.
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>
            Employees
          </h1>
          <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>
            Manage employee accounts, roles, and status.
          </p>
        </div>
        <Can permission="EMPLOYEE_CREATE">
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 transition-colors"
              style={{
                background: "#FFFFFF",
                color: "#111827",
                border: "0.5px solid #E4E6EC",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Upload size={14} aria-hidden="true" /> Import Excel
            </button>
            <Link
              to="/employees/new"
              className="inline-flex items-center gap-2 transition-colors"
              style={{
                background: "#1A56DB",
                color: "#FFFFFF",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1648C0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#1A56DB";
              }}
            >
              <Plus size={14} aria-hidden="true" /> Add Employee
            </Link>
          </div>
        </Can>
      </div>

      {/* Filters & export bar */}
      <div
        style={{
          background: "#FFFFFF",
          border: "0.5px solid #E4E6EC",
          borderRadius: 12,
          padding: "12px 16px",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex items-center">
              <Search
                size={13}
                className="absolute left-3 pointer-events-none"
                style={{ color: "#9EA3B0" }}
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search Employee…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                style={{ ...selectStyle, paddingLeft: 30, width: 180 }}
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setSelectedTeamId("");
                setPage(0);
              }}
              style={selectStyle}
            >
              <option value="">All departments</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.departmentName}
                </option>
              ))}
            </select>

            {/* Team Filter */}
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setPage(0);
              }}
              disabled={!!selectedDeptId}
              style={{ ...selectStyle, opacity: selectedDeptId ? 0.5 : 1 }}
            >
              <option value="">All teams</option>
              {teams?.map((team) => (
                <option key={team.teamId} value={team.teamId}>
                  {team.teamName}
                </option>
              ))}
            </select>

            {/* Sort Order Selector */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(0);
              }}
              style={selectStyle}
            >
              <option value="name">Sort by: Name (A-Z)</option>
              <option value="-name">Sort by: Name (Z-A)</option>
              <option value="department">Sort by: Department (A-Z)</option>
              <option value="-department">Sort by: Department (Z-A)</option>
              <option value="code">Sort by: Code (Asc)</option>
              <option value="-code">Sort by: Code (Desc)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={isDownloading}
              className="inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              style={{
                fontSize: 12,
                color: "#791F1F",
                background: "#FCEBEB",
                border: "0.5px solid #F5C2C2",
                borderRadius: 6,
                padding: "5px 10px",
              }}
            >
              <Download size={12} /> PDF
            </button>
            <button
              onClick={() => handleDownload("xlsx")}
              disabled={isDownloading}
              className="inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              style={{
                fontSize: 12,
                color: "#27500A",
                background: "#EAF3DE",
                border: "0.5px solid #B8DCA0",
                borderRadius: 6,
                padding: "5px 10px",
              }}
            >
              <Download size={12} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "0.5px solid #E4E6EC",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #E4E6EC" }}>
                <th
                  onClick={() => {
                    setSortBy((prev) => (prev === "name" ? "-name" : "name"));
                    setPage(0);
                  }}
                  className="cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  style={{
                    padding: "10px 18px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: sortBy.includes("name") ? "#1A56DB" : "#9EA3B0",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Employee</span>
                    {sortBy === "name" ? (
                      <ArrowUp size={12} className="text-indigo-600" />
                    ) : sortBy === "-name" ? (
                      <ArrowDown size={12} className="text-indigo-600" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => {
                    setSortBy((prev) => (prev === "department" ? "-department" : "department"));
                    setPage(0);
                  }}
                  className="cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  style={{
                    padding: "10px 18px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: sortBy.includes("department") ? "#1A56DB" : "#9EA3B0",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Department & position</span>
                    {sortBy === "department" ? (
                      <ArrowUp size={12} className="text-indigo-600" />
                    ) : sortBy === "-department" ? (
                      <ArrowDown size={12} className="text-indigo-600" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  style={{
                    padding: "10px 18px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#9EA3B0",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Roles
                </th>

                <th
                  style={{
                    padding: "10px 18px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#9EA3B0",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    textAlign: "right",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((emp, idx) => {
                const avatarColor =
                  AVATAR_COLORS[
                    (emp.staffName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
                  ];
                return (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom:
                        idx < employees.length - 1
                          ? "0.5px solid #F0F2F6"
                          : "none",
                    }}
                    className="hover:bg-[#FAFBFF] transition-colors"
                  >
                    {/* Employee */}
                    <td style={{ padding: "11px 18px" }}>
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: avatarColor.bg,
                            color: avatarColor.text,
                            fontSize: 11,
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            overflow: "hidden",
                          }}
                        >
                          {emp.profileImage &&
                          emp.profileImage !== "default.jpg" ? (
                            <img
                              src={`http://localhost:8000${emp.profileImage}`}
                              alt={emp.staffName || "Employee"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : // Check lagaya hai: Agar staffName null/undefined ho toh fallback character '?' dikhaye
                          emp.staffName && emp.staffName.trim() ? (
                            emp.staffName.charAt(0)
                          ) : (
                            "?"
                          )}
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#111827",
                            }}
                          >
                            {emp.staffName}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: "#9EA3B0",
                              fontFamily: "monospace",
                            }}
                          >
                            {emp.employeeCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Department */}
                    <td style={{ padding: "11px 18px" }}>
                      <p style={{ fontSize: 12, color: "#5A6070" }}>
                        {emp.currentDepartmentName ?? "—"}
                      </p>
                      <p style={{ fontSize: 11, color: "#1A56DB" }}>
                        {emp.positionName}{" "}
                        {emp.levelName ? `(${emp.levelName})` : ""}
                      </p>
                    </td>
                    {/* Roles */}
                    <td style={{ padding: "11px 18px" }}>
                      <div className="flex flex-wrap gap-1 items-center relative">
                        {emp.roles.map((role) => (
                          <span
                            key={role}
                            style={{
                              background: "#EEF3FD",
                              color: "#0C447C",
                              fontSize: 11,
                              fontWeight: 500,
                              padding: "2px 6px",
                              borderRadius: 20,
                            }}
                          >
                            {role.replace("ROLE_", "")}
                          </span>
                        ))}
                        <button
                          onClick={() =>
                            setSelectedEmp(
                              selectedEmp === emp.id ? null : emp.id,
                            )
                          }
                          title="Manage roles"
                          style={{
                            width: 22,
                            height: 22,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "0.5px dashed #C8CCE0",
                            borderRadius: 6,
                            color: "#9EA3B0",
                          }}
                        >
                          <Settings2 size={12} aria-hidden="true" />
                        </button>

                        {selectedEmp === emp.id && (
                          <div
                            className="absolute z-50 top-7 left-0 w-52 space-y-1"
                            style={{
                              background: "#FFFFFF",
                              border: "0.5px solid #E4E6EC",
                              borderRadius: 10,
                              padding: "10px 12px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                color: "#9EA3B0",
                                textTransform: "uppercase",
                                letterSpacing: "0.8px",
                                marginBottom: 6,
                              }}
                            >
                              Assign roles
                            </p>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {allRoles?.map((role) => {
                                const hasRole =
                                  emp.roles.includes(role.roleName) ||
                                  emp.roles.includes(`ROLE_${role.roleName}`);
                                return (
                                  <label
                                    key={role.roleId}
                                    className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-[#F5F6F8] transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={hasRole}
                                      onChange={() =>
                                        handleRoleToggle(
                                          emp.id,
                                          role.roleId,
                                          hasRole,
                                        )
                                      }
                                      style={{ accentColor: "#1A56DB" }}
                                    />
                                    <span
                                      style={{ fontSize: 12, color: "#5A6070" }}
                                    >
                                      {role.roleName}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "11px 18px", textAlign: "right" }}>
                      <div className="flex justify-end items-center gap-1">
                        <Link
                          to={`/employees/${emp.id}/profile`}
                          title="View profile"
                          style={{
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9EA3B0",
                            borderRadius: 6,
                          }}
                          className="hover:bg-info-fill hover:text-[#1A56DB] transition-colors"
                        >
                          <Eye size={14} aria-hidden="true" />
                        </Link>
                        <Link
                          to={`/employees/${emp.id}/departments`}
                          title="Manage departments"
                          style={{
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9EA3B0",
                            borderRadius: 6,
                          }}
                          className="hover:bg-info-fill hover:text-[#1A56DB] transition-colors"
                        >
                          <Building2 size={14} aria-hidden="true" />
                        </Link>
                        <Can permission="EMPLOYEE_EDIT">
                          <Link
                            to={`/employees/edit/${emp.id}`}
                            title="Edit"
                            style={{
                              width: 28,
                              height: 28,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9EA3B0",
                              borderRadius: 6,
                            }}
                            className="hover:bg-info-fill hover:text-[#1A56DB] transition-colors"
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </Link>
                        </Can>

                        <div
                          style={{
                            width: 1,
                            height: 14,
                            background: "#E4E6EC",
                            margin: "0 2px",
                          }}
                        />
                        <Can permission="EMPLOYEE_EDIT">
                          {emp.accountLocked && (
                            <button
                              onClick={async () => {
                                try {
                                  await unlockEmployee(emp.id).unwrap();
                                } catch (err) {
                                  console.error("Unlock failed:", err);
                                }
                              }}
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: "#1A56DB",
                                background: "#EEF3FD",
                                border: "0.5px solid #C8CCE0",
                                borderRadius: 6,
                                padding: "3px 8px",
                                marginRight: 4,
                              }}
                            >
                              Unlock
                            </button>
                          )}
                          {emp.status !== "ACTIVE" ? (
                            <button
                              onClick={async () => {
                                try {
                                  await activateEmployee(emp.id).unwrap();
                                } catch (err) {
                                  console.error("Activate failed:", err);
                                }
                              }}
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: "#27500A",
                                background: "#EAF3DE",
                                border: "0.5px solid #B8DCA0",
                                borderRadius: 6,
                                padding: "3px 8px",
                              }}
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  await deactivateEmployee(emp.id).unwrap();
                                } catch (err) {
                                  console.error("Deactivate failed:", err);
                                }
                              }}
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: "#791F1F",
                                background: "#FCEBEB",
                                border: "0.5px solid #F5C2C2",
                                borderRadius: 6,
                                padding: "3px 8px",
                              }}
                            >
                              Deactivate
                            </button>
                          )}
                        </Can>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {employees?.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "32px 18px",
                      textAlign: "center",
                      fontSize: 13,
                      color: "#9EA3B0",
                    }}
                  >
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagedData && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: "#FFFFFF",
            border: "0.5px solid #E4E6EC",
            borderRadius: 12,
            padding: "12px 18px",
          }}
        >
          <p style={{ fontSize: 12, color: "#9EA3B0" }}>
            Showing {pagedData.content.length} of {pagedData.totalElements}{" "}
            results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="transition-colors disabled:opacity-30"
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                background: "#F5F6F8",
                border: "0.5px solid #E0E2E8",
                color: "#5A6070",
              }}
            >
              ‹
            </button>
            {[...Array(pagedData.totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: page === i ? 500 : 400,
                  background: page === i ? "#1A56DB" : "#F5F6F8",
                  color: page === i ? "#FFFFFF" : "#5A6070",
                  border: page === i ? "none" : "0.5px solid #E0E2E8",
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(page + 1)}
              disabled={pagedData.last}
              className="transition-colors disabled:opacity-30"
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                background: "#F5F6F8",
                border: "0.5px solid #E0E2E8",
                color: "#5A6070",
              }}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {isImportOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          style={{ background: "rgba(17,24,39,0.48)" }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "0.5px solid #E4E6EC",
              borderRadius: 12,
              width: "100%",
              maxWidth: 560,
              overflow: "hidden",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: "16px 18px",
                borderBottom: "0.5px solid #E4E6EC",
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>
                  Import Employees
                </h2>
                <p style={{ fontSize: 12, color: "#9EA3B0", marginTop: 2 }}>
                  Upload employee workbook (.xlsx)
                </p>
              </div>
              <button
                type="button"
                onClick={closeImport}
                style={{
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  color: "#9EA3B0",
                }}
                className="hover:bg-[#F5F6F8] transition-colors"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div style={{ padding: "18px" }} className="space-y-4">
              {!importResult ? (
                <>
                  <div
                    onClick={() => importInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      setSelectedImportFile(e.dataTransfer.files?.[0]);
                    }}
                    className="transition-colors cursor-pointer"
                    style={{
                      border: `1px dashed ${isDragging ? "#1A56DB" : importFile ? "#B8DCA0" : "#C8CCE0"}`,
                      borderRadius: 12,
                      background: isDragging
                        ? "#EEF3FD"
                        : importFile
                          ? "#EAF3DE"
                          : "#FAFBFF",
                      padding: "32px 18px",
                    }}
                  >
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(e) =>
                        setSelectedImportFile(e.target.files?.[0])
                      }
                    />
                    <div className="flex flex-col items-center text-center gap-3">
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: importFile ? "#DDEECC" : "#EEF3FD",
                          color: importFile ? "#27500A" : "#1A56DB",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {importFile ? (
                          <FileText size={21} aria-hidden="true" />
                        ) : (
                          <Upload size={21} aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#111827",
                          }}
                        >
                          {importFile
                            ? importFile.name
                            : "Drop Excel file here or browse"}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: importFile ? "#27500A" : "#9EA3B0",
                            marginTop: 3,
                          }}
                        >
                          {importFile
                            ? "Ready to import"
                            : "Accepted format: .xlsx"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#FAEEDA",
                      border: "0.5px solid #F0D4A4",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                    className="flex gap-2"
                  >
                    <AlertTriangle
                      size={15}
                      style={{ color: "#633806", flexShrink: 0, marginTop: 1 }}
                    />
                    <p
                      style={{
                        fontSize: 11,
                        color: "#633806",
                        lineHeight: 1.5,
                      }}
                    >
                      Headers can use names such as staffName, email,
                      positionName, currentDepartmentName, roleName, and
                      directManagerEmail.
                    </p>
                  </div>

                  {importError && (
                    <div
                      style={{
                        background: "#FCEBEB",
                        border: "0.5px solid #F5C2C2",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                      className="flex gap-2"
                    >
                      <AlertCircle
                        size={15}
                        style={{
                          color: "#791F1F",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />
                      <p style={{ fontSize: 12, color: "#791F1F" }}>
                        {importError}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeImport}
                      style={{
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#5A6070",
                        background: "#F5F6F8",
                        border: "0.5px solid #E4E6EC",
                        borderRadius: 8,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!importFile || isImporting}
                      onClick={handleImportUpload}
                      style={{
                        padding: "8px 18px",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#FFFFFF",
                        background: "#1A56DB",
                        border: "none",
                        borderRadius: 8,
                        opacity: !importFile || isImporting ? 0.55 : 1,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {isImporting ? (
                        <Loader2
                          size={14}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2 size={14} aria-hidden="true" />
                      )}
                      {isImporting ? "Importing..." : "Start Import"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      background: "#F5F6F8",
                      border: "0.5px solid #E0E2E8",
                      borderRadius: 12,
                      padding: "14px 16px",
                    }}
                    className="flex items-center gap-3"
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: importResult.failedImports
                          ? "#FAEEDA"
                          : "#EAF3DE",
                        color: importResult.failedImports
                          ? "#633806"
                          : "#27500A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {importResult.failedImports ? (
                        <AlertTriangle size={18} aria-hidden="true" />
                      ) : (
                        <CheckCircle2 size={18} aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#111827",
                        }}
                      >
                        Import Summary
                      </p>
                      <p
                        style={{ fontSize: 12, color: "#9EA3B0", marginTop: 2 }}
                      >
                        {importResult.successfulImports} success /{" "}
                        {importResult.failedImports} failed /{" "}
                        {importResult.totalRows} rows
                      </p>
                    </div>
                  </div>

                  {importResult.errors?.length > 0 && (
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#791F1F",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: 8,
                        }}
                      >
                        Error logs
                      </p>
                      <div
                        style={{
                          maxHeight: 190,
                          overflowY: "auto",
                          border: "0.5px solid #F5C2C2",
                          borderRadius: 10,
                          background: "#FCEBEB",
                          padding: 8,
                        }}
                        className="space-y-1"
                      >
                        {importResult.errors.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            style={{
                              background: "#FFFFFF",
                              borderRadius: 8,
                              padding: "8px 10px",
                            }}
                            className="flex gap-2"
                          >
                            <AlertCircle
                              size={13}
                              style={{
                                color: "#791F1F",
                                flexShrink: 0,
                                marginTop: 1,
                              }}
                            />
                            <p
                              style={{
                                fontSize: 11,
                                color: "#5A6070",
                                lineHeight: 1.45,
                              }}
                            >
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    {importResult.failedImports > 0 && (
                      <button
                        type="button"
                        onClick={resetImport}
                        style={{
                          padding: "8px 16px",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#5A6070",
                          background: "#F5F6F8",
                          border: "0.5px solid #E4E6EC",
                          borderRadius: 8,
                        }}
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeImport}
                      style={{
                        padding: "8px 18px",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#FFFFFF",
                        background: "#111827",
                        border: "none",
                        borderRadius: 8,
                      }}
                    >
                      Complete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
