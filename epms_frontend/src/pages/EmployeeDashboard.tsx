import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Trophy, Target, Clock, ClipboardList, MessageSquare, AlertTriangle, TrendingUp } from 'lucide-react';
import { useGetEmployeeDashboardQuery } from '../features/dashboard/dashboardApi';
import { useDownloadReportMutation } from '../features/report/reportApi';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ChartCard from '../components/dashboard/ChartCard';
import TaskPanel from '../components/dashboard/TaskPanel';

const COLORS = ['#1A56DB', '#E4E6EC'];

const EmployeeDashboard: React.FC = () => {
  const { data, isLoading, error } = useGetEmployeeDashboardQuery();
  const { user } = useAuth();
  const [downloadReport] = useDownloadReportMutation();

  const handleDownload = async (format: 'pdf' | 'excel') => {
    if (!user?.id) return;
    try {
      await downloadReport({
        endpoint: 'performance-trend',
        params: { employeeId: user.id, format },
        fileName: `Performance_Trend_${user.id}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      }).unwrap();
      toast.success(`Downloading performance trend as ${format.toUpperCase()}...`);
    } catch (err) {
      toast.error('Failed to download performance trend.');
    }
  };

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading your performance metrics…</div>;
  if (error) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading dashboard.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>Welcome back!</h1>
        <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Your performance overview for the current cycle.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard title="Performance score" value={`${data?.currentScore?.toFixed(1) ?? 0}%`} icon={<Trophy size={15} />} color="blue" />
        <DashboardStatCard title="KPI completion" value={`${data?.kpiCompletionPercentage ?? 0}%`} icon={<Target size={15} />} color="green" />
        <DashboardStatCard title="Pending tasks" value={data?.pendingTasksCount ?? 0} icon={<ClipboardList size={15} />} color="orange" />
        <DashboardStatCard title="Feedback" value={data?.feedbackCount ?? 0} icon={<MessageSquare size={15} />} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard 
            title="Performance trend"
            action={
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload('pdf')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    background: '#EEF3FD', color: '#1A56DB', border: '0.5px solid #1A56DB', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <ClipboardList size={11} /> PDF
                </button>
                <button
                  onClick={() => handleDownload('excel')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    background: '#ECFDF3', color: '#027A48', border: '0.5px solid #027A48', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <ClipboardList size={11} /> Excel
                </button>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F6" />
                <XAxis dataKey="period" stroke="#9EA3B0" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9EA3B0" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "0.5px solid #E4E6EC", boxShadow: "none", fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#1A56DB" strokeWidth={2} dot={{ r: 3, fill: '#1A56DB', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div>
          <ChartCard title="KPI status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.kpiStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {data?.kpiStatus?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "0.5px solid #E4E6EC", boxShadow: "none", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Tasks & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskPanel
          tasks={data?.tasks.map(t => ({
            id: t.id,
            title: t.title,
            deadline: t.deadline,
            priority: t.priority as 'High' | 'Medium' | 'Low',
          })) ?? []}
        />
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Clock size={15} style={{ color: "#1A56DB" }} aria-hidden="true" />
            <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Appraisal timeline</p>
          </div>
          <div className="space-y-4">
            {data?.appraisalTimeline.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    background: step.active ? "#1A56DB" : "#E4E6EC",
                    outline: step.active ? "3px solid #EEF3FD" : "none",
                  }} />
                  {idx !== (data?.appraisalTimeline.length ?? 0) - 1 && (
                    <div style={{ width: 1, flex: 1, background: "#F0F2F6", margin: "3px 0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: step.active ? 500 : 400, color: step.active ? "#1A56DB" : "#111827" }}>{step.phase}</p>
                  <p style={{ fontSize: 11, color: "#9EA3B0", marginTop: 1 }}>{step.date} — {step.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Employee fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Rank & Days Left */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            {data?.teamRank !== undefined && (
              <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "#9EA3B0", display: "block", marginBottom: 4 }}>Your rank</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: "#1A56DB" }}>
                  #{data.teamRank}
                </span>
                <span style={{ fontSize: 11, color: "#9EA3B0", display: "block", marginTop: 4 }}>of {data.teamSize}</span>
              </div>
            )}
            {data?.daysUntilNextDeadline !== undefined && data.daysUntilNextDeadline >= 0 && (
              <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "#9EA3B0", display: "block", marginBottom: 4 }}>Days until</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: data.daysUntilNextDeadline <= 3 ? "#E24B4A" : "#1A56DB" }}>
                  {data.daysUntilNextDeadline}
                </span>
                <span style={{ fontSize: 11, color: "#9EA3B0", display: "block", marginTop: 4 }}>next deadline</span>
              </div>
            )}
          </div>
        </div>

        {/* Manager Feedback */}
        {data?.managerLastScore !== undefined && (
          <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
              <MessageSquare size={15} style={{ color: "#1A56DB" }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Manager feedback</p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#5A6070", marginBottom: 6 }}>Last evaluation score</p>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#1A56DB", marginBottom: 12 }}>
                {data.managerLastScore?.toFixed(1) ?? 'N/A'}
              </p>
              {data.managerLastComment && (
                <div style={{ paddingTop: 12, borderTop: "0.5px solid #E4E6EC" }}>
                  <p style={{ fontSize: 11, color: "#9EA3B0", marginBottom: 6 }}>Comment</p>
                  <p style={{ fontSize: 12, color: "#5A6070", lineHeight: 1.5 }}>{data.managerLastComment}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
