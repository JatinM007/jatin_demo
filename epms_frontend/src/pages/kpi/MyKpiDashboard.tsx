import { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useGetGoalSetByEmployeeQuery, useGetProgressHistoryQuery } from '../../services/kpiApi';
import ProgressUpdateModal from '../../components/kpi/ProgressUpdateModal';
import KpiSummaryCard from '../../components/kpi/KpiSummaryCard';
import KpiGoalCard from '../../components/kpi/KpiGoalCard';
import KpiUpdateHistoryCard from '../../components/kpi/KpiUpdateHistoryCard';
import { TrendingUp, Target } from 'lucide-react';
import { formatRelativeTime } from '../../utils/timeUtils';

const MyKpiDashboard: React.FC = () => {
  const { user, activeCycleId, activeCycleName } = useAuth();

  const { data: goalSetResponse, isLoading } = useGetGoalSetByEmployeeQuery(
    { employeeId: user?.id || 0, cycleId: activeCycleId ?? 0 },
    {
      skip: !user?.id || !activeCycleId,
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const { data: historyResponse } = useGetProgressHistoryQuery(
    { employeeId: user?.id || 0, limit: 3 },
    { skip: !user }
  );

  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const kpis = goalSetResponse?.data?.items || [];
  const isDraft = goalSetResponse?.data?.status === 'DRAFT';
  const canUpdate = goalSetResponse?.data?.status === 'APPROVED';

  const overallProgress = useMemo(() => {
    if (kpis.length === 0) return 0;
    const totalWeight = kpis.reduce((acc, kpi) => acc + (kpi.weightPercent || 0), 0);
    if (totalWeight === 0) return 0;
    const weightedSum = kpis.reduce((acc, kpi) => {
      const progress = Math.min(Math.floor((kpi.currentProgress || 0) / (kpi.targetValue || 1) * 100), 100);
      return acc + (progress * (kpi.weightPercent || 0));
    }, 0);
    return Math.floor(weightedSum / totalWeight);
  }, [kpis]);

  if (isLoading) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading goals…</div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header — title only */}
      <div style={{ paddingBottom: 14, borderBottom: '0.5px solid #E4E6EC' }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827', margin: 0 }}>My Assigned Goals</h1>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <KpiSummaryCard label="Overall Progress" value={`${overallProgress}%`} icon={TrendingUp} color="blue" />
        <KpiSummaryCard label="Active Goals" value={kpis.length} icon={Target} color="indigo" />
      </div>

      {goalSetResponse?.data && (
        <div style={{
          display: 'flex', gap: 32, padding: '10px 0',
          borderBottom: '0.5px solid #E4E6EC', flexWrap: 'wrap'
        }}>
          {[
            { label: 'CYCLE', value: goalSetResponse.data.appraisalCycleName ?? activeCycleName },
            { label: 'MANAGER', value: goalSetResponse.data.managerName },
            { label: 'ASSIGNED BY', value: goalSetResponse.data.assignedByName },
            { label: 'ASSIGNED', value: formatRelativeTime(goalSetResponse.data.assignedAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9EA3B0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginTop: 2 }}>{value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Goals */}
        <div className="lg:col-span-2 space-y-3">
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Primary Objectives</p>
          {kpis.map((kpi, idx) => (
            <KpiGoalCard key={kpi.id} kpi={kpi} idx={idx}
              onUpdate={(item) => { setSelectedKpi(item); setIsUpdateModalOpen(true); }} 
              canUpdate={canUpdate}/>
          ))}
          {kpis.length === 0 && (
            <div style={{ background: '#FFFFFF', border: '0.5px dashed #E0E2E8', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F5F6F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Target size={20} style={{ color: '#9EA3B0' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
                {isDraft ? 'Goals are being drafted' : 'No goals assigned yet'}
              </p>
              <p style={{ fontSize: 13, color: '#9EA3B0' }}>
                {isDraft ? 'Your manager is working on your goals for this cycle.' : 'Wait for your manager to set up your objectives.'}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <KpiUpdateHistoryCard history={historyResponse?.data || []} />
        </div>
      </div>

      {isUpdateModalOpen && selectedKpi && (
        <ProgressUpdateModal
          item={selectedKpi}
          goalSetStatus={goalSetResponse?.data?.status}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MyKpiDashboard;
