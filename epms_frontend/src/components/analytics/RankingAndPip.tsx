import { memo, useMemo, useState } from 'react';
import { Award, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { DashboardCard, EmptyState, SkeletonBlock } from './DashboardPrimitives';
import { DASHBOARD_COLORS, DASHBOARD_BORDER } from '../../styles/dashboardStyles';
import { formatScore, getTopRows, getUnderRows } from '../../utils/reportUtils';
import type { PerformanceRankingReportDTO, PromotionReadinessReportDTO } from '../../types/report';

const DownloadButton = ({
  label,
  tone = 'plain',
  ariaLabel,
  onClick,
}: {
  label: string;
  tone?: 'primary' | 'success' | 'plain';
  ariaLabel: string;
  onClick: () => void;
}) => {
  const isPrimary = tone === 'primary';
  const isSuccess = tone === 'success';

  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 28,
        padding: '4px 10px',
        background: isPrimary ? DASHBOARD_COLORS.primarySoft : isSuccess ? DASHBOARD_COLORS.successSoft : 'transparent',
        color: isPrimary ? '#0C447C' : isSuccess ? DASHBOARD_COLORS.success : DASHBOARD_COLORS.subtle,
        border: isPrimary ? `0.5px solid ${DASHBOARD_COLORS.primaryBorder}` : isSuccess ? `0.5px solid ${DASHBOARD_COLORS.successBorder}` : 'none',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {isSuccess ? <FileSpreadsheet size={12} /> : isPrimary ? <FileText size={12} /> : <Download size={14} />}
      {label}
    </button>
  );
};

const ReportFormatButtons = ({
  onDownloadPdf,
  onDownloadExcel,
}: {
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
}) => (
  <div style={{ display: 'flex', gap: 6 }}>
    <DownloadButton label="PDF" tone="primary" ariaLabel="Download PDF report" onClick={onDownloadPdf} />
    <DownloadButton label="Excel" tone="success" ariaLabel="Download Excel report" onClick={onDownloadExcel} />
  </div>
);

