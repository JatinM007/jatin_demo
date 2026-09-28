import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, AlertCircle, CheckCircle2, Search, Filter,
  ChevronDown, ChevronRight, LayoutTemplate
} from 'lucide-react';
import { useGetAllEmployeesQuery, useGetDirectReportsQuery } from '../../features/employee/employeeapi';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import { useAuth } from '../../hooks/useAuth';
import { useGetTeamGoalSetsQuery } from '../../services/kpiApi';
import BulkAssignModal from '../../components/kpi/BulkAssignModal';
import KpiSummaryReportButton from '../../components/kpi/KpiSummaryReportButton';
import KpiActualsReportButton from '../../components/kpi/KpiActualsReportButton';
import React from 'react';

import { isKpiEligible } from '../../utils/kpiLevelFilter';

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  APPROVED: { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  LOCKED:   { bg: '#111827', text: '#FFFFFF', border: '#111827' },
  DRAFT:    { bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4' },
};

const TeamKpiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeCycleId, activeCycleName, isAdmin, isHR } = useAuth();
  const isAdminOrHr = isAdmin || isHR;

  const [selectedCycle, setSelectedCycle] = useState('All');
  const { data: cyclesResponse } = useGetCyclesQuery();
  const cycles = Array.isArray(cyclesResponse) ? cyclesResponse : ((cyclesResponse as any)?.data || []);
  const activeCycles = cycles.filter((c: any) => (c.cycleId || c.id) === activeCycleId);
  const inactiveCycles = cycles.filter((c: any) => (c.cycleId || c.id) !== activeCycleId);
  const getCycleStatusLabel = (c: any) => {
    if (!c.status) return '';
    return ` (${c.status.charAt(0).toUpperCase() + c.status.slice(1).toLowerCase()})`;
  };
  const effectiveCycleId = selectedCycle === 'All' ? activeCycleId : Number(selectedCycle);

  const { data: allEmployees = [], isLoading: loadingAll } = useGetAllEmployeesQuery(undefined, { skip: !isAdminOrHr });
  const { data: directReports = [], isLoading: loadingReports } = useGetDirectReportsQuery(Number(user?.id), { skip: isAdminOrHr || !user?.id });

  const employees = isAdminOrHr ? allEmployees : directReports;
  const isLoading = isAdminOrHr ? loadingAll : loadingReports;

  const { data: teamGoalsResponse } = useGetTeamGoalSetsQuery(
    { managerId: Number(user?.id), cycleId: Number(effectiveCycleId) },
    { skip: !user?.id || !effectiveCycleId }
  );
  const teamGoals = teamGoalsResponse?.data || [];

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'progress-high' | 'progress-low'>('name');

  const teamMembers = useMemo(() => {
    if (!user || !employees) return [];
    let members = employees.map(emp => {
      const goals = teamGoals.find(g => String(g.employeeId) === String(emp.id));
      const items = goals?.items || [];
      let progress = 0;
      if (items.length > 0) {
        const totalWeight = items.reduce((acc, i) => acc + (i.weightPercent || 0), 0);
        if (totalWeight > 0) {
          const weightedSum = items.reduce((acc, i) => {
            const p = Math.min(Math.floor(((i as any).currentProgress || 0) / ((i as any).targetValue || 1) * 100), 100);
            return acc + (p * (i.weightPercent || 0));
          }, 0);
          progress = Math.floor(weightedSum / totalWeight);
        }
      }
      return { ...emp, goalSet: goals, progress };
    });
    members = members.filter(isKpiEligible);
    if (searchTerm) {
      members = members.filter(m =>
        m.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return [...members].sort((a, b) => {
      if (sortBy === 'name') return a.staffName.localeCompare(b.staffName);
      if (sortBy === 'progress-high') return b.progress - a.progress;
      if (sortBy === 'progress-low') return a.progress - b.progress;
      return 0;
    });
  }, [employees, user, teamGoals, searchTerm, sortBy]);

  const stats = useMemo(() => {
    const withGoals = teamMembers.filter(m => m.goalSet).length;
    return {
      coverage: teamMembers.length > 0 ? Math.round((withGoals / teamMembers.length) * 100) : 0,
      assigned: withGoals,
      pending: teamMembers.length - withGoals,
    };
  }, [teamMembers]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? teamMembers.map(m => m.id) : []);
  };

  const selectStyle: React.CSSProperties = {
    background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
    padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', appearance: 'none' as any,
  };

  const getProgressColor = (p: number) => p >= 80 ? '#27500A' : p >= 40 ? '#1A56DB' : p > 0 ? '#633806' : '#9EA3B0';
  const getProgressBg = (p: number) => p >= 80 ? '#EAF3DE' : p >= 40 ? '#EEF3FD' : p > 0 ? '#FAEEDA' : '#F5F6F8';

  if (isLoading) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading team data…</div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Team Performance</h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>
            Direct Reports &amp; Goal Tracking &bull; {activeCycleName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button onClick={() => { if (teamMembers.length > 0) { setSelectedIds(teamMembers.map(m => m.id)); setIsBulkModalOpen(true); } }}
            className="inline-flex items-center gap-2 transition-colors"
            style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: 'none' }}>
            <LayoutTemplate size={13} /> Bulk Assign Team
          </button>
          <KpiActualsReportButton />
          <KpiSummaryReportButton />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal Assignment</p>
            <div className="flex items-center gap-1" style={{ color: '#1A56DB' }}>
              <TrendingUp size={12} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>Coverage</span>
            </div>
          </div>
          <p style={{ fontSize: 28, fontWeight: 500, color: '#111827', marginBottom: 8 }}>{stats.coverage}%</p>
          <div style={{ background: '#F0F2F6', borderRadius: 4, height: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', background: '#1A56DB', width: `${stats.coverage}%`, transition: 'width 0.5s' }} />
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: 10, color: '#9EA3B0' }}>Phase: Goal Setting</span>
            <span style={{ fontSize: 10, color: '#9EA3B0' }}>{stats.assigned} of {teamMembers.length}</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={15} style={{ color: '#27500A' }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Assigned</p>
          </div>
          <p style={{ fontSize: 28, fontWeight: 500, color: '#111827', marginBottom: 2 }}>{stats.assigned}</p>
          <p style={{ fontSize: 10, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Goal Sets</p>
        </div>

        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={15} style={{ color: '#791F1F' }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Pending</p>
          </div>
          <p style={{ fontSize: 28, fontWeight: 500, color: '#791F1F', marginBottom: 2 }}>{stats.pending}</p>
          <p style={{ fontSize: 10, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requires Assignment</p>
        </div>
      </div>

      {/* Table */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" style={{ minWidth: 280 }}>
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
              <input type="text" placeholder="Search by name or employee code…"
                style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 12px 8px 30px', fontSize: 13, color: '#111827', outline: 'none', width: '100%' }}
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="relative" style={{ minWidth: 240 }}>
              <select style={{
                ...selectStyle,
                paddingRight: 30,
                paddingLeft: 12,
                background: '#F5F6F8',
                width: '100%',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
              }} value={selectedCycle} onChange={e => { setSelectedCycle(e.target.value); setSelectedIds([]); }}>
                <option value="All">Cycle: {activeCycleName || 'All'}</option>
                {activeCycles.length > 0 && (
                  <optgroup label="Active Cycle">
                    {activeCycles.map((c: any, i: number) => (
                      <option key={`${c.cycleId || c.id}-${i}`} value={c.cycleId || c.id}>
                        {(c.cycleName || c.name) + getCycleStatusLabel(c)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {inactiveCycles.length > 0 && (
                  <optgroup label="Other Cycles">
                    {inactiveCycles.map((c: any, i: number) => (
                      <option key={`${c.cycleId || c.id}-${i}`} value={c.cycleId || c.id}>
                        {(c.cycleName || c.name) + getCycleStatusLabel(c)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
              <select
                style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '6px 12px 6px 28px', fontSize: 11, color: '#5A6070', outline: 'none', appearance: 'none' }}
                value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="progress-high">Sort: High Progress</option>
                <option value="progress-low">Sort: Low Progress</option>
              </select>
            </div>
            {selectedIds.length > 0 && (
              <button onClick={() => setIsBulkModalOpen(true)}
                style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 500, border: 'none' }}>
                Bulk Assign ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 680 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
                  <th style={{ padding: '10px 16px', width: 40 }}>
                    <input type="checkbox" style={{ accentColor: '#1A56DB' }}
                      checked={selectedIds.length === teamMembers.length && teamMembers.length > 0}
                      onChange={handleSelectAll} />
                  </th>
                  {['Direct Report','Goal Status','KPI Items','Cycle','Progress',''].map((h, i) => (
                    <th key={h + i} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((emp, idx) => {
                  const status = emp.goalSet?.status;
                  const ss = STATUS_STYLE[status || ''] || { bg: '#F5F6F8', text: '#9EA3B0', border: '#E0E2E8' };
                  return (
                    <tr key={emp.id}
                      style={{
                        borderBottom: idx < teamMembers.length - 1 ? '0.5px solid #F0F2F6' : 'none',
                        background: selectedIds.includes(emp.id) ? '#EEF3FD' : '#FFFFFF',
                        cursor: status ? 'pointer' : 'default',
                      }}
                      className={status ? 'hover:bg-[#FAFBFF] transition-colors' : 'transition-colors'}
                      onClick={() => {
                        if (!status) return;
                        const base = (status === 'APPROVED' || status === 'LOCKED') ? `/kpi/goals/${emp.id}` : `/kpi/assign/${emp.id}`;
                        navigate(`${base}?cycleId=${effectiveCycleId}`);
                      }}>
                      <td style={{ padding: '10px 16px' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" style={{ accentColor: '#1A56DB' }}
                          checked={selectedIds.includes(emp.id)}
                          onChange={() => setSelectedIds(prev => prev.includes(emp.id) ? prev.filter(i => i !== emp.id) : [...prev, emp.id])} />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div className="flex items-center gap-3">
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEF3FD', color: '#1A56DB', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                            {emp.profileImage && emp.profileImage !== 'default.jpg' ? (
                              <img src={`http://localhost:8000${emp.profileImage}`} alt={emp.staffName}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                              emp.staffName ? emp.staffName.split(' ').map((n: string) => n[0]).join('') : '?'
                            )}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{emp.staffName}</p>
                            <p style={{ fontSize: 10, color: '#9EA3B0' }}>{emp.positionName || 'Associate'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 500, background: ss.bg, color: ss.text, border: `0.5px solid ${ss.border}`, borderRadius: 20, padding: '2px 8px' }}>
                          {status || 'Not Assigned'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#5A6070' }}>
                        {emp.goalSet?.items?.length || 0} Items
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#9EA3B0' }}>
                        {emp.goalSet?.appraisalCycleName || activeCycleName}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 64, height: 4, background: '#F0F2F6', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: getProgressColor(emp.progress), width: `${emp.progress}%` }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 500, color: getProgressColor(emp.progress), background: getProgressBg(emp.progress), borderRadius: 4, padding: '1px 5px' }}>
                            {emp.progress}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <ChevronRight size={14} style={{ color: '#9EA3B0' }} />
                      </td>
                    </tr>
                  );
                })}
                {teamMembers.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>No team members found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isBulkModalOpen && (
        <BulkAssignModal selectedEmployeeIds={selectedIds}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => { setIsBulkModalOpen(false); setSelectedIds([]); }} />
      )}
    </div>
  );
};

export default TeamKpiDashboard;
