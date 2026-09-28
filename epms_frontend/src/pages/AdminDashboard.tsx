import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield, Users, LayoutDashboard, Lock, Activity, Calendar, Server, Key, Database, Settings } from 'lucide-react';
import { useGetAdminDashboardQuery } from '../features/dashboard/dashboardApi';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ChartCard from '../components/dashboard/ChartCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActionPanel, { type Action } from '../components/dashboard/QuickActionPanel';
import { alertColors } from '../constants/dashboardColors';
import { formatAuditDateTime, formatAuditDateValue} from '../utils/timeUtils';

const PIE_COLORS = ['#639922', '#E24B4A', '#BA7517'];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetAdminDashboardQuery();

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading admin controls…</div>;
  if (error) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading admin data.</div>;

  const userStats = [
    { name: 'Active', value: data?.activeUsers ?? 0 },
    { name: 'Locked', value: data?.lockedAccounts ?? 0 },
    { name: 'Inactive', value: (data?.totalEmployees ?? 0) - (data?.activeUsers ?? 0) - (data?.lockedAccounts ?? 0) },
  ];

  const quickActions: Action[] = [
    { id: '1', label: 'System logs', icon: <Server size={16} />, onClick: () => navigate('/admin/audit-logs'), color: 'bg-gray-100 text-gray-600' },
    { id: '2', label: 'User management', icon: <Users size={16} />, onClick: () => navigate('/admin/users'), color: 'bg-blue-100 text-blue-600' },
    { id: '3', label: 'Security', icon: <Shield size={16} />, onClick: () => navigate('/admin/security'), color: 'bg-red-100 text-red-600' },
    { id: '4', label: 'DB backup', icon: <Database size={16} />, onClick: () => navigate('/admin/backup'), color: 'bg-green-100 text-green-600' },
    { id: '5', label: 'Auth config', icon: <Key size={16} />, onClick: () => navigate('/admin/auth-config'), color: 'bg-orange-100 text-orange-600' },
    { id: '6', label: 'Settings', icon: <Settings size={16} />, onClick: () => navigate('/admin/settings'), color: 'bg-indigo-100 text-indigo-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={18} style={{ color: "#791F1F" }} aria-hidden="true" />
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>System administration</h1>
          <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Global system health and security overview.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard title="Total Employees" value={data?.totalEmployees ?? 0} icon={<Users size={15} />} color="blue" />
        <DashboardStatCard title="Departments" value={data?.totalDepartments ?? 0} icon={<LayoutDashboard size={15} />} color="indigo" />
        <DashboardStatCard title="Active cycles" value={data?.activeCycles ?? 0} icon={<Calendar size={15} />} color="green" />
        <DashboardStatCard title="Locked accounts" value={data?.lockedAccounts ?? 0} icon={<Lock size={15} />} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ChartCard title="User account status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={userStats} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {userStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "0.5px solid #E4E6EC", boxShadow: "none", fontSize: 12 }} />
                <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: 11, color: "#9EA3B0" }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-2" style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Shield size={15} style={{ color: "#791F1F" }} aria-hidden="true" />
            <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Security alerts</p>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-64">
            {data?.securityAlerts.map((alert, idx) => {
              const colors = alertColors[alert.severity] || alertColors.LOW;
              return (
                <div key={idx} className="flex items-start gap-3" style={{ background: colors.bg, border: `0.5px solid ${colors.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ background: colors.bg, borderRadius: 6, padding: 4, flexShrink: 0 }}>
                    <Activity size={13} style={{ color: colors.text }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap justify-between gap-1" style={{ marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{alert.event}</span>
                      <span style={{ fontSize: 11, color: colors.text, opacity: 0.7, fontFamily: "monospace" }}>{formatAuditDateTime(alert.timestamp)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: colors.text, opacity: 0.85 }}>{alert.details}</p>
                    <span style={{ fontSize: 11, fontWeight: 500, color: colors.text, marginTop: 4, display: "inline-block" }}>
                      Severity: {alert.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active cycle info */}
      {data?.activeCycleName && (
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Active appraisal cycle</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span style={{ fontSize: 11, color: "#9EA3B0", display: "block", marginBottom: 4 }}>Cycle name</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{data.activeCycleName}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#9EA3B0", display: "block", marginBottom: 4 }}>Start date</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{formatAuditDateValue(data.cycleStartDate)}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#9EA3B0", display: "block", marginBottom: 4 }}>End date</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{formatAuditDateValue(data.cycleEndDate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security metrics */}
      {(data?.failedLoginsLast24h !== undefined || data?.accountsCreatedThisMonth !== undefined) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <DashboardStatCard
            title="Failed logins (24h)"
            value={data?.failedLoginsLast24h ?? 0}
            icon={<Activity size={15} />}
            color="red"
          />
          <DashboardStatCard
            title="Accounts created (this month)"
            value={data?.accountsCreatedThisMonth ?? 0}
            icon={<Users size={15} />}
            color="green"
          />
          <DashboardStatCard
            title="Accounts deactivated (this month)"
            value={data?.accountsDeactivatedThisMonth ?? 0}
            icon={<Lock size={15} />}
            color="orange"
          />
        </div>
      )}

      {/* Quick actions */}
      {/* <QuickActionPanel actions={quickActions} /> */}

      {/* Activity feed */}
      <ActivityFeed
        activities={data?.recentActivities.map((act, idx) => ({
          id: idx,
          user: act.user,
          action: act.action,
          module: act.module,
          timestamp: act.timestamp,
        })) ?? []}
      />
    </div>
  );
};

export default AdminDashboard;
