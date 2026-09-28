import { useState, useMemo } from "react";
import {
  useGetTeamsQuery,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useRemoveTeamMemberMutation,
  useAssignEmployeeMutation,
  useGetTeamMembersQuery,
} from "../../features/org/teamApi";
import { useGetDepartmentsQuery } from "../../features/org/departmentApi";
import { useGetEmployeesQuery } from "../../features/employee/employeeapi";
import type { TeamResponse } from "../../features/org/orgTypes";
import { Plus, Trash2, X, Users, Search, Shield, Building, UserCheck } from "lucide-react";
import { Can } from "../../components/Can";
import { toast } from "react-toastify";

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8",
  border: "0.5px solid #E0E2E8",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#111827",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
};

const TeamList = () => {
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useGetTeamsQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const { data: pagedEmployees } = useGetEmployeesQuery({ page: 0, size: 1000 });
  const employees = pagedEmployees?.content || [];

  const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();
  const [deleteTeam] = useDeleteTeamMutation();
  const [removeMember] = useRemoveTeamMemberMutation();
  const [assignEmployee, { isLoading: isAssigning }] = useAssignEmployeeMutation();

  const [newTeamName, setNewTeamName] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<TeamResponse | null>(null);
  const [employeeToAssign, setEmployeeToAssign] = useState<string>("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: members, isLoading: membersLoading } = useGetTeamMembersQuery(
    selectedTeam?.teamId ?? "",
    {
      skip: !selectedTeam,
    }
  );

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (!searchTerm.trim()) return teams;
    const q = searchTerm.toLowerCase();
    return teams.filter(
      (t) =>
        t.teamName.toLowerCase().includes(q) ||
        (t.departmentName && t.departmentName.toLowerCase().includes(q))
    );
  }, [teams, searchTerm]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !selectedDeptId) {
      toast.warning("Please provide a team name and select a department.");
      return;
    }
    try {
      await createTeam({ teamName: newTeamName.trim(), departmentId: selectedDeptId }).unwrap();
      toast.success(`Team "${newTeamName.trim()}" created successfully!`);
      setNewTeamName("");
      setSelectedDeptId("");
      refetchTeams();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to create team.");
    }
  };

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !employeeToAssign) {
      toast.warning("Please select an employee to assign.");
      return;
    }
    try {
      await assignEmployee({
        teamId: selectedTeam.teamId,
        employeeId: employeeToAssign,
        isPrimary,
      }).unwrap();
      toast.success("Employee successfully assigned to team!");
      setEmployeeToAssign("");
      setIsPrimary(false);
      refetchTeams();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to assign employee.");
    }
  };

  const handleDeleteTeam = async (team: TeamResponse) => {
    if (!window.confirm(`Are you sure you want to delete "${team.teamName}"?`)) return;
    try {
      await deleteTeam(team.teamId).unwrap();
      toast.success(`Team "${team.teamName}" deleted.`);
      if (selectedTeam?.teamId === team.teamId) {
        setSelectedTeam(null);
      }
      refetchTeams();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to delete team.");
    }
  };

  const handleRemoveMember = async (employeeId: string | number, staffName: string) => {
    if (!selectedTeam) return;
    try {
      await removeMember({ teamId: selectedTeam.teamId, employeeId }).unwrap();
      toast.success(`Removed ${staffName} from ${selectedTeam.teamName}.`);
      refetchTeams();
    } catch (err: any) {
      toast.error(err?.data?.detail || err?.message || "Failed to remove member.");
    }
  };

  if (teamsLoading) {
    return (
      <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>
        Loading teams…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>Team Management</h1>
          <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>
            Organize department cohorts into functional teams, pods, and sub-batches.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-lg self-start">
          Total Teams: <strong className="text-slate-800">{teams?.length || 0}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: list + create */}
        <div className="lg:col-span-2 space-y-4">
          {/* Create form */}
          <Can permission="ORG_TEAM_MANAGE">
            <div
              style={{
                background: "#FFFFFF",
                border: "0.5px solid #E4E6EC",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
                Add New Team / Pod
              </p>
              <form onSubmit={handleCreateTeam} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  style={inputStyle}
                  placeholder="Team / Pod name (e.g. Sub-Batch A1)"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <select
                  style={inputStyle}
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments?.map((dept) => (
                    <option key={String(dept.id)} value={String(dept.id)}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  style={{
                    background: "#1A56DB",
                    color: "#FFFFFF",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1648C0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#1A56DB";
                  }}
                >
                  <Plus size={14} aria-hidden="true" /> {isCreating ? "Adding..." : "Add Team"}
                </button>
              </form>
            </div>
          </Can>

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filter teams by name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-600 shadow-2xs"
            />
          </div>

          {/* Teams table */}
          <div
            style={{
              background: "#FFFFFF",
              border: "0.5px solid #E4E6EC",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 450 }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid #E4E6EC", background: "#F9FAFB" }}>
                    {["Team Name", "Department", "Members", "Actions"].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 18px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          textAlign: i === 3 ? "right" : "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team, idx) => {
                    const isSelected = String(selectedTeam?.teamId) === String(team.teamId);
                    return (
                      <tr
                        key={String(team.teamId)}
                        style={{
                          borderBottom:
                            idx < filteredTeams.length - 1 ? "0.5px solid #F0F2F6" : "none",
                          background: isSelected ? "#EEF3FD" : undefined,
                          cursor: "pointer",
                        }}
                        className="hover:bg-[#FAFBFF] transition-colors"
                        onClick={() => setSelectedTeam(team)}
                      >
                        <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                          <div className="flex items-center gap-2">
                            <span>{team.teamName}</span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 18px", fontSize: 12, color: "#4B5563" }}>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            <Building size={11} className="text-slate-400" />
                            {team.departmentName}
                          </span>
                        </td>
                        <td style={{ padding: "12px 18px", fontSize: 12, color: "#5A6070" }}>
                          <span
                            style={{
                              background: (team.memberCount ?? 0) > 0 ? "#EAF3DE" : "#F1EFE8",
                              color: (team.memberCount ?? 0) > 0 ? "#27500A" : "#6B7280",
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 12,
                            }}
                          >
                            {team.memberCount ?? 0} active
                          </span>
                        </td>
                        <td style={{ padding: "12px 18px", textAlign: "right" }}>
                          <div className="flex justify-end items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTeam(team);
                              }}
                              style={{
                                fontSize: 12,
                                color: "#1A56DB",
                                background: "#EEF3FD",
                                border: "0.5px solid #B5D4F4",
                                borderRadius: 6,
                                padding: "4px 9px",
                                fontWeight: 500,
                              }}
                              className="cursor-pointer hover:bg-indigo-100 transition-colors"
                            >
                              Manage
                            </button>
                            <Can permission="ORG_TEAM_MANAGE">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTeam(team);
                                }}
                                className="inline-flex items-center gap-1 transition-colors cursor-pointer hover:bg-red-100"
                                style={{
                                  fontSize: 12,
                                  color: "#791F1F",
                                  background: "#FCEBEB",
                                  border: "0.5px solid #F5C2C2",
                                  borderRadius: 6,
                                  padding: "4px 8px",
                                }}
                                title="Delete Team"
                              >
                                <Trash2 size={12} aria-hidden="true" />
                              </button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTeams.length === 0 && (
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
                        {searchTerm ? "No teams matching search criteria." : "No teams configured yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: member management */}
        <div>
          {selectedTeam ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "0.5px solid #E4E6EC",
                borderRadius: 12,
                padding: "18px",
                position: "sticky",
                top: 16,
              }}
              className="shadow-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                    {selectedTeam.teamName}
                  </p>
                  <p style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {selectedTeam.departmentName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  style={{ color: "#9EA3B0" }}
                  className="cursor-pointer hover:text-slate-600 p-1"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Assign form */}
              <Can permission="ORG_TEAM_MANAGE">
                <form
                  onSubmit={handleAssignEmployee}
                  className="space-y-3 pb-4 mb-4 border-b border-slate-100"
                >
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                    Assign Member to Team
                  </p>
                  <select
                    style={inputStyle}
                    value={employeeToAssign}
                    onChange={(e) => setEmployeeToAssign(e.target.value)}
                  >
                    <option value="">Select Employee</option>
                    {employees
                      ?.filter(
                        (emp) =>
                          !members?.some(
                            (m) => String(m.employeeId) === String(emp.id)
                          )
                      )
                      .map((emp) => {
                        const isSameDept =
                          String(emp.currentDepartmentId) ===
                          String(selectedTeam.departmentId);
                        return (
                          <option key={String(emp.id)} value={String(emp.id)}>
                            {emp.staffName} ({emp.employeeCode})
                            {isSameDept ? " — [Cohort Member]" : ` — [${emp.currentDepartmentName || "Other"}]`}
                          </option>
                        );
                      })}
                  </select>
                  <label
                    className="flex items-center gap-2 cursor-pointer"
                    style={{ fontSize: 12, color: "#4B5563" }}
                  >
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      style={{ accentColor: "#1A56DB" }}
                    />
                    <span>Designate as Team Lead / Primary</span>
                  </label>
                  <button
                    type="submit"
                    disabled={!employeeToAssign || isAssigning}
                    className="w-full flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    style={{
                      background: "#1A56DB",
                      color: "#FFFFFF",
                      borderRadius: 8,
                      padding: "8px 0",
                      fontSize: 13,
                      fontWeight: 500,
                      border: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1648C0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#1A56DB";
                    }}
                  >
                    <Plus size={14} /> {isAssigning ? "Assigning..." : "Assign to Team"}
                  </button>
                </form>
              </Can>

              {/* Member list */}
              <div className="flex items-center justify-between mb-2.5">
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9EA3B0",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                  }}
                >
                  Assigned Members ({members?.length || 0})
                </p>
              </div>

              {membersLoading ? (
                <p style={{ fontSize: 12, color: "#9EA3B0" }}>Loading members…</p>
              ) : members && members.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {members.map((member) => (
                    <div
                      key={String(member.employeeId)}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#111827",
                            lineHeight: "1.2",
                          }}
                          className="truncate"
                        >
                          {member.staffName}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                            marginTop: 1,
                          }}
                          className="truncate"
                        >
                          {member.employeeCode ? `${member.employeeCode} • ` : ""}
                          {member.positionName ?? "Member"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {member.isPrimary && (
                          <span
                            style={{
                              background: "#EAF3DE",
                              color: "#27500A",
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 12,
                            }}
                          >
                            Lead
                          </span>
                        )}
                        <Can permission="ORG_TEAM_MANAGE">
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveMember(member.employeeId, member.staffName)
                            }
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer rounded"
                            aria-label="Remove member"
                            title="Remove from Team"
                          >
                            <X size={14} />
                          </button>
                        </Can>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "#9EA3B0", padding: "8px 0" }}>
                  No members assigned yet.
                </p>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{
                background: "#F5F6F8",
                border: "0.5px dashed #C8CCE0",
                borderRadius: 12,
                padding: "36px 18px",
                minHeight: 220,
              }}
            >
              <Users
                size={26}
                style={{ color: "#94A3B8", marginBottom: 8 }}
                aria-hidden="true"
              />
              <p style={{ fontSize: 13, fontWeight: 500, color: "#64748B" }}>
                Select a team to manage its members
              </p>
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                Assign team leads, add new members, or view pod composition.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamList;
