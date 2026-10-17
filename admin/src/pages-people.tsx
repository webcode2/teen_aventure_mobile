import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import { askConfirm } from './prompt-dialog';
import { Alert, Badge, Dialog, Drawer, Empty, Field, Pager, PencilIcon, slicePage, Spinner, Button } from './ui';
import {
  accountTypeKey,
  accountTypeLabel,
  CHILD_ACCOUNT_TYPE_FILTERS,
  childAccountLabel,
  childAccountTypeKey,
  isMobileAppUser,
  isPastorAccount,
  isStaffAccount,
  STAFF_ROLE_FILTERS,
  STATUS_FILTERS,
  staffTypeLabel,
  SYSTEM_ADMIN_ROLES,
  USER_ACCOUNT_TYPE_FILTERS,
  USER_PLATFORM_ROLES,
  type ChildAccountTypeKey,
  type UserAccountTypeKey,
} from './account-types';

export type PeopleDirectorySection = 'users' | 'pastors' | 'staff';

type PeopleUser = {
  id: string;
  email: string;
  name: string;
  platformRole: string;
  isActive: boolean;
  appLogin?: boolean;
  createdAt: string;
  churchRoles: Array<{ role: string; church: { name: string } }>;
  guardianships: Array<{ relation: string; family: { id: string; name: string; church?: { name: string } | null } }>;
  familiesOwned: Array<{ id: string; name: string }>;
  _count?: { pushSubscriptions: number };
};

type PushSubscription = {
  id: string;
  fcmToken: string;
  platform: string;
  deviceName?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  createdAt?: string;
  updatedAt: string;
};

function pushDeviceLabel(sub: PushSubscription) {
  const name = sub.deviceName?.trim();
  if (name) return name;
  const make = sub.manufacturer?.trim();
  const model = sub.model?.trim();
  if (make && model && !model.toLowerCase().includes(make.toLowerCase())) {
    return `${make} ${model}`;
  }
  return model || make || '';
}

type UserDetail = {
  id: string;
  email: string;
  name: string;
  platformRole: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  pushSubscriptions: PushSubscription[];
  churchRoles: Array<{ role: string; church: { id: string; name: string; joinCode?: string } }>;
  guardianships: Array<{ relation: string; family: { id: string; name: string; jurisdiction: string; church?: { name: string } | null; children?: Array<{ id: string; name: string; ageBand: string; email: string | null }> } }>;
  familiesOwned: Array<{ id: string; name: string; jurisdiction: string }>;
  classesOwned?: Array<{ id: string; name: string; kind: string; joinCode: string }>;
  classAssign?: Array<{ role: string; classGroup: { id: string; name: string; kind: string } }>;
  reportsFiled?: Array<{ id: string; category: string; status: string; createdAt: string }>;
};

type PeopleChild = {
  id: string;
  name: string;
  ageBand: string;
  email: string | null;
  independentLogin: boolean;
  hasPin: boolean;
  askScore: number;
  createdAt: string;
  family: { id: string; name: string; jurisdiction: string; church?: { name: string } | null };
  streak: { current: number; longest: number; lastDay: string | null } | null;
  enrollments: Array<{ status: string; classGroup: { name: string; kind: string } }>;
  _count: { scores: number; enrollments: number };
};

type PeopleFamily = {
  id: string;
  name: string;
  jurisdiction: string;
  deletionStage: string | null;
  createdAt: string;
  church: { name: string } | null;
  owner: { email: string; name: string };
  _count: { children: number; guardians: number; jarEntries: number };
};

type Directory = { users: PeopleUser[]; children: PeopleChild[]; families: PeopleFamily[] };

type Kind = 'users' | 'staff' | 'pastors' | 'children' | 'families';

function maskToken(token: string) {
  if (token.length <= 16) return token;
  return `${token.slice(0, 8)}…${token.slice(-6)}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || '?').slice(0, 2).toUpperCase();
}

function PersonAvatar({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-tight ${
        muted ? 'bg-surface-2 text-muted' : 'bg-navy text-gold'
      }`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function DataTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto bg-transparent">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">{children}</table>
    </div>
  );
}

const thClass =
  'whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0';
const tdClass = 'px-3 py-3 align-middle text-navy first:pl-0 last:pr-0';

function rowClass(selected: boolean, dimmed?: boolean) {
  return `border-b border-border/50 cursor-pointer transition-colors hover:bg-surface-2/30 ${
    selected ? 'bg-teal-tint/50' : ''
  } ${dimmed ? 'opacity-65' : ''}`;
}

