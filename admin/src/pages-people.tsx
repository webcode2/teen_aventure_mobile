import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { Alert, Badge, Dialog, Empty, Field, PageHeader, Spinner } from './ui';
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
      <div className="form-grid" style={{ marginTop: 16 }}>
        <Field label="Display name">
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {accountKind === 'staff' ? (
          <Field label="System role">
            <select value={platformRole} onChange={(e) => setPlatformRole(e.target.value)}>
              {SYSTEM_ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>{staffTypeLabel({ platformRole: role })}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="User type">
            <select value={platformRole} onChange={(e) => setPlatformRole(e.target.value)}>
              {USER_PLATFORM_ROLES.map((role) => (
                <option key={role} value={role}>{role === 'CHILD' ? 'Standalone teen' : 'Main account'}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Password" hint="At least 8 characters">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        </Field>
      </div>
      <div className="builder-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn" disabled={saving} onClick={() => void submit()}>
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

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
      setPassword('');
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
      <Dialog open onClose={onClose} title="Account details">
        <Spinner label="Loading account…" />
      </Dialog>
    );
  }
  if (error) {
    return (
      <Dialog open onClose={onClose} title="Account details">
        <Alert kind="error">{error}</Alert>
      </Dialog>
    );
  }
  if (!user) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={user.name}
      subtitle={
        accountKind === 'staff'
          ? `${staffTypeLabel(user)} · ${user.isActive ? 'Active' : 'Deactivated'} · joined ${new Date(user.createdAt).toLocaleDateString()}`
          : `${accountTypeLabel(user)} · ${user.isActive ? 'Active' : 'Deactivated'} · joined ${new Date(user.createdAt).toLocaleDateString()}`
      }
    >
      {saveError ? <Alert kind="error">{saveError}</Alert> : null}
      {!user.isActive ? <Alert kind="error">This account is deactivated and cannot sign in.</Alert> : null}

      <div className="form-grid" style={{ marginTop: 16 }}>
        <Field label="Display name">
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {accountKind === 'staff' ? (
          <Field label="System role" hint="Dashboard access for Teen Bible Adventures Manager">
            <select value={platformRole} onChange={(e) => setPlatformRole(e.target.value)}>
              {SYSTEM_ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>{staffTypeLabel({ platformRole: role })}</option>
              ))}
            </select>
          </Field>
        ) : user.platformRole === 'CHILD' ? (
          <Field label="User type">
            <select value={platformRole} onChange={(e) => setPlatformRole(e.target.value)}>
              {USER_PLATFORM_ROLES.map((role) => (
                <option key={role} value={role}>{role === 'CHILD' ? 'Standalone teen' : 'Main account'}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Account type">
            <p className="muted" style={{ margin: 0 }}>{accountTypeLabel(user)}</p>
          </Field>
        )}
        <Field
          label={accountKind === 'staff' ? 'Reset password' : 'New password'}
          hint={accountKind === 'staff' ? 'Set a new dashboard login password' : 'Leave blank to keep current password'}
        >
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
      </div>

      <div className="builder-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn" disabled={saving || deleting || toggling} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn secondary" disabled={saving || deleting || toggling} onClick={() => void toggleActive()}>
          {toggling ? 'Updating…' : user.isActive ? 'Deactivate account' : 'Reactivate account'}
        </button>
        <button type="button" className="btn danger" disabled={saving || deleting || toggling} onClick={() => void remove()}>
          {deleting ? 'Deleting…' : 'Delete account'}
        </button>
      </div>

      <section style={{ marginTop: 24 }}>
        <h4>FCM push tokens ({user.pushSubscriptions.length})</h4>
        {user.pushSubscriptions.length === 0 ? (
          <p className="muted">No devices registered yet. Tokens appear when the user opens the mobile app.</p>
        ) : (
          <table>
            <thead><tr><th>Platform</th><th>Token</th><th>Last updated</th></tr></thead>
            <tbody>
              {user.pushSubscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.platform}</td>
                  <td><code title={sub.fcmToken}>{maskToken(sub.fcmToken)}</code></td>
                  <td>{new Date(sub.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {(user.familiesOwned.length > 0 || user.guardianships.length > 0 || user.churchRoles.length > 0) && (
        <section style={{ marginTop: 24 }}>
          <h4>Linked records</h4>
          <ul className="muted">
            {user.familiesOwned.map((f) => <li key={f.id}>Owns family: {f.name}</li>)}
            {user.guardianships.map((g) => <li key={g.family.id}>Guardian of {g.family.name} ({g.relation})</li>)}
            {user.churchRoles.map((r, i) => <li key={i}>{r.role} at {r.church.name}</li>)}
          </ul>
        </section>
      )}
    </Dialog>
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

  if (error) return <div className="card"><Alert kind="error">{error}</Alert></div>;
  if (!data) return <Spinner />;

  return (
    <>
      <PageHeader
        kicker="Superadmin"
        title="People"
        subtitle="Manage app users and dashboard staff accounts."
      />
      <div className="card">
        <div className="tabs-inline">
          <button type="button" className={kind === 'users' ? 'active' : ''} onClick={() => setKind('users')}>Users ({communityUsers.length})</button>
          <button type="button" className={kind === 'staff' ? 'active' : ''} onClick={() => setKind('staff')}>Staff ({staffAccounts.length})</button>
          <button type="button" className={kind === 'children' ? 'active' : ''} onClick={() => setKind('children')}>Children ({children.length})</button>
          <button type="button" className={kind === 'families' ? 'active' : ''} onClick={() => setKind('families')}>Families ({families.length})</button>
        </div>
        {(kind === 'users' || kind === 'staff') && (
          <div className="builder-actions" style={{ marginBottom: 12 }}>
            <button type="button" className="btn" onClick={() => setCreating(kind === 'staff' ? 'staff' : 'user')}>
              {kind === 'staff' ? 'Add staff' : 'Add user'}
            </button>
          </div>
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, family…"
          aria-label="Search people"
          style={{ marginBottom: 16, maxWidth: 420 }}
        />
        {kind === 'users' && (
          communityUsers.length === 0 ? <Empty title="No users" body="Parents, teens, pastors, and church team appear here." /> : (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Account type</th><th>Status</th><th>FCM devices</th><th>Families</th><th>Church roles</th><th>Joined</th></tr></thead>
              <tbody>
                {communityUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={`row-link${selectedUserId === u.id ? ' row-selected' : ''}${!u.isActive ? ' row-inactive' : ''}`}
                    onClick={() => selectUser(u.id)}
                  >
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{accountTypeLabel(u)}</td>
                    <td><Badge kind={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td>{u._count?.pushSubscriptions ?? 0}</td>
                    <td>{u.familiesOwned.map((f) => f.name).join(', ') || u.guardianships.map((g) => g.family.name).join(', ') || '—'}</td>
                    <td>{u.churchRoles.map((r) => `${r.role} · ${r.church.name}`).join(', ') || '—'}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
        {kind === 'staff' && (
          staffAccounts.length === 0 ? <Empty title="No staff" body="System administrators created by superadmin for dashboard access appear here." /> : (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>System role</th><th>Status</th><th>FCM devices</th><th>Joined</th></tr></thead>
              <tbody>
                {staffAccounts.map((u) => (
                  <tr
                    key={u.id}
                    className={`row-link${selectedUserId === u.id ? ' row-selected' : ''}${!u.isActive ? ' row-inactive' : ''}`}
                    onClick={() => selectUser(u.id)}
                  >
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><Badge kind="warn">{staffTypeLabel(u)}</Badge></td>
                    <td><Badge kind={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td>{u._count?.pushSubscriptions ?? 0}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
        {kind === 'children' && (
          children.length === 0 ? <Empty title="No children" body="Kids and teens on the app appear here with streaks and scores." /> : (
            <table>
              <thead><tr><th>Name</th><th>Account type</th><th>Band</th><th>Family</th><th>Email</th><th>Streak</th><th>ASK score</th><th>PIN</th></tr></thead>
              <tbody>
                {children.map((c) => (
                  <tr key={c.id} className="row-link" onClick={() => open(`/api/admin/people/children/${c.id}`, c.name)}>
                    <td>{c.name}</td>
                    <td>{childAccountLabel(c)}</td>
                    <td>{c.ageBand}</td>
                    <td>{c.family.name}{c.family.church ? ` · ${c.family.church.name}` : ''}</td>
                    <td>{c.email ?? '—'}</td>
                    <td>{c.streak ? `${c.streak.current} (best ${c.streak.longest})` : '0'}</td>
                    <td>{c.askScore}</td>
                    <td>{c.hasPin ? 'Set' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
        {kind === 'families' && (
          families.length === 0 ? <Empty title="No families" body="Family records from the app appear here." /> : (
            <table>
              <thead><tr><th>Family</th><th>Owner</th><th>Church</th><th>Kids</th><th>Deletion</th></tr></thead>
              <tbody>
                {families.map((f) => (
                  <tr key={f.id} className="row-link" onClick={() => open(`/api/admin/people/families/${f.id}`, f.name)}>
                    <td>{f.name}</td>
                    <td>{f.owner.name} · {f.owner.email}</td>
                    <td>{f.church?.name ?? '—'}</td>
                    <td>{f._count.children}</td>
                    <td>{f.deletionStage ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        <div className="card">
          <div className="builder-head">
            <h3>{detail.title}</h3>
            <button type="button" className="btn secondary" onClick={() => setDetail(null)}>Close</button>
          </div>
          <pre className="json-pane">{JSON.stringify(detail.body, null, 2)}</pre>
        </div>
      ) : kind !== 'users' && kind !== 'staff' && !detail ? (
        <p className="muted">Select a row to inspect the full record (no password or PIN hash).</p>
      ) : (kind === 'users' || kind === 'staff') && !selectedUserId ? (
        <p className="muted">Select a {kind === 'staff' ? 'staff member' : 'user'} to view, edit, or delete the account and see FCM tokens.</p>
      ) : null}
    </>
  );
}
