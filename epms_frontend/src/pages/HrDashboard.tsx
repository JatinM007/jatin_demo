import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, CheckSquare, ClipboardList, AlertTriangle, Star, Building2, Bell, FileText, UserPlus, TrendingDown } from 'lucide-react';
import { useGetHrDashboardQuery } from '../features/dashboard/dashboardApi';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ChartCard from '../components/dashboard/ChartCard';
import TaskPanel from '../components/dashboard/TaskPanel';
import ProgressBarCard from '../components/dashboard/ProgressBarCard';
import QuickActionPanel, { type Action } from '../components/dashboard/QuickActionPanel';
import { alertColors } from '../constants/dashboardColors';

const HrDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetHrDashboardQuery();

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading HR insights…</div>;
  if (error) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading dashboard data.</div>;

  const quickActions: Action[] = [
    { id: '1', label: 'Launch cycle', icon: <TrendingDown size={16} />, onClick: () => navigate('/hr/cycles/new'), color: 'bg-blue-100 text-blue-600' },
    { id: '2', label: 'Add employee', icon: <UserPlus size={16} />, onClick: () => navigate('/hr/employees/new'), color: 'bg-green-100 text-green-600' },
    { id: '3', label: 'Generate report', icon: <FileText size={16} />, onClick: () => navigate('/hr/reports'), color: 'bg-purple-100 text-purple-600' },
    { id: '4', label: 'Goal Library', icon: <CheckSquare size={16} />, onClick: () => navigate('/kpi/library'), color: 'bg-indigo-100 text-indigo-600' },
    { id: '5', label: 'Send reminder', icon: <Bell size={16} />, onClick: () => navigate('/hr/reminders'), color: 'bg-orange-100 text-orange-600' },
    { id: '6', label: 'Manage roles', icon: <Building2 size={16} />, onClick: () => navigate('/hr/roles'), color: 'bg-indigo-100 text-indigo-600' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>HR analytics</h1>
        <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Monitoring organizational performance and review cycles.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard title="Under review" value={data?.totalEmployeesUnderReview ?? 0} icon={<Users size={15} />} color="blue" />
        <DashboardStatCard title="Pending self-assessments" value={data?.pendingSelfAssessments ?? 0} icon={<ClipboardList size={15} />} color="orange" />
        <DashboardStatCard title="Manager reviews pending" value={data?.pendingManagerReviews ?? 0} icon={<CheckSquare size={15} />} color="purple" />
        <DashboardStatCard title="Active Departments" value={data?.departmentPerformance?.length ?? 0} icon={<Building2 size={15} />} color="green" />
      </div>

      {/* Charts & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Departmental performance score">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.departmentPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F6" />
                <XAxis dataKey="departmentName" stroke="#9EA3B0" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9EA3B0" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#F5F6F8" }} contentStyle={{ borderRadius: 8, border: "0.5px solid #E4E6EC", boxShadow: "none", fontSize: 12 }} />
                <Bar dataKey="averageScore" fill="#1A56DB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="space-y-4">
          <ProgressBarCard
            title="Appraisal completion rate"
            percentage={data?.appraisalCompletionRate ?? 0}
            label="Total organization progress"
            color="green"
          />

          <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
              <Star size={14} style={{ color: "#BA7517" }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Top performers</p>
            </div>
            <div className="space-y-3">
              {data?.topPerformers.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EEF3FD", color: "#1A56DB", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.employeeName.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{p.employeeName}</p>
                      <p style={{ fontSize: 11, color: "#9EA3B0" }}>{p.department}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#27500A", background: "#EAF3DE", padding: "2px 8px", borderRadius: 20 }}>{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cycle phase progress */}
      {data?.currentCyclePhase && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "#9EA3B0", display: "block", marginBottom: 4 }}>Current phase</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                {data.currentCyclePhase?.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <div className="flex justify-between" style={{ marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: "#5A6070" }}>Progress</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{(data.cyclePhaseProgress ?? 0).toFixed(0)}%</span>
              </div>
              <div style={{ height: 6, background: "#EEF0F6", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${data.cyclePhaseProgress ?? 0}%`,
                    borderRadius: 3,
                    background: "#1A56DB",
                  }}
                />
              </div>
            </div>
            {data.daysUntilCycleEnd !== undefined && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid #E4E6EC" }}>
                <span style={{ fontSize: 11, color: "#9EA3B0" }}>Days remaining: </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{data.daysUntilCycleEnd}</span>
              </div>
            )}
          </div>

          {/* Non-compliant managers */}
          {data?.nonCompliantManagers && data.nonCompliantManagers.length > 0 && (
            <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 12 }}>
                {data.nonCompliantManagers.length} Managers Haven't Submitted Reviews
              </p>
              <div className="space-y-2">
                {data.nonCompliantManagers.map((manager, idx) => (
                  <div key={idx} className="flex items-center" style={{ fontSize: 12, color: "#5A6070", paddingLeft: 8 }}>
                    • {manager}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}



      {/* Quick actions */}
      {/* <QuickActionPanel actions={quickActions} /> */}

      {/* Tasks & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskPanel
          title="Urgent HR tasks"
          tasks={data?.alerts.map((alert, idx) => ({
            id: idx,
            title: alert.title,
            deadline: alert.timestamp,
            priority: (alert.type === 'danger' ? 'High' : alert.type === 'warning' ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
          })) ?? []}
        />

        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 14 }}>System alerts</p>
          <div className="space-y-3">
            {data?.alerts.map((alert, idx) => {
              const style = alertColors[alert.type] || alertColors.info;
              return (
                <div key={idx} className="flex gap-3" style={{ background: style.bg, border: `0.5px solid ${style.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  <AlertTriangle size={14} style={{ color: style.text, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: style.text }}>{alert.title}</p>
                    <p style={{ fontSize: 12, color: style.text, opacity: 0.8, marginTop: 2 }}>{alert.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HrDashboard;
