import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getUser, logout } from './api';
import type { Tab } from './route';
import { MenuIcon } from './nav-icons';
import { Button } from './ui';

const TAB_TITLES: Record<Tab, string> = {
  dashboard: 'Dashboard',
  people: 'Users',
  pastors: 'Pastors',
  staff: 'Staff',
  churches: 'Churches',
  groups: 'Groups',
  notifications: 'Notifications',
  quests: 'Quest',
  puzzles: 'Puzzle Studio',
  matching: 'Match Studio',
  scoring: 'Quest points',
  reports: 'Safeguarding',
  deletions: 'Deletions',
  'content-mobile': 'Mobile Content',
  'content-web': 'Web Content',
  legal: 'Site pages',
  cheers: 'Student nudges',
  archive: 'Church archive',
  'users-archive': 'Users archive',
};

function initials(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || 'AM';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TopNav({
  tab,
  alertCount = 0,
  sidebarCollapsed = false,
  mobileNavOpen = false,
  isMobile = false,
  onToggleSidebar,
}: {
  tab: Tab;
  alertCount?: number;
  sidebarCollapsed?: boolean;
  mobileNavOpen?: boolean;
  isMobile?: boolean;
  onToggleSidebar?: () => void;
}) {
  const navigate = useNavigate();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const user = getUser();
  const name = user?.name || 'App Manager';
  const role = user?.role?.replace(/_/g, ' ') || 'Manager';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 sm:gap-4 border-b border-border bg-surface/90 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3.5 transition-all">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleSidebar ? (
          <button
            type="button"
            className="p-2 rounded-xl text-muted hover:text-navy hover:bg-surface-2 transition-colors cursor-pointer border border-border/50"
            aria-label={isMobile ? (mobileNavOpen ? 'Close menu' : 'Open menu') : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            title={isMobile ? (mobileNavOpen ? 'Close menu' : 'Open menu') : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            aria-expanded={isMobile ? mobileNavOpen : !sidebarCollapsed}
            onClick={onToggleSidebar}
          >
            <MenuIcon />
          </button>
        ) : null}
        <div className="min-w-0">
          <p className="hidden md:block truncate text-[10px] font-bold uppercase tracking-wider text-muted">Teen Bible Adventures</p>
          <h2 className="text-base sm:text-lg font-bold text-navy tracking-tight truncate leading-tight">{TAB_TITLES[tab]}</h2>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          type="button"
          className="relative p-2 rounded-xl text-muted hover:text-navy hover:bg-surface-2 transition-colors cursor-pointer border border-border/50"
          aria-label={
            alertCount > 0
              ? `Pending church nudges, ${alertCount} awaiting review`
              : 'Pending church nudges'
          }
          title={
            alertCount > 0
              ? `${alertCount} church nudge${alertCount === 1 ? '' : 's'} awaiting review`
              : 'No pending church nudges'
          }
          onClick={() =>
            navigate(
              alertCount > 0
                ? '/app/dashboard/cheers?tab=church-pending'
                : '/app/dashboard/cheers',
            )
          }
        >
          <BellIcon />
          {alertCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-orange text-[9px] font-bold text-white shadow-xs">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          ) : null}
        </button>

        {/* Button's own inline-flex beats a `hidden` class, so the wrapper does the hiding. */}
        <div className="hidden md:block">
          <Button
            type="button"
            variant="soft"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => navigate('/app/dashboard/quests/new')}
          >
            + New quest
          </Button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-border">
          <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-gold ring-2 ring-white shadow-xs" aria-hidden>
            {initials(user?.name, user?.email)}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <strong className="text-xs font-semibold text-navy leading-none">{name}</strong>
            <span className="text-[10px] text-muted capitalize leading-tight mt-0.5">{role}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="px-2.5 py-1 whitespace-nowrap"
            disabled={logoutBusy}
            onClick={async () => {
              setLogoutBusy(true);
              setLogoutError('');
              try { await logout(); navigate('/app/login'); }
              catch (error) { setLogoutError(error instanceof Error ? error.message : 'Could not sign out'); }
              finally { setLogoutBusy(false); }
            }}
          >
            {logoutBusy ? 'Signing out…' : 'Sign out'}
          </Button>
          {logoutError ? <span role="alert" className="absolute right-3 top-full mt-1 rounded-lg bg-surface px-2 py-1 text-xs text-error shadow-xs">{logoutError}</span> : null}
        </div>
      </div>
    </header>
  );
}
