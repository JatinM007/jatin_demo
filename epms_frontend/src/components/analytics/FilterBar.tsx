import { Filter, RefreshCw, Users } from 'lucide-react';
import type { AppraisalCycle } from '../../features/appraisal/appraisalApi';
import type { DepartmentResponse } from '../../features/org/orgTypes';
import { DASHBOARD_COLORS, DASHBOARD_BORDER, dashboardStyles } from '../../styles/dashboardStyles';

interface FilterBarProps {
  cycles?: AppraisalCycle[];
  departments?: DepartmentResponse[];
  selectedCycle: number | '';
  selectedDept: number | '';
  isRefreshing: boolean;
  onCycleChange: (value: number | '') => void;
  onDeptChange: (value: number | '') => void;
  onRefresh: () => void;
}

export const FilterBar = ({
  cycles,
  departments,
  selectedCycle,
  selectedDept,
  isRefreshing,
  onCycleChange,
  onDeptChange,
  onRefresh,
}: FilterBarProps) => (
  <header
    style={{
      background: DASHBOARD_COLORS.surface,
      border: DASHBOARD_BORDER,
      borderRadius: 8,
      padding: '14px 18px',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: DASHBOARD_COLORS.ink }}>Reporting & Analytics</h1>
      <p style={{ fontSize: 12, color: DASHBOARD_COLORS.subtle, marginTop: 2 }}>
        Strategic insights into organizational performance.
      </p>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <label style={dashboardStyles.filterControl}>
        <Filter size={13} color={DASHBOARD_COLORS.subtle} />
        <select
          aria-label="Select appraisal cycle"
          style={dashboardStyles.select}
          value={selectedCycle}
          onChange={(event) => onCycleChange(event.target.value ? Number(event.target.value) : '')}
        >
          <option value="">Select Appraisal Cycle</option>
          {cycles?.map((cycle) => {
            const cId = cycle.cycleId ?? (cycle as any).id;
            const cName = cycle.cycleName ?? (cycle as any).name;
            return <option key={cId} value={cId}>{cName}</option>;
          })}
        </select>
      </label>
      <label style={dashboardStyles.filterControl}>
        <Users size={13} color={DASHBOARD_COLORS.subtle} />
        <select
          aria-label="Filter by department"
          style={dashboardStyles.select}
          value={selectedDept}
          onChange={(event) => onDeptChange(event.target.value ? Number(event.target.value) : '')}
        >
          <option value="">All Departments</option>
          {departments?.map((department) => {
            const dId = department.id ?? (department as any).departmentId;
            const dName = department.departmentName ?? (department as any).name;
            return <option key={dId} value={dId}>{dName}</option>;
          })}
        </select>
      </label>
      <button
        aria-label="Refresh dashboard data"
        aria-busy={isRefreshing}
        disabled={isRefreshing}
        onClick={onRefresh}
        style={{ ...dashboardStyles.iconButton, opacity: isRefreshing ? 0.6 : 1 }}
      >
        <RefreshCw size={14} color={DASHBOARD_COLORS.subtle} />
      </button>
    </div>
  </header>
);
