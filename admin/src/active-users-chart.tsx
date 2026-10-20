import { useEffect, useState } from 'react';
import { api } from './api';

export type ActiveUserWindows = {
  day: number;
  week: number;
  month: number;
  threeMonths: number;
  sixMonths: number;
  year: number;
};

export const EMPTY_ACTIVE_USERS: ActiveUserWindows = {
  day: 0,
  week: 0,
  month: 0,
  threeMonths: 0,
  sixMonths: 0,
  year: 0,
};

type ActivityPeriod = 'week' | 'month' | 'quarter' | 'year';
type Trend = { buckets: Array<{ start: string; count: number }> };
const PERIODS = { week: 'Weekly', month: 'Monthly', quarter: 'Quarterly', year: 'Yearly' } as const;
function bucketLabel(start: string, period: ActivityPeriod) {
  const date = new Date(start);
  if (period === 'year') return String(date.getUTCFullYear());
  if (period === 'quarter') return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
  return date.toLocaleDateString('en-GB', { timeZone: 'UTC', ...(period === 'week' ? { day: 'numeric' as const } : {}), month: 'short', ...(period === 'month' ? { year: '2-digit' as const } : {}) });
}

function calculateScale(maxVal: number) {
  if (maxVal <= 0) return { max: 10, ticks: [0, 2, 4, 6, 8, 10] };
  if (maxVal <= 5) return { max: 5, ticks: [0, 1, 2, 3, 4, 5] };
  if (maxVal <= 10) return { max: 10, ticks: [0, 2, 4, 6, 8, 10] };
  if (maxVal <= 20) return { max: 20, ticks: [0, 5, 10, 15, 20] };
  if (maxVal <= 50) return { max: 50, ticks: [0, 10, 20, 30, 40, 50] };

  const rawStep = maxVal / 4;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const factor = rawStep / power;
  let step = power;
  if (factor > 5) step = 10 * power;
  else if (factor > 2) step = 5 * power;
  else if (factor > 1) step = 2 * power;

  const max = Math.ceil(maxVal / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return { max, ticks };
}

/** Distinct active accounts in consecutive calendar periods. */
export function ActiveUsersTrendChart() {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState<ActivityPeriod>('week');
  const [trend, setTrend] = useState<Trend | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setTrend(null); setError(''); setHoveredIndex(null);
    api<Trend>(`/api/admin/activity-trend?period=${period}`)
      .then(data => { if (current) setTrend(data); })
      .catch((e: Error) => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [period, retry]);
  const points = (trend?.buckets ?? []).map(bucket => ({
    label: bucketLabel(bucket.start, period), value: bucket.count, color: '#159a9c',
  }));
  const rawMax = Math.max(...points.map((p) => p.value), 0);
  const scale = calculateScale(rawMax);

  const width = 720;
  const height = 280;
  const pad = { top: 32, right: 20, bottom: 44, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const baselineY = pad.top + innerH;
  const colW = innerW / Math.max(1, points.length);
  const barW = Math.min(40, Math.max(20, colW * 0.48));

  const linePoints = points.map((p, i) => {
    const x = pad.left + i * colW + colW / 2;
    const y = p.value > 0 ? baselineY - (p.value / scale.max) * innerH : baselineY;
    return { x, y, point: p, index: i };
  });

  const smoothLinePath = linePoints.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');

  const smoothAreaPath =
    linePoints.length > 0
      ? `${smoothLinePath} L ${linePoints[linePoints.length - 1].x} ${baselineY} L ${linePoints[0].x} ${baselineY} Z`
      : '';

  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-navy">Active accounts</h4>
          <p className="text-[11px] text-muted mt-0.5">
            Distinct explorers and app accounts per period. Current period is incomplete (UTC).
          </p>
        </div>
        <label className="text-xs text-muted flex items-center gap-2">
          View
          <select aria-label="Activity period" value={period} onChange={e => setPeriod(e.target.value as ActivityPeriod)} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-navy">
            {Object.entries(PERIODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="inline-flex p-1 rounded-xl bg-surface-2 border border-border text-xs font-semibold shadow-2xs">
          <button
            type="button"
            aria-pressed={chartType === 'bar'}
            onClick={() => setChartType('bar')}
            className={`min-h-11 px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              chartType === 'bar' ? 'bg-surface text-navy shadow-xs font-bold' : 'text-muted hover:text-navy'
            }`}
            title="View as Bar Chart"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            <span>Bar Graph</span>
          </button>
          <button
            type="button"
            aria-pressed={chartType === 'line'}
            onClick={() => setChartType('line')}
            className={`min-h-11 px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              chartType === 'line' ? 'bg-surface text-navy shadow-xs font-bold' : 'text-muted hover:text-navy'
            }`}
            title="View as Line Chart"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>Line Graph</span>
          </button>
        </div>
      </div>

      {error ? <div role="alert" className="text-sm text-error">{error} <button type="button" className="underline min-h-11" onClick={() => setRetry(n => n + 1)}>Retry</button></div>
        : !trend ? <p role="status" className="py-16 text-center text-sm text-muted">Loading activity…</p> : <>
      {rawMax === 0 && <p className="text-sm text-muted">No recorded activity in these periods.</p>}
      <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[540px] h-auto select-none"
        role="img"
        aria-label={`${PERIODS[period]} active accounts: ${points.map(p => `${p.label}: ${p.value}`).join(', ')}`}
      >
        <defs>
          <linearGradient id="activeUsersArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#159a9c" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#159a9c" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {scale.ticks.map((tick) => {
          const y = baselineY - (tick / scale.max) * innerH;
          const isZero = tick === 0;
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + innerW}
                y2={y}
                stroke={isZero ? 'rgba(1, 31, 59, 0.28)' : 'rgba(1, 31, 59, 0.08)'}
                strokeWidth={isZero ? 1.5 : 1}
                strokeDasharray={isZero ? undefined : '3 3'}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-muted font-medium tabular-nums"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {chartType === 'bar'
          ? points.map((point, i) => {
              const colCenterX = pad.left + i * colW + colW / 2;
              const x = colCenterX - barW / 2;
              const isHovered = hoveredIndex === i;
              const barH = point.value > 0 ? Math.max(8, (point.value / scale.max) * innerH) : 0;
              const barY = baselineY - barH;
              const r = Math.min(6, barW / 2, barH / 2);
              const barPath =
                point.value > 0
                  ? `M ${x} ${baselineY}
                     L ${x} ${barY + r}
                     A ${r} ${r} 0 0 1 ${x + r} ${barY}
                     L ${x + barW - r} ${barY}
                     A ${r} ${r} 0 0 1 ${x + barW} ${barY + r}
                     L ${x + barW} ${baselineY}
                     Z`
                  : null;

              return (
                <g
                  key={point.label}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <rect
                    x={x}
                    y={pad.top}
                    width={barW}
                    height={innerH}
                    rx="6"
                    fill={isHovered ? 'rgba(1, 31, 59, 0.06)' : 'rgba(1, 31, 59, 0.02)'}
                  />
                  {barPath ? (
                    <path d={barPath} fill={point.color} opacity={isHovered ? 1 : 0.9} />
                  ) : (
                    <rect
                      x={x}
                      y={baselineY - 3}
                      width={barW}
                      height={3}
                      rx="1.5"
                      fill={point.color}
                      opacity="0.35"
                    />
                  )}
                  <text
                    x={colCenterX}
                    y={point.value > 0 ? barY - 8 : baselineY - 8}
                    textAnchor="middle"
                    className="text-[11px] font-bold fill-navy tabular-nums"
                  >
                    {point.value}
                  </text>
                  <text
                    x={colCenterX}
                    y={baselineY + 18}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-navy"
                  >
                    {point.label}
                  </text>
                </g>
              );
            })
          : (
            <g>
              {smoothAreaPath ? <path d={smoothAreaPath} fill="url(#activeUsersArea)" /> : null}
              {smoothLinePath ? (
                <path
                  d={smoothLinePath}
                  fill="none"
                  stroke="#159a9c"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {linePoints.map((lp) => {
                const isHovered = hoveredIndex === lp.index;
                return (
                  <g
                    key={lp.point.label}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(lp.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {isHovered ? (
                      <line
                        x1={lp.x}
                        y1={pad.top}
                        x2={lp.x}
                        y2={baselineY}
                        stroke="rgba(21, 154, 156, 0.3)"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    ) : null}
                    <circle
                      cx={lp.x}
                      cy={lp.y}
                      r={isHovered ? 6 : 4.5}
                      fill={lp.point.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={lp.x}
                      y={lp.y - 10}
                      textAnchor="middle"
                      className="text-[11px] font-bold fill-navy tabular-nums"
                    >
                      {lp.point.value}
                    </text>
                    <text
                      x={lp.x}
                      y={baselineY + 18}
                      textAnchor="middle"
                      className={`text-[10px] font-bold ${isHovered ? 'fill-teal' : 'fill-navy'}`}
                    >
                      {lp.point.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
      </svg>
      </div>
      <p className="text-xs text-muted">Based on recorded score activity and latest device presence; historical visits without a recorded event may be missing.</p>
      <details className="text-xs text-muted"><summary className="cursor-pointer py-2">View data</summary>
        <table className="w-full text-left"><thead><tr><th>Period starts (UTC)</th><th>Active accounts</th></tr></thead><tbody>
          {trend.buckets.map(bucket => <tr key={bucket.start}><td>{bucket.start.slice(0, 10)}</td><td>{bucket.count}</td></tr>)}
        </tbody></table>
      </details>
      </>}
    </div>
  );
}