export const PerformanceRankingTable = memo(({
  data,
  loading,
  isError,
  pageSize = 5,
  onDownloadPdf,
  onDownloadExcel,
}: {
  data?: PerformanceRankingReportDTO[];
  loading: boolean;
  isError?: boolean;
  pageSize?: number;
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleRows = useMemo(() => showAll ? data || [] : getTopRows(data, pageSize), [data, pageSize, showAll]);

  return (
    <DashboardCard
      className="lg:col-span-7"
      title="Top Performers Leaderboard"
      isError={isError}
      style={{ overflow: 'hidden', padding: 0 }}
      action={<ReportFormatButtons onDownloadPdf={onDownloadPdf} onDownloadExcel={onDownloadExcel} />}
    >
      {loading ? <div style={{ padding: 16 }}><SkeletonBlock height={180} /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
            <thead>
              <tr style={{ borderBottom: DASHBOARD_BORDER, background: DASHBOARD_COLORS.surfaceAlt }}>
                {['Rank', 'Employee', 'Final Score'].map((heading, index) => (
                  <th key={heading} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: DASHBOARD_COLORS.subtle, textTransform: 'uppercase', letterSpacing: 0, textAlign: index === 2 ? 'right' : 'left' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!visibleRows.length ? (
                <tr><td colSpan={3}><EmptyState title="No appraisal data" body="Ranking data will appear after employee scores are available." /></td></tr>
              ) : visibleRows.map((row) => (
                <tr key={`${row.rank}-${row.employeeName}`} style={{ borderBottom: `0.5px solid ${DASHBOARD_COLORS.grid}` }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: DASHBOARD_COLORS.primary }}>#{row.rank}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DASHBOARD_COLORS.ink }}>{row.employeeName}</div>
                    <div style={{ fontSize: 11, color: DASHBOARD_COLORS.subtle, marginTop: 1 }}>{row.departmentName}</div>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <span style={{ padding: '2px 8px', background: DASHBOARD_COLORS.primarySoft, color: '#0C447C', border: `0.5px solid ${DASHBOARD_COLORS.primaryBorder}`, borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                      {formatScore(row.currentScore, 2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data?.length || 0) > pageSize && (
            <button
              aria-label={showAll ? 'Show fewer performers' : 'View all performers'}
              onClick={() => setShowAll((value) => !value)}
              style={{ width: '100%', padding: '10px 14px', background: DASHBOARD_COLORS.surface, border: 'none', borderTop: DASHBOARD_BORDER, color: DASHBOARD_COLORS.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {showAll ? 'Show Top 5' : `View All ${data?.length || 0}`}
            </button>
          )}
        </div>
      )}
    </DashboardCard>
  );
});

export const UnderPerformanceRankingTable = memo(({
  data,
  loading,
  isError,
  pageSize = 5,
}: {
  data?: PerformanceRankingReportDTO[];
  loading: boolean;
  isError?: boolean;
  pageSize?: number;
}) => {
  const [showAll, setShowAll] = useState(false);
  const sortedRows = useMemo(() => getUnderRows(data, data?.length || pageSize), [data, pageSize]);
  const visibleRows = useMemo(() => showAll ? sortedRows : sortedRows.slice(0, pageSize), [pageSize, showAll, sortedRows]);

  return (
    <DashboardCard
      className="lg:col-span-7"
      title="Under Performers Leaderboard"
      isError={isError}
      style={{ overflow: 'hidden', padding: 0 }}
    >
      {loading ? <div style={{ padding: 16 }}><SkeletonBlock height={180} /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
            <thead>
              <tr style={{ borderBottom: DASHBOARD_BORDER, background: DASHBOARD_COLORS.surfaceAlt }}>
                {['Priority', 'Employee', 'Final Score'].map((heading, index) => (
                  <th key={heading} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: DASHBOARD_COLORS.subtle, textTransform: 'uppercase', letterSpacing: 0, textAlign: index === 2 ? 'right' : 'left' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!visibleRows.length ? (
                <tr><td colSpan={3}><EmptyState title="No under performer data" body="Employees with lower scores will appear after appraisal scores are available." /></td></tr>
              ) : visibleRows.map((row, index) => (
                <tr key={`under-${row.rank}-${row.employeeName}`} style={{ borderBottom: `0.5px solid ${DASHBOARD_COLORS.grid}` }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: DASHBOARD_COLORS.danger }}>#{index + 1}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DASHBOARD_COLORS.ink }}>{row.employeeName}</div>
                    <div style={{ fontSize: 11, color: DASHBOARD_COLORS.subtle, marginTop: 1 }}>{row.departmentName}</div>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <span style={{ padding: '2px 8px', background: DASHBOARD_COLORS.dangerSoft, color: DASHBOARD_COLORS.danger, border: `0.5px solid #F5BFBF`, borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                      {formatScore(row.currentScore, 2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(sortedRows.length || 0) > pageSize && (
            <button
              aria-label={showAll ? 'Show fewer under performers' : 'View all under performers'}
              onClick={() => setShowAll((value) => !value)}
              style={{ width: '100%', padding: '10px 14px', background: DASHBOARD_COLORS.surface, border: 'none', borderTop: DASHBOARD_BORDER, color: DASHBOARD_COLORS.danger, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {showAll ? 'Show Bottom 5' : `View All ${sortedRows.length}`}
            </button>
          )}
        </div>
      )}
    </DashboardCard>
  );
});

export const PromotionReadinessPanel = memo(({
  data,
  loading,
  isError,
  onDownloadPdf,
  onDownloadExcel,
}: {
  data?: PromotionReadinessReportDTO[];
  loading: boolean;
  isError?: boolean;
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
}) => {
  const readyCount = useMemo(() => (data || []).filter((employee) => employee.isReady).length, [data]);
  const topReady = useMemo(
    () => (data || [])
      .filter((employee) => employee.isReady)
      .slice(0, 3),
    [data],
  );

  return (
    <DashboardCard
      title="Promotion Readiness"
      isError={isError}
      action={(
        <div style={{ display: 'flex', gap: 6 }}>
          <DownloadButton label="PDF" tone="primary" ariaLabel="Download promotion readiness PDF" onClick={onDownloadPdf} />
          <DownloadButton label="Excel" tone="success" ariaLabel="Download promotion readiness Excel" onClick={onDownloadExcel} />
        </div>
      )}
    >
      {loading ? <SkeletonBlock height={160} /> : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: DASHBOARD_COLORS.successSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} color={DASHBOARD_COLORS.success} />
            </div>
            <div>
              <p style={{ fontSize: 24, fontWeight: 700, color: DASHBOARD_COLORS.ink, lineHeight: 1 }}>{readyCount}</p>
              <p style={{ fontSize: 11, color: DASHBOARD_COLORS.subtle, marginTop: 3 }}>Ready of {data?.length || 0} employees</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
            {!topReady.length ? (
              <p style={{ fontSize: 12, color: DASHBOARD_COLORS.muted }}>No employees are marked promotion-ready yet.</p>
            ) : topReady.map((employee) => (
              <div key={employee.employeeId} style={{ padding: 12, borderRadius: 10, background: DASHBOARD_COLORS.surfaceAlt, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: DASHBOARD_COLORS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.employeeName}</p>
                  <p style={{ fontSize: 11, color: DASHBOARD_COLORS.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.currentPosition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
});

export const StrategicInsightCard = () => (
  <div style={{ background: DASHBOARD_COLORS.dark, borderRadius: 8, padding: '18px 20px' }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: DASHBOARD_COLORS.subtle, textTransform: 'uppercase', letterSpacing: 0, marginBottom: 10 }}>Strategic Tip</p>
    <p style={{ fontSize: 13, color: '#FFFFFF', lineHeight: 1.6, marginBottom: 14 }}>
      Appraisal cycles with over 85% completion rate in the first 2 weeks correlate with higher employee satisfaction scores.
    </p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>EP</div>
      <p style={{ fontSize: 12, color: DASHBOARD_COLORS.subtle }}>EPMS AI Insights</p>
    </div>
  </div>
);
