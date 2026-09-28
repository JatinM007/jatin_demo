import { useGetDepartmentsQuery, useCreateDepartmentMutation, useDeleteDepartmentMutation } from "../../features/org/departmentApi";
import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Can } from "../../components/Can";
import { toast } from "react-toastify";

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 8,
  padding: "7px 12px", fontSize: 13, color: "#111827", fontFamily: "inherit", outline: "none", width: "100%",
};

const DepartmentList = () => {
  const { data: departments, isLoading, error } = useGetDepartmentsQuery();
  const [createDepartment, { isLoading: isCreating }] = useCreateDepartmentMutation();
  const [deleteDepartment] = useDeleteDepartmentMutation();
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) {
      toast.warning("Please enter both department code and name.");
      return;
    }
    try {
      await createDepartment({ departmentName: newDeptName.trim(), departmentCode: newDeptCode.trim() }).unwrap();
      toast.success(`Department '${newDeptName}' created successfully!`);
      setNewDeptName("");
      setNewDeptCode("");
    } catch (err: any) {
      console.error("Failed to create department", err);
      toast.error(err?.data?.detail || "Failed to create department.");
    }
  };

  const handleDelete = async (id: number | string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete department '${name}'?`)) return;
    try {
      await deleteDepartment(id as any).unwrap();
      toast.success("Department deleted successfully!");
    } catch (err: any) {
      toast.error("Failed to delete department.");
    }
  };

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading departments…</div>;
  if (error) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading departments.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>Departments</h1>
        <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Manage organisational departments.</p>
      </div>

      {/* Create form */}
      <Can permission="ORG_DEPT_MANAGE">
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Add department</p>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input style={inputStyle} placeholder="Code (e.g. IT)" value={newDeptCode} onChange={(e) => setNewDeptCode(e.target.value)} />
            <input style={inputStyle} placeholder="Department name" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 transition-colors"
              style={{ background: "#1A56DB", color: "#FFFFFF", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500, border: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1648C0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1A56DB"; }}
            >
              <Plus size={14} aria-hidden="true" /> Add
            </button>
          </form>
        </div>
      </Can>

      {/* Table */}
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 400 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #E4E6EC" }}>
                <th style={{ padding: "10px 18px", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Code</th>
                <th style={{ padding: "10px 18px", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</th>
                <th style={{ padding: "10px 18px", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments?.map((dept, idx) => (
                <tr key={dept.id} style={{ borderBottom: idx < departments.length - 1 ? "0.5px solid #F0F2F6" : "none" }}
                  className="hover:bg-[#FAFBFF] transition-colors">
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "#1A56DB", fontFamily: "monospace" }}>{dept.departmentCode}</td>
                  <td style={{ padding: "11px 18px", fontSize: 13, fontWeight: 500, color: "#111827" }}>{dept.departmentName}</td>
                  <td style={{ padding: "11px 18px", textAlign: "right" }}>
                    <div className="flex justify-end items-center gap-2">
                      <Link
                        to={`/departments/${dept.id}/members`}
                        className="inline-flex items-center gap-1 transition-colors"
                        style={{ fontSize: 12, color: "#1A56DB", background: "#EEF3FD", border: "0.5px solid #C8CCE0", borderRadius: 6, padding: "3px 8px", textDecoration: "none" }}
                      >
                        <Users size={12} aria-hidden="true" /> Members
                      </Link>
                      <Can permission="ORG_DEPT_MANAGE">
                        <button
                          onClick={() => handleDelete(dept.id, dept.departmentName)}
                          className="inline-flex items-center gap-1 transition-colors cursor-pointer"
                          style={{ fontSize: 12, color: "#791F1F", background: "#FCEBEB", border: "0.5px solid #F5C2C2", borderRadius: 6, padding: "3px 8px" }}
                        >
                          <Trash2 size={12} aria-hidden="true" /> Delete
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
              {departments?.length === 0 && (
                <tr><td colSpan={3} style={{ padding: "24px 18px", textAlign: "center", fontSize: 13, color: "#9EA3B0" }}>No departments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentList;
