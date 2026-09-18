import { useEffect, useState, type ReactNode } from 'react';
import { api, getUser } from './api';
import { Alert, Badge, Empty, Field, PageHeader, Spinner } from './ui';
import {
  ChildIcon,
  ChurchIcon,
  CommunityChart,
  getDashboardGreeting,
  HomeIcon,
  MailIcon,
  QuestIcon,
  ShieldIcon,
  StatCard,
  StatGroupCard,
  TrashIcon,
  UsersIcon,
} from './dashboard-helpers';

type Stats = {
  families: number;
  kidsOnParentAccount: number;
  standaloneTeens: number;
  pastors: number;
  churchStaff: number;
  churches: number;
  dashboardAdmins?: number;
  openReports: number;
  pendingDeletions?: number;
  queuedNotifications?: number;
  teenQuestWeeks?: number;
  users?: number;
};

export function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Stats>('/api/admin/stats').then(setStats).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="card"><Alert kind="error">{error}</Alert></div>;
  if (!stats) return <Spinner />;

  const user = getUser();
  const greeting = getDashboardGreeting(user?.name || 'Manager');

  const statCards: Array<{
    label: string;
    value: number;
    icon: ReactNode;
    tone: 'teal' | 'forest' | 'gold' | 'navy' | 'orange' | 'warn';
    hint?: string;
  }> = [
    { label: 'Families', value: stats.families, icon: <HomeIcon />, tone: 'forest', hint: 'Parent households' },
    { label: 'Kids on parent account', value: stats.kidsOnParentAccount, icon: <ChildIcon />, tone: 'gold', hint: 'Under 18, no standalone login' },
    { label: 'Standalone teens', value: stats.standaloneTeens, icon: <UsersIcon />, tone: 'teal', hint: 'Parent-granted login' },
    {
      label: 'Open reports',
      value: stats.openReports,
      icon: <ShieldIcon />,
      tone: stats.openReports > 0 ? 'warn' : 'teal',
      hint: stats.openReports > 0 ? 'Needs review' : 'All clear',
    },
  ];
  if (stats.queuedNotifications != null) {
    statCards.push({
      label: 'Queued notices',
      value: stats.queuedNotifications,
      icon: <MailIcon />,
      tone: stats.queuedNotifications > 0 ? 'orange' : 'teal',
    });
  }
  if (stats.pendingDeletions != null) {
    statCards.push({
      label: 'Deletions',
      value: stats.pendingDeletions,
      icon: <TrashIcon />,
      tone: stats.pendingDeletions > 0 ? 'warn' : 'forest',
    });
  }
  if (stats.dashboardAdmins != null && stats.dashboardAdmins > 0) {
    statCards.push({
      label: 'Dashboard admins',
      value: stats.dashboardAdmins,
      icon: <UsersIcon />,
      tone: 'warn',
      hint: 'Not counted in families or church',
    });
  }

  const chartPoints = [
    { label: 'Families', value: stats.families, color: '#2f7d5a' },
    { label: 'Kids', value: stats.kidsOnParentAccount, color: '#f4b942' },
    { label: 'Teens', value: stats.standaloneTeens, color: '#159a9c' },
    { label: 'Pastors', value: stats.pastors, color: '#173b5c' },
    { label: 'Staff', value: stats.churchStaff, color: '#e87524' },
  ];

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-hero-emoji" aria-hidden>{greeting.emoji}</p>
          <h1 className="dashboard-greeting">{greeting.headline}</h1>
          <p className="lede dashboard-greeting-sub">{greeting.subline}</p>
        </div>
        <div className="dashboard-hero-badges">
          <Badge kind={stats.openReports > 0 ? 'warn' : 'ok'}>
            {stats.openReports > 0 ? `${stats.openReports} open report${stats.openReports === 1 ? '' : 's'}` : 'Safeguarding clear'}
          </Badge>
          <Badge kind="info">{stats.kidsOnParentAccount + stats.standaloneTeens} kids & teens tracked</Badge>
        </div>
      </section>

      <div className="stat-grid stat-grid-rich">
        {statCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
        <StatGroupCard
          title="Church"
          stats={[
            { label: 'Pastors', value: stats.pastors, icon: <ChurchIcon />, tone: 'navy', hint: 'Church leadership' },
            { label: 'Church staff', value: stats.churchStaff, icon: <QuestIcon />, tone: 'orange', hint: 'Teachers & church team' },
            { label: 'Churches', value: stats.churches, icon: <ChurchIcon />, tone: 'navy' },
          ]}
        />
      </div>

      <div className="two-col dashboard-split">
        <div className="card chart-card">
          <h3>Community snapshot</h3>
          <p className="muted">Live counts from the same API the Flutter app reads.</p>
          <CommunityChart points={chartPoints} />
        </div>
        <div className="stack">
          <div className="card">
            <h3>What this desk controls</h3>
            <p className="muted">This desk publishes Teen Quest weeks and quizzes only. Teachers open a quiz for class — they cannot author weeks. There is no live class, chat, or custom message to children.</p>
          </div>
          <div className="card">
            <h3>Watch these</h3>
            <p className="muted">
              {stats.openReports > 0
                ? `${stats.openReports} safeguarding report${stats.openReports === 1 ? '' : 's'} still open.`
                : 'No open safeguarding reports.'}
              {' '}
              {stats.queuedNotifications
                ? `${stats.queuedNotifications} notification${stats.queuedNotifications === 1 ? '' : 's'} waiting on email/SMS/push delivery.`
                : 'Outbox is clear.'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

type Church = {
  id: string;
  name: string;
  joinCode: string;
  jurisdiction?: string;
  _count: { families: number; classes: number; reports: number };
};

export function ChurchesPage() {
  const [rows, setRows] = useState<Church[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('US');
  const [message, setMessage] = useState('');

  async function load() {
    try { setRows(await api<Church[]>('/api/admin/churches')); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/api/admin/churches', { method: 'POST', body: JSON.stringify({ name, jurisdiction }) });
      setName('');
      setMessage('Church created. Families join with the join code.');
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create church');
    }
  }

  async function regen(id: string) {
    await api(`/api/admin/churches/${id}/regenerate-join-code`, { method: 'POST' });
    load();
  }

  return (
    <>
      <PageHeader kicker="Directory" title="Churches" subtitle="Join codes are how families attach to a church in the mobile app." />
      <div className="two-col">
        <div className="card">
          <h3>Registered churches</h3>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {rows.length === 0 ? <Empty title="No churches yet" body="Create one so families can join from the app." /> : (
            <table>
              <thead><tr><th>Name</th><th>Join code</th><th>Families</th><th>Classes</th><th>Reports</th><th></th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td><span className="badge info join-code">{c.joinCode}</span></td>
                    <td>{c._count.families}</td>
                    <td>{c._count.classes}</td>
                    <td>{c._count.reports}</td>
                    <td><button className="btn secondary" type="button" onClick={() => regen(c.id)}>New code</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <form className="card" onSubmit={create}>
          <h3>Add church</h3>
          <Field label="Church name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grace Community" required />
          </Field>
          <Field label="Jurisdiction" hint="Used for consent packs (US, GB, NG…)">
            <input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value.toUpperCase())} required />
          </Field>
          {message ? <Alert kind="ok">{message}</Alert> : null}
          <button className="btn">Create church</button>
        </form>
      </div>
    </>
  );
}

const statusClass: Record<string, 'info' | 'warn' | 'bad' | 'ok'> = {
  SUBMITTED: 'info', UNDER_REVIEW: 'warn', ESCALATED: 'bad', CLOSED: 'ok',
};

type Report = {
  id: string;
  category: string;
  status: string;
  createdAt: string;
  church?: { name: string };
  assignee?: { name: string } | null;
  events?: unknown[];
};

export function ReportsPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try { setRows(await api<Report[]>('/api/admin/reports')); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    await api(`/api/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  return (
    <>
      <PageHeader kicker="Care" title="Safeguarding" subtitle="Controlled investigation access. Status changes are audited against your manager token." />
      <div className="card">
        <h3>Safeguarding reports — controlled investigation access</h3>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {rows.length === 0 ? <Empty title="No reports" body="New reports from the app will land here." /> : (
          <table>
            <thead><tr><th>Church</th><th>Category</th><th>Status</th><th>Assignee</th><th>Events</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.church?.name}</td>
                  <td>{r.category}</td>
                  <td><Badge kind={statusClass[r.status] ?? 'info'}>{r.status}</Badge></td>
                  <td>{r.assignee?.name ?? '—'}</td>
                  <td>{r.events?.length ?? 0}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <select
                      aria-label={`Status for ${r.category}`}
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                    >
                      {['SUBMITTED', 'UNDER_REVIEW', 'ESCALATED', 'CLOSED'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

type Deletion = {
  id: string;
  requestedAt: string;
  family?: { name: string; deletionStage: string };
};

export function DeletionsPage() {
  const [rows, setRows] = useState<Deletion[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Deletion[]>('/api/admin/deletions').then(setRows).catch((e: Error) => setError(e.message));
  }, []);

  const stageClass: Record<string, 'warn' | 'info' | 'bad'> = {
    recoverable: 'warn', backend_only: 'info', purge_pending: 'bad',
  };

  return (
    <>
      <PageHeader kicker="Privacy" title="Deletions" subtitle="0–30 days recoverable · 30–90 days backend-only · 90+ days purge pending." />
      <div className="card">
        <h3>Deletion lifecycle (0-30d recoverable · 30-90d backend-only · 90+d purge)</h3>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {rows.length === 0 ? <Empty title="No pending deletion requests" body="Family wipe requests from the app appear here." /> : (
          <table>
            <thead><tr><th>Family</th><th>Stage</th><th>Requested</th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>{d.family?.name}</td>
                  <td><Badge kind={stageClass[d.family?.deletionStage ?? ''] ?? 'info'}>{d.family?.deletionStage}</Badge></td>
                  <td>{new Date(d.requestedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const QUEST_SCORE_KEYS = ['VIDEO_WATCH', 'TEEN_QUEST_OBJS', 'TEEN_QUEST_SCRAMBLE', 'PRAYER_DECLARATION'] as const;
const QUEST_SCORE_FALLBACK: Record<(typeof QUEST_SCORE_KEYS)[number], number> = {
  VIDEO_WATCH: 10,
  TEEN_QUEST_OBJS: 5,
  TEEN_QUEST_SCRAMBLE: 5,
  PRAYER_DECLARATION: 1,
};

export function ScoringPage() {
  const [rules, setRules] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Record<string, number>>('/api/admin/scoring-rules').then(setRules).catch((e: Error) => setError(e.message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!rules) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload: Record<string, number> = {};
      for (const key of QUEST_SCORE_KEYS) payload[key] = rules[key] ?? QUEST_SCORE_FALLBACK[key];
      const saved = await api<Record<string, number>>('/api/admin/scoring-rules', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setRules(saved);
      setMessage('Saved. Completing a video, quiz/puzzle, or prayer awards this activity total — not a sum of question points.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  if (error && !rules) return <div className="card"><Alert kind="error">{error}</Alert></div>;
  if (!rules) return <Spinner />;

  const questRules = QUEST_SCORE_KEYS.map((key) => [key, rules[key] ?? QUEST_SCORE_FALLBACK[key]] as const);

  return (
    <>
      <PageHeader kicker="Points" title="Quest points" subtitle="Jar points for completing a video, quiz/puzzle, or prayer declaration." />
      <form className="card" onSubmit={save}>
        <h3>Teen Quest defaults</h3>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {message ? <Alert kind="ok">{message}</Alert> : null}
        <div className="scoring-grid">
          {questRules.map(([activity, points]) => (
            <label className="scoring-item scoring-edit" key={activity}>
              <span>{activity.replace(/_/g, ' ')}</span>
              <span className="pts-edit">
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={points}
                  aria-label={`${activity.replace(/_/g, ' ')} points`}
                  onChange={(e) => setRules({ ...rules, [activity]: Number(e.target.value) })}
                />
                <span className="pts">{points} pts</span>
              </span>
            </label>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Prayer is 1 point until the client confirms the amount. Official video thumbs and Abi/Zach art are drop-in files, not generated here.
        </p>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save quest points'}</button>
      </form>
    </>
  );
}