function CreateAccountDialog({
  accountKind,
  onClose,
  onCreated,
}: {
  accountKind: 'user' | 'staff';
  onClose: () => void;
  onCreated: (userId: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [platformRole, setPlatformRole] = useState(accountKind === 'staff' ? 'APP_MANAGER' : 'MAIN_ACCOUNT');
  const isTeen = accountKind === 'user' && platformRole === 'CHILD';
  const thisYear = new Date().getFullYear();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError('');
    setSaving(true);
    try {
      const created = await api<{ id: string }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          accountKind,
          platformRole,
          password,
          ...(accountKind === 'user' ? { birthYear: Number(birthYear) } : {}),
        }),
      });
      onCreated(created.id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create account');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={accountKind === 'staff' ? 'Add staff account' : 'Add user account'}
      subtitle={accountKind === 'staff' ? 'System administrator for this dashboard' : 'App account for parents or standalone teens'}
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      <div className="flex flex-col gap-3 mt-2">
        <Field label="Display name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          />
        </Field>
        {accountKind === 'staff' ? (
          <Field label="System role">
            <select
              value={platformRole}
              onChange={(e) => setPlatformRole(e.target.value)}
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              {SYSTEM_ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>{staffTypeLabel({ platformRole: role })}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="User type">
            <select
              value={platformRole}
              onChange={(e) => setPlatformRole(e.target.value)}
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              {USER_PLATFORM_ROLES.map((role) => (
                <option key={role} value={role}>{role === 'CHILD' ? 'Standalone teen' : 'Main account'}</option>
              ))}
            </select>
          </Field>
        )}
        {accountKind === 'user' ? (
          <Field label="Birth year" hint={isTeen ? `Teens are 15–19 (born ${thisYear - 19}–${thisYear - 15})` : `Main accounts are 20+ (born ${thisYear - 20} or earlier)`}>
            <input
              type="number"
              inputMode="numeric"
              min={1900}
              max={thisYear}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </Field>
        ) : null}
        <Field label="Password" hint="At least 8 characters; teens use this with email on Teen sign in">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          />
        </Field>
      </div>
      <div className="mt-4 pt-3 border-t border-border flex justify-end">
        <Button className="w-full hover:shadow" type="button"
           
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? 'Creating…' : 'Create account'}
        </Button>
      </div>
    </Dialog>
  );
}

