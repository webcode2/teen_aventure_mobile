export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const TOKEN_KEY = 'askhub_admin_token';
const USER_KEY = 'askhub_admin_user';

export type AdminUser = {
  id?: string;
  email?: string;
  name?: string;
  role: string;
};

// Staff credentials live only in a server-set HttpOnly cookie. These are UI state.
let token: string | null = null;
let currentUser: AdminUser | null = null;
let sessionExpiresAt: number | null = null;
let sessionReady = false;
let sessionGeneration = 0;
let sessionLoad: Promise<void> | null = null;
try {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
} catch { /* storage may be unavailable */ }

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

// Portal credentials stay in memory and disappear when the page is closed/reloaded.
let pastorToken: string | null = null;
let pastorUser: PastorUser | null = null;
try {
  localStorage.removeItem(PASTOR_TOKEN_KEY);
  localStorage.removeItem(PASTOR_USER_KEY);
  localStorage.removeItem('askhub_church_applicant_token');
} catch { /* storage may be unavailable */ }

export function getPastorToken(): string | null { return pastorToken; }
export function getPastorUser(): PastorUser | null { return pastorUser; }
export function setPastorSession(t: string | null, u?: PastorUser | null) {
  pastorToken = t;
  pastorUser = t ? u ?? null : null;
}

export function clearPastorSession() {
  setPastorSession(null, null);
}

/** Server-provided expiry metadata; the cookie itself is never exposed to JavaScript. */
export function staffTokenExpiresAt(): number | null { return sessionExpiresAt; }
export function getToken() {
  return sessionExpiresAt != null && sessionExpiresAt <= Date.now() ? null : token;
}
export function staffSessionReady() { return sessionReady; }
export function subscribeStaffSession(listener: () => void) {
  window.addEventListener('staff-session-change', listener);
  return () => window.removeEventListener('staff-session-change', listener);
}
export function getUser() { return currentUser; }

/** Compatibility setter for UI state and tests. This value is never a bearer credential. */
export function setToken(value: string | null, user?: AdminUser | null, expiresAt?: number) {
  token = value;
  if (user !== undefined) currentUser = user;
  if (!value) currentUser = null;
  sessionExpiresAt = value ? expiresAt ?? null : null;
  sessionReady = true;
  sessionGeneration++;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* storage may be unavailable */ }
  window.dispatchEvent(new Event('staff-session-change'));
}

export async function initializeStaffSession() {
  if (sessionReady) return;
  if (sessionLoad) return sessionLoad;
  const generation = sessionGeneration;
  sessionLoad = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/dashboard-session`, {
        credentials: 'include', cache: 'no-store', headers: { 'X-Dashboard-Request': '1' },
      });
      if (!response.ok) throw new Error('Session unavailable');
      const result = await response.json() as { user: AdminUser; expiresAt: number };
      if (generation === sessionGeneration) setToken('cookie-session', result.user, result.expiresAt);
    } catch {
      if (generation === sessionGeneration) setToken(null);
    } finally { sessionLoad = null; }
  })();
  return sessionLoad;
}

export async function logout() {
  // A failed network request must not pretend to have removed an HttpOnly cookie.
  const response = await fetch(`${API_BASE}/api/auth/dashboard-logout`, {
    method: 'POST', credentials: 'include', headers: { 'X-Dashboard-Request': '1' },
  });
  if (!response.ok) throw new Error('Could not sign out. Please try again.');
  setToken(null);
}

/** Only invalidate the staff surface; ministry sessions are independent. */
function handleStaffAuthFailure(status: number, message: string, sentToken: string | null) {
  if (!sentToken || sentToken !== token || !window.location.pathname.startsWith('/app/dashboard')) return;
  if (status === 401 || (status === 403 && /^Insufficient dashboard role\.?$/i.test(message.trim()))) {
    setToken(null);
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(status === 403 && /^Insufficient dashboard role\.?$/i.test(message.trim())
      ? 'Please sign out and log in again to refresh your dashboard access. If this continues, contact your administrator.'
      : message);
    this.status = status;
    this.body = body ?? null;
  }
}

export async function apiUpload<T = unknown>(path: string, file: File, field: string): Promise<T> {
  const sentToken = token;
  const generation = sessionGeneration;
  const body = new FormData();
  body.append(field, file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body,
    credentials: 'include',
    headers: { 'X-Dashboard-Request': '1' },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const parsed = await res.json();
      if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') message = parsed.message;
    } catch { /* non-JSON */ }
    if (generation === sessionGeneration) handleStaffAuthFailure(res.status, message, sentToken);
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
  const staffRequest = window.location.pathname.startsWith('/app/dashboard') || path.includes('/auth/dashboard-');
  const activeToken = !staffRequest && !path.endsWith('/auth/login') && (isPastorPath || !token) ? pastorTok : null;
  const staffGeneration = sessionGeneration;
  const sentStaffSession = token;
  const hasBody = options.body != null && options.body !== '';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'X-Dashboard-Request': '1',
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
    if (staffGeneration === sessionGeneration && !activeToken) handleStaffAuthFailure(res.status, message, sentStaffSession);
    throw new ApiError(res.status, message, body);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

const DASHBOARD_ROLES = new Set(['SUPER_ADMIN', 'SUPER_EDITOR', 'EDITOR']);

export async function login(email: string, password: string) {
  const res = await api<{ expiresAt: number; user: AdminUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, surface: 'dashboard' }),
  });
  if (!DASHBOARD_ROLES.has(res.user.role)) throw new ApiError(403, 'Dashboard access required');
  setToken('cookie-session', res.user, res.expiresAt);
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

let applicantToken: string | null = null;
export function getApplicantToken(): string | null { return applicantToken; }
export function setApplicantToken(value: string | null) { applicantToken = value; }

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
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Dashboard-Request': '1' },
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

const publicReads = new Map<string, Promise<unknown>>();

/** Share simultaneous public CMS reads; retain no stale copy after completion. */
export function publicApi<T>(path: string): Promise<T> {
  const existing = publicReads.get(path);
  if (existing) return existing as Promise<T>;
  const pending = fetchPublic<T>(path).finally(() => publicReads.delete(path));
  publicReads.set(path, pending);
  return pending;
}

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'omit',
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
