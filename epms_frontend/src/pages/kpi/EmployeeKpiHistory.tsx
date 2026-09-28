import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGetEmployeeKpiHistoryQuery, useGetGoalSetAuditTrailQuery } from '../../services/kpiApi';
import {
  ChevronLeft, Calendar, Target, TrendingUp, Clock, AlertCircle
} from 'lucide-react';
import { calculateGoalSetMetrics } from '../../utils/kpiTransformationService';
import KpiAuditTable from '../../components/kpi/KpiAuditTable';

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  APPROVED: { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  LOCKED:   { bg: '#F1EFE8', text: '#444441', border: '#DDDBD2' },
  DRAFT:    { bg: '#FAEEDA', text: '#633806', border: '#F0D4A4' },
  SCORED:   { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  ARCHIVED: { bg: '#F0F0F0', text: '#6B7280', border: '#D1D5DB' },
};

const EmployeeKpiHistory: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGoalSetId = searchParams.get('cycle') || null;

  const { data: historyResponse, isLoading: historyLoading, isError: historyError } = useGetEmployeeKpiHistoryQuery(employeeId || '', {
    skip: !employeeId,
  });
  const { data: auditResponse, isLoading: auditLoading, isError: auditError } = useGetGoalSetAuditTrailQuery(selectedGoalSetId || '', {
    skip: !selectedGoalSetId,
  });

  const goalSets = useMemo(() =>
    [...(historyResponse?.data || [])].sort((a, b) =>
      (b.appraisalCycleName ?? '').localeCompare(a.appraisalCycleName ?? '')
    ),
    [historyResponse?.data]
  );
  const employeeName = goalSets[0]?.employeeName;
  const auditLogs = auditResponse?.data || [];
  const [objPage, setObjPage] = useState(1);
  const OBJ_PER_PAGE = 15;

  // Auto-select the most recent cycle when the page first loads
  useEffect(() => {
    if (!selectedGoalSetId && goalSets.length > 0) {
      setSearchParams({ cycle: String(goalSets[0].id) }, { replace: true });
    }
  }, [goalSets, selectedGoalSetId, setSearchParams]);

  const goalSetMetricsMap = useMemo(
    () => new Map(goalSets.map(gs => [String(gs.id), calculateGoalSetMetrics(gs)])),
    [goalSets]
  );
  const selectedGoalSet = selectedGoalSetId
    ? goalSets.find(gs => String(gs.id) === String(selectedGoalSetId))
    : goalSets[0];
  const metrics = selectedGoalSet
    ? (goalSetMetricsMap.get(String(selectedGoalSet.id)) || { finalScore: selectedGoalSet.score || 85, completionRate: selectedGoalSet.score || 85 })
    : null;

  const allItems = selectedGoalSet?.items ?? [];
  const totalObjPages = Math.ceil(allItems.length / OBJ_PER_PAGE);
  const pagedItems = allItems.slice((objPage - 1) * OBJ_PER_PAGE, objPage * OBJ_PER_PAGE);

  if (!employeeId) {
    return <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Invalid employee reference.</div>;
  }

  if (historyLoading) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading KPI history…</div>
  );

  if (historyError) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#E53E3E' }}>
      Failed to load KPI history. Please try again.
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070', flexShrink: 0 }}
          className="hover:bg-[#F5F6F8] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>
            {employeeName ? `${employeeName} — KPI History` : 'KPI Performance History'}
          </h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>Review past performance cycles and goal audit logs.</p>
        </div>
      </div>

      {/* Cycle Selector */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px' }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Performance Timeline</p>
          <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 2 }}>Select an appraisal cycle to view details</p>
        </div>
        <div className="relative" style={{ minWidth: 260 }}>
          <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
          <select value={selectedGoalSetId || ''}
            onChange={e => { setSearchParams({ cycle: String(e.target.value) }); setObjPage(1); }}
            style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 36px 8px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', appearance: 'none' as const }}>
            <option value="" disabled>Choose a performance cycle…</option>
            {goalSets.map(gs => (
              <option key={gs.id} value={gs.id}>
                {gs.appraisalCycleName || 'Annual Cycle'} ({gs.status}) — {(goalSetMetricsMap.get(String(gs.id))?.finalScore ?? gs.score ?? 85).toFixed(0)}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {goalSets.length === 0 && (
        <div style={{ background: '#FFFFFF', border: '0.5px dashed #E0E2E8', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#F5F6F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <AlertCircle size={22} style={{ color: '#9EA3B0' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>No History Found</p>
          <p style={{ fontSize: 12, color: '#9EA3B0', maxWidth: 320, margin: '0 auto' }}>This employee doesn't have any past performance cycles recorded in the system yet.</p>
        </div>
      )}

      {/* Selected cycle details */}
      {selectedGoalSet && metrics ? (
        <div className="space-y-4">
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#1A56DB' }} />
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Cycle Performance Score</p>
              <div className="flex items-baseline gap-2">
                <span style={{ fontSize: 28, fontWeight: 500, color: '#111827' }}>{metrics.finalScore.toFixed(1)}%</span>
                {metrics.finalScore >= 100 && (
                  <span style={{ fontSize: 10, fontWeight: 500, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 4, padding: '2px 6px' }}>Target Met</span>
                )}
              </div>
              <TrendingUp size={48} style={{ position: 'absolute', right: 12, bottom: 10, color: '#E4E6EC', opacity: 0.5 }} />
            </div>

            <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Avg. Goal Achievement</p>
              <div className="flex items-baseline gap-2">
                <span style={{ fontSize: 28, fontWeight: 500, color: '#111827' }}>{metrics.completionRate.toFixed(1)}%</span>
                <span style={{ fontSize: 12, color: '#9EA3B0' }}>/ 100%</span>
              </div>
              <Target size={48} style={{ position: 'absolute', right: 12, bottom: 10, color: '#E4E6EC', opacity: 0.5 }} />
            </div>

            <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Goal Status</p>
              {(() => {
                const ss = STATUS_STYLE[selectedGoalSet.status] || { bg: '#F5F6F8', text: '#9EA3B0', border: '#E0E2E8' };
                return (
                  <span style={{ fontSize: 14, fontWeight: 500, background: ss.bg, color: ss.text, border: `0.5px solid ${ss.border}`, borderRadius: 20, padding: '4px 12px', display: 'inline-block' }}>
                    {selectedGoalSet.status}
                  </span>
                );
              })()}
              <Clock size={48} style={{ position: 'absolute', right: 12, bottom: 10, color: '#E4E6EC', opacity: 0.5 }} />
            </div>
          </div>

          {/* Objectives + Audit */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Objectives */}
            <div className="w-full lg:w-1/2">
              <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Assigned Objectives</p>
              <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden', maxHeight: 520, overflowY: 'auto' }}>
                {(selectedGoalSet.items?.length ?? 0) > 0 ? (
                pagedItems.map((item, idx) => {
                  const pct = Math.min(((item.currentProgress || 0) / (item.targetValue || 1)) * 100, 100);
                  return (
                    <div key={item.id} style={{ padding: '14px 16px', borderBottom: idx < pagedItems.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}
                      className="hover:bg-[#FAFBFF] transition-colors">
                      <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 2 }}>{item.title}</p>
                          <p style={{ fontSize: 10, color: '#9EA3B0', textTransform: 'uppercase' }}>Weight: {item.weightPercent}%</p>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>
                          {item.currentProgress} <span style={{ fontSize: 10, color: '#9EA3B0', textTransform: 'uppercase' }}>{item.unit}</span>
                        </span>
                      </div>
                      <div className="flex justify-between" style={{ fontSize: 10, color: '#9EA3B0', marginBottom: 4 }}>
                        <span>Progress</span>
                        <span style={{ color: '#1A56DB', fontWeight: 500 }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ background: '#F0F2F6', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#1A56DB', width: `${pct}%`, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })
                ) : (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <Target size={24} style={{ color: '#E0E2E8', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12, color: '#9EA3B0' }}>No objectives assigned for this cycle.</p>
                  </div>
                )}
              </div>
              {totalObjPages > 1 && (
                <div style={{ padding: '10px 16px', borderTop: '0.5px solid #E4E6EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#9EA3B0' }}>
                    {(objPage - 1) * OBJ_PER_PAGE + 1}–{Math.min(objPage * OBJ_PER_PAGE, selectedGoalSet.items?.length ?? 0)} of {selectedGoalSet.items?.length ?? 0}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setObjPage(p => Math.max(1, p - 1))} disabled={objPage === 1}
                      style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '0.5px solid #E0E2E8', background: objPage === 1 ? '#F5F6F8' : '#FFFFFF', color: objPage === 1 ? '#C0C4CC' : '#374151', cursor: objPage === 1 ? 'not-allowed' : 'pointer' }}>
                      ‹
                    </button>
                    <button onClick={() => setObjPage(p => Math.min(totalObjPages, p + 1))} disabled={objPage === totalObjPages}
                      style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '0.5px solid #E0E2E8', background: objPage === totalObjPages ? '#F5F6F8' : '#FFFFFF', color: objPage === totalObjPages ? '#C0C4CC' : '#374151', cursor: objPage === totalObjPages ? 'not-allowed' : 'pointer' }}>
                      ›
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Audit Trail Table */}
            <div className="w-full lg:w-1/2" style={{ maxHeight: 520, overflowY: 'auto' }}>
              <KpiAuditTable
                logs={auditLogs}
                isLoading={auditLoading}
                isError={auditError}
              />
            </div>
          </div>
        </div>
      ) : goalSets.length > 0 ? (
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: '#EEF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Target size={24} style={{ color: '#1A56DB' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>Select a Cycle</p>
          <p style={{ fontSize: 12, color: '#9EA3B0' }}>Pick a performance cycle from the timeline above to explore detailed scores and history.</p>
        </div>
      ) : null}
    </div>
  );
};

export default EmployeeKpiHistory;
