import React, { useState, useMemo } from 'react';
import { useGetActiveDepartmentsQuery } from '../../features/org/departmentApi';
import { useGetEmployeesQuery } from '../../features/employee/employeeapi';
import { 
  useGetPerformanceHistoryByEmployeeQuery, 
  useGetAllPerformanceHistoryQuery,
  useGetPerformancePulseQuery,
  useGetMeetingPulseQuery 
} from '../../features/continuous/continuousApi';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

interface MonthData {
  name: string;
  month: number;
  year: number;
  praise: number;
  praisePublic: number;
  praisePrivate: number;
  improvement: number;
  improvementPublic: number;
  improvementPrivate: number;
  warning: number;
  warningPublic: number;
  warningPrivate: number;
  meetings: number;
  meetingsPublic: number;
  meetingsPrivate: number;
  actionItemsCompleted: number;
  totalActionItems: number;
}

const SentimentChart = ({ history, employeeName, filterType, actionItems = [] }: { history: any[], employeeName?: string, filterType: string, actionItems?: any[] }) => {
  const [timeRange, setTimeRange] = useState<3 | 6 | 12>(6);
  const [showPraise, setShowPraise] = useState(true);
  const [showImprovement, setShowImprovement] = useState(true);
  const [showCorrection, setShowCorrection] = useState(true);

  // Group data by month for the selected time range
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData: MonthData[] = [];
  const now = new Date();
  for (let i = timeRange - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    chartData.push({
      name: months[d.getMonth()],
      month: d.getMonth(),
      year: d.getFullYear(),
      praise: 0,
      praisePublic: 0,
      praisePrivate: 0,
      improvement: 0,
      improvementPublic: 0,
      improvementPrivate: 0,
      warning: 0,
      warningPublic: 0,
      warningPrivate: 0,
      meetings: 0,
      meetingsPublic: 0,
      meetingsPrivate: 0,
      actionItemsCompleted: 0,
      totalActionItems: 0
    });
  }

  // Use Sets to track unique entities per month to avoid double-counting lifecycle events
  // (e.g. a meeting that is Scheduled, Updated, then Published counts as ONE meeting).
  const uniqueMeetingsPerMonth = new Map<string, Set<number>>();
  const uniqueFeedbacksPerMonth = new Map<string, Set<number>>();

  history.forEach(h => {
    const date = new Date(h.createdAt);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthData = chartData.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
    if (monthData) {
      if (h.sourceType === 'MEETING') {
        if (!uniqueMeetingsPerMonth.has(monthKey)) uniqueMeetingsPerMonth.set(monthKey, new Set());
        const meetingSet = uniqueMeetingsPerMonth.get(monthKey)!;
        if (!meetingSet.has(h.sourceId)) {
          meetingSet.add(h.sourceId);
          monthData.meetings++;
        }
      } else if (h.sourceType === 'FEEDBACK') {
        if (!uniqueFeedbacksPerMonth.has(monthKey)) uniqueFeedbacksPerMonth.set(monthKey, new Set());
        const feedbackSet = uniqueFeedbacksPerMonth.get(monthKey)!;
        if (!feedbackSet.has(h.sourceId)) {
          feedbackSet.add(h.sourceId);
          const type: string = h.feedbackType || 'PRAISE';
          if (type === 'PRAISE') {
            monthData.praise++;
          } else if (type === 'IMPROVEMENT') {
            monthData.improvement++;
          } else if (type === 'WARNING') {
            monthData.warning++;
          }
        }
      }
    }
  });

  // Action Items analytics per month.
  // Bucket by dueDate. If dueDate is missing or outside the chart window,
  // fall back to the CURRENT month so the item is always counted somewhere visible.
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  actionItems.forEach(ai => {
    // Determine the month to credit this action item to
    let targetMonth: { month: number; year: number } | undefined;
    if (ai.dueDate) {
      const dueDate = new Date(ai.dueDate);
      const slot = chartData.find(m => m.month === dueDate.getMonth() && m.year === dueDate.getFullYear());
      if (slot) targetMonth = slot;
    }
    // Fallback: if no dueDate or dueDate out of range, use current month
    if (!targetMonth) {
      targetMonth = chartData.find(m => m.month === nowMonth && m.year === nowYear);
    }
    if (targetMonth) {
      (targetMonth as any).totalActionItems++;
    }

    if (ai.status === 'DONE' && ai.completedAt) {
      const completedDate = new Date(ai.completedAt);
      const monthData = chartData.find(m => m.month === completedDate.getMonth() && m.year === completedDate.getFullYear());
      if (monthData) {
        monthData.actionItemsCompleted++;
      }
    }
  });

  const isMeetingOnly = filterType === 'MEETING';
  // maxValue must be the highest COUNT of any single metric in any month.
  const maxValue = isMeetingOnly
    ? Math.max(...chartData.map(m => Math.max(m.meetings, m.actionItemsCompleted)), 5)
    : filterType === 'ALL'
    ? Math.max(
        ...chartData.flatMap(m => [
          showPraise ? m.praise : 0,
          showImprovement ? m.improvement : 0,
          showCorrection ? m.warning : 0,
          m.meetings
        ]),
        5
      )
    : Math.max(
        ...chartData.flatMap(m => [
          showPraise ? m.praise : 0,
          showImprovement ? m.improvement : 0,
          showCorrection ? m.warning : 0,
        ]),
        5
      );

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {isMeetingOnly ? 'Meeting Volume' : filterType === 'ALL' ? 'Activity Overview' : 'Sentiment Distribution'}
          </p>
          <h3 className="text-xl font-black text-gray-900">
            {isMeetingOnly ? 'Meeting Frequency' : filterType === 'ALL' ? 'Unified Activity Pulse' : 'Historical Pulse'}{employeeName ? `: ${employeeName}` : ''}
          </h3>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value) as 3 | 6 | 12)}
            className="px-4 py-2 bg-transparent hover:bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-black text-gray-500 uppercase tracking-widest outline-none transition cursor-pointer appearance-none shadow-sm"
            style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px', paddingRight: '32px' }}
          >
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
          </select>

          <div className="flex flex-wrap justify-end gap-x-6 gap-y-2">
            {!isMeetingOnly ? (
              <>
                <button 
                  onClick={() => setShowPraise(!showPraise)}
                  className={`flex items-center gap-1.5 transition-all duration-300 hover:opacity-80 ${showPraise ? 'opacity-100' : 'opacity-40 grayscale'}`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Praise</span>
                </button>
                <button 
                  onClick={() => setShowImprovement(!showImprovement)}
                  className={`flex items-center gap-1.5 transition-all duration-300 hover:opacity-80 ${showImprovement ? 'opacity-100' : 'opacity-40 grayscale'}`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-200" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Improvement</span>
                </button>
                <button 
                  onClick={() => setShowCorrection(!showCorrection)}
                  className={`flex items-center gap-1.5 transition-all duration-300 hover:opacity-80 ${showCorrection ? 'opacity-100' : 'opacity-40 grayscale'}`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Correction</span>
                </button>
                {filterType === 'ALL' && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Meetings</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Meetings</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative h-64 w-full">
        {/* Y-Axis Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} className="absolute w-full border-t border-gray-50 z-0" style={{ bottom: `${p * 100}%` }}>
            <span className="absolute -left-8 -top-2 text-[8px] font-black text-gray-300">
              {Math.round(p * maxValue)}
            </span>
          </div>
        ))}

        <svg className="w-full h-full overflow-visible z-10" preserveAspectRatio="none" viewBox="0 0 500 200">
          <defs>
            <linearGradient id="praiseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="improveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="warningGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="meetingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>

          {(() => {
            const width = 500;
            const height = 200;
            const points = chartData.length;
            const dx = width / (points - 1 || 1);

            // Build a smooth cubic-Bézier path for a single metric.
            const getPath = (getData: (m: MonthData) => number): string => {
              let path = '';
              let prevY = 0;
              chartData.forEach((m, i) => {
                const x = i * dx;
                const y = height - (getData(m) / maxValue) * height;
                if (i === 0) {
                  path = `M ${x} ${y}`;
                } else {
                  const prevX = (i - 1) * dx;
                  const cpX = prevX + (x - prevX) / 2;
                  path += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
                }
                prevY = y;
              });
              return path;
            };

            const fillPath = (path: string) => `${path} L ${width} ${height} L 0 ${height} Z`;

            if (isMeetingOnly) {
              const dx = width / (chartData.length - 1 || 1);
              const meetingPath = getPath(m => m.meetings);
              const actionPath = getPath(m => m.actionItemsCompleted);

              return (
                <>
                  {/* Bars for Meetings */}
                  {chartData.map((m, i) => {
                    const barWidth = 20;
                    const val = m.meetings;
                    const h = (val / maxValue) * height;
                    const x = i * dx - barWidth / 2;
                    const y = height - h;
                    return (
                      <rect 
                        key={`bar-${i}`}
                        x={x} y={y} width={barWidth} height={h}
                        fill="url(#meetingGrad)"
                        rx="4"
                        className="transition-all duration-500"
                      />
                    );
                  })}
                  
                  {/* Line for Action Items Completed */}
                  <path d={actionPath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" className="transition-all duration-500" />
                  {chartData.map((m, i) => {
                    const x = i * dx;
                    const y = height - (m.actionItemsCompleted / maxValue) * height;
                    return (
                      <circle key={`dot-${i}`} cx={x} cy={y} r="4" fill="#6366f1" stroke="white" strokeWidth="2" />
                    );
                  })}
                </>
              );
            }

            // Each metric is its own independent line — no stacking.
            const praiseP     = getPath(m => m.praise);
            const improvementP = getPath(m => m.improvement);
            const correctionP  = getPath(m => m.warning);

            return (
              <>
                {filterType === 'ALL' && chartData.map((m, i) => {
                  const barWidth = 16;
                  const val = m.meetings;
                  const h = (val / maxValue) * height;
                  const x = i * dx - barWidth / 2;
                  const y = height - h;
                  return (
                    <rect 
                      key={`bar-${i}`}
                      x={x} y={y} width={barWidth} height={h}
                      fill="url(#meetingGrad)"
                      rx="3"
                      className="transition-all duration-500 opacity-60 hover:opacity-100"
                    />
                  );
                })}

                {showPraise && <path d={fillPath(praiseP)}      fill="url(#praiseGrad)" className="transition-all duration-500 opacity-30" />}
                {showImprovement && <path d={fillPath(improvementP)} fill="url(#improveGrad)" className="transition-all duration-500 opacity-30" />}
                {showCorrection && <path d={fillPath(correctionP)}  fill="url(#warningGrad)" className="transition-all duration-500 opacity-30" />}

                {showPraise && <path d={praiseP}      fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" className="transition-all duration-500" />}
                {showImprovement && <path d={improvementP} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" className="transition-all duration-500" />}
                {showCorrection && <path d={correctionP}  fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" className="transition-all duration-500" />}
              </>
            );
          })()}
        </svg>

        {/* Legend / X-Axis Labels */}
        <div className="absolute inset-0 flex justify-between items-end pointer-events-none px-0">
          {chartData.map((m, i) => (
            <div key={i} className="flex flex-col items-center gap-2 group relative pointer-events-auto">
              <div className="w-px h-64 bg-transparent group-hover:bg-indigo-50 transition-colors relative">
                <div className="absolute -top-36 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-4 py-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl z-20 space-y-1.5 border border-white/10">
                  <p className="text-gray-400 mb-1">{m.name} {m.year}</p>
                  {!isMeetingOnly ? (
                    <>
                      {showPraise && (
                        <div className="flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Praise</div>
                          <span className="font-black">{m.praise}</span>
                        </div>
                      )}
                      {showImprovement && (
                        <div className="flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Improvement</div>
                          <span className="font-black">{m.improvement}</span>
                        </div>
                      )}
                      {showCorrection && (
                        <div className="flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /> Correction</div>
                          <span className="font-black">{m.warning}</span>
                        </div>
                      )}
                      {filterType === 'ALL' && (
                        <div className="flex items-center gap-3 justify-between border-t border-white/10 pt-1.5 mt-1.5">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Meetings</div>
                          <span className="font-black">{m.meetings}</span>
                        </div>
                      )}
                      {!showPraise && !showImprovement && !showCorrection && (
                        <div className="text-gray-500 italic text-[10px] text-center">No metrics selected</div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Meetings</div>
                        <span className="font-black">{m.meetings}</span>
                      </div>
                      <div className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400" /> Total Tasks</div>
                        <span className="font-black">{m.totalActionItems}</span>
                      </div>
                      <div className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Tasks Done</div>
                        <span className="font-black">{m.actionItemsCompleted}</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-indigo-600" />
                </div>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter bg-white px-2 mb-[-24px] z-20">
                {m.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
const MeetingStats = ({ total, completed, isManagerView, departmentName, employeeName }: { total: number, completed: number, isManagerView: boolean, departmentName?: string, employeeName?: string }) => {
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  
  const headerLabel = employeeName 
    ? `${employeeName}'s Action Items` 
    : isManagerView 
      ? `${departmentName || 'Department'} Action Items` 
      : 'Company-Wide Action Items';

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{headerLabel}</p>
        <h3 className="text-3xl font-black text-gray-900">{total} <span className="text-base font-bold text-gray-400">Tasks</span></h3>
        <p className="text-xs text-gray-500 font-medium">
          {completed} / {total} completed &nbsp;·&nbsp; {completionRate}% done
        </p>
      </div>
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
          <circle 
            cx="48" cy="48" r={radius} 
            stroke="currentColor" strokeWidth="10" 
            fill="transparent" className="text-gray-100" 
          />
          <circle 
            cx="48" cy="48" r={radius} 
            stroke="currentColor" strokeWidth="10" 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={circumference - (circumference * completionRate) / 100} 
            strokeLinecap="round"
            className="text-blue-600 transition-all duration-1000 ease-out" 
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-blue-600">{completionRate}%</span>
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Done</span>
        </div>
      </div>
    </div>
  );
};

const AdminStats = ({ history, isManagerView, departmentName, employeeName }: { history: any[], isManagerView?: boolean, departmentName?: string, employeeName?: string }) => {
  // Backend returns one deduped row per entity with up-to-date feedbackType.
  const feedbacks = history.filter(h => h.sourceType === 'FEEDBACK');
  const total = feedbacks.length;

  const praise = feedbacks.filter(h => h.feedbackType === 'PRAISE').length;
  const improvement = feedbacks.filter(h => h.feedbackType === 'IMPROVEMENT').length;
  const correction = feedbacks.filter(h => h.feedbackType === 'WARNING').length;

  const pPerc = total > 0 ? Math.round((praise / total) * 100) : 0;
  const iPerc = total > 0 ? Math.round((improvement / total) * 100) : 0;
  const cPerc = total > 0 ? Math.round((correction / total) * 100) : 0;

  const label = employeeName ? `${employeeName}'s Sentiment` : isManagerView ? `${departmentName} Sentiment` : 'Company-Wide Sentiment';

  const radius = 38;
  const stroke = 9;
  const circumference = 2 * Math.PI * radius;
  const gap = 2;
  const gapFrac = gap / 360;

  const pFrac = total > 0 ? praise / total : 0;
  const iFrac = total > 0 ? improvement / total : 0;
  const cFrac = total > 0 ? correction / total : 0;

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Feedback Sentiment</p>
          <p className="text-sm font-black text-gray-900 mt-0.5 truncate max-w-[160px]">{label}</p>
        </div>
        <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{total} total</span>
      </div>

      {/* Donut Chart centered with total inside */}
      <div className="flex justify-center">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} stroke="#f3f4f6" strokeWidth={stroke} fill="transparent" />
            {total === 0 ? (
              <circle cx="48" cy="48" r={radius} stroke="#e5e7eb" strokeWidth={stroke} fill="transparent"
                strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * 0.25} />
            ) : (
              <>
                {/* Praise arc — starts at 12 o'clock */}
                <circle cx="48" cy="48" r={radius} stroke="#10b981" strokeWidth={stroke} fill="transparent"
                  strokeDasharray={`${pFrac * circumference} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="butt"
                  style={{ transformOrigin: '48px 48px', transform: `rotate(0deg)` }}
                  className="transition-all duration-1000" />
                {/* Improvement arc — rotated to start after Praise */}
                <circle cx="48" cy="48" r={radius} stroke="#fbbf24" strokeWidth={stroke} fill="transparent"
                  strokeDasharray={`${iFrac * circumference} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="butt"
                  style={{ transformOrigin: '48px 48px', transform: `rotate(${pFrac * 360}deg)` }}
                  className="transition-all duration-1000" />
                {/* Correction arc — rotated to start after Praise + Improvement */}
                <circle cx="48" cy="48" r={radius} stroke="#f43f5e" strokeWidth={stroke} fill="transparent"
                  strokeDasharray={`${cFrac * circumference} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="butt"
                  style={{ transformOrigin: '48px 48px', transform: `rotate(${(pFrac + iFrac) * 360}deg)` }}
                  className="transition-all duration-1000" />
              </>
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-gray-900">{total}</span>
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">feedbacks</span>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-gray-600">Praise</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-900">{praise}</span>
              <span className="text-[9px] font-bold text-gray-400">{pPerc}%</span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${pPerc}%` }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold text-gray-600">Improvement</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-900">{improvement}</span>
              <span className="text-[9px] font-bold text-gray-400">{iPerc}%</span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${iPerc}%` }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[10px] font-bold text-gray-600">Correction</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-900">{correction}</span>
              <span className="text-[9px] font-bold text-gray-400">{cPerc}%</span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${cPerc}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Combined Stats card: Feedback + Meetings in one view ─────────────────────
const CombinedStats = ({
  history, meetingTotal, meetingCompleted, employeeName, departmentName
}: {
  history: any[];
  meetingTotal: number;
  meetingCompleted: number;
  employeeName?: string;
  departmentName?: string;
}) => {
  const feedbackCount = history.filter(h => h.sourceType === 'FEEDBACK').length;
  const meetingCount  = history.filter(h => h.sourceType === 'MEETING').length;
  const total = feedbackCount + meetingCount;
  const completionRate = meetingTotal > 0 ? Math.round((meetingCompleted / meetingTotal) * 100) : 0;
  const label = employeeName ? `${employeeName}'s Activity` : departmentName ? `${departmentName} Activity` : 'Department Activity';

  const bars = [
    { label: 'Feedback', value: feedbackCount, color: '#10b981' },
    { label: 'Meetings', value: meetingCount,  color: '#2563eb' },
  ];

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-5 h-full">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-5xl font-black text-gray-900 tabular-nums">{total}</h3>
        <p className="text-xs text-gray-400 font-medium">Total published interactions</p>
      </div>

      <div className="space-y-3 flex-1">
        {bars.map(({ label: l, value, color }) => (
          <div key={l} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{l}</span>
              </div>
              <span className="text-[11px] font-black text-gray-700">{value}</span>
            </div>
            <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%', background: color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Action Items</p>
          <p className="text-lg font-black text-gray-900">{completionRate}% Done</p>
        </div>
        <div className="relative w-12 h-12">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-gray-100" />
            <circle
              cx="24" cy="24" r="18"
              stroke="currentColor" strokeWidth="5" fill="transparent"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - completionRate / 100)}`}
              strokeLinecap="round"
              className="text-blue-500 transition-all duration-1000 ease-out"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

// ─── Special Manager-Tracking Components ─────────────────────────────────────

const ManagerialActivityChart = ({ history, managerName, managerId, timeRange, onTimeRangeChange, filterType }: { history: any[], managerName: string, managerId: number, timeRange: number, onTimeRangeChange: (val: number) => void, filterType: string }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const chartData = [];
  
  for (let i = timeRange - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    chartData.push({ name: months[d.getMonth()], month: d.getMonth(), year: d.getFullYear(), praise: 0, improvement: 0, correction: 0, meetings: 0 });
  }

  // Use a Set to track unique entities per month to avoid double-counting life-cycle events
  const uniqueMeetingsPerMonth = new Map<string, Set<number>>();
  const uniqueFeedbacksPerMonth = new Map<string, Set<number>>();

  history.forEach(h => {
    if (h.performerId !== managerId) return;
    const date = new Date(h.createdAt);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const slot = chartData.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
    if (!slot) return;

    if (h.sourceType === 'MEETING') {
      if (!uniqueMeetingsPerMonth.has(monthKey)) uniqueMeetingsPerMonth.set(monthKey, new Set());
      const meetingSet = uniqueMeetingsPerMonth.get(monthKey)!;
      
      if (!meetingSet.has(h.sourceId)) {
        meetingSet.add(h.sourceId);
        slot.meetings++;
      }
    } else if (h.sourceType === 'FEEDBACK') {
      if (!uniqueFeedbacksPerMonth.has(monthKey)) uniqueFeedbacksPerMonth.set(monthKey, new Set());
      const feedbackSet = uniqueFeedbacksPerMonth.get(monthKey)!;

      if (!feedbackSet.has(h.sourceId)) {
        feedbackSet.add(h.sourceId);
        const type = h.feedbackType || 'PRAISE';
        if (type === 'PRAISE') slot.praise++;
        else if (type === 'IMPROVEMENT') slot.improvement++;
        else if (type === 'WARNING') slot.correction++;
      }
    }
  });

  const isMeetingOnly = filterType === 'MEETING';
  const isFeedbackOnly = filterType === 'FEEDBACK';

  const maxValue = Math.max(
    ...chartData.flatMap(m => {
      if (isMeetingOnly) return [m.meetings];
      if (isFeedbackOnly) return [m.praise, m.improvement, m.correction];
      return [m.praise, m.improvement, m.correction, m.meetings];
    }), 
    5
  );

  const title = isMeetingOnly ? 'Meeting Frequency' : isFeedbackOnly ? 'Feedback Distribution' : 'Activity Distribution';

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 h-full">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Managerial Output</p>
          <h3 className="text-xl font-black text-gray-900">{title}: {managerName}</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden md:flex gap-4">
            {(filterType === 'ALL' || isFeedbackOnly) && (
              <>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[8px] font-black uppercase text-gray-400">Praise</span></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[8px] font-black uppercase text-gray-400">Improve</span></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /><span className="text-[8px] font-black uppercase text-gray-400">Correct</span></div>
              </>
            )}
            {(filterType === 'ALL' || isMeetingOnly) && (
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /><span className="text-[8px] font-black uppercase text-gray-400">Meetings</span></div>
            )}
          </div>
          <select value={timeRange} onChange={(e) => onTimeRangeChange(Number(e.target.value))} className="px-4 py-2 bg-gray-50 border-none rounded-lg text-[11px] font-black outline-none">
            <option value={3}>3 Months</option><option value={6}>6 Months</option><option value={12}>12 Months</option>
          </select>
        </div>
      </div>
      <div className="relative h-64 flex items-end justify-between gap-2 px-2">
         {/* Y-Axis Grid Lines */}
         {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} className="absolute w-full border-t border-gray-50 z-0" style={{ bottom: `${p * 100}%` }}>
            <span className="absolute -left-6 -top-2 text-[8px] font-black text-gray-300">{Math.round(p * maxValue)}</span>
          </div>
        ))}

        {chartData.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
            {/* Tooltip */}
            <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-indigo-600 text-white p-3 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 min-w-[120px] scale-90 group-hover:scale-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 border-b border-white/10 pb-1">{m.name} {m.year}</p>
              <div className="space-y-1.5">
                {(filterType === 'ALL' || isFeedbackOnly) && (
                  <>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase">Praise</span>
                      <span className="text-[10px] font-black">{m.praise}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[9px] font-bold text-amber-400 uppercase">Improve</span>
                      <span className="text-[10px] font-black">{m.improvement}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[9px] font-bold text-rose-400 uppercase">Correct</span>
                      <span className="text-[10px] font-black">{m.correction}</span>
                    </div>
                  </>
                )}
                {(filterType === 'ALL' || isMeetingOnly) && (
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[9px] font-bold text-blue-400 uppercase">Meetings</span>
                    <span className="text-[10px] font-black">{m.meetings}</span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-600 rotate-45" />
            </div>

            {/* Grouped Bars Container */}
            <div className="w-full h-48 flex items-end justify-center gap-0.5 px-1 pb-1 border-b border-gray-50">
              {(filterType === 'ALL' || isFeedbackOnly) && (
                <>
                  <div 
                    style={{ height: `${Math.max((m.praise/maxValue)*100, 2)}%` }} 
                    className="flex-1 max-w-[8px] bg-emerald-500 rounded-t-sm transition-all duration-500 hover:brightness-110 shadow-sm" 
                  />
                  <div 
                    style={{ height: `${Math.max((m.improvement/maxValue)*100, 2)}%` }} 
                    className="flex-1 max-w-[8px] bg-amber-400 rounded-t-sm transition-all duration-500 hover:brightness-110 shadow-sm" 
                  />
                  <div 
                    style={{ height: `${Math.max((m.correction/maxValue)*100, 2)}%` }} 
                    className="flex-1 max-w-[8px] bg-rose-500 rounded-t-sm transition-all duration-500 hover:brightness-110 shadow-sm" 
                  />
                </>
              )}
              {(filterType === 'ALL' || isMeetingOnly) && (
                <div 
                  style={{ height: `${Math.max((m.meetings/maxValue)*100, 2)}%` }} 
                  className="flex-1 max-w-[8px] bg-blue-500 rounded-t-sm transition-all duration-500 hover:brightness-110 shadow-sm" 
                />
              )}
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase transition-colors group-hover:text-indigo-600">{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ManagerActionStats = ({ history, managerId, filterType }: { history: any[], managerId: number, filterType: string }) => {
  const isFeedbackOnly = filterType === 'FEEDBACK';
  const isMeetingOnly = filterType === 'MEETING';

  if (isFeedbackOnly) {
    // Deduplicate by sourceId — keep only ONE row per unique feedback (the most recent),
    // so that edit/update events don't inflate the count.
    const managerFeedbackRows = history.filter(h => h.performerId === managerId && h.sourceType === 'FEEDBACK');
    const latestBySource = new Map<number, any>();
    managerFeedbackRows.forEach(h => {
      const existing = latestBySource.get(h.sourceId);
      if (!existing || new Date(h.createdAt) > new Date(existing.createdAt)) {
        latestBySource.set(h.sourceId, h);
      }
    });
    const uniqueFeedbacks = Array.from(latestBySource.values());

    const praise = uniqueFeedbacks.filter(h => h.feedbackType === 'PRAISE').length;
    const improvement = uniqueFeedbacks.filter(h => h.feedbackType === 'IMPROVEMENT').length;
    const correction = uniqueFeedbacks.filter(h => h.feedbackType === 'WARNING').length;
    const total = praise + improvement + correction;

    return (
      <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col justify-between h-full shadow-xl shadow-indigo-100">
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Feedback Output</p>
            <h3 className="text-4xl font-black">{total}</h3>
            <p className="text-xs text-gray-400 font-medium italic">Total feedback entries given.</p>
          </div>
          
          <div className="space-y-3">
            {[
              { label: 'Praise', count: praise, color: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Improvement', count: improvement, color: 'bg-amber-400', text: 'text-amber-400' },
              { label: 'Correction', count: correction, color: 'bg-rose-500', text: 'text-rose-400' }
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-gray-400">{item.label}</span>
                  <span className={item.text}>{item.count}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sentiment Balance</p>
        </div>
      </div>
    );
  }

  // Default / Meeting View (Quality Control) - Deduplicate re-opens per unique action item
  const uniqueReopens = new Set<string>();
  history.forEach(h => {
    if (h.performerId === managerId && h.title.includes('Re-opened')) {
      uniqueReopens.add(`${h.sourceId}-${h.description}`);
    }
  });
  const reopens = uniqueReopens.size;

  return (
    <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col justify-between h-full shadow-xl shadow-indigo-100">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quality Control</p>
        <h3 className="text-4xl font-black">{reopens}</h3>
        <p className="text-xs text-gray-400 font-medium italic">Action items re-opened for revision.</p>
      </div>
      <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-rose-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Revision Frequency</p>
      </div>
    </div>
  );
};

export const PerformanceHistoryManagerPage = () => {
  const { user } = useAuth();
  const isGovernanceMode = false; // Hardcoded for this page
  const { data: departments } = useGetActiveDepartmentsQuery();
  const { data: employeeData, isLoading: isEmpsLoading } = useGetEmployeesQuery({ page: 0, size: 1000, excludeSelf: true });
  const employees = (employeeData?.content || []).filter(emp => emp.id !== user?.id);

  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>(user?.currentDepartmentId || '');
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<'ALL' | 'FEEDBACK' | 'MEETING'>('ALL');

  const [managerPerspective, setManagerPerspective] = useState<'conducted' | 'received'>('conducted');
  const [managerTimeRange, setManagerTimeRange] = useState(6);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Auto-select and lock department for managers
  React.useEffect(() => {
    if (user?.currentDepartmentId) {
      setSelectedDeptId(user.currentDepartmentId);
    }
  }, [user?.currentDepartmentId]);

  const selectedEmployee = employees?.find(e => e.id === selectedEmpId);
  const isManagerSelected = selectedEmployee?.roles?.some(r => r.replace("ROLE_", "") === 'MANAGER');

  const { data: employeeHistoryResponse, isLoading: isEmpHistoryLoading } = useGetPerformanceHistoryByEmployeeQuery(
    { 
      employeeId: Number(selectedEmpId), 
      sourceType: filterType,
      onlyByManager: selectedEmpId === '' 
        ? undefined 
        : (isManagerSelected && managerPerspective === 'conducted' ? false : true),
      isConducted: selectedEmpId === ''
        ? undefined
        : (isManagerSelected && managerPerspective === 'conducted' ? true : false),
      page: currentPage - 1, 
      size: itemsPerPage 
    }, 
    { skip: !selectedEmpId }
  );

  const { data: globalHistoryResponse, isLoading: isGlobalHistoryLoading } = useGetAllPerformanceHistoryQuery(
    { 
      sourceType: filterType,
      departmentId: Number(selectedDeptId),
      page: currentPage - 1, 
      size: itemsPerPage 
    },
    { skip: !!selectedEmpId }
  );

  // Always fetch both so both chart types are ready without waiting for filter change
  const { data: analyticsData } = useGetPerformancePulseQuery({
    departmentId: Number(selectedDeptId),
    employeeId: selectedEmpId === '' ? undefined : Number(selectedEmpId),
    onlyByManager: selectedEmpId === '' 
      ? undefined 
      : (isManagerSelected && managerPerspective === 'conducted' ? false : true)
  });

  const { data: meetingPulseData } = useGetMeetingPulseQuery({
    departmentId: Number(selectedDeptId),
    employeeId: selectedEmpId === '' ? undefined : Number(selectedEmpId),
    onlyByManager: selectedEmpId === '' 
      ? undefined 
      : (isManagerSelected && managerPerspective === 'conducted' ? false : true)
  });

  const managerChartHistory = useMemo(() => {
    if (!selectedEmpId) return [];
    if (meetingPulseData?.actionHistory) {
      return [...meetingPulseData.actionHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (analyticsData) {
      return analyticsData
        .filter(h => h.performerId === Number(selectedEmpId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  }, [analyticsData, meetingPulseData, selectedEmpId]);

  const receivedAnalyticsData = useMemo(() => {
    if (!selectedEmpId || !analyticsData) return [];
    return analyticsData.filter(h => h.employeeId === Number(selectedEmpId));
  }, [analyticsData, selectedEmpId]);

  // analyticsData comes from findLatestStateByEmployee which includes all roles
  // (employee.id, manager.id, performer.id, createdBy). Filtering to sourceType MEETING
  // and employeeId === selectedEmpId gives meetings WHERE the selected person is the
  // EMPLOYEE (i.e. meetings they received). meetingPulseData.meetingHistory only has
  // performer-side (conducted) history for managers, so it cannot be used here.
  const receivedMeetingHistory = useMemo(() => {
    if (!selectedEmpId || !analyticsData) return [];
    return analyticsData.filter((h: any) =>
      h.sourceType === 'MEETING' && h.employeeId === Number(selectedEmpId)
    );
  }, [analyticsData, selectedEmpId]);

  const receivedActionItems = useMemo(() => {
    if (!selectedEmpId || !meetingPulseData?.actionItems) return [];
    return meetingPulseData.actionItems.filter((ai: any) => ai.assignedToId === Number(selectedEmpId));
  }, [meetingPulseData, selectedEmpId]);

  // Action items from meetings the selected manager CONDUCTED — assigned to their subordinates
  const conductedActionItems = useMemo(() => {
    if (!selectedEmpId || !meetingPulseData?.actionItems) return [];
    return meetingPulseData.actionItems.filter((ai: any) => ai.assignedToId !== Number(selectedEmpId));
  }, [meetingPulseData, selectedEmpId]);

  const selectedDeptName = departments?.find(d => d.id === selectedDeptId)?.departmentName;
  const userRank = user?.levelRank ?? 99;
  const filteredEmployees = employees?.filter(emp => {
    if (selectedDeptName && emp.currentDepartmentName !== selectedDeptName) {
      return false;
    }
    const empRank = emp.levelRank ?? 99;
    return empRank >= userRank;
  }) || [];


  const historyResponse = selectedEmpId ? employeeHistoryResponse : globalHistoryResponse;
  const isHistoryLoading = selectedEmpId ? isEmpHistoryLoading : isGlobalHistoryLoading;
  const history = historyResponse?.content || [];

  const totalItems = historyResponse?.totalElements || 0;
  const totalPages = historyResponse?.totalPages || 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + history.length;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const selectedEmployeeName = employees?.find(e => e.id === selectedEmpId)?.staffName;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-2">
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>Team Performance Tracker</h1>
        {/* <h1 className="text-4xl font-black text-gray-900 tracking-tight">Team Performance Tracker</h1> */}
        <p className="text-gray-500 font-medium">View chronological performance activities and continuous feedback for your team.</p>
      </header>

      {(analyticsData || meetingPulseData) && (
        <div className="space-y-6">
          {isManagerSelected && selectedEmpId ? (
            /* Manager-Specific Toggleable View */
            <div className="space-y-4">
              <div className="bg-white border border-gray-200/80 rounded-2xl p-1.5 flex gap-2 w-fit shadow-sm">
                <button
                  id="tab-conducted-activities"
                  onClick={() => setManagerPerspective('conducted')}
                  className={`px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-300 ${
                    managerPerspective === 'conducted'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Conducted Activities (Given)
                </button>
                <button
                  id="tab-individual-performance"
                  onClick={() => setManagerPerspective('received')}
                  className={`px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-300 ${
                    managerPerspective === 'received'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Individual Performance (Received)
                </button>
              </div>

              {managerPerspective === 'conducted' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                  <div className="lg:col-span-2">
                    <ManagerialActivityChart 
                      history={managerChartHistory}
                      managerName={selectedEmployeeName || ''}
                      managerId={Number(selectedEmpId)}
                      timeRange={managerTimeRange}
                      onTimeRangeChange={setManagerTimeRange}
                      filterType={filterType}
                    />
                  </div>
                  <div className="lg:col-span-1 flex flex-col gap-4">
                    <ManagerActionStats history={managerChartHistory} managerId={Number(selectedEmpId)} filterType={filterType} />
                    {(filterType === 'ALL' || filterType === 'MEETING') && (
                      <MeetingStats
                        total={conductedActionItems.length}
                        completed={conductedActionItems.filter((ai: any) => ai.status === 'DONE').length}
                        isManagerView={true}
                        employeeName={selectedEmployeeName}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                  <div className="lg:col-span-1">
                    {filterType === 'ALL' ? (
                      <CombinedStats
                        history={receivedAnalyticsData}
                        meetingTotal={receivedActionItems.length}
                        meetingCompleted={receivedActionItems.filter((ai: any) => ai.status === 'DONE').length}
                        employeeName={selectedEmployeeName}
                      />
                    ) : filterType === 'FEEDBACK' ? (
                      <AdminStats history={receivedAnalyticsData} employeeName={selectedEmployeeName} />
                    ) : (
                      <MeetingStats
                        total={receivedActionItems.length}
                        completed={receivedActionItems.filter((ai: any) => ai.status === 'DONE').length}
                        isManagerView={false}
                        employeeName={selectedEmployeeName}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-2">
                    <SentimentChart 
                      history={filterType === 'MEETING' ? receivedMeetingHistory : receivedAnalyticsData} 
                      employeeName={selectedEmployeeName} 
                      filterType={filterType}
                      actionItems={receivedActionItems}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standard Employee View / Department View */
            <div className="space-y-8">
              {filterType === 'ALL' ? (
                /* Combined single row */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="lg:col-span-1">
                    <CombinedStats
                      history={analyticsData || []}
                      meetingTotal={meetingPulseData?.totalActionItems || 0}
                      meetingCompleted={meetingPulseData?.completedActionItems || 0}
                      employeeName={selectedEmployeeName}
                      departmentName={user?.currentDepartmentName}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <SentimentChart
                      history={
                        selectedEmpId
                          // When an employee is selected: analyticsData (feedback, deduplicated)
                          // + meetingPulseData.meetingHistory (all meetings for that employee).
                          // SentimentChart deduplicates by sourceId internally, so no double-count.
                          ? [...(analyticsData || []), ...(meetingPulseData?.meetingHistory || [])]
                          // Department view: analyticsData already includes all meetings for the dept.
                          : (analyticsData || [])
                      }
                      employeeName={selectedEmployeeName}
                      filterType="ALL"
                      actionItems={meetingPulseData?.actionItems || []}
                    />
                  </div>
                </div>
              ) : filterType === 'FEEDBACK' ? (
                /* Feedback only */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="lg:col-span-1">
                    <AdminStats
                      history={(analyticsData || []).filter(h => h.sourceType === 'FEEDBACK')}
                      isManagerView={true}
                      departmentName={user?.currentDepartmentName}
                      employeeName={selectedEmployeeName}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <SentimentChart
                      history={(analyticsData || []).filter(h => h.sourceType === 'FEEDBACK')}
                      employeeName={selectedEmployeeName}
                      filterType="FEEDBACK"
                      actionItems={[]}
                    />
                  </div>
                </div>
              ) : (
                /* Meeting only */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="lg:col-span-1">
                    <MeetingStats
                      total={meetingPulseData?.totalActionItems || 0}
                      completed={meetingPulseData?.completedActionItems || 0}
                      isManagerView={true}
                      departmentName={user?.currentDepartmentName}
                      employeeName={selectedEmployeeName}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <SentimentChart
                      history={meetingPulseData?.meetingHistory || []}
                      employeeName={selectedEmployeeName}
                      filterType="MEETING"
                      actionItems={meetingPulseData?.actionItems || []}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 sticky top-0 z-20">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Department (Fixed)</label>
          <div className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-500 font-bold">
            {user?.currentDepartmentName || "Your Department"}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Team Member</label>
          <select
            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedEmpId}
            onChange={(e) => {
              setSelectedEmpId(e.target.value === '' ? '' : Number(e.target.value));
              setCurrentPage(1);
              setManagerPerspective('conducted');
            }}
            disabled={isEmpsLoading || employees.length === 0}
          >
            <option value="">{filteredEmployees.length > 0 ? "Choose an Employee..." : "No employees found"}</option>
            {filteredEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.staffName} ({emp.positionName})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Activity Type</label>
          <select
            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Feedback Activities</option>
            <option value="FEEDBACK">Feedback Only</option>
          </select>
        </div>
      </div>

      {/* History Timeline Section */}
      {selectedEmpId ? (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
              Performance Timeline
            </h2>
          </div>
          
          {isHistoryLoading ? (
            <div className="text-center py-20 text-gray-400 font-black uppercase tracking-widest animate-pulse">Analyzing Performance Data...</div>
          ) : history.length > 0 ? (
            <div className="flex flex-col h-full min-h-[500px]">
              <div className="flex-grow overflow-auto">
                <div className="relative border-l-2 border-indigo-100 ml-4 space-y-10 pb-24">
                  {history.map((record) => (
                    <div key={record.historyId} className="relative pl-10 group">
                      <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 border-white shadow-sm transition-transform duration-300 group-hover:scale-125 ${
                        record.sourceType === 'FEEDBACK' ? 'bg-emerald-500' : 'bg-blue-600'
                      }`} />
                      
                      <div className="bg-gray-50/50 rounded-[2rem] p-6 border border-gray-100 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-indigo-50/50 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                 record.sourceType === 'FEEDBACK' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                               }`}>
                                 {record.sourceType}
                               </span>
                               {record.feedbackType && (
                                 <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                   record.feedbackType === 'PRAISE' ? 'bg-green-100 text-green-700' :
                                   record.feedbackType === 'IMPROVEMENT' ? 'bg-amber-100 text-amber-700' :
                                   'bg-rose-100 text-rose-700'
                                 }`}>
                                   {record.feedbackType}
                                 </span>
                               )}
                               {record.tagName && (
                                 <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg">#{record.tagName}</span>
                               )}
                            </div>
                            <h3 className="font-black text-gray-900 text-xl tracking-tight leading-none">
                              {record.title}
                            </h3>
                            <p className="text-xs font-bold text-gray-400">
                              {record.performerId !== (selectedEmpId || user?.id) 
                                ? `Recorded by ${record.performerName}` 
                                : `Interaction with ${record.employeeId === (selectedEmpId || user?.id) ? record.managerName : record.employeeName}`
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(new Date(record.createdAt), 'MMMM d')}</p>
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">{format(new Date(record.createdAt), 'p')}</p>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white rounded-2xl border border-gray-100/50 shadow-inner-sm italic text-gray-600 leading-relaxed">
                          "{record.description}"
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 px-8 rounded-b-[2.5rem] flex items-center justify-between z-30">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex items-center gap-1 px-2">
                      {[...Array(totalPages)].map((_, i) => (
                        <button key={i+1} onClick={() => handlePageChange(i+1)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i+1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'}`}>
                          {i+1}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400 font-black uppercase tracking-widest">No activity found in the logs.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-24 bg-indigo-50/50 rounded-[2.5rem] border-2 border-dashed border-indigo-100/50 space-y-4">
          <div className="w-20 h-20 bg-indigo-100 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-400 shadow-sm">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <p className="text-indigo-400 font-black uppercase tracking-widest text-sm">Targeted Insights: Select a team member to begin analysis</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceHistoryManagerPage;
