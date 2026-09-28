import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Eye,
  Info,
  Mail,
  Shield,
  Users,
  UserPlus,
  UserCheck,
  X,
  Search,
  CheckCircle2,
} from "lucide-react";
import { useSearchEmployeesQuery, useGetEmployeesQuery } from "../../features/employee/employeeapi";
import {
  useGetDepartmentsQuery,
  useAddDepartmentMemberMutation,
  useAssignDepartmentManagerMutation,
} from "../../features/org/departmentApi";
import { useGetTeamsQuery, useGetTeamMembersQuery } from "../../features/org/teamApi";
import type { TeamResponse } from "../../features/org/orgTypes";
import type { EmployeeResponse } from "../../features/employee/employeeTypes";
import { toast } from "react-toastify";

const AVATAR_COLORS = [
  { bg: "#EEF3FD", text: "#0C447C" },
  { bg: "#EAF3DE", text: "#27500A" },
  { bg: "#FAEEDA", text: "#633806" },
  { bg: "#F1EFE8", text: "#444441" },
  { bg: "#FCEBEB", text: "#791F1F" },
];

const isManagerRole = (emp: EmployeeResponse) =>
  emp.roles.some((r) => r === "ROLE_MANAGER" || r === "MANAGER" || r.includes("MANAGER")) ||
  (emp.positionName || "").toLowerCase().includes("manager") ||
  (emp.levelName || "").toLowerCase().includes("manager");

