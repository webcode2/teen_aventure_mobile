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

export function PuzzleIcon() {
  return (
    <NavSvg>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeLinecap="round" strokeLinejoin="round" />
    </NavSvg>
  );
}

export function MatchIcon() {
  return (
    <NavSvg>
      <path d="M4 7h6M14 7h6M4 12h6M14 12h6M4 17h6M14 17h6" strokeLinecap="round" />
      <path d="M10 7h4M10 17h4" strokeLinecap="round" />
    </NavSvg>
  );
}

export function SettingsIcon() {
  return (
    <NavSvg>
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavSvg>
  );
}

export function GroupsIcon() {
  return (
    <NavSvg>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </NavSvg>
  );
}

export function MobileIcon() {
  return (
    <NavSvg>
      <rect x="5" y="2" width="14" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </NavSvg>
  );
}

export function WebIcon() {
  return (
    <NavSvg>
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
    </NavSvg>
  );
}

export function CheerIcon() {
  return (
    <NavSvg>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
    </NavSvg>
  );
}

const NAV_ICONS: Record<Tab, () => ReactNode> = {
  dashboard: DashboardIcon,
  people: UsersIcon,
  pastors: ChurchIcon,
  staff: SettingsIcon,
  churches: ChurchIcon,
  groups: GroupsIcon,
  notifications: MailIcon,
  quests: QuestIcon,
  puzzles: PuzzleIcon,
  matching: MatchIcon,
  'content-mobile': MobileIcon,
  'content-web': WebIcon,
  legal: ConsentIcon,
  cheers: CheerIcon,
  scoring: SettingsIcon,
  reports: ShieldIcon,
  deletions: TrashIcon,
  archive: TrashIcon,
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