function UserAccountPanel({
  userId,
  accountKind,
  onClose,
  onChanged,
}: {
  userId: string;
  accountKind: 'user' | 'staff';
  onClose: () => void;
  onChanged: () => void;
}) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [platformRole, setPlatformRole] = useState<string>('MAIN_ACCOUNT');
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const body = await api<UserDetail>(`/api/admin/people/users/${userId}`);
      setUser(body);
      setName(body.name);
      setEmail(body.email);
      setPlatformRole(body.platformRole);
      setPassword('');
      setIsEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  function cancelEdit() {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPlatformRole(user.platformRole);
      setPassword('');
    }
    setSaveError('');
    setIsEditing(false);
  }

  async function save() {
    setSaveError('');
    setSaving(true);
    try {
      const payload: Record<string, string | boolean> = { name, email };
      if (accountKind === 'staff') {
        payload.platformRole = platformRole;
      } else if (user?.platformRole === 'CHILD' || platformRole === 'CHILD') {
        payload.platformRole = platformRole;
      }
      if (password.trim()) payload.password = password.trim();
      const updated = await api<UserDetail>(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setUser(updated);
      setName(updated.name);
      setEmail(updated.email);
      setPlatformRole(updated.platformRole);
      setPassword('');
      setIsEditing(false);
      onChanged();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!user) return;
    const next = !user.isActive;
    const ok = await askConfirm(
      next
        ? `Enable ${user.name}? They will be able to sign in again.`
        : `Disable ${user.name}? They will not be able to sign in until enabled again.`,
      {
        title: next ? 'Enable account' : 'Disable account',
        confirmLabel: next ? 'Enable' : 'Disable',
        tone: next ? 'default' : 'danger',
      },
    );
    if (!ok) return;
    setSaveError('');
    setToggling(true);
    try {
      const updated = await api<UserDetail>(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: next }),
      });
      setUser(updated);
      onChanged();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setToggling(false);
    }
  }

  async function remove() {
    if (!user) return;
    const ok = await askConfirm(`Delete ${user.name} (${user.email})? This cannot be undone.`, {
      title: 'Delete account',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setSaveError('');
    setDeleting(true);
    try {
      await api(`/api/admin/users/${userId}`, { method: 'DELETE' });
      onChanged();
      onClose();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function removePushSubscription(sub: PushSubscription) {
    if (!user) return;
    const label = pushDeviceLabel(sub) || sub.platform;
    const ok = await askConfirm(`Remove this ${label} push token? The phone will re-register if the app opens again.`, {
      title: 'Remove device token',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    setSaveError('');
    try {
      await api(`/api/admin/users/${userId}/push-subscriptions/${sub.id}`, { method: 'DELETE' });
      setUser({
        ...user,
        pushSubscriptions: user.pushSubscriptions.filter((row) => row.id !== sub.id),
      });
      onChanged();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Could not remove token');
    }
  }

  if (loading) {
    return (
      <Drawer open onClose={onClose}>
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner label="Loading account…" />
        </div>
      </Drawer>
    );
  }
  if (error) {
    return (
      <Drawer open onClose={onClose} title="Account details">
        <Alert kind="error">{error}</Alert>
      </Drawer>
    );
  }
  if (!user) return null;

  const roleLabel = accountKind === 'staff' ? staffTypeLabel(user) : accountTypeLabel(user);
  const explorerLabel =
    accountKind === 'staff'
      ? roleLabel
      : user.platformRole === 'CHILD'
        ? 'Explorer'
        : roleLabel.includes('Pastor')
          ? 'Pastor'
          : roleLabel.includes('Church')
            ? 'Church leader'
            : 'Explorer';
  const familyCount = user.familiesOwned.length + user.guardianships.length;
  const deviceCount = user.pushSubscriptions.length;
  const letter = user.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Drawer
      open
      onClose={onClose}
      widthClass="max-w-md"
      headerActions={
        isEditing ? (
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-muted hover:text-navy transition-colors cursor-pointer"
            onClick={cancelEdit}
          >
            Cancel
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button size="sm" className="gap-1" type="button"
               
              disabled={saving || deleting || toggling}
              onClick={() => setIsEditing(true)}
            >
              <PencilIcon />
              <span>Edit</span>
            </Button>
            <button
              type="button"
              className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-cream disabled:opacity-50"
              disabled={saving || deleting || toggling}
              onClick={() => void toggleActive()}
            >
              {toggling ? 'Updating…' : user.isActive ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-full border border-error/25 bg-surface px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error-bg/60 disabled:opacity-50"
              disabled={saving || deleting || toggling}
              onClick={() => void remove()}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )
      }
    >
      {saveError ? <Alert kind="error">{saveError}</Alert> : null}
      {!user.isActive ? <Alert kind="error">This account is disabled and cannot sign in.</Alert> : null}

      {!isEditing ? (
        <div className="flex flex-col gap-4">
          {/* App-style profile card */}
          <div className="rounded-[1.75rem] border border-border/70 bg-surface px-5 pb-5 pt-6 shadow-xs">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 rounded-full bg-[#F3E6D8] p-1.5">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-2xl font-black tracking-tight text-white shadow-xs">
                  {letter}
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <h4 className="m-0 text-lg font-extrabold tracking-tight text-navy">{user.name}</h4>
                <button
                  type="button"
                  className="cursor-pointer rounded-lg p-1 text-muted transition-colors hover:bg-cream hover:text-navy"
                  aria-label="Edit account"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilIcon />
                </button>
              </div>
              <p className="m-0 mt-0.5 text-sm text-muted">{explorerLabel}</p>
              <p className="m-0 mt-1 max-w-full truncate font-mono text-[11px] text-muted/80">{user.email}</p>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h5 className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Overview</h5>
                <Badge kind={user.isActive ? 'ok' : 'bad'}>{user.isActive ? 'Active' : 'Disabled'}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-tint text-teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.8L12 14.8 7.7 16.5l.8-4.8L5 8.3l4.8-.8L12 3z" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-navy">{roleLabel}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${familyCount ? 'bg-teal-tint text-teal' : 'bg-surface-2 text-muted/50'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-navy">
                    {familyCount ? `${familyCount} famil${familyCount === 1 ? 'y' : 'ies'}` : 'No family'}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${user.churchRoles.length ? 'bg-teal-tint text-teal' : 'bg-surface-2 text-muted/50'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M3 21h18M6 21V10l6-4 6 4v11M10 21v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-navy">
                    {user.churchRoles.length ? `${user.churchRoles.length} role${user.churchRoles.length === 1 ? '' : 's'}` : 'No church'}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange/15 text-orange">
                    <span className="text-xs font-black">{deviceCount}</span>
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-navy">
                    {deviceCount === 1 ? '1 device' : `${deviceCount} devices`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h5 className="mb-2.5 m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Account</h5>
              <div className="divide-y divide-border/50 rounded-2xl bg-cream/80 px-3.5">
                <div className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="text-muted">Email</span>
                  <span className="max-w-[14rem] truncate font-mono font-semibold text-navy">{user.email}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="text-muted">Updated</span>
                  <span className="font-semibold text-navy">{new Date(user.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-cream/90 px-3.5 py-3">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-navy">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-muted">Families</p>
              <p className="m-0 mt-0.5 text-sm font-extrabold text-navy">{familyCount}</p>
            </div>
            <div className="rounded-2xl bg-cream/90 px-3.5 py-3">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange/15 text-orange">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.8L12 14.8 7.7 16.5l.8-4.8L5 8.3l4.8-.8L12 3z" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-muted">Devices</p>
              <p className="m-0 mt-0.5 text-sm font-extrabold text-navy">{deviceCount}</p>
            </div>
          </div>

          {saveError ? <Alert kind="error">{saveError}</Alert> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Edit account details</span>
            <button
              type="button"
              className="text-xs text-muted hover:text-navy cursor-pointer underline"
              onClick={cancelEdit}
            >
              Cancel editing
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </Field>
            {accountKind === 'staff' ? (
              <Field label="System role" hint="Dashboard access for Teen Bible Adventures Manager">
                <select
                  value={platformRole}
                  onChange={(e) => setPlatformRole(e.target.value)}
                  className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                >
                  {SYSTEM_ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>{staffTypeLabel({ platformRole: role })}</option>
                  ))}
                </select>
              </Field>
            ) : user.platformRole === 'CHILD' ? (
              <Field label="User type">
                <select
                  value={platformRole}
                  onChange={(e) => setPlatformRole(e.target.value)}
                  className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                >
                  {USER_PLATFORM_ROLES.map((role) => (
                    <option key={role} value={role}>{role === 'CHILD' ? 'Standalone teen' : 'Main account'}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Account type">
                <p className="text-xs text-muted font-medium m-0">{accountTypeLabel(user)}</p>
              </Field>
            )}
            <Field
              label={accountKind === 'staff' ? 'Reset password' : 'New password'}
              hint={accountKind === 'staff' ? 'Set a new dashboard login password' : 'Leave blank to keep current password'}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
            <Button className="hover:shadow" type="button"
               
              disabled={saving || deleting}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <button
              type="button"
              className="px-3.5 py-2 rounded-full border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-muted hover:text-navy transition-colors cursor-pointer"
              disabled={saving}
              onClick={cancelEdit}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3.5 py-2 rounded-full border border-error/20 bg-surface hover:bg-error-bg/60 text-xs font-semibold text-error transition-colors cursor-pointer disabled:opacity-50 ml-auto"
              disabled={saving || deleting}
              onClick={() => void remove()}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </div>
      )}

      <section className="mt-1 pt-4 border-t border-border/60">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          FCM push tokens ({user.pushSubscriptions.length})
        </h4>
        {user.pushSubscriptions.length === 0 ? (
          <p className="m-0 text-xs text-muted">No devices registered yet. Tokens appear when the user opens the mobile app.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-0 py-2 font-semibold uppercase text-[10px] text-muted">Device</th>
                  <th className="px-2.5 py-2 font-semibold uppercase text-[10px] text-muted">Make / model</th>
                  <th className="px-2.5 py-2 font-semibold uppercase text-[10px] text-muted">Platform</th>
                  <th className="px-2.5 py-2 font-semibold uppercase text-[10px] text-muted">Token</th>
                  <th className="px-2.5 py-2 font-semibold uppercase text-[10px] text-muted">Updated</th>
                  <th className="px-0 py-2 text-right font-semibold uppercase text-[10px] text-muted"> </th>
                </tr>
              </thead>
              <tbody>
                {user.pushSubscriptions.map((sub) => {
                  const label = pushDeviceLabel(sub);
                  return (
                    <tr key={sub.id} className="border-b border-border/40">
                      <td className="px-0 py-2 font-medium text-navy">
                        {label || <span className="font-normal text-muted">Unknown (open app to label)</span>}
                      </td>
                      <td className="px-2.5 py-2 text-muted">
                        {[sub.manufacturer, sub.model].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-2.5 py-2 text-navy">{sub.platform}</td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-muted">
                        <code title={sub.fcmToken}>{maskToken(sub.fcmToken)}</code>
                      </td>
                      <td className="px-2.5 py-2 text-muted whitespace-nowrap">
                        {new Date(sub.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-0 py-2 text-right">
                        <button
                          type="button"
                          className="cursor-pointer rounded-md border border-error/30 bg-error-bg px-2 py-1 text-[11px] font-semibold text-error hover:bg-error/15"
                          onClick={() => void removePushSubscription(sub)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(user.familiesOwned.length > 0 || user.guardianships.length > 0 || user.churchRoles.length > 0) && (
        <section className="mt-1 pt-4 border-t border-border/60">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Linked records</h4>
          <ul className="m-0 list-disc space-y-1 pl-4 text-xs text-muted">
            {user.familiesOwned.map((f) => <li key={f.id}>Owns family: {f.name}</li>)}
            {user.guardianships.map((g) => <li key={g.family.id}>Guardian of {g.family.name} ({g.relation})</li>)}
            {user.churchRoles.map((r, i) => <li key={i}>{r.role} at {r.church.name}</li>)}
          </ul>
        </section>
      )}
    </Drawer>
  );
}

export function PeoplePage({ section = 'users' }: { section?: PeopleDirectorySection }) {
  const [data, setData] = useState<Directory | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>(
    section === 'staff' ? 'staff' : section === 'pastors' ? 'pastors' : 'users',
  );
  const [userTypeFilter, setUserTypeFilter] = useState<UserAccountTypeKey | 'all'>('all');
  const [staffRoleFilter, setStaffRoleFilter] = useState<(typeof SYSTEM_ADMIN_ROLES)[number] | 'all'>('all');
  const [childTypeFilter, setChildTypeFilter] = useState<ChildAccountTypeKey | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState<'user' | 'staff' | null>(null);
  const [detail, setDetail] = useState<{ title: string; body: unknown } | null>(null);
  const [detailError, setDetailError] = useState('');

  const apiScope = section === 'users' ? 'users' : section === 'pastors' ? 'pastors' : 'staff';

  const reload = useCallback(() => {
    api<Directory>(`/api/admin/people?scope=${apiScope}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [apiScope]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    setKind(section === 'staff' ? 'staff' : section === 'pastors' ? 'pastors' : 'users');
    setSelectedUserId(null);
    setQ('');
    setUserTypeFilter('all');
    setStaffRoleFilter('all');
    setChildTypeFilter('all');
    setStatusFilter('all');
  }, [section]);

  useEffect(() => {
    setSelectedUserId(null);
    setUserTypeFilter('all');
    setStaffRoleFilter('all');
    setChildTypeFilter('all');
    setStatusFilter('all');
  }, [kind]);

  const query = q.trim().toLowerCase();
  const matchedAccounts = useMemo(() => {
    if (!data) return [];
    return data.users.filter((u) =>
      !query || `${u.name} ${u.email} ${u.platformRole} ${accountTypeLabel(u)}`.toLowerCase().includes(query),
    );
  }, [data, query]);
  const communityUsers = useMemo(() => {
    return matchedAccounts.filter((u) => {
      if (!isMobileAppUser(u)) return false;
      if (userTypeFilter !== 'all' && accountTypeKey(u) !== userTypeFilter) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'disabled' && u.isActive) return false;
      return true;
    });
  }, [matchedAccounts, userTypeFilter, statusFilter]);
  const pastorAccounts = useMemo(() => {
    return matchedAccounts.filter((u) => {
      if (!isPastorAccount(u)) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'disabled' && u.isActive) return false;
      return true;
    });
  }, [matchedAccounts, statusFilter]);
  const staffAccounts = useMemo(() => {
    return matchedAccounts.filter((u) => {
      if (!isStaffAccount(u)) return false;
      if (staffRoleFilter !== 'all' && u.platformRole !== staffRoleFilter) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'disabled' && u.isActive) return false;
      return true;
    });
  }, [matchedAccounts, staffRoleFilter, statusFilter]);
  const children = useMemo(() => {
    if (!data || section !== 'users') return [];
    return data.children.filter((c) => {
      if (query && !`${c.name} ${c.email ?? ''} ${c.family.name} ${childAccountLabel(c)}`.toLowerCase().includes(query)) {
        return false;
      }
      if (childTypeFilter !== 'all' && childAccountTypeKey(c) !== childTypeFilter) return false;
      return true;
    });
  }, [data, query, childTypeFilter, section]);
  const families = useMemo(() => {
    if (!data || section !== 'users') return [];
    return data.families.filter((f) =>
      !query || `${f.name} ${f.owner.email} ${f.church?.name ?? ''}`.toLowerCase().includes(query),
    );
  }, [data, query, section]);

  useEffect(() => {
    setPage(1);
  }, [kind, query, userTypeFilter, staffRoleFilter, childTypeFilter, statusFilter]);

  const usersPage = slicePage(communityUsers, page);
  const pastorsPage = slicePage(pastorAccounts, page);
  const staffPage = slicePage(staffAccounts, page);
  const childrenPage = slicePage(children, page);
  const familiesPage = slicePage(families, page);
  const pageTotal =
    kind === 'pastors' ? pastorsPage.total
    : kind === 'staff' ? staffPage.total
    : kind === 'children' ? childrenPage.total
    : kind === 'families' ? familiesPage.total
    : usersPage.total;

  const communityUserTotal = useMemo(
    () => matchedAccounts.filter((u) => isMobileAppUser(u)).length,
    [matchedAccounts],
  );
  const pastorAccountTotal = useMemo(
    () => matchedAccounts.filter((u) => isPastorAccount(u)).length,
    [matchedAccounts],
  );
  const staffAccountTotal = useMemo(
    () => matchedAccounts.filter((u) => isStaffAccount(u)).length,
    [matchedAccounts],
  );
  const childrenTotal = useMemo(() => {
    if (!data || section !== 'users') return 0;
    return data.children.filter((c) =>
      !query || `${c.name} ${c.email ?? ''} ${c.family.name}`.toLowerCase().includes(query),
    ).length;
  }, [data, query, section]);

  async function open(path: string, title: string) {
    setDetailError('');
    setSelectedUserId(null);
    try {
      const body = await api(path);
      setDetail({ title, body });
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : 'Could not load record');
    }
  }

  function selectUser(id: string) {
    setDetail(null);
    setDetailError('');
    setSelectedUserId(id);
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
        <Alert kind="error">{error}</Alert>
      </div>
    );
  }
  if (!data) return <Spinner label="Loading directory…" />;

  const tabs: Array<{ id: Kind; label: string; count: number }> =
    section === 'users'
      ? [
          { id: 'users', label: 'Users', count: communityUserTotal },
          { id: 'children', label: 'Children', count: childrenTotal },
          { id: 'families', label: 'Families', count: families.length },
        ]
      : section === 'pastors'
        ? [{ id: 'pastors', label: 'Pastors', count: pastorAccountTotal }]
        : [{ id: 'staff', label: 'Staff', count: staffAccountTotal }];

  const filterSelectClass =
    'h-[42px] rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25';

  const showingCount =
    kind === 'users'
      ? communityUsers.length
      : kind === 'pastors'
        ? pastorAccounts.length
        : kind === 'staff'
          ? staffAccounts.length
          : kind === 'children'
            ? children.length
            : families.length;
  const sectionTotal =
    kind === 'users'
      ? communityUserTotal
      : kind === 'pastors'
        ? pastorAccountTotal
        : kind === 'staff'
          ? staffAccountTotal
          : kind === 'children'
            ? childrenTotal
            : families.length;
  const filtersActive =
    (kind === 'users' && userTypeFilter !== 'all') ||
    (kind === 'staff' && staffRoleFilter !== 'all') ||
    (kind === 'children' && childTypeFilter !== 'all') ||
    ((kind === 'users' || kind === 'staff' || kind === 'pastors') && statusFilter !== 'all');

  const listHint =
    kind === 'users' || kind === 'staff' || kind === 'pastors'
      ? `Select a ${kind === 'staff' ? 'staff member' : kind === 'pastors' ? 'pastor' : 'user'} for full details, edit, and delete`
      : 'Select a row to inspect the full record';

  const showSectionTabs = tabs.length > 1;

  return (
    <div className="flex flex-col gap-5">
      {!showSectionTabs ? (
        <div>
          <h2 className="m-0 text-lg font-bold text-navy">
            {section === 'pastors' ? 'Pastors' : section === 'staff' ? 'Staff' : 'Users'}
          </h2>
          <p className="m-0 mt-0.5 text-xs text-muted">
            {section === 'pastors'
              ? 'Ministry pastor accounts'
              : section === 'staff'
                ? 'Dashboard administrator accounts'
                : 'Mobile app accounts'}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        {showSectionTabs ? (
          <div
            className="inline-flex shrink-0 flex-wrap items-center gap-0.5 rounded-md border border-border bg-cream p-1"
            role="tablist"
            aria-label="Directory sections"
          >
            {tabs.map((tab) => {
              const active = kind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`cursor-pointer rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-navy text-white shadow-xs' : 'text-muted hover:bg-surface hover:text-navy'
                  }`}
                  onClick={() => setKind(tab.id)}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        ) : null}

        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search directory</span>
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, family…"
            aria-label="Search directory"
            className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-navy placeholder:text-muted/70 shadow-xs focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
          />
        </label>

        {kind === 'users' ? (
          <select
            value={userTypeFilter}
            onChange={(e) => setUserTypeFilter(e.target.value as UserAccountTypeKey | 'all')}
            className={`${filterSelectClass} min-w-[11rem] shrink-0`}
            aria-label="Filter by account type"
          >
            {USER_ACCOUNT_TYPE_FILTERS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        ) : null}

        {kind === 'staff' ? (
          <select
            value={staffRoleFilter}
            onChange={(e) => setStaffRoleFilter(e.target.value as (typeof SYSTEM_ADMIN_ROLES)[number] | 'all')}
            className={`${filterSelectClass} min-w-[11rem] shrink-0`}
            aria-label="Filter by system role"
          >
            {STAFF_ROLE_FILTERS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        ) : null}

        {kind === 'children' ? (
          <select
            value={childTypeFilter}
            onChange={(e) => setChildTypeFilter(e.target.value as ChildAccountTypeKey | 'all')}
            className={`${filterSelectClass} min-w-[12rem] shrink-0`}
            aria-label="Filter by child account type"
          >
            {CHILD_ACCOUNT_TYPE_FILTERS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        ) : null}

        {kind === 'users' || kind === 'staff' || kind === 'pastors' ? (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'disabled')}
            className={`${filterSelectClass} min-w-[9rem] shrink-0`}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        ) : null}

        {filtersActive ? (
          <button
            type="button"
            className="h-[42px] shrink-0 cursor-pointer rounded-md border border-border bg-cream px-3 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-navy"
            onClick={() => {
              setUserTypeFilter('all');
              setStaffRoleFilter('all');
              setChildTypeFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear
          </button>
        ) : null}

        {(kind === 'users' || kind === 'staff') && (
          <Button type="button" className="shrink-0" onClick={() => setCreating(kind === 'staff' ? 'staff' : 'user')}>
            {kind === 'staff' ? 'Add staff' : 'Add user'}
          </Button>
        )}
      </div>

      <p className="m-0 text-xs text-muted">
        {listHint}
        {filtersActive ? ` · Showing ${showingCount} of ${sectionTotal}` : ''}
      </p>

      {kind === 'users' && (
        communityUsers.length === 0 ? (
          <Empty title="No users" body="Mobile app accounts for parents, teens, and church team appear here." />
        ) : (
          <DataTableShell>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Account type</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>FCM</th>
                <th className={thClass}>Families</th>
                <th className={thClass}>Church roles</th>
              </tr>
            </thead>
            <tbody>
              {usersPage.rows.map((u) => {
                const family =
                  u.familiesOwned.map((f) => f.name).join(', ') ||
                  u.guardianships.map((g) => g.family.name).join(', ');
                return (
                  <tr
                    key={u.id}
                    className={rowClass(selectedUserId === u.id, !u.isActive)}
                    onClick={() => selectUser(u.id)}
                  >
                    <td className={`${tdClass} font-semibold`}>
                      <div className="flex min-w-[10rem] items-center gap-2.5">
                        <PersonAvatar name={u.name} muted={!u.isActive} />
                        <span className="truncate">{u.name}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} max-w-[14rem] truncate text-muted`}>{u.email}</td>
                    <td className={`${tdClass} text-muted`}>{accountTypeLabel(u)}</td>
                    <td className={tdClass}>
                      <Badge kind={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                    </td>
                    <td className={`${tdClass} text-muted`}>{u._count?.pushSubscriptions ?? 0}</td>
                    <td className={`${tdClass} max-w-[10rem] truncate text-muted`}>{family || '—'}</td>
                    <td className={`${tdClass} max-w-[12rem] truncate text-muted`}>
                      {u.churchRoles.map((r) => `${r.role} · ${r.church.name}`).join(', ') || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTableShell>
        )
      )}

      {kind === 'pastors' && (
        pastorAccounts.length === 0 ? (
          <Empty title="No pastors" body="Approved ministry pastor accounts appear here." />
        ) : (
          <DataTableShell>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Ministry</th>
                <th className={thClass}>App login</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pastorsPage.rows.map((u) => {
                const ministries = u.churchRoles
                  .filter((r) => r.role === 'PASTOR')
                  .map((r) => r.church.name)
                  .join(', ');
                return (
                  <tr
                    key={u.id}
                    className={rowClass(selectedUserId === u.id, !u.isActive)}
                    onClick={() => selectUser(u.id)}
                  >
                    <td className={`${tdClass} font-semibold`}>
                      <div className="flex min-w-[10rem] items-center gap-2.5">
                        <PersonAvatar name={u.name} muted={!u.isActive} />
                        <span className="truncate">{u.name}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} max-w-[14rem] truncate text-muted`}>{u.email}</td>
                    <td className={`${tdClass} max-w-[14rem] truncate text-muted`}>{ministries || '—'}</td>
                    <td className={tdClass}>
                      <Badge kind={u.appLogin === false ? 'warn' : 'ok'}>
                        {u.appLogin === false ? 'Portal only' : 'Mobile'}
                      </Badge>
                    </td>
                    <td className={tdClass}>
                      <Badge kind={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTableShell>
        )
      )}

      {kind === 'staff' && (
        staffAccounts.length === 0 ? (
          <Empty title="No staff" body="System administrators created by superadmin for dashboard access appear here." />
        ) : (
          <DataTableShell>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>System role</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>FCM</th>
              </tr>
            </thead>
            <tbody>
              {staffPage.rows.map((u) => (
                  <tr
                    key={u.id}
                    className={rowClass(selectedUserId === u.id, !u.isActive)}
                    onClick={() => selectUser(u.id)}
                  >
                    <td className={`${tdClass} font-semibold`}>
                      <div className="flex min-w-[10rem] items-center gap-2.5">
                        <PersonAvatar name={u.name} muted={!u.isActive} />
                        <span className="truncate">{u.name}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} max-w-[14rem] truncate text-muted`}>{u.email}</td>
                    <td className={tdClass}>
                      <Badge kind="warn">{staffTypeLabel(u)}</Badge>
                    </td>
                    <td className={tdClass}>
                      <Badge kind={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                    </td>
                    <td className={`${tdClass} text-muted`}>{u._count?.pushSubscriptions ?? 0}</td>
                  </tr>
              ))}
            </tbody>
          </DataTableShell>
        )
      )}

      {kind === 'children' && (
        children.length === 0 ? (
          <Empty title="No children" body="Kids and teens on the app appear here with streaks and scores." />
        ) : (
          <DataTableShell>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Account type</th>
                <th className={thClass}>Band</th>
                <th className={thClass}>Family</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Streak</th>
                <th className={thClass}>AskScore</th>
                <th className={thClass}>PIN</th>
              </tr>
            </thead>
            <tbody>
              {childrenPage.rows.map((c) => (
                <tr
                  key={c.id}
                  className={rowClass(false)}
                  onClick={() => open(`/api/admin/people/children/${c.id}`, c.name)}
                >
                  <td className={`${tdClass} font-semibold`}>
                    <div className="flex min-w-[9rem] items-center gap-2.5">
                      <PersonAvatar name={c.name} />
                      <span className="truncate">{c.name}</span>
                    </div>
                  </td>
                  <td className={`${tdClass} text-muted`}>{childAccountLabel(c)}</td>
                  <td className={tdClass}>
                    <Badge kind="info">{c.ageBand}</Badge>
                  </td>
                  <td className={`${tdClass} max-w-[12rem] truncate text-muted`}>
                    {c.family.name}
                    {c.family.church ? ` · ${c.family.church.name}` : ''}
                  </td>
                  <td className={`${tdClass} max-w-[12rem] truncate text-muted`}>{c.email ?? '—'}</td>
                  <td className={`${tdClass} text-muted`}>
                    {c.streak ? `${c.streak.current} (best ${c.streak.longest})` : '0'}
                  </td>
                  <td className={`${tdClass} font-bold text-teal`}>{c.askScore}</td>
                  <td className={`${tdClass} text-muted`}>{c.hasPin ? 'Set' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </DataTableShell>
        )
      )}

      {kind === 'families' && (
        families.length === 0 ? (
          <Empty title="No families" body="Family records from the app appear here." />
        ) : (
          <DataTableShell>
            <thead>
              <tr>
                <th className={thClass}>Family</th>
                <th className={thClass}>Owner</th>
                <th className={thClass}>Church</th>
                <th className={thClass}>Kids</th>
                <th className={thClass}>Deletion</th>
              </tr>
            </thead>
            <tbody>
              {familiesPage.rows.map((f) => (
                <tr
                  key={f.id}
                  className={rowClass(false)}
                  onClick={() => open(`/api/admin/people/families/${f.id}`, f.name)}
                >
                  <td className={`${tdClass} font-semibold`}>
                    <div className="flex min-w-[9rem] items-center gap-2.5">
                      <PersonAvatar name={f.name} />
                      <span className="truncate">{f.name}</span>
                    </div>
                  </td>
                  <td className={`${tdClass} max-w-[14rem] text-muted`}>
                    <span className="block truncate font-medium text-navy">{f.owner.name}</span>
                    <span className="block truncate text-[11px]">{f.owner.email}</span>
                  </td>
                  <td className={`${tdClass} text-muted`}>{f.church?.name ?? '—'}</td>
                  <td className={`${tdClass} text-muted`}>{f._count.children}</td>
                  <td className={`${tdClass} text-muted`}>{f.deletionStage ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </DataTableShell>
        )
      )}

      <Pager page={page} total={pageTotal} onPage={setPage} />

      {creating ? (
        <CreateAccountDialog
          accountKind={creating}
          onClose={() => setCreating(null)}
          onCreated={(id) => {
            reload();
            setSelectedUserId(id);
          }}
        />
      ) : null}

      {selectedUserId ? (
        <UserAccountPanel
          userId={selectedUserId}
          accountKind={kind === 'staff' ? 'staff' : 'user'}
          onClose={() => setSelectedUserId(null)}
          onChanged={reload}
        />
      ) : null}

      {detailError ? <Alert kind="error">{detailError}</Alert> : null}
      {detail ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <h3 className="m-0 text-base font-bold text-navy">{detail.title}</h3>
            <button
              type="button"
              className="cursor-pointer rounded-full border border-border bg-cream px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-surface-2"
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          </div>
          <pre className="m-0 max-h-96 overflow-x-auto rounded-xl bg-navy p-4 font-mono text-xs leading-relaxed text-cream">
            {JSON.stringify(detail.body, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
