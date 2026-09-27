import { TABS, type Tab } from './route';

export const DASHBOARD_TAB_IDS = TABS.filter((t): t is Exclude<Tab, 'dashboard'> => t !== 'dashboard');

export function isDashboardTab(value: string): value is Tab {
  return (DASHBOARD_TAB_IDS as readonly string[]).includes(value);
}

export function safeStaffNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/app/dashboard';
  const pathOnly = next.split('?')[0] ?? next;
  if (pathOnly === '/app/dashboard' || pathOnly.startsWith('/app/dashboard/')) return next;
  return '/app/dashboard';
}

export function legacyHashToPath(hash: string): string | null {
  const raw = (hash || '').replace(/^#/, '');
  if (!raw) return null;
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.replace(/^\//, '').split('/').filter(Boolean);
  const page = (segments[0] || '').toLowerCase();
  const sub = segments[1] || '';
  const qs = queryPart ? `?${queryPart}` : '';

  if (page === 'landing' || page === 'home' || page === 'public') return '/';
  if (page === 'about') return '/about';
  if (page === 'privacy') return '/privacy';
  if (page === 'contact') return '/contact';
  if (page === 'login') return '/app/login';
  if (page === 'forgot') return '/app/forgot';
  if (page === 'reset') return `/app/reset${qs}`;
  if (page === 'pastor' || page === 'church-portal') {
    const church = sub || new URLSearchParams(queryPart).get('church') || '';
    return church ? `/groups/${church}` : '/groups';
  }
  if (page === 'church') return sub ? `/groups/${sub}` : '/groups';
  if (page === 'dashboard' || page === '') return '/app/dashboard';
  if ((TABS as readonly string[]).includes(page) && page !== 'dashboard') {
    return `/app/dashboard/${page}${qs}`;
  }
  if (page) return '/app/dashboard';
  return null;
}
