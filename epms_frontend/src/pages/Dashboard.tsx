import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useGetActiveDepartmentsQuery, useGetDepartmentHeadcountQuery } from "../features/org/departmentApi";
import { BarChart3, Users, Target, ClipboardCheck, Calendar, Building2 } from "lucide-react";

const HeadcountCard = ({ departmentId, departmentName }: { departmentId: number; departmentName: string }) => {
  const { data: count, isLoading } = useGetDepartmentHeadcountQuery(departmentId);
  return (
    <div
      className="flex justify-between items-center"
      style={{
        background: "#F5F6F8",
        border: "0.5px solid #E4E6EC",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 400, color: "#5A6070" }}>{departmentName}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#1A56DB" }}>{isLoading ? "…" : count}</span>
    </div>
  );
};

const Dashboard = () => {
  const { user, isAdmin, isHR, isManager, isEmployee } = useAuth();
  const navigate = useNavigate();
  const { data: departments } = useGetActiveDepartmentsQuery(undefined, { skip: !isAdmin && !isHR });

  if (!user) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#1A56DB" }} />
    </div>
  );

  const getMetrics = () => {
    if (isAdmin) return [
      { label: "Total Workforce", value: "428", icon: <Users size={15} />, color: "blue" as const },
      { label: "Active departments", value: "8", icon: <Building2 size={15} />, color: "green" as const },
      { label: "System health", value: "100%", icon: <BarChart3 size={15} />, color: "green" as const },
    ];
    if (isHR) return [
      { label: "Active appraisals", value: "12", icon: <ClipboardCheck size={15} />, color: "blue" as const },
      { label: "Completion rate", value: "88%", icon: <BarChart3 size={15} />, color: "green" as const },
      { label: "Training needs", value: "5", icon: <ClipboardCheck size={15} />, color: "orange" as const },
    ];
    if (isManager) return [
      { label: "Direct reports", value: "14", icon: <Users size={15} />, color: "blue" as const },
      { label: "Team avg score", value: "3.8", icon: <BarChart3 size={15} />, color: "orange" as const },
      { label: "Pending reviews", value: "3", icon: <ClipboardCheck size={15} />, color: "blue" as const },
    ];
    return [
      { label: "My last rating", value: "4.2", icon: <BarChart3 size={15} />, color: "green" as const },
      { label: "KPI progress", value: "75%", icon: <Target size={15} />, color: "blue" as const },
      { label: "Days to review", value: "18", icon: <Calendar size={15} />, color: "orange" as const },
    ];
  };

  const COLOR_MAP = {
    blue:   { bg: "#EEF3FD", text: "#1A56DB" },
    green:  { bg: "#EAF3DE", text: "#27500A" },
    orange: { bg: "#FAEEDA", text: "#633806" },
  };

  const metrics = getMetrics();

  const actionCards = [
    ...(isAdmin ? [{ title: "System config", desc: "Manage global parameters and system logs.", label: "Admin console", to: "/admin/settings", fill: "#EEF3FD", textColor: "#0C447C" }] : []),
    ...(isHR ? [{ title: "Talent management", desc: "Oversee hiring, reviews and department structures.", label: "HR panel", to: "/employees", fill: "#EAF3DE", textColor: "#27500A" }] : []),
    ...(isManager ? [{ title: "Team tracking", desc: "Monitor direct reports and KPI progress.", label: "Review team", to: "/kpi/team", fill: "#EAF3DE", textColor: "#27500A" }] : []),
    ...(isEmployee ? [{ title: "My growth", desc: "Submit self-assessments and track your goals.", label: "Self review", to: "/appraisal", fill: "#FAEEDA", textColor: "#633806" }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>
            {user.positionName} — {user.levelName}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metrics.map((m) => {
          const colors = COLOR_MAP[m.color];
          return (
            <div
              key={m.label}
              style={{
                background: "#FFFFFF",
                border: "0.5px solid #E4E6EC",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: colors.bg, color: colors.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {m.icon}
                </div>
              </div>
              <p style={{ fontSize: 22, fontWeight: 500, color: "#111827", lineHeight: 1, marginTop: 8 }}>{m.value}</p>
              <p style={{ fontSize: 12, color: "#9EA3B0", marginTop: 3 }}>{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Main two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: action cards + tasks */}
        <div className="lg:col-span-2 space-y-4">
          {/* Action cards */}
          {actionCards.length > 0 && (
            <div className={`grid gap-4 ${actionCards.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
              {actionCards.map((card) => (
                <button
                  key={card.to}
                  onClick={() => navigate(card.to)}
                  className="text-left w-full transition-colors"
                  style={{ background: card.fill, border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}
                >
                  <h2 style={{ fontSize: 14, fontWeight: 500, color: card.textColor }}>{card.title}</h2>
                  <p style={{ fontSize: 12, color: card.textColor, opacity: 0.8, marginTop: 4 }}>{card.desc}</p>
                  <span style={{ fontSize: 11, fontWeight: 500, color: card.textColor, marginTop: 10, display: "inline-block" }}>
                    {card.label} →
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Tasks panel */}
          <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                {isEmployee ? "My action items" : isManager ? "Team tasks" : "System alerts"}
              </p>
              <button style={{ fontSize: 12, color: "#1A56DB" }}>View all</button>
            </div>
            <div
              className="flex items-center justify-between"
              style={{ background: "#F5F6F8", border: "0.5px solid #E4E6EC", borderRadius: 10, padding: "10px 12px" }}
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#EEF3FD", color: "#1A56DB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardCheck size={13} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
                    {isEmployee ? "Submit self-assessment" : isManager ? "Review team appraisal" : "Cycle progress review"}
                  </p>
                  <p style={{ fontSize: 11, color: "#9EA3B0", marginTop: 1 }}>Due in 2 days</p>
                </div>
              </div>
              <span style={{ background: "#FAEEDA", color: "#633806", fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 20 }}>
                Pending
              </span>
            </div>
          </div>
        </div>

        {/* Right: profile card + headcount */}
        <div className="space-y-4">
          {/* Profile card */}
          <div
            className="text-center cursor-pointer"
            style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}
            onClick={() => navigate("/profile")}
          >
            <div
              className="flex items-center justify-center mx-auto"
              style={{ width: 48, height: 48, borderRadius: "50%", background: "#EEF3FD", color: "#1A56DB", fontSize: 18, fontWeight: 500, marginBottom: 10 }}
            >
              {user.staffName.charAt(0)}
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{user.staffName}</p>
            <p style={{ fontSize: 11, color: "#9EA3B0", marginTop: 2 }}>{user.employeeCode}</p>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "0.5px solid #E4E6EC" }} className="text-left space-y-2">
              <div className="flex justify-between">
                <span style={{ fontSize: 11, color: "#9EA3B0" }}>Department</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{user.currentDepartmentId || "Engineering"}</span>
              </div>
              {isManager && (
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: "#9EA3B0" }}>Direct reports</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#1A56DB" }}>14</span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/profile"); }}
              className="w-full mt-4 transition-colors"
              style={{ background: "#F5F6F8", border: "0.5px solid #E4E6EC", borderRadius: 8, padding: "7px 0", fontSize: 12, color: "#5A6070" }}
            >
              View profile
            </button>
          </div>

          {/* Headcount (admin/HR only) */}
          {(isAdmin || isHR) && departments && (
            <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Headcount</p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {departments.map((dept) => (
                  <HeadcountCard key={dept.id} departmentId={dept.id} departmentName={dept.departmentName} />
                ))}
              </div>
            </div>
          )}

          {/* Goal milestone (employee only) */}
          {isEmployee && (
            <div style={{ background: "#EEF3FD", border: "0.5px solid #B5D4F4", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#0C447C" }}>Goal milestone</p>
              <p style={{ fontSize: 12, color: "#5A6070", marginTop: 4 }}>3 of 4 quarterly KPIs completed. Keep it up!</p>
              <button
                onClick={() => navigate("/kpi/my")}
                className="mt-4 transition-colors"
                style={{ background: "#1A56DB", color: "#FFFFFF", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 500, border: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1648C0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1A56DB"; }}
              >
                View goals
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
