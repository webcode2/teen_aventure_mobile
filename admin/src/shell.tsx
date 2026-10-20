import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, getUser } from './api';
import { useNavigate } from 'react-router';
import type { Tab } from './route';
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
      ['people', 'Users'],
      ['pastors', 'Pastors'],
      ['churches', 'Churches'],
      ['groups', 'Groups'],
      ['notifications', 'Notifications'],
    ],
  },
  {
    label: 'Publish',
    items: [
      ['quests', 'Quest'],
      ['puzzles', 'Puzzle Studio'],
      ['matching', 'Match Studio'],
    ],
  },
  {
    label: 'Content Management',
    items: [
      ['content-mobile', 'Mobile'],
      ['content-web', 'Web'],
      ['legal', 'Site pages'],
    ],
  },
  {
    label: 'Care',
    items: [
      ['reports', 'Safeguarding'],
      ['cheers', 'Student nudges'],
      ['deletions', 'Deletions'],
    ],
  },
  {
    label: 'Settings',
    items: [
      ['staff', 'Staff'],
      ['scoring', 'Quest points'],
    ],
  },
  {
    label: 'Archive',
    items: [['archive', 'Church archive'], ['users-archive', 'Users archive']],
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
  const navigate = useNavigate();
  const user = getUser();
  const [alertCount, setAlertCount] = useState(0);
  const [navBadges, setNavBadges] = useState<Partial<Record<Tab, number>>>({});
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

  const refreshNavBadges = useCallback(() => {
    api<{
      openReports?: number;
      queuedNotifications?: number;
      pendingDeletions?: number;
      pendingChurchApplications?: number;
      pendingChurchNudges?: number;
    }>('/api/admin/stats')
      .then((stats) => {
        const reports = stats.openReports ?? 0;
        const deletions = stats.pendingDeletions ?? 0;
        const churches = stats.pendingChurchApplications ?? 0;
        const pendingNudges = stats.pendingChurchNudges ?? 0;
        // Bell tracks church nudge templates awaiting Care review (not the outbound composer).
        setAlertCount(pendingNudges);
        setNavBadges({
          reports,
          deletions,
          churches,
          cheers: pendingNudges,
        });
      })
      .catch(() => {
        setAlertCount(0);
        setNavBadges({});
      });
  }, []);

  useEffect(() => {
    refreshNavBadges();
  }, [tab, refreshNavBadges]);

  useEffect(() => {
    const onRefresh = () => refreshNavBadges();
    window.addEventListener('askhub:admin-stats-refresh', onRefresh);
    return () => window.removeEventListener('askhub:admin-stats-refresh', onRefresh);
  }, [refreshNavBadges]);

  const initials = (() => {
    const source = user?.name?.trim() || user?.email?.trim() || 'AM';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  })();

  const isCollapsed = sidebarCollapsed && !isMobile;

  return (
    <div
      className={`min-h-screen bg-cream text-navy ${
        isMobile
          ? 'flex flex-col'
          : `grid ${isCollapsed ? 'grid-cols-[72px_1fr]' : 'grid-cols-[232px_1fr]'} transition-[grid-template-columns] duration-200`
      }`}
    >
      {isMobile && mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-navy/60 backdrop-blur-xs transition-opacity cursor-pointer border-none"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        className={`bg-navy text-cream flex flex-col p-3 z-40 transition-all duration-200 ${
          isMobile
            ? `fixed inset-y-0 left-0 w-64 shadow-2xl transform overflow-y-auto scrollbar-none ${
                mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'sticky top-0 h-screen overflow-hidden'
        }`}
      >
        <div className={`flex items-center gap-2 pb-3 pt-1 border-b border-white/10 shrink-0 ${
          isCollapsed ? 'flex-col justify-center' : 'justify-between px-2'
        }`}>
          <Brand size={isCollapsed ? 'sm' : 'md'} />
          <button
            type="button"
            className="p-1.5 rounded-lg text-cream/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={handleNavToggle}
          >
            <SidebarToggleIcon collapsed={isCollapsed} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 flex flex-col gap-4 py-4 overflow-y-auto overflow-x-hidden scrollbar-none">
          {GROUPS.map((group) => (
            <div className="flex flex-col gap-1" key={group.label}>
              {!isCollapsed ? (
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted/70 px-2 py-1">
                  {group.label}
                </div>
              ) : null}
              {group.items.map(([id, label]) => {
                const active = tab === id;
                const badge = navBadges[id] ?? 0;
                const displayLabel =
                  id === 'cheers' && badge > 0 ? 'Nudges · Pending' : label;
                const title = badge > 0 ? `${displayLabel} (${badge})` : displayLabel;
                const destination =
                  id === 'dashboard'
                    ? '/app/dashboard'
                    : id === 'cheers' && badge > 0
                      ? '/app/dashboard/cheers?tab=church-pending'
                      : `/app/dashboard/${id}`;
                return (
                  <button
                    key={id}
                    className={`relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isCollapsed ? 'justify-center' : 'w-full text-left'
                    } ${
                      active
                        ? 'bg-white/15 text-white shadow-xs'
                        : badge > 0
                          ? 'text-white bg-white/8 hover:bg-white/12'
                          : 'text-cream/75 hover:bg-white/8 hover:text-white'
                    }`}
                    aria-label={title}
                    title={title}
                    onClick={() => {
                      closeMobileNav();
                      navigate(destination);
                    }}
                  >
                    <span className="relative shrink-0">
                      <NavIcon tab={id} />
                      {isCollapsed && badge > 0 ? (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-orange text-[8px] font-bold text-white">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      ) : null}
                    </span>
                    {!isCollapsed ? <span className="min-w-0 flex-1 truncate">{displayLabel}</span> : null}
                    {!isCollapsed && badge > 0 ? (
                      <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-orange px-1 text-[9px] font-bold text-white tabular-nums">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="pt-3 border-t border-white/10 mt-auto shrink-0">
          {isCollapsed ? (
            <div
              className="flex h-9 w-9 mx-auto items-center justify-center rounded-full bg-surface-2 text-navy text-xs font-bold shadow-xs"
              aria-hidden
              title={user?.name || 'App Manager'}
            >
              {initials}
            </div>
          ) : (
            <div className="px-2 py-1 flex flex-col text-left">
              <strong className="text-xs font-bold text-white truncate">{user?.name || 'App Manager'}</strong>
              <span className="text-[11px] text-cream/60 truncate">{user?.email || 'Signed in with token'}</span>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-col min-w-0 flex-1 min-h-screen">
        <TopNav
          tab={tab}
          alertCount={alertCount}
          onToggleSidebar={handleNavToggle}
          sidebarCollapsed={isCollapsed}
          mobileNavOpen={mobileNavOpen}
          isMobile={isMobile}
        />
        <main className="p-4 sm:p-6 md:px-8 md:py-6 flex-1 w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
