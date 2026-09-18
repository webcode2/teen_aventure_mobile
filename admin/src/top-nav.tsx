import { getUser, setToken } from './api';
import { navigate, type Tab } from './route';
import { MenuIcon } from './nav-icons';

const TAB_TITLES: Record<Tab, string> = {
  dashboard: 'Dashboard',
  people: 'People',
  churches: 'Churches',
  notifications: 'Notifications',
  quests: 'Teen Quest',
  scoring: 'Quest points',
  reports: 'Safeguarding',
  consent: 'Consent',
  deletions: 'Deletions',
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

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
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
  const user = getUser();
  const name = user?.name || 'App Manager';
  const email = user?.email || 'Signed in';
  const role = user?.role?.replace(/_/g, ' ') || 'Manager';

  return (
    <header className="top-nav">
      <div className="top-nav-start">
        {onToggleSidebar ? (
          <button
            type="button"
            className="top-nav-icon-btn top-nav-menu"
            aria-label={isMobile ? (mobileNavOpen ? 'Close menu' : 'Open menu') : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            title={isMobile ? (mobileNavOpen ? 'Close menu' : 'Open menu') : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            aria-expanded={isMobile ? mobileNavOpen : !sidebarCollapsed}
            onClick={onToggleSidebar}
          >
            <MenuIcon />
          </button>
        ) : null}
        <div>
          <p className="top-nav-kicker">Teen Bible Adventures</p>
          <h2 className="top-nav-title">{TAB_TITLES[tab]}</h2>
        </div>
      </div>

      <div className="top-nav-search" role="search">
        <SearchIcon />
        <input type="search" placeholder="Search people, churches, reports…" aria-label="Search dashboard" />
      </div>

      <div className="top-nav-actions">
        <button
          type="button"
          className="top-nav-icon-btn"
          aria-label={`Notifications${alertCount ? `, ${alertCount} alerts` : ''}`}
          title="Notifications"
          onClick={() => navigate({ kind: 'app', tab: 'notifications' })}
        >
          <BellIcon />
          {alertCount > 0 ? <span className="top-nav-badge">{alertCount > 9 ? '9+' : alertCount}</span> : null}
        </button>

        <button
          type="button"
          className="btn ghost top-nav-quick"
          onClick={() => navigate({ kind: 'app', tab: 'quests' })}
        >
          + New quest week
        </button>

        <div className="top-nav-profile">
          <div className="top-nav-avatar" aria-hidden>{initials(user?.name, user?.email)}</div>
          <div className="top-nav-who">
            <strong>{name}</strong>
            <span>{role}</span>
          </div>
          <button
            type="button"
            className="btn secondary top-nav-signout"
            onClick={() => {
              setToken(null);
              navigate({ kind: 'auth', view: 'login' });
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
