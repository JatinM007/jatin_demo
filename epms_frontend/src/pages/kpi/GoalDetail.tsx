import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetGoalSetByEmployeeQuery,
  useApproveGoalSetMutation,
  useRevertGoalSetMutation,
  useLockGoalSetMutation,
  useCalculateScoresMutation,
  useGetFinalScoreQuery
} from '../../services/kpiApi';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import { useAuth } from '../../hooks/useAuth';
import ProgressUpdateModal from '../../components/kpi/ProgressUpdateModal';
import KpiRevisionModal from '../../components/kpi/KpiRevisionModal';
import KpiAuditLogModal from '../../components/kpi/KpiAuditLogModal';
import type { GoalItemResponse } from '../../features/kpi/kpiTypes';
import { ChevronLeft, CheckCircle2, AlertCircle, Lock, Award, ShieldCheck, History, Archive } from 'lucide-react';
import { Can } from '../../components/Can';
import { useGetMidcycleSummaryQuery } from '../../services/midcycleApi';
import { MidcyclePhaseTimeline } from '../../components/kpi/MidcyclePhaseTimeline';
import { MidcycleChangeModal } from '../../components/kpi/MidcycleChangeModal';
import { formatRelativeTime } from '../../utils/timeUtils';

const STEPS = [
  { id: 'DRAFT', label: 'Draft', icon: CheckCircle2 },
  { id: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { id: 'LOCKED', label: 'Locked', icon: Lock },
];

const GoalDetail: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, activeCycleId, isManager: _isManager, isAdmin, isHR } = useAuth();
  const cycleIdParam = searchParams.get('cycleId');
  const effectiveCycleId = cycleIdParam ? Number(cycleIdParam) : activeCycleId ? Number(activeCycleId) : undefined;

  const { data: goalSetResponse, isLoading, error, refetch } = useGetGoalSetByEmployeeQuery(
    { employeeId: employeeId!, cycleId: effectiveCycleId! },
    {
      skip: !user?.id || !effectiveCycleId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      pollingInterval: 30000,
    }
  );

  const goalSet = goalSetResponse?.data;
  const items = goalSet?.items || [];

  const { data: finalScoreResponse } = useGetFinalScoreQuery(
    { employeeId: employeeId!, cycleId: effectiveCycleId! },
    { skip: !goalSet || !effectiveCycleId }
  );
  const finalScore = finalScoreResponse?.data ?? null;
  const isScoredState = !!finalScore;

  const { data: cyclesData } = useGetCyclesQuery();
  const cycles = cyclesData || [];
  const cycleData = cycles.find((cycle) => cycle.cycleId === effectiveCycleId);
  const isArchivedCycle = cycleData?.status?.toUpperCase() === 'ARCHIVED';
  const isReadOnly = isArchivedCycle || goalSet?.status === 'ARCHIVED';

  const [approveGoal] = useApproveGoalSetMutation();
  const [revertGoal] = useRevertGoalSetMutation();
  const [lockGoal] = useLockGoalSetMutation();
  const [calculateScores] = useCalculateScoresMutation();

  const [selectedItem, setSelectedItem] = useState<GoalItemResponse | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [showMidcycleModal, setShowMidcycleModal] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showAssignmentWorkspaceButton, setShowAssignmentWorkspaceButton] = useState(false);

  const { data: midcycleResponse, refetch: refetchMidcycle } = useGetMidcycleSummaryQuery(
    { employeeId: employeeId as any, cycleId: effectiveCycleId as any },
    {
      skip: !effectiveCycleId,
      refetchOnMountOrArgChange: true,
      pollingInterval: 10000   // ← auto-refresh every 10 seconds
    }
  );
  const midcycle = midcycleResponse?.data ?? null;

  const isOwner = String(user?.id) === String(employeeId);
  const isPrivileged = _isManager || isAdmin || isHR;

  const handleApprove = async () => {
    if (!goalSet) return;
    try {
      await approveGoal(goalSet.id).unwrap();
      toast.success('Goal set approved!');
      await refetch();
    } catch { toast.error('Failed to approve goal set'); }
  };

  const handleCalculate = async () => {
    if (!goalSet) return;
    try {
      await calculateScores({ employeeId: goalSet.employeeId, cycleId: goalSet.appraisalCycleId }).unwrap();
      toast.success('Score calculated!');
      await Promise.all([refetch(), refetchMidcycle()]);
    } catch { toast.error('Failed to calculate score'); }
  };

  const handleRevert = async () => {
    if (!goalSet) return;
    setShowRevertConfirm(true);
  };

  const handleLock = () => {
    if (!goalSet) return;
    setShowLockConfirm(true);
  };

  if (isLoading) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading goal details…</div>
  );
  if (error) {
    const isNotFound = (error as any)?.status === 404;
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: '#E0E0E0', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
          {isNotFound ? 'No goal set found for this cycle' : 'Failed to load goal details'}
        </p>
        <p style={{ fontSize: 12, color: '#9EA3B0' }}>
          {isNotFound
            ? 'Goals may not have been assigned for the selected appraisal cycle.'
            : 'Please try again or contact support.'}
        </p>
      </div>
    );
  }
  if (!goalSet) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#791F1F' }}>Goal set not found for this cycle.</div>
  );

  const totalWeight = items.reduce((sum, i) => sum + i.weightPercent, 0);

  const currentStepIndex = STEPS.findIndex(s => s.id === goalSet.status);
  const effectiveStepIndex = goalSet.status === 'SCORED' ? STEPS.length - 1 : currentStepIndex;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070', flexShrink: 0, marginTop: 2 }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>{goalSet.employeeName}'s Performance Goals</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 40px', marginTop: 10 }}>
              {[
                {
                  label: 'Cycle',
                  value: goalSet.appraisalCycleName || `Cycle ${goalSet.appraisalCycleId}`
                },
                {
                  label: 'Manager',
                  value: goalSet.managerName || 'Not Assigned'
                },
                {
                  label: 'Assigned By',
                  value: goalSet.assignedByName || '—'
                },
                {
                  label: 'Assigned',
                  value: formatRelativeTime(goalSet.assignedAt) || '—'
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginTop: 3 }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {(isPrivileged || isOwner) && (
            <button onClick={() => setShowAuditLog(true)}
              style={{ background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              className="hover:bg-gray-100 transition-colors">
              <History size={14} /> History
            </button>
          )}
          {isPrivileged && !isReadOnly && (
            <>
              <Can permission="KPI_CREATE">
                {(goalSet.status === 'DRAFT' || goalSet.status === 'APPROVED') && (
                  <button
                    onClick={() => navigate(`/kpi/assign/${employeeId}?cycleId=${effectiveCycleId}&mode=edit`)}
                    style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500, border: 'none' }}>
                    Modify Goals
                  </button>
                )}
              </Can>

              <Can permission="KPI_APPROVE">
                {goalSet.status === 'DRAFT' && (
                  <button onClick={handleApprove}
                    style={{ background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>
                    Approve Goals
                  </button>
                )}

                {goalSet.status === 'APPROVED' && (
                  <button onClick={handleRevert}
                    style={{ background: '#FEF3C7', color: '#92400E', border: '0.5px solid #FDE68A', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>
                    Revert to Draft
                  </button>
                )}
                {goalSet.status === 'APPROVED' && (
                  <button onClick={handleLock}
                    style={{ background: '#F1EFE8', color: '#444441', border: '0.5px solid #DDDBD2', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>
                    Lock Goals
                  </button>
                )}
                {(goalSet.status === 'APPROVED' || goalSet.status === 'LOCKED') && (
                  <button onClick={() => setShowMidcycleModal(true)}
                    style={{ background: '#EFF6FF', color: '#1E40AF', border: '0.5px solid #BFDBFE', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500 }}
                    className="hover:bg-blue-100 transition-colors">
                    Midcycle Change
                  </button>
                )}
                {showAssignmentWorkspaceButton && isPrivileged && !isReadOnly && (
                  <button
                    onClick={() => navigate(`/kpi/assign/${employeeId}?cycleId=${effectiveCycleId}&mode=edit`)}
                    style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500, border: 'none' }}
                  >
                    Go to Goal Assignment Workspace
                  </button>
                )}
              </Can>
            </>
          )}
        </div>
      </div>

      {/* Archived cycle banner */}
      {isArchivedCycle && (
        <div style={{
          background: '#F5F6F8',
          border: '0.5px solid #E0E2E8',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#475569',
          fontSize: 13,
          marginBottom: 12,
        }}>
          <Archive size={14} /> This cycle has been archived — goal data is read-only.
        </div>
      )}

      {/* Visual Stepper */}
      {goalSet.status === 'ARCHIVED' ? (
        <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 12, padding: '16px 24px', textAlign: 'center', color: '#9EA3B0', fontSize: 13 }}>
          This goal set has been archived and superseded by a newer assignment.
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="flex items-center w-full max-w-2xl mx-auto relative">
            {STEPS.map((step, index) => {
              const isCompleted = effectiveStepIndex > index;
              const isCurrent = effectiveStepIndex === index;
              const statusColor = isCompleted || isCurrent ? '#1A56DB' : '#E4E6EC';
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex-1 flex items-center relative">
                  <div className="flex flex-col items-center relative z-10 w-full">
                    <div style={{
                      width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isCurrent ? '#EEF3FD' : isCompleted ? '#1A56DB' : '#F5F6F8',
                      color: isCurrent ? '#1A56DB' : isCompleted ? '#FFFFFF' : '#9EA3B0',
                      border: `1.5px solid ${statusColor}`,
                      transition: 'all 0.3s'
                    }}>
                      <Icon size={14} strokeWidth={isCurrent || isCompleted ? 3 : 2} />
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 500, marginTop: 8,
                      color: isCurrent ? '#111827' : '#9EA3B0'
                    }}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', top: 16, left: '50%', right: '-50%', height: 2,
                      background: currentStepIndex > index ? '#1A56DB' : '#E4E6EC',
                      transform: 'translateY(-50%)', zIndex: 0
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Score status indicator — independent of step position */}
          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: '0.5px solid #E4E6EC',
            display: 'flex', justifyContent: 'center', width: '100%'
          }}>
            {isScoredState && finalScore ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#EAF3DE', border: '0.5px solid #B8DCA0',
                borderRadius: 20, padding: '4px 14px',
                fontSize: 11, fontWeight: 500, color: '#27500A'
              }}>
                <Award size={12} />
                Score calculated — {finalScore.weightedScore.toFixed(1)} / 100
                <span style={{ color: '#5A7A3A', fontWeight: 400 }}>
                  · {formatRelativeTime(finalScore.calculatedAt)}
                </span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#F5F6F8', border: '0.5px solid #E0E2E8',
                borderRadius: 20, padding: '4px 14px',
                fontSize: 11, color: '#9EA3B0'
              }}>
                <Award size={12} />
                Score not yet calculated
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Total Weight</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: totalWeight === 100 ? '#1A56DB' : '#791F1F' }}>
            {totalWeight}% <span style={{ fontSize: 13, color: '#9EA3B0' }}>/ 100%</span>
          </p>
        </div>
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>KPI Count</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>{items.length} Goals</p>
        </div>
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Execution Status</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>
            {goalSet.status === 'APPROVED' ? 'Active' : goalSet.status === 'LOCKED' ? 'Locked' : isScoredState ? 'Scored' : 'Pending'}
          </p>
        </div>
      </div>

      {midcycle && midcycle.phases && midcycle.phases.length > 0 && (
        <MidcyclePhaseTimeline
          summary={midcycle}
          isPrivileged={isAdmin || isHR}
          onRefetch={() => {
            refetch();
            refetchMidcycle();
          }}
        />
      )}

      {/* 2-column layout: table left, score sidebar right */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Left — KPI items table (existing, unchanged) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
                    {['KPI Item', 'Weight', 'Target', 'Unit', 'Progress', 'Actions'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 18px', fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const pct = Math.min(Math.round(((item.currentProgress || 0) / item.targetValue) * 100), 100);
                    const isComplianceRow = item.isCompliance;
                    const rowBg = isComplianceRow ? '#FEFCE8' : '#FAFBFF';

                    return (
                      <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}
                        className={`transition-colors ${isComplianceRow ? 'hover:bg-[#FEF9C3]' : 'hover:bg-[#F3F4F6]'}`}>
                        <td style={{ padding: '12px 18px', background: rowBg }}>
                          <div className="flex items-center gap-2 mb-2">
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{item.title}</p>
                            {isComplianceRow && (
                              <span title="Compliance KPI" className="flex">
                                <ShieldCheck size={14} className="text-amber-500" />
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 10, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.categoryName}</p>
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 500, color: '#111827', background: rowBg }}>{item.weightPercent}%</td>
                        <td style={{ padding: '12px 18px', fontSize: 12, color: '#5A6070', background: rowBg }}>
                          {item.targetValue}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: 12, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', background: rowBg }}>
                          {item.unit || '—'}
                        </td>
                        <td style={{ padding: '12px 18px', background: rowBg }}>
                          <div className="flex items-center gap-3">
                            <div style={{ flex: 1, maxWidth: 100, background: isComplianceRow ? '#FDE68A' : '#F0F2F6', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: isComplianceRow ? '#D97706' : '#1A56DB', width: `${pct}%`, transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right', background: rowBg }}>
                          <div className="flex justify-end gap-2">
                            {/* Employee update button - for regular goals */}
                            <Can permission="KPI_CREATE">
                              {isOwner && goalSet.status === 'APPROVED' && !item.isCompliance && (
                                <button
                                  onClick={() => { setSelectedItem(item); setShowProgressModal(true); }}
                                  style={{ background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500 }}
                                  className="hover:bg-blue-100 transition">
                                  UPDATE
                                </button>
                              )}
                            </Can>
                            {/* Employee locked state - for compliance goals */}
                            {isOwner && goalSet.status === 'APPROVED' && item.isCompliance && (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg" title="Requires manager verification">
                                <Lock size={12} />
                                <span style={{ fontSize: 10, fontWeight: 600 }}>MANAGER ONLY</span>
                              </div>
                            )}

                            {/* Manager verify button - for compliance items */}
                            <Can permission="KPI_APPROVE">
                              {isPrivileged && item.isCompliance && goalSet.status === 'APPROVED' && !isArchivedCycle && (
                                item.verifiedAt ? (
                                  <div style={{ fontSize: 10, color: '#27500A', background: '#EAF3DE', border: '0.5px solid #B8DCA0', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ShieldCheck size={11} />
                                    Verified {item.verifiedBy ? `by ${item.verifiedBy}` : ''} {formatRelativeTime(item.verifiedAt)}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setSelectedItem(item); setShowProgressModal(true); }}
                                    style={{ background: '#FEF3C7', color: '#92400E', border: '0.5px solid #FDE68A', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500 }}
                                    className="hover:bg-amber-200 transition">
                                    VERIFY
                                  </button>
                                )
                              )}
                            </Can>

                            {/* Manager revise button - for all items */}
                            <Can permission="KPI_CREATE">
                              {isPrivileged && !isReadOnly && goalSet.status !== 'LOCKED' && (
                                <button
                                  onClick={() => { setSelectedItem(item); setShowRevisionModal(true); }}
                                  style={{ background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500 }}
                                  className="hover:bg-gray-100 transition">
                                  REVISE
                                </button>
                              )}
                            </Can>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right — Score sidebar (new, 300px fixed) */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Score card */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px' }}>
            <p style={{ fontSize: 10, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              KPI Score
            </p>
            {finalScore ? (
              <>
                <p style={{ fontSize: 32, fontWeight: 600, color: '#111827' }}>
                  {finalScore.weightedScore.toFixed(1)}
                  <span style={{ fontSize: 13, color: '#9EA3B0' }}> / 100</span>
                </p>
                <p style={{ fontSize: 12, color: '#5A6070' }}>
                  Achievement: {finalScore.totalAchievementPercent?.toFixed(1)}%
                </p>
                <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 4 }}>
                  Last calculated {formatRelativeTime(finalScore.calculatedAt)}
                </p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 8 }}>Not yet calculated</p>
            )}

            {/* Recalculate button — always visible to Manager/HR */}
            {isPrivileged && !isArchivedCycle && (
              <button onClick={handleCalculate}
                style={{
                  width: '100%', marginTop: 12, background: '#EEF3FD', color: '#0C447C',
                  border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 500
                }}>
                {finalScore ? 'Recalculate Score' : 'Calculate Score'}
              </button>
            )}
          </div>

          {/* Per-item score breakdown */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 10, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Item Breakdown
            </p>
            {items.map(item => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '0.5px solid #F0F2F6', fontSize: 12
              }}>
                <span style={{
                  color: '#5A6070', flex: 1, marginRight: 8,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {item.title}
                </span>
                <span style={{ color: '#111827', fontWeight: 500, flexShrink: 0 }}>
                  {item.scorePercent != null ? `${Number(item.scorePercent).toFixed(0)}%` : '—'}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {showProgressModal && selectedItem && (
        <ProgressUpdateModal
          item={selectedItem}
          goalSetStatus={goalSet.status}
          onClose={() => { setShowProgressModal(false); setSelectedItem(null); }}
        />
      )}
      {showRevisionModal && selectedItem && (
        <KpiRevisionModal item={selectedItem} onClose={() => { setShowRevisionModal(false); setSelectedItem(null); }} />
      )}
      {showAuditLog && goalSet && (
        <KpiAuditLogModal goalSetId={goalSet.id} onClose={() => setShowAuditLog(false)} />
      )}

      {showRevertConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              Revert to Draft?
            </h3>
            <p style={{ fontSize: 13, color: '#5A6070', lineHeight: 1.6, marginBottom: 16 }}>
              This will:
            </p>
            <ul style={{ fontSize: 13, color: '#5A6070', lineHeight: 2, paddingLeft: 20, marginBottom: 20 }}>
              <li>Send a <strong>KPI_REJECTED</strong> notification to {goalSet?.employeeName}</li>
              <li>Make all goal items editable again</li>
              <li>Require re-approval before goals become active</li>
              <li>Existing progress history will be preserved</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRevertConfirm(false)}
                style={{ background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={async () => {
                setShowRevertConfirm(false);
                try {
                  await revertGoal(goalSet!.id).unwrap();
                  toast.success('Goal set reverted to draft.');
                  await Promise.all([refetch(), refetchMidcycle()]);
                } catch (err: any) {
                  toast.error('Failed to revert goal set.');
                }
              }}
                style={{ background: '#FEF3C7', color: '#92400E', border: '0.5px solid #FDE68A', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>
                Yes, Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {showLockConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: '28px 32px',
            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              Lock Goal Set?
            </h3>
            <p style={{ fontSize: 13, color: '#5A6070', lineHeight: 1.6, marginBottom: 16 }}>
              This will:
            </p>
            <ul style={{
              fontSize: 13, color: '#5A6070', lineHeight: 2,
              paddingLeft: 20, marginBottom: 20
            }}>
              <li>Send a <strong>KPI_LOCKED</strong> notification to {goalSet?.employeeName}</li>
              <li>Prevent any further progress updates</li>
              <li>Allow final score calculation to proceed</li>
              <li>Cannot be undone — goal set cannot be reverted from LOCKED</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLockConfirm(false)}
                style={{
                  background: '#F5F6F8', color: '#5A6070',
                  border: '0.5px solid #E0E2E8', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13
                }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLockConfirm(false);
                  try {
                    await lockGoal(goalSet!.id).unwrap();
                    toast.success('Goal set locked.');
                    await refetch();
                  } catch (err: any) {
                    toast.error('Failed to lock goal set.');
                  }
                }}
                style={{
                  background: '#F1EFE8', color: '#444441',
                  border: '0.5px solid #DDDBD2', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, fontWeight: 500
                }}>
                Yes, Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {showMidcycleModal && goalSet && cycleData && (
        <MidcycleChangeModal
          employeeId={employeeId as any}
          employeeName={goalSet.employeeName}
          cycleId={effectiveCycleId!}
          cycleName={goalSet.appraisalCycleName || cycleData.cycleName}
          cycleStartDate={cycleData.startDate}
          cycleEndDate={cycleData.endDate}
          summary={null}
          onClose={() => setShowMidcycleModal(false)}
          onSuccess={async () => {
            await Promise.all([refetch(), refetchMidcycle()]);
            setShowAssignmentWorkspaceButton(true);
            setShowMidcycleModal(false);
          }}
        />
      )}

      <div style={{ display: 'none' }}><CheckCircle2 /><AlertCircle /></div>
    </div>
  );
};

export default GoalDetail;
