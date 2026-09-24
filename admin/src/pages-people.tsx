import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { Alert, Badge, Dialog, Drawer, Empty, Field, PageHeader, PencilIcon, Spinner } from './ui';
import { accountTypeLabel, childAccountLabel, isCommunityUser, isStaffAccount, staffTypeLabel, SYSTEM_ADMIN_ROLES, USER_PLATFORM_ROLES } from './account-types';

type PeopleUser = {
  id: string;
  email: string;
  name: string;
  platformRole: string;
  isActive: boolean;
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
  updatedAt: string;
};

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

type Kind = 'users' | 'staff' | 'children' | 'families';

function maskToken(token: string) {
  if (token.length <= 16) return token;
  return `${token.slice(0, 8)}…${token.slice(-6)}`;
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
  const [platformRole, setPlatformRole] = useState(accountKind === 'staff' ? 'APP_MANAGER' : 'MAIN_ACCOUNT');
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
          password,
          accountKind,
          platformRole,
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
        <Field label="Password" hint="At least 8 characters">
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
        <button
          type="button"
          className="w-full rounded-xl bg-navy hover:bg-teal text-white py-2.5 px-4 font-semibold text-xs shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? 'Creating…' : 'Create account'}
        </button>
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
    const ok = globalThis.confirm(
      next
        ? `Reactivate ${user.name}? They will be able to sign in again.`
        : `Deactivate ${user.name}? They will not be able to sign in until reactivated.`,
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
    const ok = globalThis.confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`);
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

  if (loading) {
    return (
      <Drawer open onClose={onClose} title="Account details">
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

  return (
    <Drawer
      open
      onClose={onClose}
      title={user.name}
      subtitle={`${roleLabel} · ${user.isActive ? 'Active' : 'Deactivated'} · joined ${new Date(user.createdAt).toLocaleDateString()}`}
      headerActions={
        !isEditing ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
            onClick={() => setIsEditing(true)}
            aria-label="Edit account"
          >
            <PencilIcon />
            <span>Edit</span>
          </button>
        ) : (
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-muted hover:text-navy transition-colors cursor-pointer"
            onClick={cancelEdit}
          >
            Cancel
          </button>
        )
      }
    >
      {saveError ? <Alert kind="error">{saveError}</Alert> : null}
      {!user.isActive ? <Alert kind="error">This account is deactivated and cannot sign in.</Alert> : null}

      {!isEditing ? (
        /* Viewable mode at first */
        <div className="flex flex-col gap-4">
          {/* Profile Overview Card */}
          <div className="bg-cream/70 border border-border/80 rounded-card p-4 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-navy text-gold font-extrabold flex items-center justify-center text-base shadow-xs shrink-0 tracking-tight">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-navy truncate m-0">{user.name}</h4>
                <p className="text-xs text-muted font-mono truncate m-0 mt-0.5">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge kind={user.isActive ? 'ok' : 'bad'}>{user.isActive ? 'Active' : 'Deactivated'}</Badge>
              <Badge kind="info">{roleLabel}</Badge>
            </div>
          </div>

          {/* Key-Value Details */}
          <div className="bg-surface border border-border rounded-xl divide-y divide-border/60 overflow-hidden shadow-2xs">
            <div className="py-2.5 px-3.5 flex items-center justify-between text-xs">
              <span className="text-muted font-medium">Display name</span>
              <span className="text-navy font-semibold">{user.name}</span>
            </div>
            <div className="py-2.5 px-3.5 flex items-center justify-between text-xs">
              <span className="text-muted font-medium">Email address</span>
              <span className="text-navy font-semibold font-mono">{user.email}</span>
            </div>
            <div className="py-2.5 px-3.5 flex items-center justify-between text-xs">
              <span className="text-muted font-medium">User type</span>
              <span className="text-navy font-semibold">{roleLabel}</span>
            </div>
            <div className="py-2.5 px-3.5 flex items-center justify-between text-xs">
              <span className="text-muted font-medium">Password</span>
              <span className="text-muted italic text-[11px]">•••••••• (secured)</span>
            </div>
            <div className="py-2.5 px-3.5 flex items-center justify-between text-xs">
              <span className="text-muted font-medium">Joined date</span>
              <span className="text-navy">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="py-2.5 px-3.5 flex items-center justify-between text-xs">
              <span className="text-muted font-medium">Last profile update</span>
              <span className="text-navy">{new Date(user.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Quick Actions in View Mode */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy hover:bg-teal text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
              onClick={() => setIsEditing(true)}
            >
              <PencilIcon />
              <span>Edit details</span>
            </button>
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer disabled:opacity-50"
              disabled={saving || deleting || toggling}
              onClick={() => void toggleActive()}
            >
              {toggling ? 'Updating…' : user.isActive ? 'Deactivate account' : 'Reactivate account'}
            </button>
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl border border-error/20 bg-surface hover:bg-error-bg/60 text-xs font-semibold text-error transition-colors cursor-pointer disabled:opacity-50 ml-auto"
              disabled={saving || deleting || toggling}
              onClick={() => void remove()}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </div>
      ) : (
        /* Editable mode when Edit is clicked */
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
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-navy hover:bg-teal text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
              disabled={saving || deleting || toggling}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-muted hover:text-navy transition-colors cursor-pointer"
              disabled={saving}
              onClick={cancelEdit}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl border border-error/20 bg-surface hover:bg-error-bg/60 text-xs font-semibold text-error transition-colors cursor-pointer disabled:opacity-50 ml-auto"
              disabled={saving || deleting || toggling}
              onClick={() => void remove()}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </div>
      )}

      {/* FCM push tokens section */}
      <section className="mt-4 pt-4 border-t border-border/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">FCM push tokens ({user.pushSubscriptions.length})</h4>
        {user.pushSubscriptions.length === 0 ? (
          <p className="text-xs text-muted">No devices registered yet. Tokens appear when the user opens the mobile app.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-2.5 font-semibold text-muted uppercase text-[10px]">Platform</th>
                  <th className="py-2 px-2.5 font-semibold text-muted uppercase text-[10px]">Token</th>
                  <th className="py-2 px-2.5 font-semibold text-muted uppercase text-[10px]">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {user.pushSubscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-border/40">
                    <td className="py-2 px-2.5 font-medium text-navy">{sub.platform}</td>
                    <td className="py-2 px-2.5 font-mono text-[11px] text-muted"><code title={sub.fcmToken}>{maskToken(sub.fcmToken)}</code></td>
                    <td className="py-2 px-2.5 text-muted">{new Date(sub.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Linked records section */}
      {(user.familiesOwned.length > 0 || user.guardianships.length > 0 || user.churchRoles.length > 0) && (
        <section className="mt-2 pt-4 border-t border-border/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Linked records</h4>
          <ul className="text-xs text-muted list-disc list-inside space-y-1">
            {user.familiesOwned.map((f) => <li key={f.id}>Owns family: {f.name}</li>)}
            {user.guardianships.map((g) => <li key={g.family.id}>Guardian of {g.family.name} ({g.relation})</li>)}
            {user.churchRoles.map((r, i) => <li key={i}>{r.role} at {r.church.name}</li>)}
          </ul>
        </section>
      )}
    </Drawer>
  );
}

export function PeoplePage() {
  const [data, setData] = useState<Directory | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('users');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState<'user' | 'staff' | null>(null);
  const [detail, setDetail] = useState<{ title: string; body: unknown } | null>(null);
  const [detailError, setDetailError] = useState('');

  const reload = useCallback(() => {
    api<Directory>('/api/admin/people').then(setData).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    setSelectedUserId(null);
  }, [kind]);

  const query = q.trim().toLowerCase();
  const matchedAccounts = useMemo(() => {
    if (!data) return [];
    return data.users.filter((u) =>
      !query || `${u.name} ${u.email} ${u.platformRole} ${accountTypeLabel(u)}`.toLowerCase().includes(query),
    );
  }, [data, query]);
  const communityUsers = useMemo(
    () => matchedAccounts.filter((u) => isCommunityUser(u)),
    [matchedAccounts],
  );
  const staffAccounts = useMemo(
    () => matchedAccounts.filter((u) => isStaffAccount(u)),
    [matchedAccounts],
  );
  const children = useMemo(() => {
    if (!data) return [];
    return data.children.filter((c) =>
      !query || `${c.name} ${c.email ?? ''} ${c.family.name}`.toLowerCase().includes(query),
    );
  }, [data, query]);
  const families = useMemo(() => {
    if (!data) return [];
    return data.families.filter((f) =>
      !query || `${f.name} ${f.owner.email} ${f.church?.name ?? ''}`.toLowerCase().includes(query),
    );
  }, [data, query]);

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

  if (error) return <div className="bg-surface border border-border rounded-card p-6 shadow-xs"><Alert kind="error">{error}</Alert></div>;
  if (!data) return <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Superadmin"
        title="People"
        subtitle="Manage app users and dashboard staff accounts."
      />
      <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-cream border border-border/80 w-fit">
          <button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${kind === 'users' ? 'bg-navy text-white shadow-xs' : 'text-muted hover:text-navy hover:bg-surface-2/60'}`} onClick={() => setKind('users')}>Users ({communityUsers.length})</button>
          <button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${kind === 'staff' ? 'bg-navy text-white shadow-xs' : 'text-muted hover:text-navy hover:bg-surface-2/60'}`} onClick={() => setKind('staff')}>Staff ({staffAccounts.length})</button>
          <button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${kind === 'children' ? 'bg-navy text-white shadow-xs' : 'text-muted hover:text-navy hover:bg-surface-2/60'}`} onClick={() => setKind('children')}>Children ({children.length})</button>
          <button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${kind === 'families' ? 'bg-navy text-white shadow-xs' : 'text-muted hover:text-navy hover:bg-surface-2/60'}`} onClick={() => setKind('families')}>Families ({families.length})</button>
        </div>

        {(kind === 'users' || kind === 'staff') && (
          <div>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-navy hover:bg-teal text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
              onClick={() => setCreating(kind === 'staff' ? 'staff' : 'user')}
            >
              {kind === 'staff' ? 'Add staff' : 'Add user'}
            </button>
          </div>
        )}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, family…"
          aria-label="Search people"
          className="w-full max-w-sm rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
        />

        {kind === 'users' && (
          communityUsers.length === 0 ? <Empty title="No users" body="Parents, teens, pastors, and church team appear here." /> : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Name</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Email</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Account type</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">FCM devices</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Families</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Church roles</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {communityUsers.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-b border-border/50 hover:bg-surface-2/40 cursor-pointer transition-colors ${
                        selectedUserId === u.id ? 'bg-teal-tint/40 font-semibold' : ''
                      } ${!u.isActive ? 'opacity-60' : ''}`}
                      onClick={() => selectUser(u.id)}
                    >
                      <td className="py-3 px-3 font-medium text-navy">{u.name}</td>
                      <td className="py-3 px-3 text-muted">{u.email}</td>
                      <td className="py-3 px-3 text-muted">{accountTypeLabel(u)}</td>
                      <td className="py-3 px-3"><Badge kind={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="py-3 px-3 text-muted">{u._count?.pushSubscriptions ?? 0}</td>
                      <td className="py-3 px-3 text-muted">{u.familiesOwned.map((f) => f.name).join(', ') || u.guardianships.map((g) => g.family.name).join(', ') || '—'}</td>
                      <td className="py-3 px-3 text-muted">{u.churchRoles.map((r) => `${r.role} · ${r.church.name}`).join(', ') || '—'}</td>
                      <td className="py-3 px-3 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {kind === 'staff' && (
          staffAccounts.length === 0 ? <Empty title="No staff" body="System administrators created by superadmin for dashboard access appear here." /> : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Name</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Email</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">System role</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">FCM devices</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {staffAccounts.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-b border-border/50 hover:bg-surface-2/40 cursor-pointer transition-colors ${
                        selectedUserId === u.id ? 'bg-teal-tint/40 font-semibold' : ''
                      } ${!u.isActive ? 'opacity-60' : ''}`}
                      onClick={() => selectUser(u.id)}
                    >
                      <td className="py-3 px-3 font-medium text-navy">{u.name}</td>
                      <td className="py-3 px-3 text-muted">{u.email}</td>
                      <td className="py-3 px-3"><Badge kind="warn">{staffTypeLabel(u)}</Badge></td>
                      <td className="py-3 px-3"><Badge kind={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="py-3 px-3 text-muted">{u._count?.pushSubscriptions ?? 0}</td>
                      <td className="py-3 px-3 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {kind === 'children' && (
          children.length === 0 ? <Empty title="No children" body="Kids and teens on the app appear here with streaks and scores." /> : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Name</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Account type</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Band</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Family</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Email</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Streak</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">ASK score</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">PIN</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-surface-2/40 cursor-pointer transition-colors" onClick={() => open(`/api/admin/people/children/${c.id}`, c.name)}>
                      <td className="py-3 px-3 font-medium text-navy">{c.name}</td>
                      <td className="py-3 px-3 text-muted">{childAccountLabel(c)}</td>
                      <td className="py-3 px-3 text-muted">{c.ageBand}</td>
                      <td className="py-3 px-3 text-muted">{c.family.name}{c.family.church ? ` · ${c.family.church.name}` : ''}</td>
                      <td className="py-3 px-3 text-muted">{c.email ?? '—'}</td>
                      <td className="py-3 px-3 text-muted">{c.streak ? `${c.streak.current} (best ${c.streak.longest})` : '0'}</td>
                      <td className="py-3 px-3 font-bold text-teal">{c.askScore}</td>
                      <td className="py-3 px-3 text-muted">{c.hasPin ? 'Set' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {kind === 'families' && (
          families.length === 0 ? <Empty title="No families" body="Family records from the app appear here." /> : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Family</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Owner</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Church</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Kids</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Deletion</th>
                  </tr>
                </thead>
                <tbody>
                  {families.map((f) => (
                    <tr key={f.id} className="border-b border-border/50 hover:bg-surface-2/40 cursor-pointer transition-colors" onClick={() => open(`/api/admin/people/families/${f.id}`, f.name)}>
                      <td className="py-3 px-3 font-medium text-navy">{f.name}</td>
                      <td className="py-3 px-3 text-muted">{f.owner.name} · {f.owner.email}</td>
                      <td className="py-3 px-3 text-muted">{f.church?.name ?? '—'}</td>
                      <td className="py-3 px-3 text-muted">{f._count.children}</td>
                      <td className="py-3 px-3 text-muted">{f.deletionStage ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

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
        <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/60">
            <h3 className="text-base font-bold text-navy">{detail.title}</h3>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-navy text-cream font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">{JSON.stringify(detail.body, null, 2)}</pre>
        </div>
      ) : kind !== 'users' && kind !== 'staff' && !detail ? (
        <p className="text-xs text-muted">Select a row to inspect the full record (no password or PIN hash).</p>
      ) : (kind === 'users' || kind === 'staff') && !selectedUserId ? (
        <p className="text-xs text-muted">Select a {kind === 'staff' ? 'staff member' : 'user'} to view, edit, or delete the account and see FCM tokens.</p>
      ) : null}
    </div>
  );
}
