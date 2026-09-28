import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGetAllLibrariesQuery, useGetGoalSetByEmployeeQuery } from '../../services/kpiApi';
import { Target, Layers, Activity, ChevronRight, History } from 'lucide-react';
import { Can } from '../../components/Can';

const KpiHub: React.FC = () => {
  const navigate = useNavigate();
  const { user, isHR, isAdmin, isManager, activeCycleId, activeCycleName } = useAuth();

  const { data: librariesResponse } = useGetAllLibrariesQuery();
  const libraries = librariesResponse?.data || [];

  const { data: myGoalsResponse, isLoading: loadingGoals } = useGetGoalSetByEmployeeQuery(
    { employeeId: user?.id || 0, cycleId: activeCycleId ?? 0 },
    { skip: !user?.id || !activeCycleId }
  );

  const myGoals = myGoalsResponse?.data;
  const items = myGoals?.items || [];
  const overallProgress = items.length > 0
    ? Math.floor(items.reduce((acc, item) => acc + ((item.currentProgress || 0) / item.targetValue * item.weightPercent), 0))
    : 0;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3" style={{ paddingBottom: 14, borderBottom: '0.5px solid #E4E6EC' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>System Intelligence Hub</h1>
        </div>
        <div style={{ background: '#EEF3FD', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '6px 12px' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#0C447C' }}>Cycle: {activeCycleName}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* My performance */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#1A56DB' }} />
          <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>My Performance</p>
          <p style={{ fontSize: 28, fontWeight: 500, color: '#111827', marginBottom: 10 }}>{overallProgress}%</p>
          <div style={{ background: '#F0F2F6', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#1A56DB', width: `${overallProgress}%`, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* KPI templates (admin) or assigned KPIs (employee) */}
        {(isAdmin || isHR) ? (
          <div style={{ background: '#1A56DB', border: 'none', borderRadius: 12, padding: '16px 18px', cursor: 'pointer' }}
            className="hover:opacity-90 transition-opacity"
            onClick={() => navigate('/kpi/library')}>
            <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>KPI Templates</p>
            <p style={{ fontSize: 28, fontWeight: 500, color: '#FFFFFF', marginBottom: 10 }}>{libraries.length}</p>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Manage Library →</span>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Assigned KPIs</p>
            <p style={{ fontSize: 28, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{items.length}</p>
            <p style={{ fontSize: 11, color: '#9EA3B0' }}>Active goals this cycle</p>
          </div>
        )}

        {/* Goal status */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Goal Status</p>
          <p style={{ fontSize: 18, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{myGoals?.status || 'No Active Goals'}</p>
          <p style={{ fontSize: 11, color: '#9EA3B0' }}>Next review in 12 days</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal goals */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <div style={{ width: 4, height: 18, background: '#1A56DB', borderRadius: 2 }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Active Goals</p>
          </div>

          {loadingGoals ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} style={{ height: 60, background: '#F5F6F8', borderRadius: 8 }} />)}
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-3">
              {items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between cursor-pointer"
                  style={{ padding: '10px 12px', background: '#F5F6F8', borderRadius: 8 }}
                  onClick={() => navigate('/kpi/my')}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 2 }}>{item.title}</p>
                    <p style={{ fontSize: 10, color: '#9EA3B0' }}>Weight: {item.weightPercent}%</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1A56DB' }}>
                      {Math.floor((item.currentProgress || 0) / item.targetValue * 100)}%
                    </p>
                    <div style={{ width: 48, height: 3, background: '#E0E2E8', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#1A56DB', width: `${(item.currentProgress || 0) / item.targetValue * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/kpi/my')}
                className="w-full transition-colors"
                style={{ padding: '8px', background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, fontSize: 12, color: '#5A6070', fontWeight: 500 }}>
                View All Personal Goals
              </button>
            </div>
          ) : (
            <div style={{ padding: '24px', background: '#F5F6F8', border: '0.5px dashed #E0E2E8', borderRadius: 8, textAlign: 'center' }}>
              <Target size={20} style={{ color: '#9EA3B0', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, color: '#9EA3B0' }}>No goals initialized for this cycle</p>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="space-y-4">
          {(isAdmin || isHR || isManager) && (
            <div style={{ background: '#111827', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Strategic Control</p>
              <div className="grid grid-cols-2 gap-3">
                <Can permission="KPI_CREATE">
                  <button onClick={() => navigate('/kpi/manage')}
                    className="flex flex-col gap-2 text-left transition-colors"
                    style={{ padding: '12px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, background: '#1A56DB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Target size={13} style={{ color: '#FFFFFF' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF' }}>Assign Goals</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Allocate library templates</p>
                    </div>
                  </button>
                </Can>
                <Can permission="KPI_LIBRARY_MANAGE">
                  <button onClick={() => navigate('/kpi/library/new')}
                    className="flex flex-col gap-2 text-left transition-colors"
                    style={{ padding: '12px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, background: '#27500A', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={13} style={{ color: '#FFFFFF' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF' }}>Create Template</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Define new KPI models</p>
                    </div>
                  </button>
                </Can>
                <button onClick={() => navigate('/kpi/org-history')}
                  className="flex flex-col gap-2 text-left transition-colors"
                  style={{ padding: '12px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
                  <div style={{ width: 28, height: 28, background: '#7C3AED', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <History size={13} style={{ color: '#FFFFFF' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF' }}>KPI History</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Audit log & lifecycle</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <div style={{ width: 4, height: 18, background: '#633806', borderRadius: 2 }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>System Sync</p>
            </div>
            <p style={{ fontSize: 12, color: '#9EA3B0', lineHeight: 1.6 }}>
              Performance data is synchronized with the global reference framework.
              Last sync: <span style={{ color: '#1A56DB', fontWeight: 500 }}>14 minutes ago</span>
            </p>
          </div>

          <div style={{ display: 'none' }}><Activity /><ChevronRight /></div>
        </div>
      </div>
    </div>
  );
};

export default KpiHub;
