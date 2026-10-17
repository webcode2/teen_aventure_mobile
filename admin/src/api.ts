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

export async function apiUpload<T = unknown>(path: string, file: File, field: string): Promise<T> {
  const body = new FormData();
  body.append(field, file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const parsed = await res.json();
      if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') message = parsed.message;
    } catch { /* non-JSON */ }
    throw new ApiError(res.status, message);
  }
  return res.json();
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const pastorTok = getPastorToken();
  const isPastorPath =
    path.startsWith('/api/churches') ||
    path.startsWith('/api/classes') ||
    path.startsWith('/api/safeguarding');
  const activeToken = isPastorPath && pastorTok ? pastorTok : (token || pastorTok);
  const hasBody = options.body != null && options.body !== '';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
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
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
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
    body: JSON.stringify({ email, password, surface: 'portal' }),
  });
  if (res.user.role === 'CHURCH_APPLICANT') {
    throw new ApiError(403, 'This account cannot sign in to the pastor dashboard.');
  }
  const churchRole = res.user.churchRole;
  const isAuthorized =
    churchRole === 'PASTOR' ||
    churchRole === 'PASTOR_NOMINEE' ||
    churchRole === 'CHILDRENS_CHURCH_LEAD' ||
    churchRole === 'TEACHER' ||
    churchRole === 'CHAPERONE';
  if (!isAuthorized) {
    throw new ApiError(403, 'Church leadership or group leader credentials required to access this portal.');
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

const APPLICANT_TOKEN_KEY = 'askhub_church_applicant_token';

export function getApplicantToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(APPLICANT_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setApplicantToken(value: string | null) {
  try {
    if (value) localStorage.setItem(APPLICANT_TOKEN_KEY, value);
    else localStorage.removeItem(APPLICANT_TOKEN_KEY);
  } catch {
    /* ignore missing localStorage in tests */
  }
}

/** Calls that belong to a verified church-application account, not the mobile app. */
export async function applicantApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const applicantToken = getApplicantToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(applicantToken ? { authorization: `Bearer ${applicantToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const payload: unknown = await res.json();
      if (payload && typeof payload === 'object' && 'message' in payload && typeof (payload as { message: unknown }).message === 'string') {
        message = (payload as { message: string }).message;
      }
    } catch { /* non-JSON */ }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

/** Unauthenticated POST for public forms (church applications). */
export async function publicWrite<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const payload: unknown = await res.json();
      if (payload && typeof payload === 'object' && 'message' in payload && typeof (payload as { message: unknown }).message === 'string') {
        message = (payload as { message: string }).message;
      }
    } catch { /* non-JSON */ }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

/** Unauthenticated GET for public pages (privacy / terms). */
export async function publicApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body: unknown = await res.json();
      if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
        message = (body as { message: string }).message;
      }
    } catch { /* non-JSON */ }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
