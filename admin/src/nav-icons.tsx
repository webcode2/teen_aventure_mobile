import type { ReactNode } from 'react';
import type { Tab } from './route';
import {
  ChurchIcon,
  MailIcon,
  QuestIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
} from './dashboard-helpers';

function NavSvg({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {children}
    </svg>
  );
}

export function DashboardIcon() {
  return (
    <NavSvg>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </NavSvg>
  );
}

export function PointsIcon() {
  return (
    <NavSvg>
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L6 21l2.3-7-6-4.6h7.6L12 2z" strokeLinecap="round" strokeLinejoin="round" />
    </NavSvg>
  );
}

export function ConsentIcon() {
  return (
    <NavSvg>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </NavSvg>
  );
}

const NAV_ICONS: Record<Tab, () => ReactNode> = {
  dashboard: DashboardIcon,
  people: UsersIcon,
  churches: ChurchIcon,
  notifications: MailIcon,
  quests: QuestIcon,
  scoring: PointsIcon,
  reports: ShieldIcon,
  consent: ConsentIcon,
  deletions: TrashIcon,
};

export function NavIcon({ tab }: { tab: Tab }) {
  const Icon = NAV_ICONS[tab];
  return <span className="nav-icon">{Icon()}</span>;
}

export function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {collapsed ? (
        <>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 6v12" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 6v12" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}
