import { useState, type ReactNode } from 'react';

export function getDashboardGreeting(name: string) {
  const hour = new Date().getHours();
  let displayName = (name || '').trim();
  if (!displayName || displayName.toLowerCase() === 'app manager' || displayName.toLowerCase() === 'app') {
    displayName = 'Manager';
  } else {
    const first = displayName.split(/\s+/)[0];
    displayName = first || displayName;
  }

  if (hour < 12) {
    return {
      headline: `Good morning, ${displayName}`,
      subline: 'Real-time discipleship activity, family reach, and active youth quests.',
      emoji: '☀️',
    };
  }
  if (hour < 17) {
    return {
      headline: `Welcome back, ${displayName}`,
      subline: 'Quests published here sync live to the mobile app for youth discipleship.',
      emoji: '⚡',
    };
  }
  if (hour < 21) {
    return {
      headline: `Good evening, ${displayName}`,
      subline: 'Safeguarding status and weekly community pulse across your youth network.',
      emoji: '🌅',
    };
  }
  return {
    headline: `Late session, ${displayName}`,
    subline: 'Operations desk pulse and background notifications delivery queue.',
    emoji: '🌙',
  };
}

export function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChildIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-1a6 6 0 0 1 12 0v1" strokeLinecap="round" />
    </svg>
  );
}

export function ChurchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 2v20M8 6h8M6 10h12M8 14h8" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function QuestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type ChartPoint = { label: string; value: number; color: string };

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
  for (let t = 0; t <= max; t += step) {
    ticks.push(t);
  }
  return { max, ticks };
}

