import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Key,
  Lock,
  Check,
  X,
  Shield,
  Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetSuperAdminUsersQuery,
  useGetSuperAdminPermissionsMatrixQuery,
  useUpdateUserRoleMutation,
  useUpdateFullMatrixMutation,
  useResetPermissionsMutation,
} from "../../features/superadmin/superadminRoleApi";
import type { SuperAdminUser } from "../../features/superadmin/superadminRoleTypes";

const ROLE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  HR: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  MANAGER: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  INTERN: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export const RolePermissionManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"users" | "matrix" | "catalog">("users");

  // Filters for User Role Management
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Queries
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useGetSuperAdminUsersQuery({
    search: searchTerm,
    role: roleFilter !== "ALL" ? roleFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter.toLowerCase() : undefined,
  });

  const {
    data: matrixData,
    isLoading: isLoadingMatrix,
    error: matrixError,
  } = useGetSuperAdminPermissionsMatrixQuery();

  // Mutations
  const [updateUserRole, { isLoading: isUpdatingRole }] = useUpdateUserRoleMutation();
  const [updateFullMatrix, { isLoading: isSavingMatrix }] = useUpdateFullMatrixMutation();
  const [resetPermissions, { isLoading: isResettingMatrix }] = useResetPermissionsMutation();

  // State for user role assignment modal
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<string>("");
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Local draft state for permissions matrix
  const [matrixDraft, setMatrixDraft] = useState<Record<string, string[]>>({});
  const [matrixFilterCategory, setMatrixFilterCategory] = useState("ALL");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync draft matrix when remote data arrives
  useEffect(() => {
    if (matrixData?.matrix) {
      setMatrixDraft(matrixData.matrix);
      setHasUnsavedChanges(false);
    }
  }, [matrixData]);

  // Derived counts
  const totalUsersCount = users.length;
  const superAdminCount = users.filter((u) => u.role === "SUPER_ADMIN" && u.isActive).length;
  const hrCount = users.filter((u) => u.role === "HR").length;
  const managerCount = users.filter((u) => u.role === "MANAGER").length;
  const internCount = users.filter((u) => u.role === "INTERN").length;

  // Handle Role Change Trigger
  const handleInitiateRoleChange = (user: SuperAdminUser, newRole: string) => {
    if (user.role === newRole) return;

    // Client-side lockout check
    if (user.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN" && superAdminCount <= 1) {
      toast.error(
        "Cannot demote the only active Super Admin in the organization. At least one Super Admin must remain to maintain system governance."
      );
      return;
    }

    setSelectedUser(user);
    setTargetRole(newRole);
    setShowRoleModal(true);
  };

  // Confirm Role Change Execution
  const handleConfirmRoleChange = async () => {
    if (!selectedUser || !targetRole) return;

    try {
      const res = await updateUserRole({
        userId: selectedUser.id,
        role: targetRole,
      }).unwrap();

      toast.success(res.message || `Role updated to ${targetRole} for ${selectedUser.username}`);
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.error || "Failed to update user role. Please try again.";
      toast.error(errorMsg);
    }
  };

  // Toggle permission in local matrix draft
  const handleTogglePermission = (role: string, permCode: string) => {
    setMatrixDraft((prev) => {
      const currentList = prev[role] ? [...prev[role]] : [];
      const hasPerm = currentList.includes(permCode);
      const updatedList = hasPerm
        ? currentList.filter((p) => p !== permCode)
        : [...currentList, permCode];

      setHasUnsavedChanges(true);
      return {
        ...prev,
        [role]: updatedList,
      };
    });
  };

  // Save full permissions matrix
  const handleSaveMatrix = async () => {
    try {
      const res = await updateFullMatrix({ matrix: matrixDraft }).unwrap();
      toast.success(res.message || "Permissions matrix successfully updated in database!");
      setHasUnsavedChanges(false);
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.error || "Failed to save permissions matrix.";
      toast.error(errorMsg);
    }
  };

  // Reset permissions to default
  const handleResetPermissions = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all role permissions to system defaults? Any custom assignments will be overwritten."
      )
    ) {
      return;
    }

    try {
      const res = await resetPermissions().unwrap();
      toast.success(res.message || "Permissions reset to system defaults.");
      if (res.data?.matrix) {
        setMatrixDraft(res.data.matrix);
      }
      setHasUnsavedChanges(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to reset permissions.");
    }
  };

  // Filter matrix catalog items
  const catalog = matrixData?.catalog || [];
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((item) => set.add(item.category));
    return Array.from(set);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesCategory =
        matrixFilterCategory === "ALL" || item.category === matrixFilterCategory;
      const matchesSearch =
        !matrixSearch.trim() ||
        item.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(matrixSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalog, matrixFilterCategory, matrixSearch]);

  const rolesList = [
    { key: "SUPER_ADMIN", label: "Super Admin", color: "purple" },
    { key: "HR", label: "HR Partner", color: "blue" },
    { key: "MANAGER", label: "Tech Manager", color: "teal" },
    { key: "INTERN", label: "Intern / Employee", color: "amber" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600 shadow-xs">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                Role & Permission Management
                <span className="bg-amber-50 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <Lock size={12} />
                  Super Admin Scope
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Centralized access control governance. Manage user role assignments and live RBAC permissions matrix.
              </p>
            </div>
          </div>
        </div>

        {/* Live Metrics Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
            <span className="text-slate-400 font-medium">Total Users: </span>
            <span className="font-bold text-slate-800">{totalUsersCount}</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5">
            <span className="text-purple-600 font-medium">Super Admins: </span>
            <span className="font-bold text-purple-900">{superAdminCount}</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5">
            <span className="text-blue-600 font-medium">HR: </span>
            <span className="font-bold text-blue-900">{hrCount}</span>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-3 py-1.5">
            <span className="text-teal-600 font-medium">Managers: </span>
            <span className="font-bold text-teal-900">{managerCount}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
            <span className="text-amber-600 font-medium">Interns: </span>
            <span className="font-bold text-amber-900">{internCount}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
            activeTab === "users"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={16} />
          User Role Assignments
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
            {totalUsersCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
            activeTab === "matrix"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Key size={16} />
          Role Permissions Matrix
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
            activeTab === "catalog"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers size={16} />
          Permissions Directory
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
            {catalog.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER ROLE ASSIGNMENTS                                              */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filter and Search Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search user by name, email, employee code, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                <Filter size={14} />
                <span>Filter:</span>
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="HR">HR Partner</option>
                <option value="MANAGER">Tech Manager</option>
                <option value="INTERN">Intern / Employee</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>

              {(searchTerm || roleFilter !== "ALL" || statusFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("ALL");
                    setStatusFilter("ALL");
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* User Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {isLoadingUsers ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-sm font-medium">Loading user roles from database...</p>
              </div>
            ) : usersError ? (
              <div className="p-12 text-center text-rose-600 space-y-2">
                <AlertTriangle size={32} className="mx-auto text-rose-500" />
                <p className="text-sm font-semibold">Failed to load user directory.</p>
                <p className="text-xs text-slate-400">Ensure backend server is running and user is authenticated as Super Admin.</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users size={32} className="mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No users found</p>
                <p className="text-xs text-slate-400">Try adjusting your search criteria or role filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">User & Identity</th>
                      <th className="py-3 px-4">Department & Track</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4 text-center">Perms Count</th>
                      <th className="py-3 px-4 text-right">Assign New Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {users.map((u) => {
                      const badgeStyle = ROLE_BADGES[u.role] || {
                        bg: "bg-slate-50",
                        text: "text-slate-700",
                        border: "border-slate-200",
                      };
                      const isSingleSuperAdmin =
                        u.role === "SUPER_ADMIN" && u.isActive && superAdminCount <= 1;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                {u.fullName ? u.fullName[0].toUpperCase() : u.username[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                                  {u.fullName || u.username}
                                  {u.isSuperUser && (
                                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                                      Root
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                                  <span>@{u.username}</span>
                                  <span>•</span>
                                  <span>{u.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-xs font-medium text-slate-800">{u.department}</div>
                            <div className="text-[11px] text-slate-400">{u.designation || "Staff"} • {u.employeeCode}</div>
                          </td>

                          <td className="py-3 px-4">
                            {u.isActive ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Deactivated
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                            >
                              <Shield size={12} />
                              {u.role === "SUPER_ADMIN"
                                ? "Super Admin"
                                : u.role === "HR"
                                ? "HR Partner"
                                : u.role === "MANAGER"
                                ? "Tech Manager"
                                : "Intern"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="bg-slate-100 text-slate-700 font-mono text-xs px-2 py-0.5 rounded-md font-bold">
                              {u.effectivePermissionsCount}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <select
                                value={u.role}
                                onChange={(e) => handleInitiateRoleChange(u, e.target.value)}
                                disabled={isUpdatingRole}
                                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
                                title={
                                  isSingleSuperAdmin
                                    ? "This user is the only active Super Admin and cannot be demoted."
                                    : "Select a new role to assign"
                                }
                              >
                                <option value="SUPER_ADMIN">Super Admin</option>
                                <option value="HR">HR Partner</option>
                                <option value="MANAGER">Tech Manager</option>
                                <option value="INTERN">Intern / Employee</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLE PERMISSIONS MATRIX                                            */}
      {/* ========================================================================= */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          {/* Matrix Header Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Filter permission code or name..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                />
              </div>

              <select
                value={matrixFilterCategory}
                onChange={(e) => setMatrixFilterCategory(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium"
              >
                <option value="ALL">All Categories ({catalog.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                onClick={handleResetPermissions}
                disabled={isResettingMatrix}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                title="Reset all permissions to factory defaults"
              >
                <RefreshCw size={13} className={isResettingMatrix ? "animate-spin" : ""} />
                Reset Defaults
              </button>

              <button
                onClick={handleSaveMatrix}
                disabled={isSavingMatrix || !hasUnsavedChanges}
                className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs ${
                  hasUnsavedChanges
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Save size={14} className={isSavingMatrix ? "animate-spin" : ""} />
                {isSavingMatrix ? "Saving Matrix..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Unsaved Changes Banner */}
          {hasUnsavedChanges && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Unsaved modifications:</strong> You have changed permissions in the matrix. Click <strong>"Save Changes"</strong> to persist them to the database.
                </span>
              </div>
              <button
                onClick={handleSaveMatrix}
                disabled={isSavingMatrix}
                className="font-bold underline text-amber-900 hover:text-amber-700 shrink-0 ml-2"
              >
                Save Now
              </button>
            </div>
          )}

          {/* Permissions Matrix Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {isLoadingMatrix ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-sm font-medium">Loading permissions matrix from database...</p>
              </div>
            ) : matrixError ? (
              <div className="p-12 text-center text-rose-600 space-y-2">
                <AlertTriangle size={32} className="mx-auto text-rose-500" />
                <p className="text-sm font-semibold">Failed to load permissions matrix.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-2/5">Permission Capability & Scope</th>
                      {rolesList.map((r) => (
                        <th key={r.key} className="py-3 px-4 text-center">
                          <div className="font-bold text-slate-100">{r.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            ({(matrixDraft[r.key] || []).length} active)
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCatalog.map((perm) => (
                      <tr key={perm.code} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2">
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-2">
                                {perm.name}
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                  {perm.code}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                {perm.description}
                              </div>
                              <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                                Category: {perm.category}
                              </div>
                            </div>
                          </div>
                        </td>

                        {rolesList.map((r) => {
                          const isAssigned = (matrixDraft[r.key] || []).includes(perm.code);
                          return (
                            <td key={r.key} className="py-3 px-4 text-center align-middle">
                              <label className="inline-flex items-center justify-center p-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => handleTogglePermission(r.key, perm.code)}
                                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERMISSIONS CATALOG DIRECTORY                                      */}
      {/* ========================================================================= */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">System Permissions Specification</h2>
              <p className="text-xs text-slate-500">
                Official RBAC capabilities catalog enforced across API endpoints and UI navigation guards.
              </p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">
              {catalog.length} Enforced Capabilities
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.map((item) => (
              <div
                key={item.code}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      {item.category}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.code}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">{item.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Enforcement: API + UI Guard</span>
                  <CheckCircle2 size={13} className="text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROLE CHANGE CONFIRMATION MODAL                                            */}
      {/* ========================================================================= */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirm Role Assignment</h3>
                <p className="text-xs text-slate-500">This action will immediately alter user permissions.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">User:</span>
                <span className="font-bold text-slate-800">{selectedUser.fullName || selectedUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-mono text-slate-700">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Current Role:</span>
                <span className="font-bold text-slate-600">{selectedUser.role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-600 font-semibold">New Assigned Role:</span>
                <span className="font-bold text-indigo-700 text-sm bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {targetRole}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              When confirmed, the new role will be persisted to the database and logged in the immutable system audit trail. The user will adopt the new permission set upon their next action.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                disabled={isUpdatingRole}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isUpdatingRole}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isUpdatingRole ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Confirm & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolePermissionManagementPage;
