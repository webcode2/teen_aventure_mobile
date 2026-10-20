import { useState } from 'react';

export type CommunityReachPoint = { label: string; value: number; color: string };

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
) {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const o1 = polar(cx, cy, outerR, startAngle);
  const o2 = polar(cx, cy, outerR, endAngle);
  const i1 = polar(cx, cy, innerR, endAngle);
  const i2 = polar(cx, cy, innerR, startAngle);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}

/** Compact doughnut for the dashboard side rail. */
export function CommunityReachDonut({ points }: { points: CommunityReachPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = points.reduce((acc, p) => acc + p.value, 0);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 92;
  const innerR = 54;
  const labelR = (outerR + innerR) / 2;

  let angle = 0;
  const slices = points.map((p, index) => {
    const share = total > 0 ? p.value / total : 0;
    const sweep = Math.min(share * 360, 359.99);
    const start = angle;
    const end = angle + (p.value > 0 ? Math.max(sweep, 0.8) : 0);
    angle = end;
    const mid = (start + end) / 2;
    const labelPos = polar(cx, cy, labelR, mid);
    return { ...p, index, start, end, share, mid, labelPos };
  });

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-extrabold text-navy tracking-tight tabular-nums">
          {total.toLocaleString()}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Total reach
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-[220px]">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Community reach doughnut chart"
        >
          {total === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="rgba(1,31,59,0.08)"
              strokeWidth={outerR - innerR}
            />
          ) : (
            <>
              {slices.map((slice) => {
                if (slice.value <= 0) return null;
                const isHovered = hoveredIndex === slice.index;
                const dimmed = hoveredIndex !== null && !isHovered;
                return (
                  <path
                    key={slice.label}
                    d={donutSlicePath(cx, cy, outerR, innerR, slice.start, slice.end)}
                    fill={slice.color}
                    opacity={dimmed ? 0.4 : isHovered ? 1 : 0.95}
                    className="transition-opacity duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(slice.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
              {slices.map((slice) => {
                // Skip tiny slices so labels stay readable.
                if (slice.value <= 0 || slice.share < 0.05) return null;
                const pct = Math.round(slice.share * 100);
                return (
                  <text
                    key={`${slice.label}-pct`}
                    x={slice.labelPos.x}
                    y={slice.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none fill-white text-[11px] font-extrabold tabular-nums"
                    style={{ paintOrder: 'stroke', stroke: 'rgba(1,31,59,0.35)', strokeWidth: 2.5 }}
                  >
                    {pct}%
                  </text>
                );
              })}
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-10">
          <span className="text-xl font-extrabold text-navy tabular-nums tracking-tight">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] font-semibold text-muted leading-tight mt-0.5">Total</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/50 pt-2">
        {points.map((p, idx) => (
          <button
            type="button"
            key={p.label}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
              hoveredIndex === idx ? 'text-navy' : 'text-muted hover:text-navy'
            }`}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