export function CommunityChart({ points }: { points: ChartPoint[] }) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const rawMax = Math.max(...points.map((p) => p.value), 0);
  const total = points.reduce((acc, p) => acc + p.value, 0);
  const scale = calculateScale(rawMax);

  const width = 580;
  const height = 240;
  const pad = { top: 32, right: 28, bottom: 48, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const baselineY = pad.top + innerH;

  const colW = innerW / Math.max(1, points.length);
  const barW = Math.min(48, Math.max(24, colW * 0.5));

  // Compute coordinates for line graph
  const linePoints = points.map((p, i) => {
    const x = pad.left + i * colW + colW / 2;
    const y = p.value > 0 ? baselineY - (p.value / scale.max) * innerH : baselineY;
    return { x, y, point: p, index: i };
  });

  // Smooth spline path generator
  const smoothLinePath = (() => {
    if (linePoints.length === 0) return '';
    if (linePoints.length === 1) return `M ${linePoints[0].x} ${linePoints[0].y}`;
    let d = `M ${linePoints[0].x} ${linePoints[0].y}`;
    for (let i = 0; i < linePoints.length - 1; i++) {
      const p0 = linePoints[Math.max(0, i - 1)];
      const p1 = linePoints[i];
      const p2 = linePoints[i + 1];
      const p3 = linePoints[Math.min(linePoints.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  })();

  const smoothAreaPath = linePoints.length > 0
    ? `${smoothLinePath} L ${linePoints[linePoints.length - 1].x} ${baselineY} L ${linePoints[0].x} ${baselineY} Z`
    : '';

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl font-extrabold text-navy tracking-tight tabular-nums">{total.toLocaleString()}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total community reach</span>
        </div>
        
        {/* Bar / Line Graph Switcher */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-surface-2 border border-border text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
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
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
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
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-1">
        {points.map((p, idx) => (
          <button
            type="button"
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all cursor-pointer ${
              hoveredIndex === idx ? 'bg-navy text-white border-navy shadow-xs scale-105' : 'bg-surface border-border text-navy hover:bg-surface-2'
            }`}
            key={p.label}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span>{p.label}</span>
            <span className={`font-semibold tabular-nums ml-0.5 ${hoveredIndex === idx ? 'text-white/80' : 'text-muted'}`}>
              ({p.value})
            </span>
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="Community reach chart"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#159a9c" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#159a9c" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines and Y-axis labels */}
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

        {chartType === 'bar' ? (
          /* ================= BAR GRAPH MODE ================= */
          points.map((point, i) => {
            const colCenterX = pad.left + i * colW + colW / 2;
            const x = colCenterX - barW / 2;
            const isHovered = hoveredIndex === i;

            const barH = point.value > 0 ? Math.max(8, (point.value / scale.max) * innerH) : 0;
            const barY = baselineY - barH;
            const r = Math.min(6, barW / 2, barH / 2);

            const barPath = point.value > 0
              ? `M ${x} ${baselineY}
                 L ${x} ${barY + r}
                 A ${r} ${r} 0 0 1 ${x + r} ${barY}
                 L ${x + barW - r} ${barY}
                 A ${r} ${r} 0 0 1 ${x + barW} ${barY + r}
                 L ${x + barW} ${baselineY}
                 Z`
              : null;

            const pct = total > 0 ? `${Math.round((point.value / total) * 100)}%` : '0%';

            return (
              <g
                key={point.label}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                tabIndex={0}
                role="graphics-symbol"
                aria-label={`${point.label}: ${point.value}`}
              >
                {/* Background column highlight */}
                <rect
                  x={x}
                  y={pad.top}
                  width={barW}
                  height={innerH}
                  rx="6"
                  fill={isHovered ? 'rgba(1, 31, 59, 0.06)' : 'rgba(1, 31, 59, 0.02)'}
                />

                {/* Data bar */}
                {barPath ? (
                  <path
                    d={barPath}
                    fill={point.color}
                    opacity={isHovered ? 1 : 0.88}
                    className="transition-opacity duration-150"
                  />
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

                {/* Top value badge */}
                <text
                  x={colCenterX}
                  y={point.value > 0 ? barY - 8 : baselineY - 8}
                  textAnchor="middle"
                  className={`text-xs font-bold tabular-nums ${point.value === 0 ? 'fill-muted/50' : 'fill-navy'}`}
                >
                  {point.value}
                </text>

                {/* Bottom X-axis label */}
                <text
                  x={colCenterX}
                  y={baselineY + 18}
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-navy"
                >
                  {point.label}
                </text>

                {/* Percentage label */}
                <text
                  x={colCenterX}
                  y={baselineY + 31}
                  textAnchor="middle"
                  className="text-[10px] font-medium fill-muted tabular-nums"
                >
                  {pct}
                </text>
              </g>
            );
          })
        ) : (
          /* ================= LINE GRAPH MODE ================= */
          <g>
            {/* Area fill */}
            {smoothAreaPath && (
              <path d={smoothAreaPath} fill="url(#areaGradient)" className="transition-all duration-300" />
            )}

            {/* Smooth trend curve */}
            {smoothLinePath && (
              <path
                d={smoothLinePath}
                fill="none"
                stroke="#159a9c"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}

            {/* Interactive Points on Line */}
            {linePoints.map((lp) => {
              const isHovered = hoveredIndex === lp.index;
              const pct = total > 0 ? `${Math.round((lp.point.value / total) * 100)}%` : '0%';

              return (
                <g
                  key={lp.point.label}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(lp.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Subtle vertical indicator line on hover */}
                  {isHovered && (
                    <line
                      x1={lp.x}
                      y1={pad.top}
                      x2={lp.x}
                      y2={baselineY}
                      stroke="rgba(21, 154, 156, 0.3)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Outer glow ring on hover */}
                  <circle
                    cx={lp.x}
                    cy={lp.y}
                    r={isHovered ? 10 : 0}
                    fill={lp.point.color}
                    opacity="0.2"
                    className="transition-all duration-150"
                  />

                  {/* Main data point */}
                  <circle
                    cx={lp.x}
                    cy={lp.y}
                    r={isHovered ? 6 : 4.5}
                    fill={lp.point.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-150"
                  />

                  {/* Value tag above point */}
                  <text
                    x={lp.x}
                    y={lp.y - 10}
                    textAnchor="middle"
                    className={`text-xs font-bold tabular-nums ${isHovered ? 'fill-navy font-extrabold' : 'fill-navy/80'}`}
                  >
                    {lp.point.value}
                  </text>

                  {/* Bottom category label */}
                  <text
                    x={lp.x}
                    y={baselineY + 18}
                    textAnchor="middle"
                    className={`text-[11px] font-bold ${isHovered ? 'fill-teal font-extrabold' : 'fill-navy'}`}
                  >
                    {lp.point.label}
                  </text>

                  {/* Percentage label */}
                  <text
                    x={lp.x}
                    y={baselineY + 31}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-muted tabular-nums"
                  >
                    {pct}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Floating tooltip */}
        {hoveredIndex !== null && (() => {
          const p = points[hoveredIndex];
          const colCenterX = pad.left + hoveredIndex * colW + colW / 2;
          const pct = total > 0 ? `${Math.round((p.value / total) * 100)}%` : '0%';
          const barH = p.value > 0 ? Math.max(8, (p.value / scale.max) * innerH) : 3;
          const tipY = Math.max(8, baselineY - barH - 34);
          const text = `${p.label}: ${p.value.toLocaleString()} (${pct})`;
          const tipW = Math.max(120, text.length * 8);
          const tipX = Math.min(Math.max(pad.left + tipW / 2, colCenterX), pad.left + innerW - tipW / 2);
          return (
            <g pointerEvents="none" className="transition-transform duration-100">
              <rect
                x={tipX - tipW / 2}
                y={tipY}
                width={tipW}
                height="26"
                rx="8"
                fill="var(--navy)"
                opacity="0.96"
                className="shadow-md"
              />
              <text
                x={tipX}
                y={tipY + 17}
                textAnchor="middle"
                fill="var(--cream)"
                fontSize="11"
                fontWeight="700"
              >
                {text}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

const toneMap = {
  teal: {
    iconBg: 'bg-teal-tint text-teal ring-1 ring-teal/20',
    badge: 'bg-teal-tint text-teal border-teal/30',
    accent: 'text-teal',
  },
  forest: {
    iconBg: 'bg-sage text-forest ring-1 ring-forest/20',
    badge: 'bg-sage text-forest border-forest/30',
    accent: 'text-forest',
  },
  gold: {
    iconBg: 'bg-amber-50 text-amber-800 ring-1 ring-gold/30',
    badge: 'bg-amber-50 text-amber-800 border-gold/40',
    accent: 'text-gold',
  },
  navy: {
    iconBg: 'bg-navy-tint text-navy ring-1 ring-navy/20',
    badge: 'bg-navy-tint text-navy border-navy/30',
    accent: 'text-navy',
  },
  orange: {
    iconBg: 'bg-terracotta text-orange ring-1 ring-orange/20',
    badge: 'bg-terracotta text-orange border-orange/30',
    accent: 'text-orange',
  },
  warn: {
    iconBg: 'bg-error-bg text-error ring-1 ring-error/20',
    badge: 'bg-error-bg text-error border-error/30',
    accent: 'text-error',
  },
};

export function StatCard({
  label,
  value,
  icon,
  tone,
  hint,
  badgeText,
  onClick,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: 'teal' | 'forest' | 'gold' | 'navy' | 'orange' | 'warn';
  hint?: string;
  badgeText?: string;
  onClick?: () => void;
}) {
  const t = toneMap[tone] || toneMap.navy;
  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-xs hover:shadow-card hover:border-border-dark transition-all duration-200 group min-w-0 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center justify-center h-10 w-10 shrink-0 rounded-xl ${t.iconBg} transition-transform group-hover:scale-110 duration-200`}>
          {icon}
        </div>
        {badgeText ? (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${t.badge}`}>
            {badgeText}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col min-w-0 mt-1">
        <span className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight tabular-nums leading-none">
          {(value ?? 0).toLocaleString()}
        </span>
        <span className="text-sm font-bold text-navy mt-2 leading-snug" title={label}>
          {label}
        </span>
        {hint ? (
          <span className="text-xs text-muted mt-0.5 leading-normal" title={hint}>
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type StatItem = {
  label: string;
  value: number;
  icon: ReactNode;
  tone: 'teal' | 'forest' | 'gold' | 'navy' | 'orange' | 'warn';
  hint?: string;
  badgeText?: string;
};

export function StatGroupCard({
  title,
  subtitle,
  stats,
}: {
  title: string;
  subtitle?: string;
  stats: StatItem[];
}) {
  return (
    <div className="bg-surface border border-border/80 rounded-xl p-3 sm:p-3.5 shadow-xs hover:border-border-dark transition-all duration-150 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/50">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</h4>
        {subtitle ? (
          <span className="text-[10px] font-semibold text-text-2 bg-cream px-2 py-0.5 rounded-full border border-border/60">
            {subtitle}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {stats.map((item) => {
          const t = toneMap[item.tone] || toneMap.navy;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/70 bg-cream hover:bg-surface hover:border-border-dark transition-all min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`flex items-center justify-center h-8 w-8 shrink-0 rounded-md ${t.iconBg}`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-lg font-extrabold text-navy tracking-tight tabular-nums leading-none">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-navy truncate" title={item.label}>
                      {item.label}
                    </span>
                  </div>
                  {item.hint ? (
                    <div className="text-[10px] text-muted truncate mt-0.5" title={item.hint}>
                      {item.hint}
                    </div>
                  ) : null}
                </div>
              </div>
              {item.badgeText ? (
                <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${t.badge}`}>
                  {item.badgeText}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
