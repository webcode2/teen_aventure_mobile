import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Brand } from './ui';
import { MenuIcon, SidebarToggleIcon } from './nav-icons';

const SIDEBAR_KEY = 'askhub_side_nav_collapsed';
const MOBILE_BREAKPOINT = 980;

export type SideNavItem = {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
};

export type SideNavGroup = {
  label: string;
  items: SideNavItem[];
};

function readSidebarCollapsed() {
  try {
    return globalThis.localStorage?.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

/** Navy sidebar + main column. Same collapse and mobile drawer as the app manager Shell. */
export function SideNavLayout({
  groups,
  activeId,
  onSelect,
  footer,
  topBar,
  topActions,
  children,
}: {
  groups: SideNavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
  footer?: ReactNode;
  topBar?: ReactNode;
  topActions?: ReactNode;
  children: ReactNode;
}) {
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
  }, [activeId]);

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
          className="fixed inset-0 z-30 cursor-pointer border-none bg-navy/60 backdrop-blur-xs transition-opacity"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        className={`z-40 flex flex-col bg-navy p-3 text-cream transition-all duration-200 ${
          isMobile
            ? `fixed inset-y-0 left-0 w-64 transform overflow-y-auto shadow-2xl scrollbar-none ${
                mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'sticky top-0 h-screen overflow-hidden'
        }`}
      >
        <div
          className={`flex shrink-0 items-center gap-2 border-b border-white/10 pb-3 pt-1 ${
            isCollapsed ? 'flex-col justify-center' : 'justify-between px-2'
          }`}
        >
          <div className="rounded-xl bg-white px-2 py-1">
            <Brand size={isCollapsed ? 'sm' : 'md'} />
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-lg p-1.5 text-cream/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={handleNavToggle}
          >
            <SidebarToggleIcon collapsed={isCollapsed} />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto py-4 scrollbar-none">
          {groups.map((group) => (
            <div className="flex flex-col gap-1" key={group.label}>
              {!isCollapsed ? (
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted/70">
                  {group.label}
                </div>
              ) : null}
              {group.items.map((item) => {
                const active = activeId === item.id;
                const title = item.count != null ? `${item.label} (${item.count})` : item.label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                      isCollapsed ? 'justify-center' : 'w-full text-left'
                    } ${
                      active
                        ? 'bg-white/15 text-white shadow-xs'
                        : 'text-cream/75 hover:bg-white/8 hover:text-white'
                    }`}
                    aria-label={title}
                    title={title}
                    onClick={() => {
                      closeMobileNav();
                      onSelect(item.id);
                    }}
                  >
                    {item.icon ? <span className="nav-icon shrink-0">{item.icon}</span> : null}
                    {!isCollapsed ? (
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    ) : null}
                    {!isCollapsed && item.count != null ? (
                      <span className={`tabular-nums ${active ? 'text-white/80' : 'text-cream/50'}`}>
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {footer ? (
          <div className="mt-auto shrink-0 border-t border-white/10 pt-3">{footer}</div>
        ) : null}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-surface/90 px-4 py-3.5 backdrop-blur-md transition-all sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="cursor-pointer rounded-xl border border-border/50 p-2 text-muted transition-colors hover:bg-surface-2 hover:text-navy"
              aria-label={
                isMobile
                  ? mobileNavOpen
                    ? 'Close menu'
                    : 'Open menu'
                  : sidebarCollapsed
                    ? 'Expand sidebar'
                    : 'Collapse sidebar'
              }
              aria-expanded={isMobile ? mobileNavOpen : !sidebarCollapsed}
              onClick={handleNavToggle}
            >
              <MenuIcon />
            </button>
            <div className="min-w-0">{topBar}</div>
          </div>
          {topActions ? <div className="flex shrink-0 items-center gap-3">{topActions}</div> : null}
        </header>
        <main className="mx-auto w-full max-w-[1720px] flex-1 p-4 sm:p-6 md:px-8 md:py-6 2xl:max-w-[1880px]">
          {children}
        </main>
      </div>
    </div>
  );
}
