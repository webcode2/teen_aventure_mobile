import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, getUser } from './api';
import { navigate, type Tab } from './route';
import { Brand } from './ui';
import { TopNav } from './top-nav';
import { NavIcon, SidebarToggleIcon } from './nav-icons';

const SIDEBAR_KEY = 'askhub_admin_sidebar_collapsed';
const MOBILE_BREAKPOINT = 980;

const GROUPS: Array<{ label: string; items: Array<[Tab, string]> }> = [
  {
    label: 'Operate',
    items: [
      ['dashboard', 'Dashboard'],
      ['people', 'People'],
      ['churches', 'Churches'],
      ['notifications', 'Notifications'],
    ],
  },
  {
    label: 'Publish',
    items: [
      ['quests', 'Teen Quest'],
      ['scoring', 'Quest points'],
    ],
  },
  {
    label: 'Care',
    items: [
      ['reports', 'Safeguarding'],
      ['consent', 'Consent'],
      ['deletions', 'Deletions'],
    ],
  },
];

function readSidebarCollapsed() {
  try {
    return globalThis.localStorage?.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

export function Shell({ tab, children }: { tab: Tab; children: ReactNode }) {
  const user = getUser();
  const [alertCount, setAlertCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        globalThis.localStorage?.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleNavToggle = useCallback(() => {
    if (isMobile) {
      setMobileNavOpen((prev) => !prev);
      return;
    }
    toggleSidebar();
  }, [isMobile, toggleSidebar]);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileNavOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [tab]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    api<{ openReports?: number; queuedNotifications?: number; pendingDeletions?: number }>('/api/admin/stats')
      .then((stats) => {
        setAlertCount(
          (stats.openReports ?? 0) + (stats.queuedNotifications ?? 0) + (stats.pendingDeletions ?? 0),
        );
      })
      .catch(() => setAlertCount(0));
  }, [tab]);

  const initials = (() => {
    const source = user?.name?.trim() || user?.email?.trim() || 'AM';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  })();

  return (
    <div
      className={[
        'app-shell',
        sidebarCollapsed && !isMobile ? 'sidebar-collapsed' : '',
        isMobile ? 'is-mobile' : '',
        mobileNavOpen ? 'mobile-nav-open' : '',
      ].filter(Boolean).join(' ')}
    >
      {isMobile && mobileNavOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      ) : null}
      <aside className={`sidebar${sidebarCollapsed && !isMobile ? ' collapsed' : ''}`}>
        <div className="sidebar-head">
          <Brand size={sidebarCollapsed && !isMobile ? 'sm' : 'md'} />
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={handleNavToggle}
          >
            <SidebarToggleIcon collapsed={sidebarCollapsed && !isMobile} />
          </button>
        </div>
        {GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map(([id, label]) => (
              <button
                key={id}
                className={`nav-tab ${tab === id ? 'active' : ''}`}
                aria-label={label}
                title={label}
                onClick={() => {
                  closeMobileNav();
                  navigate({ kind: 'app', tab: id });
                }}
              >
                <NavIcon tab={id} />
                <span className="nav-text">{label}</span>
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-foot">
          {sidebarCollapsed && !isMobile ? (
            <div className="sidebar-avatar" aria-hidden title={user?.name || 'App Manager'}>{initials}</div>
          ) : (
            <p className="who">
              <strong>{user?.name || 'App Manager'}</strong>
              {user?.email || 'Signed in with token'}
            </p>
          )}
        </div>
      </aside>
      <div className="main-column">
        <TopNav
          tab={tab}
          alertCount={alertCount}
          onToggleSidebar={handleNavToggle}
          sidebarCollapsed={sidebarCollapsed && !isMobile}
          mobileNavOpen={mobileNavOpen}
          isMobile={isMobile}
        />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
