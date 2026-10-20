import type { ReactNode } from 'react';

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
