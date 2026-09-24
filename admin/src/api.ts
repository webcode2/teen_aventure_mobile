export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const TOKEN_KEY = 'askhub_admin_token';
const USER_KEY = 'askhub_admin_user';

export type AdminUser = {
  id?: string;
  email?: string;
  name?: string;
  role: string;
};

function readStoredToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function readStoredUser(): AdminUser | null {
  try {
    const raw = globalThis.localStorage?.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as AdminUser : null;
  } catch {
    return null;
  }
}

let token: string | null = readStoredToken();
let currentUser: AdminUser | null = readStoredUser();

const PASTOR_TOKEN_KEY = 'askhub_pastor_token';
const PASTOR_USER_KEY = 'askhub_pastor_user';

export type PastorUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  familyId?: string | null;
  churchId?: string | null;
  churchRole?: string | null;
  roles?: string[];
};

export function getPastorToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(PASTOR_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function getPastorUser(): PastorUser | null {
  try {
    const raw = globalThis.localStorage?.getItem(PASTOR_USER_KEY);
    return raw ? (JSON.parse(raw) as PastorUser) : null;
  } catch {
    return null;
  }
}

export function setPastorSession(t: string | null, u?: PastorUser | null) {
  try {
    if (t) localStorage.setItem(PASTOR_TOKEN_KEY, t);
    else localStorage.removeItem(PASTOR_TOKEN_KEY);
    if (u) localStorage.setItem(PASTOR_USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(PASTOR_USER_KEY);
  } catch {
    /* ignore missing localStorage in tests */
  }
}

export function clearPastorSession() {
  setPastorSession(null, null);
}

export function getToken() { return token; }
export function getUser() { return currentUser; }

export function setToken(t: string | null, user?: AdminUser | null) {
  token = t;
  if (user !== undefined) currentUser = user;
  if (!t) currentUser = null;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    if (currentUser) localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore missing localStorage in tests */
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body ?? null;
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const activeToken = token || getPastorToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(activeToken ? { authorization: `Bearer ${activeToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let body: unknown = null;
    try {
      body = await res.json();
      if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
        message = (body as { message: string }).message;
      }
    } catch { /* non-JSON */ }
    throw new ApiError(res.status, message, body);
  }
  return res.json();
}

const DASHBOARD_ROLES = new Set(['APP_MANAGER', 'SUPER_ADMIN', 'SUPER_EDITOR', 'EDITOR']);

export async function login(email: string, password: string) {
  const res = await api<{ token: string; user: AdminUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!DASHBOARD_ROLES.has(res.user.role)) throw new ApiError(403, 'Dashboard access required');
  setToken(res.token, res.user);
  return res;
}

export async function pastorLogin(email: string, password: string) {
  const res = await api<{ token: string; user: PastorUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const churchRole = res.user.churchRole;
  const isPastor = churchRole === 'PASTOR' || churchRole === 'PASTOR_NOMINEE' || churchRole === 'CHILDRENS_CHURCH_LEAD';
  if (!isPastor) {
    throw new ApiError(403, 'Church Pastor or Leadership role required. Please sign in with your pastoral credentials.');
  }
  setPastorSession(res.token, res.user);
  return res;
}

export async function forgotPassword(email: string) {
  return api<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(resetToken: string, password: string) {
  return api<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: resetToken, password }),
  });
}
