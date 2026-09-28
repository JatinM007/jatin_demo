import { useGetJobLevelsQuery, useCreateJobLevelMutation, useDeleteJobLevelMutation } from "../../features/org/jobLevelApi";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Can } from "../../components/Can";
import { toast } from "react-toastify";

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 8,
  padding: "7px 12px", fontSize: 13, color: "#111827", fontFamily: "inherit", outline: "none", width: "100%",
};

const JobLevelList = () => {
  const { data: levels, isLoading, error } = useGetJobLevelsQuery();
  const [createLevel, { isLoading: isCreating }] = useCreateJobLevelMutation();
  const [deleteLevel] = useDeleteJobLevelMutation();
  const [newLevelName, setNewLevelName] = useState("");
  const [newLevelCode, setNewLevelCode] = useState("");
  const [newLevelRank, setNewLevelRank] = useState<number | "">(1);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim() || !newLevelCode.trim() || newLevelRank === "") {
      toast.warning("Please enter level name, code, and rank.");
      return;
    }
    try {
      await createLevel({ levelName: newLevelName.trim(), levelCode: newLevelCode.trim(), levelRank: Number(newLevelRank) }).unwrap();
      toast.success(`Job Level '${newLevelName}' created successfully!`);
      setNewLevelName(""); setNewLevelCode(""); setNewLevelRank(1);
    } catch (err: any) {
      console.error("Failed to create job level", err);
      toast.error(err?.data?.detail || "Failed to create job level.");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete job level '${name}'?`)) return;
    try {
      await deleteLevel(id).unwrap();
      toast.success("Job level deleted successfully!");
    } catch (err: any) {
      toast.error("Failed to delete job level.");
    }
  };

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading job levels…</div>;
  if (error) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading job levels.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>Job levels</h1>
        <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Define seniority levels used across positions.</p>
      </div>

      <Can permission="ORG_LEVEL_MANAGE">
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Add level</p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input style={inputStyle} placeholder="Level name (e.g. Senior)" value={newLevelName} onChange={(e) => setNewLevelName(e.target.value)} />
          <input style={inputStyle} placeholder="Code (e.g. L04)" value={newLevelCode} onChange={(e) => setNewLevelCode(e.target.value)} />
          <input style={{ ...inputStyle, textAlign: "right" }} type="number" min="1" placeholder="Rank" value={newLevelRank === "" ? "" : newLevelRank}
            onKeyDown={e => {
              if (e.key === '-' || e.key === '.' || e.key === 'e') {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              setNewLevelRank(val === "" ? "" : Math.max(1, parseInt(val)));
            }} />
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

      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 420 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #E4E6EC" }}>
                {["Code", "Name", "Rank", "Actions"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 18px", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: i === 3 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {levels?.map((level, idx) => (
                <tr key={level.levelId} style={{ borderBottom: idx < levels.length - 1 ? "0.5px solid #F0F2F6" : "none" }}
                  className="hover:bg-[#FAFBFF] transition-colors">
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "#1A56DB", fontFamily: "monospace" }}>{level.levelCode}</td>
                  <td style={{ padding: "11px 18px", fontSize: 13, fontWeight: 500, color: "#111827" }}>{level.levelName}</td>
                  <td style={{ padding: "11px 18px", fontSize: 13, color: "#5A6070" }}>{level.levelRank}</td>
                  <td style={{ padding: "11px 18px", textAlign: "right" }}>
                    <Can permission="ORG_LEVEL_MANAGE">
                      <button
                        onClick={() => handleDelete(level.levelId, level.levelName)}
                        className="inline-flex items-center gap-1 transition-colors cursor-pointer"
                        style={{ fontSize: 12, color: "#791F1F", background: "#FCEBEB", border: "0.5px solid #F5C2C2", borderRadius: 6, padding: "3px 8px" }}
                      >
                        <Trash2 size={12} aria-hidden="true" /> Delete
                      </button>
                    </Can>
                  </td>
                </tr>
              ))}
              {levels?.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "24px 18px", textAlign: "center", fontSize: 13, color: "#9EA3B0" }}>No job levels yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JobLevelList;
