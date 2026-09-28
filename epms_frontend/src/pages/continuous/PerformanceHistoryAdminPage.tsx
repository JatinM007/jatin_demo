import React, { useState, useMemo } from 'react';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { useGetEmployeesQuery } from '../../features/employee/employeeapi';
import { 
  useGetPerformanceHistoryByEmployeeQuery, 
  useGetAllPerformanceHistoryQuery,
  useGetPerformancePulseQuery,
  useGetMeetingPulseQuery,
  useGetDepartmentBenchmarksQuery,
  useGetGoalsPulseOverlayQuery
} from '../../features/continuous/continuousApi';
import type { 
  DepartmentBenchmarksResponse, 
  DepartmentBenchmarkItem,
  GoalsPulseOverlayResponse 
} from '../../features/continuous/continuousTypes';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  goalProgress?: number;
  goalTotal?: number;
  goalCompleted?: number;
}

// ─── Components ──────────────────────────────────────────────────────────────

const SentimentChart = ({ 
  history, 
  employeeName, 
  filterType, 
  actionItems = [],
  timeRange = 6,
  onTimeRangeChange,
  showGoalOverlay = true,
  onToggleGoalOverlay,
  goalOverlayData,
}: { 
  history: any[]; 
  employeeName?: string; 
  filterType: string; 
  actionItems?: any[];
  timeRange?: number;
  onTimeRangeChange?: (range: 3 | 6 | 12) => void;
  showGoalOverlay?: boolean;
  onToggleGoalOverlay?: () => void;
  goalOverlayData?: GoalsPulseOverlayResponse;
}) => {
  const [showPraise, setShowPraise] = useState(true);
  const [showImprovement, setShowImprovement] = useState(true);
  const [showCorrection, setShowCorrection] = useState(true);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData: MonthData[] = [];
  const now = new Date();
  
  for (let i = timeRange - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mMonth = d.getMonth();
    const mYear = d.getFullYear();

    // Goal overlay match
    const goalSlot = goalOverlayData?.monthlyOverlay?.find(
      gm => gm.month === mMonth && gm.year === mYear
    );

    chartData.push({
      name: months[mMonth],
      month: mMonth,
      year: mYear,
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
      totalActionItems: 0,
      goalProgress: goalSlot ? goalSlot.averageProgress : undefined,
      goalTotal: goalSlot ? goalSlot.totalGoals : undefined,
      goalCompleted: goalSlot ? goalSlot.completedGoals : undefined
    });
  }

  // Use a Set to track unique entities per month to avoid double-counting
  const uniqueMeetingsPerMonth = new Map<string, Set<number | string>>();
  const uniqueFeedbacksPerMonth = new Map<string, Set<number | string>>();

  history.forEach(h => {
    if (!h.createdAt) return;
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
          const type: string = (h.feedbackType || '').toUpperCase();
          if (type === 'PRAISE' || type === 'POSITIVE') monthData.praise++;
          else if (type === 'IMPROVEMENT' || type === 'CONSTRUCTIVE') monthData.improvement++;
          else if (type === 'WARNING' || type === 'NEGATIVE') monthData.warning++;
          else monthData.improvement++;
        }
      }
    }
  });

  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();

  actionItems.forEach(ai => {
    let targetMonth: { month: number; year: number } | undefined;
    if (ai.dueDate) {
      const dueDate = new Date(ai.dueDate);
      const slot = chartData.find(m => m.month === dueDate.getMonth() && m.year === dueDate.getFullYear());
      if (slot) targetMonth = slot;
    }
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
  const maxValue = isMeetingOnly
    ? Math.max(...chartData.map(m => Math.max(m.meetings, m.actionItemsCompleted)), 5)
    : Math.max(...chartData.flatMap(m => [showPraise ? m.praise : 0, showImprovement ? m.improvement : 0, showCorrection ? m.warning : 0]), 5);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {isMeetingOnly ? 'Meeting Volume' : 'Sentiment & Goal Distribution'}
          </p>
          <h3 className="text-xl font-black text-gray-900">
            {isMeetingOnly ? 'Meeting Frequency' : 'Historical Pulse'}{employeeName ? `: ${employeeName}` : ''}
          </h3>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          {onTimeRangeChange && (
            <select 
              value={timeRange} 
              onChange={(e) => onTimeRangeChange(Number(e.target.value) as any)}
              className="px-4 py-2 bg-transparent hover:bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-black text-gray-500 uppercase tracking-widest outline-none transition cursor-pointer appearance-none shadow-sm"
            >
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
          )}

          <div className="flex flex-wrap justify-end gap-x-4 gap-y-2 items-center">
            {!isMeetingOnly ? (
              <>
                <button onClick={() => setShowPraise(!showPraise)} className={`flex items-center gap-1.5 transition-all ${showPraise ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-[10px] font-black text-gray-400 uppercase">Praise</span>
                </button>
                <button onClick={() => setShowImprovement(!showImprovement)} className={`flex items-center gap-1.5 transition-all ${showImprovement ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                  <span className="text-[10px] font-black text-gray-400 uppercase">Improvement</span>
                </button>
                <button onClick={() => setShowCorrection(!showCorrection)} className={`flex items-center gap-1.5 transition-all ${showCorrection ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                  <span className="text-[10px] font-black text-gray-400 uppercase">Correction</span>
                </button>
                {onToggleGoalOverlay && (
                  <button 
                    onClick={onToggleGoalOverlay} 
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black transition-all ${
                      showGoalOverlay 
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm' 
                        : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-sm" />
                    <span>Goal Overlay</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                <span className="text-[10px] font-black text-gray-400 uppercase">Meetings</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative h-64 w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} className="absolute w-full border-t border-gray-50 z-0" style={{ bottom: `${p * 100}%` }}>
            <span className="absolute -left-8 -top-2 text-[8px] font-black text-gray-300">{Math.round(p * maxValue)}</span>
            {showGoalOverlay && !isMeetingOnly && (
              <span className="absolute -right-8 -top-2 text-[8px] font-black text-indigo-300">{Math.round(p * 100)}%</span>
            )}
          </div>
        ))}

        <svg className="w-full h-full overflow-visible z-10" preserveAspectRatio="none" viewBox="0 0 500 200">
          <defs>
            <linearGradient id="praiseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.4" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient>
            <linearGradient id="improveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" /><stop offset="100%" stopColor="#fbbf24" stopOpacity="0" /></linearGradient>
            <linearGradient id="warningGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" /><stop offset="100%" stopColor="#f43f5e" stopOpacity="0" /></linearGradient>
            <linearGradient id="meetingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient>
          </defs>

          {(() => {
            const width = 500;
            const height = 200;
            const points = chartData.length;
            const dx = width / (points - 1 || 1);

            const getPath = (getData: (m: MonthData) => number): string => {
              let path = '';
              let prevY = 0;
              chartData.forEach((m, i) => {
                const x = i * dx;
                const y = height - (getData(m) / maxValue) * height;
                if (i === 0) path = `M ${x} ${y}`;
                else {
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
              const meetingPath = getPath(m => m.meetings);
              const actionPath = getPath(m => m.actionItemsCompleted);
              return (
                <>
                  {chartData.map((m, i) => {
                    const bw = 20;
                    const h = (m.meetings / maxValue) * height;
                    return <rect key={i} x={i * dx - bw/2} y={height - h} width={bw} height={h} fill="url(#meetingGrad)" rx="4" />;
                  })}
                  <path d={actionPath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" />
                  {chartData.map((m, i) => <circle key={i} cx={i * dx} cy={height - (m.actionItemsCompleted / maxValue) * height} r="4" fill="#6366f1" stroke="white" strokeWidth="2" />)}
                </>
              );
            }

            const praiseP = getPath(m => m.praise);
            const improvementP = getPath(m => m.improvement);
            const correctionP = getPath(m => m.warning);

            // Goal progress path (0 to 100% scaled to height)
            let goalLinePath = '';
            if (showGoalOverlay) {
              chartData.forEach((m, i) => {
                const x = i * dx;
                const progressPct = m.goalProgress !== undefined ? m.goalProgress : 0;
                const y = height - (progressPct / 100) * height;
                if (i === 0) goalLinePath = `M ${x} ${y}`;
                else {
                  const prevX = (i - 1) * dx;
                  const cpX = prevX + (x - prevX) / 2;
                  const prevY = height - (((chartData[i-1].goalProgress || 0) / 100) * height);
                  goalLinePath += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
                }
              });
            }

            return (
              <>
                {showPraise && <path d={fillPath(praiseP)} fill="url(#praiseGrad)" />}
                {showImprovement && <path d={fillPath(improvementP)} fill="url(#improveGrad)" />}
                {showCorrection && <path d={fillPath(correctionP)} fill="url(#warningGrad)" />}
                {showPraise && <path d={praiseP} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />}
                {showImprovement && <path d={improvementP} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />}
                {showCorrection && <path d={correctionP} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />}

                {/* Goal & KPI Progress Line Overlay */}
                {showGoalOverlay && goalLinePath && (
                  <>
                    <path d={goalLinePath} fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" />
                    {chartData.map((m, i) => {
                      const y = height - (((m.goalProgress || 0) / 100) * height);
                      return (
                        <circle key={`goal-circle-${i}`} cx={i * dx} cy={y} r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                      );
                    })}
                  </>
                )}
              </>
            );
          })()}
        </svg>

        <div className="absolute inset-0 flex justify-between items-end pointer-events-none px-0">
          {chartData.map((m, i) => (
            <div key={i} className="flex flex-col items-center gap-2 group relative pointer-events-auto">
              <div className="w-px h-64 bg-transparent group-hover:bg-indigo-50 transition-colors relative">
                <div className="absolute -top-36 left-1/2 -translate-x-1/2 bg-indigo-900 text-white text-[10px] font-bold px-4 py-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl z-20 space-y-1.5 border border-white/10">
                  <p className="text-gray-300 mb-1">{m.name} {m.year}</p>
                  {!isMeetingOnly ? (
                    <>
                      {showPraise && <div className="flex items-center gap-3 justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Praise</div><span className="font-black">{m.praise}</span></div>}
                      {showImprovement && <div className="flex items-center gap-3 justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Improvement</div><span className="font-black">{m.improvement}</span></div>}
                      {showCorrection && <div className="flex items-center gap-3 justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /> Correction</div><span className="font-black">{m.warning}</span></div>}
                      {showGoalOverlay && m.goalProgress !== undefined && (
                        <div className="flex items-center gap-3 justify-between pt-1 border-t border-white/15">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400" /> Goal Progress</div>
                          <span className="font-black text-indigo-300">{m.goalProgress}% ({m.goalCompleted || 0}/{m.goalTotal || 0})</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Meetings</div><span className="font-black">{m.meetings}</span></div>
                      <div className="flex items-center gap-3 justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /> Total Tasks</div><span className="font-black">{m.totalActionItems}</span></div>
                      <div className="flex items-center gap-3 justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Tasks Done</div><span className="font-black">{m.actionItemsCompleted}</span></div>
                    </div>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-indigo-900" />
                </div>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter bg-white px-2 mb-[-24px] z-20">{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminStats = ({ history, isManagerView, departmentName, employeeName }: { history: any[], isManagerView?: boolean, departmentName?: string, employeeName?: string }) => {
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

      {/* Donut Chart */}
      <div className="flex justify-center">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} stroke="#f3f4f6" strokeWidth={stroke} fill="transparent" />
            {total === 0 ? (
              <circle cx="48" cy="48" r={radius} stroke="#e5e7eb" strokeWidth={stroke} fill="transparent"
                strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * 0.25} />
            ) : (
              <>
                <circle cx="48" cy="48" r={radius} stroke="#10b981" strokeWidth={stroke} fill="transparent"
                  strokeDasharray={`${pFrac * circumference} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="butt"
                  style={{ transformOrigin: '48px 48px', transform: `rotate(0deg)` }}
                  className="transition-all duration-1000" />
                <circle cx="48" cy="48" r={radius} stroke="#fbbf24" strokeWidth={stroke} fill="transparent"
                  strokeDasharray={`${iFrac * circumference} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="butt"
                  style={{ transformOrigin: '48px 48px', transform: `rotate(${pFrac * 360}deg)` }}
                  className="transition-all duration-1000" />
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

const MeetingStats = ({ total, completed, isManagerView, departmentName, employeeName }: { total: number, completed: number, isManagerView: boolean, departmentName?: string, employeeName?: string }) => {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const label = employeeName ? `${employeeName}'s Tasks` : 'Action Items';
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-black text-gray-900">{rate}% Done</h3>
        <p className="text-xs text-gray-500 font-medium">Task completion rate.</p>
      </div>
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90"><circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100" /><circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - (226 * rate) / 100} strokeLinecap="round" className="text-blue-600 transition-all duration-1000" /></svg>
      </div>
    </div>
  );
};

const CombinedStats = ({ history, meetingTotal, meetingCompleted, employeeName, departmentName }: { history: any[], meetingTotal: number, meetingCompleted: number, employeeName?: string, departmentName?: string }) => {
  const feedbackCount = history.filter(h => h.sourceType === 'FEEDBACK').length;
  const meetingCount = history.filter(h => h.sourceType === 'MEETING').length;
  const total = feedbackCount + meetingCount;
  const rate = meetingTotal > 0 ? Math.round((meetingCompleted / meetingTotal) * 100) : 0;
  const label = employeeName ? `${employeeName}'s Activity` : 'Department Activity';

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-5 h-full">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-5xl font-black text-gray-900">{total}</h3>
        <p className="text-xs text-gray-400 font-medium">Total published interactions</p>
      </div>
      <div className="space-y-3 flex-1">
        {[{ l: 'Feedback', v: feedbackCount, c: '#10b981' }, { l: 'Meetings', v: meetingCount, c: '#2563eb' }].map(b => (
          <div key={b.l} className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400"><span>{b.l}</span><span>{b.v}</span></div>
            <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(b.v / (total || 1)) * 100}%`, background: b.c }} /></div>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
        <div><p className="text-[10px] font-black text-gray-400 uppercase">Action Items</p><p className="text-lg font-black text-gray-900">{rate}% Done</p></div>
        <div className="relative w-12 h-12"><svg className="w-full h-full -rotate-90"><circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-gray-100" /><circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray={113} strokeDashoffset={113 - (113 * rate) / 100} strokeLinecap="round" className="text-blue-500 transition-all duration-1000" /></svg></div>
      </div>
    </div>
  );
};

// ─── Department Benchmark Comparison Component ───────────────────────────────

const DepartmentBenchmarkComparison = ({
  benchmarkData,
  selectedDeptId,
  onSelectDepartment,
  isLoading
}: {
  benchmarkData?: DepartmentBenchmarksResponse;
  selectedDeptId?: string;
  onSelectDepartment: (deptId: string) => void;
  isLoading: boolean;
}) => {
  const company = benchmarkData?.companyAverage;
  const depts = benchmarkData?.departments || [];

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comparative Analysis</p>
          </div>
          <h3 className="text-xl font-black text-gray-900">Department Benchmark Comparison</h3>
          <p className="text-xs text-gray-500 font-medium">Cross-department headcount density, continuous interaction volume, and goal completion rates.</p>
        </div>
      </div>

      {/* Company Average Banner */}
      {company && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-5 rounded-2xl border border-indigo-100/60 shadow-sm">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Org Headcount</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{company.totalHeadcount} <span className="text-xs font-bold text-gray-400">members</span></p>
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Activity Density</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">{company.activitiesPerEmployee} <span className="text-xs font-bold text-gray-400">/ emp</span></p>
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Activities</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{company.totalActivities} <span className="text-xs font-bold text-gray-400">events</span></p>
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Avg Goal Progress</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{company.averageGoalCompletionPercentage}% <span className="text-xs font-bold text-gray-400">({company.goalCompletionRate}% done)</span></p>
          </div>
        </div>
      )}

      {/* Benchmarks Table */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 font-black uppercase text-xs animate-pulse">Loading department metrics...</div>
      ) : depts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Department</th>
                <th className="pb-3 px-3">Headcount</th>
                <th className="pb-3 px-3">Activities</th>
                <th className="pb-3 px-3">Rate / Emp</th>
                <th className="pb-3 px-3 min-w-[140px]">Sentiment Breakdown</th>
                <th className="pb-3 px-3 min-w-[140px]">Goal Completion</th>
                <th className="pb-3 px-3 text-right">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {depts.map((d) => {
                const isSelected = selectedDeptId === d.departmentId;
                const s = d.sentimentDistribution;
                const g = d.goals;
                return (
                  <tr 
                    key={d.departmentId} 
                    className={`group transition hover:bg-indigo-50/30 ${isSelected ? 'bg-indigo-50/50 font-bold' : ''}`}
                  >
                    <td className="py-4 px-3 font-black text-gray-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span>{d.departmentName}</span>
                    </td>
                    <td className="py-4 px-3 text-gray-600 font-bold">
                      {d.headcount > 0 ? `${d.headcount} staff` : <span className="text-gray-300 italic">0 staff</span>}
                    </td>
                    <td className="py-4 px-3 font-black text-gray-900">
                      {d.totalActivities}
                    </td>
                    <td className="py-4 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                        d.activitiesPerEmployee >= (company?.activitiesPerEmployee || 1)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : d.activitiesPerEmployee > 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {d.activitiesPerEmployee} / emp
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      {d.totalActivities > 0 ? (
                        <div className="space-y-1">
                          <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-100">
                            <div style={{ width: `${s.praisePercentage}%` }} className="bg-emerald-500" title={`Praise: ${s.praisePercentage}%`} />
                            <div style={{ width: `${s.improvementPercentage}%` }} className="bg-amber-400" title={`Improvement: ${s.improvementPercentage}%`} />
                            <div style={{ width: `${s.warningPercentage}%` }} className="bg-rose-500" title={`Correction: ${s.warningPercentage}%`} />
                          </div>
                          <div className="flex justify-between text-[8px] font-black text-gray-400">
                            <span className="text-emerald-600">{s.praisePercentage}%</span>
                            <span className="text-amber-600">{s.improvementPercentage}%</span>
                            <span className="text-rose-600">{s.warningPercentage}%</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 italic">No feedback activity</span>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      {g.total > 0 ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-black">
                            <span className="text-gray-900">{g.averageCompletionPercentage}% avg</span>
                            <span className="text-gray-400">{g.completed}/{g.total} done</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 rounded-full transition-all duration-700" 
                              style={{ width: `${g.averageCompletionPercentage}%` }} 
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 italic">No active goals</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-right">
                      {isSelected ? (
                        <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">
                          Filtered
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectDepartment(d.departmentId)}
                          className="px-2.5 py-1 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg text-[10px] font-bold transition"
                        >
                          Filter
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-400 text-xs">No department data available.</div>
      )}
    </div>
  );
};

// ─── Goal & KPI Alignment Overlay Panel ─────────────────────────────────────

const GoalAndKpiAlignmentPanel = ({
  goalOverlayData,
  isLoading
}: {
  goalOverlayData?: GoalsPulseOverlayResponse;
  isLoading: boolean;
}) => {
  const summary = goalOverlayData?.summary;
  const goals = goalOverlayData?.goals || [];

  if (!goalOverlayData || goals.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outcome Correlation</p>
          </div>
          <h3 className="text-xl font-black text-gray-900">Goal & KPI Progress Overlay</h3>
          <p className="text-xs text-gray-500 font-medium">Real persisted completion metrics correlating check-in frequency with deliverables.</p>
        </div>
        {summary && (
          <div className="flex gap-4 items-center bg-purple-50/60 px-4 py-2 rounded-2xl border border-purple-100">
            <div>
              <p className="text-[9px] font-black text-purple-400 uppercase">Avg Goal Progress</p>
              <p className="text-lg font-black text-purple-900">{summary.averageCompletionPercentage}%</p>
            </div>
            <div className="h-6 w-px bg-purple-200" />
            <div>
              <p className="text-[9px] font-black text-purple-400 uppercase">Completion Rate</p>
              <p className="text-lg font-black text-purple-900">{summary.completionRate}% <span className="text-[10px] text-purple-600">({summary.completedGoals}/{summary.totalGoals})</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.slice(0, 6).map((g) => (
          <div key={g.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3 hover:shadow-sm transition">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-black text-gray-900 line-clamp-2">{g.title}</h4>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                g.status === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {g.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span className="font-bold text-gray-700">{g.employeeName}</span>
              <span>Due: {g.dueDate}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black">
                <span className="text-gray-400">Completion</span>
                <span className="text-indigo-600">{g.completionPercentage}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${g.completionPercentage}%` }} />
              </div>
            </div>
            {g.kpis && g.kpis.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Active KPIs</p>
                {g.kpis.map((k) => (
                  <div key={k.id} className="flex justify-between text-[9px]">
                    <span className="text-gray-600 truncate max-w-[140px]">{k.name}</span>
                    <span className="font-bold text-gray-900">{k.achievedValue} / {k.targetValue} {k.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Special Manager-Tracking Components ─────────────────────────────────────

const ManagerialActivityChart = ({ history, managerName, managerId, timeRange, onTimeRangeChange, filterType }: { history: any[], managerName: string, managerId: string | number, timeRange: number, onTimeRangeChange: (val: number) => void, filterType: string }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const chartData: { name: string; month: number; year: number; praise: number; improvement: number; correction: number; meetings: number }[] = [];
  
  for (let i = timeRange - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    chartData.push({ name: months[d.getMonth()], month: d.getMonth(), year: d.getFullYear(), praise: 0, improvement: 0, correction: 0, meetings: 0 });
  }

  const uniqueMeetingsPerMonth = new Map<string, Set<number | string>>();
  const uniqueFeedbacksPerMonth = new Map<string, Set<number | string>>();

  history.forEach(h => {
    if (String(h.performerId) !== String(managerId)) return;
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
        const type = (h.feedbackType || '').toUpperCase();
        if (type === 'PRAISE' || type === 'POSITIVE') slot.praise++;
        else if (type === 'IMPROVEMENT' || type === 'CONSTRUCTIVE') slot.improvement++;
        else if (type === 'WARNING' || type === 'NEGATIVE') slot.correction++;
        else slot.improvement++;
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
          <select value={timeRange} onChange={(e) => onTimeRangeChange(Number(e.target.value))} className="px-4 py-2 bg-gray-50 border-none rounded-lg text-[11px] font-black outline-none cursor-pointer">
            <option value={3}>3 Months</option><option value={6}>6 Months</option><option value={12}>12 Months</option>
          </select>
        </div>
      </div>
      <div className="relative h-64 flex items-end justify-between gap-2 px-2">
         {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} className="absolute w-full border-t border-gray-50 z-0" style={{ bottom: `${p * 100}%` }}>
            <span className="absolute -left-6 -top-2 text-[8px] font-black text-gray-300">{Math.round(p * maxValue)}</span>
          </div>
        ))}

        {chartData.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
            <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-indigo-900 text-white p-3 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 min-w-[120px] scale-90 group-hover:scale-100">
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
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-900 rotate-45" />
            </div>

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

const ManagerActionStats = ({ history, managerId, filterType }: { history: any[], managerId: string | number, filterType: string }) => {
  const isFeedbackOnly = filterType === 'FEEDBACK';

  if (isFeedbackOnly) {
    const managerFeedbackRows = history.filter(h => String(h.performerId) === String(managerId) && h.sourceType === 'FEEDBACK');
    const latestBySource = new Map<any, any>();
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
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Feedback Output</p>
            <h3 className="text-4xl font-black">{total}</h3>
            <p className="text-xs text-gray-300 font-medium italic">Total feedback entries given.</p>
          </div>
          
          <div className="space-y-3">
            {[
              { label: 'Praise', count: praise, color: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Improvement', count: improvement, color: 'bg-amber-400', text: 'text-amber-400' },
              { label: 'Correction', count: correction, color: 'bg-rose-500', text: 'text-rose-400' }
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-gray-300">{item.label}</span>
                  <span className={item.text}>{item.count}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Sentiment Balance</p>
        </div>
      </div>
    );
  }

  const reopens = history.filter(h => String(h.performerId) === String(managerId) && h.title.includes('Re-opened')).length;
  return (
    <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col justify-between h-full shadow-xl shadow-indigo-100">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Quality Control</p>
        <h3 className="text-4xl font-black">{reopens}</h3>
        <p className="text-xs text-gray-300 font-medium italic">Action items re-opened for revision.</p>
      </div>
      <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-rose-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Revision Frequency</p>
      </div>
    </div>
  );
};

// ─── Main Admin Page ─────────────────────────────────────────────────────────

export const PerformanceHistoryAdminPage = () => {
  const { isAdmin, isHR, accessToken } = useAuth();
  
  const { data: departments } = useGetDepartmentsQuery();
  const { data: employeeData, isLoading: isEmpsLoading } = useGetEmployeesQuery({ page: 0, size: 1000 });
  const employees = employeeData?.content || [];

  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [managerPerspective, setManagerPerspective] = useState<'conducted' | 'received'>('conducted');
  const [filterType, setFilterType] = useState<'ALL' | 'FEEDBACK' | 'MEETING'>('ALL');
  const [managerTimeRange, setManagerTimeRange] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Feature 2: Custom Date Range State
  const [datePreset, setDatePreset] = useState<'3M' | '6M' | '12M' | 'CUSTOM'>('6M');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return format(d, 'yyyy-MM-dd');
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  // Calculate effective date range
  const { effectiveStartDate, effectiveEndDate, isDateRangeValid } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    if (datePreset === '3M') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return { effectiveStartDate: format(d, 'yyyy-MM-dd'), effectiveEndDate: todayStr, isDateRangeValid: true };
    }
    if (datePreset === '6M') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return { effectiveStartDate: format(d, 'yyyy-MM-dd'), effectiveEndDate: todayStr, isDateRangeValid: true };
    }
    if (datePreset === '12M') {
      const d = new Date();
      d.setMonth(d.getMonth() - 12);
      return { effectiveStartDate: format(d, 'yyyy-MM-dd'), effectiveEndDate: todayStr, isDateRangeValid: true };
    }
    // CUSTOM
    const valid = Boolean(customStartDate && customEndDate && customEndDate >= customStartDate);
    return { effectiveStartDate: customStartDate, effectiveEndDate: customEndDate, isDateRangeValid: valid };
  }, [datePreset, customStartDate, customEndDate]);

  // Feature 1: Export State
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Feature 3: Goal Overlay State
  const [showGoalOverlay, setShowGoalOverlay] = useState(true);

  const selectedEmployee = employees?.find(e => String(e.id) === String(selectedEmpId));
  const selectedEmployeeName = selectedEmployee?.staffName;
  const isManagerSelected = selectedEmployee?.roles?.some(r => r.replace("ROLE_", "") === 'MANAGER');

  const auditPerspective = (selectedEmpId && isManagerSelected)
    ? (managerPerspective === 'conducted' ? 'given' : 'received')
    : (selectedEmpId ? 'received' : 'all');

  // Queries wired to date range and filters
  const { data: employeeHistoryResponse, isLoading: isEmpHistoryLoading } = useGetPerformanceHistoryByEmployeeQuery(
    { 
      employeeId: Number(selectedEmpId) || 0, 
      sourceType: filterType,
      isConducted: auditPerspective === 'given' ? true : (auditPerspective === 'received' ? false : undefined),
      page: currentPage - 1, 
      size: itemsPerPage 
    }, 
    { skip: !selectedEmpId }
  );

  const { data: globalHistoryResponse, isLoading: isGlobalHistoryLoading } = useGetAllPerformanceHistoryQuery(
    { 
      sourceType: filterType,
      departmentId: selectedDeptId || undefined,
      startDate: isDateRangeValid ? effectiveStartDate : undefined,
      endDate: isDateRangeValid ? effectiveEndDate : undefined,
      page: currentPage - 1, 
      size: itemsPerPage 
    },
    { skip: !!selectedEmpId }
  );

  const historyResponse = selectedEmpId ? employeeHistoryResponse : globalHistoryResponse;
  const isHistoryLoading = selectedEmpId ? isEmpHistoryLoading : isGlobalHistoryLoading;

  const { data: analyticsData } = useGetPerformancePulseQuery({
    departmentId: selectedDeptId || undefined,
    employeeId: selectedEmpId || undefined,
    startDate: isDateRangeValid ? effectiveStartDate : undefined,
    endDate: isDateRangeValid ? effectiveEndDate : undefined
  });

  const { data: meetingPulseData } = useGetMeetingPulseQuery({
    departmentId: selectedDeptId || undefined,
    employeeId: selectedEmpId || undefined,
    startDate: isDateRangeValid ? effectiveStartDate : undefined,
    endDate: isDateRangeValid ? effectiveEndDate : undefined
  });

  // Feature 4: Department Benchmarks Query
  const { data: benchmarkData, isLoading: isBenchmarkLoading } = useGetDepartmentBenchmarksQuery(
    isDateRangeValid ? { startDate: effectiveStartDate, endDate: effectiveEndDate } : undefined
  );

  // Feature 3: Goals Pulse Overlay Query
  const { data: goalOverlayData, isLoading: isGoalOverlayLoading } = useGetGoalsPulseOverlayQuery(
    isDateRangeValid ? {
      departmentId: selectedDeptId || undefined,
      employeeId: selectedEmpId || undefined,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate
    } : undefined
  );

  const managerChartHistory = useMemo(() => {
    if (!selectedEmpId) return [];
    const baseHistory = meetingPulseData?.actionHistory || analyticsData || [];
    return [...baseHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [analyticsData, meetingPulseData, selectedEmpId]);

  const receivedAnalyticsData = useMemo(() => {
    if (!selectedEmpId || !analyticsData) return [];
    return analyticsData.filter(h => String(h.employeeId) === String(selectedEmpId));
  }, [analyticsData, selectedEmpId]);

  const receivedMeetingHistory = useMemo(() => {
    if (!selectedEmpId || !analyticsData) return [];
    return analyticsData.filter((h: any) =>
      h.sourceType === 'MEETING' && String(h.employeeId) === String(selectedEmpId)
    );
  }, [analyticsData, selectedEmpId]);

  const receivedActionItems = useMemo(() => {
    if (!selectedEmpId || !meetingPulseData?.actionItems) return [];
    return meetingPulseData.actionItems.filter((ai: any) => String(ai.assignedToId) === String(selectedEmpId));
  }, [meetingPulseData, selectedEmpId]);

  const conductedActionItems = useMemo(() => {
    if (!selectedEmpId || !meetingPulseData?.actionItems) return [];
    return meetingPulseData.actionItems.filter((ai: any) => String(ai.assignedToId) !== String(selectedEmpId));
  }, [meetingPulseData, selectedEmpId]);

  const history = historyResponse?.content || [];
  const totalItems = historyResponse?.totalElements || 0;
  const totalPages = historyResponse?.totalPages || 0;
  const filteredAuditHistory = history;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Feature 1: Export Trigger Function
  const handleExport = async (formatType: 'csv' | 'pdf') => {
    if (!isDateRangeValid) {
      setExportError('Cannot export: End date cannot precede start date.');
      return;
    }
    try {
      if (formatType === 'csv') setIsExportingCsv(true);
      else setIsExportingPdf(true);
      setExportError(null);

      const params = new URLSearchParams();
      params.append('format', formatType);
      if (effectiveStartDate) params.append('startDate', effectiveStartDate);
      if (effectiveEndDate) params.append('endDate', effectiveEndDate);
      if (selectedDeptId) params.append('departmentId', selectedDeptId);
      if (selectedEmpId) params.append('employeeId', selectedEmpId);
      if (filterType && filterType !== 'ALL') params.append('sourceType', filterType);

      const response = await fetch(`/api/performance-history/export/?${params.toString()}`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access Denied: Super Admin or HR permissions required for export.');
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const stamp = format(new Date(), 'yyyyMMdd_HHmmss');
      a.download = `performance_pulse_report_${stamp}.${formatType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setExportError(err.message || 'An error occurred during export.');
    } finally {
      setIsExportingCsv(false);
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header & Export Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Super Admin Governance</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>The Global Pulse</h1>
          <p className="text-gray-500 text-sm font-medium">Real-time organizational performance, continuous feedback health & department benchmarks.</p>
        </div>

        {/* Feature 1: Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExportingCsv || !isDateRangeValid}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-xl font-bold text-xs shadow-sm transition hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download CSV report with activities, sentiment, benchmarks, and goals"
          >
            {isExportingCsv ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExportingPdf || !isDateRangeValid}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download PDF report with summary metrics, benchmarks, and audit trail"
          >
            {isExportingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* Export Error Alert */}
      {exportError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{exportError}</span>
          </div>
          <button onClick={() => setExportError(null)} className="text-rose-400 hover:text-rose-700">Dismiss</button>
        </div>
      )}

      {/* Feature 2: Filters & Custom Date Range Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Department Filter */}
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Department</label>
            <select
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 cursor-pointer"
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setSelectedEmpId('');
                setCurrentPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments?.map(dept => <option key={dept.id} value={String(dept.id)}>{dept.departmentName}</option>)}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Employee</label>
            <select
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 cursor-pointer"
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setCurrentPage(1);
                setManagerTimeRange(6);
                setManagerPerspective('conducted');
              }}
            >
              <option value="">All Employees</option>
              {employees.filter(emp => !selectedDeptId || String(emp.currentDepartmentId) === String(selectedDeptId)).map(emp => (
                <option key={emp.id} value={String(emp.id)}>{emp.staffName} ({emp.positionName || 'Staff'})</option>
              ))}
            </select>
          </div>

          {/* Activity Type Filter */}
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Activity Type</label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 cursor-pointer" 
              value={filterType} 
              onChange={(e) => { setFilterType(e.target.value as any); setCurrentPage(1); }}
            >
              <option value="ALL">All Feedback Activities</option>
              <option value="FEEDBACK">Continuous Feedback Only</option>
            </select>
          </div>

          {/* Date Range Preset Selector */}
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Date Range</label>
            <select
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 cursor-pointer"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
            >
              <option value="3M">Last 3 Months</option>
              <option value="6M">Last 6 Months</option>
              <option value="12M">Last 12 Months</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Feature 2: Custom Date Range Pickers & Validation */}
        {datePreset === 'CUSTOM' && (
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-12">Start:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-12">End:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            {!isDateRangeValid ? (
              <span className="text-[11px] font-black text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                End date cannot precede start date.
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                Range applied: {effectiveStartDate} to {effectiveEndDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Analytics Cards */}
      {(analyticsData || meetingPulseData) && (
        <div className="space-y-6">
          {isManagerSelected && selectedEmpId ? (
            /* Manager-Specific Toggleable View */
            <div className="space-y-4">
              <div className="bg-white border border-gray-200/80 rounded-2xl p-1.5 flex gap-2 w-fit shadow-sm">
                <button
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-700">
                  <div className="lg:col-span-2">
                    <ManagerialActivityChart 
                      history={managerChartHistory}
                      managerName={selectedEmployeeName || ''}
                      managerId={selectedEmpId}
                      timeRange={managerTimeRange}
                      onTimeRangeChange={setManagerTimeRange}
                      filterType={filterType}
                    />
                  </div>
                  <div className="lg:col-span-1 flex flex-col gap-4">
                    <ManagerActionStats history={managerChartHistory} managerId={selectedEmpId} filterType={filterType} />
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-700">
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
                      goalOverlayData={goalOverlayData}
                      showGoalOverlay={showGoalOverlay}
                      onToggleGoalOverlay={() => setShowGoalOverlay(!showGoalOverlay)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standard Employee/Global View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                {filterType === 'ALL' ? (
                  <CombinedStats
                    history={analyticsData || []}
                    meetingTotal={meetingPulseData?.totalActionItems || 0}
                    meetingCompleted={meetingPulseData?.completedActionItems || 0}
                    employeeName={selectedEmployeeName}
                  />
                ) : filterType === 'FEEDBACK' ? (
                  <AdminStats history={analyticsData || []} employeeName={selectedEmployeeName} />
                ) : (
                  <MeetingStats
                    total={meetingPulseData?.totalActionItems || 0}
                    completed={meetingPulseData?.completedActionItems || 0}
                    isManagerView={false}
                    employeeName={selectedEmployeeName}
                  />
                )}
              </div>
              <div className="lg:col-span-2">
                <SentimentChart 
                  history={filterType === 'MEETING' ? (meetingPulseData?.meetingHistory || []) : (analyticsData || [])} 
                  employeeName={selectedEmployeeName} 
                  filterType={filterType}
                  actionItems={meetingPulseData?.actionItems || []}
                  goalOverlayData={goalOverlayData}
                  showGoalOverlay={showGoalOverlay}
                  onToggleGoalOverlay={() => setShowGoalOverlay(!showGoalOverlay)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feature 3: Goal & KPI Alignment Overlay Panel */}
      {showGoalOverlay && (
        <GoalAndKpiAlignmentPanel 
          goalOverlayData={goalOverlayData}
          isLoading={isGoalOverlayLoading}
        />
      )}

      {/* Feature 4: Department Benchmark Comparison */}
      <DepartmentBenchmarkComparison 
        benchmarkData={benchmarkData}
        selectedDeptId={selectedDeptId}
        onSelectDepartment={(deptId) => {
          setSelectedDeptId(deptId);
          setSelectedEmpId('');
          setCurrentPage(1);
        }}
        isLoading={isBenchmarkLoading}
      />

      {/* Audit Log Table */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative min-h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-1 mb-8">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Audit Log / Transparent History</h2>
          <p className="text-xs text-gray-400 font-medium">Detailed historical record of all published continuous feedback.</p>
        </div>

        {isHistoryLoading ? (
          <div className="text-center py-20 text-gray-400 font-black uppercase animate-pulse">Analyzing Data...</div>
        ) : filteredAuditHistory.length > 0 ? (
          <>
            <div className="flex-grow overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase px-2">Timestamp</th>
                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase px-2">Participants</th>
                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase px-2">Direction</th>
                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase px-2">Tag/Type</th>
                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase px-2">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAuditHistory.map((record: any) => {
                    const isGiven = !selectedEmpId || String(record.performerId) === String(selectedEmpId);
                    return (
                      <tr key={record.historyId || record.id} className="group hover:bg-gray-50/50 transition">
                        <td className="py-4 px-2 text-[10px] font-bold text-gray-900 whitespace-nowrap">
                          {record.createdAt ? format(new Date(record.createdAt), 'MMM d, p') : 'Recent'}
                        </td>
                        <td className="py-4 px-2 text-xs font-black text-gray-900">
                          {record.performerName}
                          <span className="text-gray-400 font-bold block text-[10px]">to {record.employeeName}</span>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${
                            isGiven
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {isGiven
                              ? <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                              : <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            }
                            {isGiven ? 'Given' : 'Received'}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${record.sourceType === 'FEEDBACK' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{record.sourceType}</span>
                          {record.feedbackType && <span className="block text-[7px] font-black text-gray-400 mt-1">{record.feedbackType}</span>}
                        </td>
                        <td className="py-4 px-2 text-[10px] text-gray-600 italic max-w-xs truncate">"{record.description}"</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase">Page {currentPage} of {totalPages} &nbsp;·&nbsp; {filteredAuditHistory.length} records shown</span>
              <div className="flex gap-2">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 disabled:opacity-30"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-30"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: auditPerspective === 'given' ? '#ECFDF5' : auditPerspective === 'received' ? '#EEF2FF' : '#F9FAFB' }}>
              {auditPerspective === 'given'
                ? <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                : auditPerspective === 'received'
                ? <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                : <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              }
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No {auditPerspective !== 'all' ? auditPerspective + ' ' : ''}records found.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceHistoryAdminPage;
