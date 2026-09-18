export const TABS = [
  'dashboard',
  'people',
  'churches',
  'quests',
  'notifications',
  'consent',
  'reports',
  'deletions',
  'scoring',
] as const;

export type Tab = typeof TABS[number];
export type AuthView = 'login' | 'forgot' | 'reset';
export type Route =
  | { kind: 'auth'; view: AuthView; token?: string }
  | { kind: 'app'; tab: Tab };

function parseQuery(raw: string) {
  const q = raw.startsWith('?') ? raw.slice(1) : raw;
  return new URLSearchParams(q);
}

export function parseHash(hash: string, authed: boolean): Route {
  const stripped = (hash || '').replace(/^#/, '');
  const [pathPart, queryPart = ''] = stripped.split('?');
  const page = pathPart.replace(/^\//, '').toLowerCase();
  const params = parseQuery(queryPart);
  const resetToken = params.get('token') ?? '';

  if (page === 'reset' || (resetToken && !authed && page === '')) {
    return { kind: 'auth', view: 'reset', token: resetToken };
  }
  if (!authed) {
    if (page === 'forgot') return { kind: 'auth', view: 'forgot' };
    return { kind: 'auth', view: 'login' };
  }
  if ((TABS as readonly string[]).includes(page)) {
    return { kind: 'app', tab: page as Tab };
  }
  return { kind: 'app', tab: 'dashboard' };
}

export function hashFor(route: Route) {
  if (route.kind === 'auth') {
    if (route.view === 'reset') {
      return route.token ? `#/reset?token=${encodeURIComponent(route.token)}` : '#/reset';
    }
    return `#/${route.view}`;
  }
  return `#/${route.tab}`;
}

export function navigate(route: Route) {
  const next = hashFor(route);
  if (window.location.hash !== next) window.location.hash = next;
  window.dispatchEvent(new Event('askhub:route'));
}
