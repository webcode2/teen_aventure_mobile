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
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const body = await res.json(); if (body?.message) message = body.message; } catch { /* non-JSON */ }
    throw new ApiError(res.status, message);
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
