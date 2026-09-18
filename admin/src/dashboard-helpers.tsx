import type { ReactNode } from 'react';

export function getDashboardGreeting(name: string) {
  const hour = new Date().getHours();
  const first = name.split(/\s+/)[0] || name;

  if (hour < 12) {
    return {
      headline: `Morning fire, ${first}!`,
      subline: 'The app is awake — families are one tap away from today\'s Word. Make it count.',
      emoji: '☀️',
    };
  }
  if (hour < 17) {
    return {
      headline: `Hey ${first}, you're on a roll.`,
      subline: 'Quests published here hit the Flutter app live. No lag, no drama — just discipleship.',
      emoji: '⚡',
    };
  }
  if (hour < 21) {
    return {
      headline: `Evening shift, ${first}? Respect.`,
      subline: 'Open reports need a human heart first. Everything else can wait five minutes.',
      emoji: '🌅',
    };
  }
  return {
    headline: `Still grinding, ${first}? Legend.`,
    subline: 'Midnight managers keep the kingdom running. Here\'s your pulse check.',
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

export function CommunityChart({ points }: { points: ChartPoint[] }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const width = 320;
  const height = 140;
  const pad = { top: 12, right: 8, bottom: 28, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const gap = 12;
  const barW = (innerW - gap * (points.length - 1)) / points.length;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="community-chart" role="img" aria-label="Community snapshot bar chart">
        {points.map((point, i) => {
          const barH = Math.max(8, (point.value / max) * innerH);
          const x = pad.left + i * (barW + gap);
          const y = pad.top + innerH - barH;
          return (
            <g key={point.label}>
              <rect x={x} y={y} width={barW} height={barH} rx="6" fill={point.color} opacity="0.88" />
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="chart-label">{point.label}</text>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="chart-value">{point.value}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: 'teal' | 'forest' | 'gold' | 'navy' | 'orange' | 'warn';
  hint?: string;
}) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <div className="value">{value}</div>
        <div className="label">{label}</div>
        {hint ? <div className="stat-hint">{hint}</div> : null}
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
};

export function StatGroupCard({
  title,
  stats,
}: {
  title: string;
  stats: StatItem[];
}) {
  return (
    <div className="stat-group-card">
      <h4 className="stat-group-title">{title}</h4>
      <div className="stat-group-grid">
        {stats.map((item) => (
          <div key={item.label} className={`stat-group-item tone-${item.tone}`}>
            <div className="stat-card-icon">{item.icon}</div>
            <div className="stat-card-body">
              <div className="value">{item.value}</div>
              <div className="label">{item.label}</div>
              {item.hint ? <div className="stat-hint">{item.hint}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