// ─── Main Page ────────────────────────────────────────────────────────────────
const DepartmentMembers = () => {
  const { id } = useParams<{ id: string }>();
  const departmentId = id ? String(id) : "";
  const navigate = useNavigate();

  const { data: departments, isLoading: isDeptLoading, refetch: refetchDepts } =
    useGetDepartmentsQuery();
  const department = departments?.find((d) => String(d.id) === departmentId);

  // Full employee data for everyone in this department
  const {
    data: membersResp,
    isLoading: isMembersLoading,
    refetch: refetchMembers,
  } = useSearchEmployeesQuery(
    { departmentId, page: 0, size: 500 },
    { skip: !departmentId }
  );
  const allMembers: EmployeeResponse[] = membersResp?.content ?? [];

  // All employees across the entire company for the Add Member & Assign Manager modals
  const { data: allCompanyEmployeesResp } = useGetEmployeesQuery({
    page: 0,
    size: 1000,
  });
  const allCompanyEmployees = allCompanyEmployeesResp?.content || [];

  // Modal states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAssignManagerOpen, setIsAssignManagerOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");

  const [addDepartmentMember, { isLoading: isAddingMember }] = useAddDepartmentMemberMutation();
  const [assignDepartmentManager, { isLoading: isAssigningManager }] = useAssignDepartmentManagerMutation();
  const isSubmitting = isAddingMember || isAssigningManager;

  // Available employees to add (not already in this department)
  const availableToAdd = useMemo(() => {
    const currentMemberIds = new Set(allMembers.map((m) => String(m.id)));
    return allCompanyEmployees.filter(
      (emp) =>
        !currentMemberIds.has(String(emp.id)) &&
        (memberSearch
          ? emp.staffName.toLowerCase().includes(memberSearch.toLowerCase()) ||
            emp.employeeCode.toLowerCase().includes(memberSearch.toLowerCase()) ||
            emp.email.toLowerCase().includes(memberSearch.toLowerCase())
          : true)
    );
  }, [allCompanyEmployees, allMembers, memberSearch]);

  // Available managers to assign
  const availableManagers = useMemo(() => {
    return allCompanyEmployees.filter((emp) => {
      const isMgr =
        emp.roles.some((r) => r.toUpperCase().includes("MANAGER") || r.toUpperCase().includes("ADMIN")) ||
        (emp.positionName || "").toLowerCase().includes("manager") ||
        (emp.levelName || "").toLowerCase().includes("lead");
      const matchesSearch = managerSearch
        ? emp.staffName.toLowerCase().includes(managerSearch.toLowerCase()) ||
          emp.employeeCode.toLowerCase().includes(managerSearch.toLowerCase())
        : true;
      return (isMgr || true) && matchesSearch;
    });
  }, [allCompanyEmployees, managerSearch]);

  // All teams — filter to ones belonging to this department
  const { data: allTeams, isLoading: isTeamsLoading } = useGetTeamsQuery();
  const departmentTeams =
    allTeams?.filter((t) => String(t.departmentId) === departmentId) ?? [];
  const hasTeams = departmentTeams.length > 0;

  const managers = allMembers.filter(isManagerRole);
  const nonManagers = allMembers.filter((e) => !isManagerRole(e));

  // Handler: Add Member to Department
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.warning("Please select an employee to add.");
      return;
    }
    try {
      await addDepartmentMember({
        departmentId,
        employeeId: selectedMemberId,
      }).unwrap();
      toast.success("Employee successfully added to department!");
      setIsAddMemberOpen(false);
      setSelectedMemberId("");
      refetchMembers();
      refetchDepts();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.data?.message || err?.message || "Failed to add member.");
    }
  };

  // Handler: Assign Department Manager
  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManagerId) {
      toast.warning("Please select a manager.");
      return;
    }
    try {
      await assignDepartmentManager({
        departmentId,
        managerId: selectedManagerId,
      }).unwrap();
      toast.success("Department Manager successfully assigned!");
      setIsAssignManagerOpen(false);
      setSelectedManagerId("");
      refetchMembers();
      refetchDepts();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.data?.message || err?.message || "Failed to assign manager.");
    }
  };

  if (isDeptLoading || isMembersLoading || isTeamsLoading) {
    return (
      <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>
        Loading department members...
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/departments")}
            className="inline-flex items-center gap-1.5 mb-2 transition-colors cursor-pointer hover:text-indigo-600"
            style={{ color: "#5A6070", fontSize: 12 }}
          >
            <ArrowLeft size={14} />
            Back to Departments
          </button>

          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>
            {department?.departmentName ?? "Department"} — Members
          </h1>

          <div className="flex flex-wrap gap-3 mt-1.5 items-center">
            <span style={{ fontSize: 12, color: "#9EA3B0" }}>
              Code:{" "}
              <span style={{ fontFamily: "monospace", color: "#1A56DB", fontWeight: 600 }}>
                {department?.departmentCode || department?.departmentName?.slice(0, 3).toUpperCase()}
              </span>
            </span>
            <span style={{ fontSize: 12, color: "#9EA3B0" }}>
              <strong>{allMembers.length}</strong> active member{allMembers.length !== 1 ? "s" : ""}
            </span>
            {hasTeams ? (
              <span style={{ fontSize: 12, color: "#9EA3B0" }}>
                {departmentTeams.length} team{departmentTeams.length !== 1 ? "s" : ""}
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#0369A1",
                  background: "#E0F2FE",
                  border: "0.5px solid #BAE6FD",
                  borderRadius: 20,
                  padding: "2px 9px",
                }}
              >
                <Info size={11} />
                Unified Department Cohort
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Add Member & Assign Department Manager */}
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setIsAssignManagerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
          >
            <Shield size={14} className="text-indigo-600" />
            Assign Department Manager
          </button>
          <button
            type="button"
            onClick={() => setIsAddMemberOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
          >
            <UserPlus size={14} />
            Add Member to Department
          </button>
        </div>
      </div>

      {/* ── Managers Section ── */}
      <SectionCard
        icon={<Shield size={16} style={{ color: "#1A56DB" }} />}
        title="Department Managers & Supervisors"
        count={managers.length}
        accentBg="#EEF3FD"
        accentText="#0C447C"
      >
        {managers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {managers.map((emp) => (
              <EmployeeCard key={emp.id} employee={emp} badgeLabel="Manager" />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            <span>No designated manager assigned to this department yet.</span>
            <button
              type="button"
              onClick={() => setIsAssignManagerOpen(true)}
              className="text-indigo-600 font-semibold hover:underline"
            >
              + Assign Lead Manager
            </button>
          </div>
        )}
      </SectionCard>

      {/* ── Teams or flat member list ── */}
      {hasTeams ? (
        departmentTeams.map((team) => (
          <TeamSection key={team.teamId} team={team} allMembers={allMembers} />
        ))
      ) : (
        <SectionCard
          icon={<Users size={16} style={{ color: "#5A6070" }} />}
          title="All Department Members & Interns"
          count={allMembers.length}
          accentBg="#F1EFE8"
          accentText="#444441"
        >
          {allMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allMembers.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  badgeLabel={isManagerRole(emp) ? "Manager" : "Member"}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <Users size={28} className="mx-auto text-slate-300 mb-2" />
              <p style={{ fontSize: 13, color: "#9EA3B0" }}>
                No members found in <strong>{department?.departmentName}</strong> yet.
              </p>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg"
              >
                <UserPlus size={13} /> Add first member
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Modal: Add Member to Department ── */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Member to {department?.departmentName}</h3>
                  <p className="text-xs text-slate-400">Select an employee to reassign/add to this department</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search filter in modal */}
            <div className="my-4 relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee by name, code, email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-indigo-600"
              />
            </div>

            {/* Scrollable employee selector */}
            <form onSubmit={handleAddMember} className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {availableToAdd.map((emp) => {
                  const isSelected = selectedMemberId === String(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedMemberId(String(emp.id))}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-50/80 border-indigo-300 text-indigo-900"
                          : "bg-slate-50/50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{emp.staffName}</div>
                        <div className="text-[11px] text-slate-400">
                          {emp.employeeCode} • {emp.positionName || "Staff"} • Currently: {emp.currentDepartmentName || "Unassigned"}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                    </div>
                  );
                })}
                {availableToAdd.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No matching available employees found.</p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedMemberId || isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl"
                >
                  {isSubmitting ? "Adding..." : "Add to Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Assign Department Manager ── */}
      {isAssignManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assign Department Manager</h3>
                  <p className="text-xs text-slate-400">Select a manager or supervisor for {department?.departmentName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignManagerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search filter in modal */}
            <div className="my-4 relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search managers by name, code..."
                value={managerSearch}
                onChange={(e) => setManagerSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-indigo-600"
              />
            </div>

            {/* Scrollable manager selector */}
            <form onSubmit={handleAssignManager} className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {availableManagers.map((emp) => {
                  const isSelected = selectedManagerId === String(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedManagerId(String(emp.id))}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-50/80 border-indigo-300 text-indigo-900"
                          : "bg-slate-50/50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{emp.staffName}</div>
                        <div className="text-[11px] text-slate-400">
                          {emp.employeeCode} • {emp.positionName || "Manager"} • Roles: {emp.roles.join(", ")}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                    </div>
                  );
                })}
                {availableManagers.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No matching managers found.</p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignManagerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedManagerId || isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl"
                >
                  {isSubmitting ? "Assigning..." : "Assign as Department Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Team Section — has its own hook call per team ────────────────────────────
const TeamSection = ({
  team,
  allMembers,
}: {
  team: TeamResponse;
  allMembers: EmployeeResponse[];
}) => {
  const { data: teamMemberList, isLoading } = useGetTeamMembersQuery(team.teamId);

  const teamEmployees: EmployeeResponse[] = (teamMemberList ?? [])
    .map((tm) => allMembers.find((emp) => String(emp.id) === String(tm.employeeId)))
    .filter((emp): emp is EmployeeResponse => emp !== undefined);

  return (
    <SectionCard
      icon={<Users size={15} style={{ color: "#5A6070" }} />}
      title={team.teamName}
      count={teamEmployees.length}
      accentBg="#F1EFE8"
      accentText="#444441"
    >
      {isLoading ? (
        <p style={{ fontSize: 12, color: "#9EA3B0" }}>Loading team members...</p>
      ) : teamEmployees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teamEmployees.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} badgeLabel={team.teamName} />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#9EA3B0", padding: "6px 0" }}>
          No members assigned to <strong>{team.teamName}</strong> yet.
        </p>
      )}
    </SectionCard>
  );
};

// ─── Section Card Wrapper ─────────────────────────────────────────────────────
const SectionCard = ({
  icon,
  title,
  count,
  accentBg,
  accentText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accentBg: string;
  accentText: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      background: "#FFFFFF",
      border: "0.5px solid #E4E6EC",
      borderRadius: 12,
      padding: 20,
    }}
  >
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{title}</h2>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          background: accentBg,
          color: accentText,
          borderRadius: 20,
          padding: "1px 8px",
          marginLeft: 2,
        }}
      >
        {count}
      </span>
    </div>
    {children}
  </div>
);

// ─── Employee Card ─────────────────────────────────────────────────────────────
const EmployeeCard = ({
  employee,
  badgeLabel,
}: {
  employee: EmployeeResponse;
  badgeLabel?: string;
}) => {
  const avatarColor =
    AVATAR_COLORS[(employee.staffName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

  return (
    <div
      style={{
        background: "#F5F6F8",
        border: "0.5px solid #E0E2E8",
        borderRadius: 10,
        padding: "12px 14px",
      }}
      className="flex items-start justify-between gap-3 hover:bg-[#EEF0F4] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: avatarColor.bg,
            color: avatarColor.text,
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {employee.profileImage && employee.profileImage !== "default.jpg" ? (
            <img
              src={`http://localhost:8000${employee.profileImage}`}
              alt={employee.staffName}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            employee.staffName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#111827",
                lineHeight: "1.2",
              }}
              className="truncate"
            >
              {employee.staffName}
            </span>
            {badgeLabel && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: badgeLabel === "Manager" ? "#0C447C" : "#27500A",
                  background: badgeLabel === "Manager" ? "#EEF3FD" : "#EAF3DE",
                  borderRadius: 4,
                  padding: "1px 5px",
                }}
              >
                {badgeLabel}
              </span>
            )}
          </div>

          <div
            style={{ fontSize: 11, color: "#9EA3B0", fontFamily: "monospace", marginTop: 2 }}
          >
            {employee.employeeCode}
          </div>

          <div
            style={{ fontSize: 11, color: "#5A6070", marginTop: 3 }}
            className="flex items-center gap-1 truncate"
          >
            <Briefcase size={11} className="shrink-0 text-slate-400" />
            <span className="truncate">{employee.positionName || "Software Intern"}</span>
          </div>

          <div
            style={{ fontSize: 11, color: "#9EA3B0", marginTop: 1 }}
            className="flex items-center gap-1 truncate"
          >
            <Mail size={11} className="shrink-0 text-slate-400" />
            <span className="truncate">{employee.email}</span>
          </div>
        </div>
      </div>

      <Link
        to={`/employees/${employee.id}`}
        style={{
          color: "#5A6070",
          background: "#FFFFFF",
          border: "0.5px solid #E0E2E8",
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 500,
          textDecoration: "none",
          flexShrink: 0,
        }}
        className="inline-flex items-center gap-1 hover:border-[#9EA3B0] transition-colors"
      >
        <Eye size={12} /> View
      </Link>
    </div>
  );
};

export default DepartmentMembers;
