import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
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
  TrashIcon,
  UsersIcon,
} from './dashboard-helpers';

type Stats = {
  families: number;
  groups: number;
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
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Stats>('/api/admin/stats').then(setStats).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs"><Alert kind="error">{error}</Alert></div>;
  if (!stats) return <Spinner />;

  const user = getUser();
  const greeting = getDashboardGreeting(user?.name || 'Manager');
  const groupCount = stats.groups;

  const chartPoints = [
    { label: 'Groups', value: groupCount, color: '#2f7d5a' },
    { label: 'Kids', value: stats.kidsOnParentAccount, color: '#f4b942' },
    { label: 'Teens', value: stats.standaloneTeens, color: '#159a9c' },
  ];

  const showAdmins = (stats.dashboardAdmins ?? 0) > 0;
  const showDeletions = (stats.pendingDeletions ?? 0) > 0;
  const statCount = 6 + (showAdmins ? 1 : 0) + (showDeletions ? 1 : 0);
  const statsGridClass =
    statCount >= 7
      ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3'
      : 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3';

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Command Hero Banner */}
      <section className="relative overflow-hidden rounded-card bg-gradient-to-r from-navy via-navy-deep to-navy text-cream p-4 sm:p-5 md:py-4 md:px-6 border border-white/10 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-cream mb-1.5 backdrop-blur-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal"></span>
            </span>
            <span>Teen Bible Adventures &bull; Discipleship Desk</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-cream">{greeting.headline}</h1>
          <p className="text-xs text-cream/75 max-w-xl mt-0.5 leading-relaxed">{greeting.subline}</p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-xs transition-all ${stats.openReports > 0 ? 'bg-error-bg/90 border-error/40 text-error' : 'bg-sage/90 border-forest/30 text-forest'}`}>
            <ShieldIcon />
            <span>{stats.openReports > 0 ? `${stats.openReports} open report${stats.openReports === 1 ? '' : 's'}` : 'Safeguarding: All Clear'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-cream backdrop-blur-xs">
            <UsersIcon />
            <span>{stats.kidsOnParentAccount + stats.standaloneTeens} youth tracked</span>
          </div>
        </div>
      </section>

      {/* Single stats row */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline gap-x-2 min-w-0">
          <h2 className="text-sm font-bold text-navy tracking-tight whitespace-nowrap shrink-0">
            Discipleship & Family Reach
          </h2>
          <p className="text-xs text-muted truncate m-0 min-w-0">
            Groups, youth, churches, and ops at a glance.
          </p>
        </div>

        <div className={statsGridClass}>
          <StatCard
            label="Groups"
            value={groupCount}
            icon={<HomeIcon />}
            tone="forest"
            hint="Family & church class groups"
            badgeText="All"
          />
          <StatCard
            label="Kids on parent account"
            value={stats.kidsOnParentAccount}
            icon={<ChildIcon />}
            tone="gold"
            hint="Under 18, guardian managed"
            badgeText="Family"
          />
          <StatCard
            label="Standalone teens"
            value={stats.standaloneTeens}
            icon={<UsersIcon />}
            tone="teal"
            hint="Parent-granted direct login"
            badgeText="Direct"
          />
          <StatCard
            label="Open reports"
            value={stats.openReports}
            icon={<ShieldIcon />}
            tone={stats.openReports > 0 ? 'warn' : 'teal'}
            hint={stats.openReports > 0 ? 'Immediate attention needed' : 'All clear'}
            badgeText={stats.openReports > 0 ? 'Review' : 'Secure'}
          />
          <StatCard
            label="Churches"
            value={stats.churches}
            icon={<ChurchIcon />}
            tone="teal"
            hint="Active ministry hubs"
            badgeText="Parishes"
          />
          <StatCard
            label="Queued notices"
            value={stats.queuedNotifications ?? 0}
            icon={<MailIcon />}
            tone={(stats.queuedNotifications ?? 0) > 0 ? 'orange' : 'teal'}
            hint={(stats.queuedNotifications ?? 0) > 0 ? 'Awaiting dispatch' : 'Outbox clear'}
            badgeText={(stats.queuedNotifications ?? 0) > 0 ? 'Pending' : 'Delivered'}
          />
          {showAdmins ? (
            <StatCard
              label="Dashboard admins"
              value={stats.dashboardAdmins!}
              icon={<UsersIcon />}
              tone="navy"
              hint="Desk managers & editors"
              badgeText="Desk"
            />
          ) : null}
          {showDeletions ? (
            <StatCard
              label="Pending deletions"
              value={stats.pendingDeletions!}
              icon={<TrashIcon />}
              tone="warn"
              hint="Privacy / erasure queue"
              badgeText="Care"
            />
          ) : null}
        </div>
      </section>

      {/* Community Snapshot & Operational Controls */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 bg-surface border border-border rounded-card p-4 sm:p-5 shadow-xs flex flex-col gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-navy">Community snapshot</h3>
            <p className="text-xs text-muted mt-0.5">Live counts from the same API the Flutter app reads.</p>
          </div>
          <CommunityChart points={chartPoints} />
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="bg-surface border border-border rounded-card p-4 sm:p-4.5 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-navy font-bold text-xs sm:text-sm">
              <span className="p-1.5 rounded-lg bg-teal-tint text-teal ring-1 ring-teal/20"><QuestIcon /></span>
              <span>Discipleship Desk Scope</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              This desk publishes weekly Teen Quest discipleship and studio puzzles. Teachers activate class quizzes during church hours — live child chats and custom messages are disabled for safeguarding.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-teal/30 bg-teal-tint text-teal hover:bg-teal hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                onClick={() => navigate('/app/dashboard/quests')}
              >
                + New quest week
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy font-semibold text-xs transition-colors cursor-pointer"
                onClick={() => navigate('/app/dashboard/puzzles')}
              >
                Puzzle Studio
              </button>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-card p-4 sm:p-4.5 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-navy font-bold text-xs sm:text-sm">
              <span className="p-1.5 rounded-lg bg-navy-tint text-navy ring-1 ring-navy/20"><ShieldIcon /></span>
              <span>Operational Pulse</span>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-cream border border-border/60">
                <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${stats.openReports > 0 ? 'bg-error animate-pulse' : 'bg-forest'}`} />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-navy">
                    {stats.openReports > 0 ? `${stats.openReports} safeguarding report${stats.openReports === 1 ? '' : 's'} open` : 'Safeguarding is clear'}
                  </span>
                  <span className="text-[11px] text-muted mt-0.5">
                    {stats.openReports > 0 ? 'Requires attention from care leadership.' : 'No active reports requiring review.'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-cream border border-border/60">
                <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${(stats.queuedNotifications ?? 0) > 0 ? 'bg-orange animate-pulse' : 'bg-forest'}`} />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-navy">
                    {(stats.queuedNotifications ?? 0) > 0 ? `${stats.queuedNotifications} notice${stats.queuedNotifications === 1 ? '' : 's'} queued` : 'Notification outbox clear'}
                  </span>
                  <span className="text-[11px] text-muted mt-0.5">
                    {(stats.queuedNotifications ?? 0) > 0 ? 'Messages awaiting dispatch.' : 'All system notifications dispatched.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type Church = {
  id: string;
  name: string;
  joinCode: string;
  jurisdiction?: string;
  description?: string;
  _count: { families: number; classes: number; reports: number };
};

type ChurchDetail = {
  id: string;
  name: string;
  joinCode: string;
  jurisdiction: string;
  description: string;
  createdAt: string;
  _count: { families: number; classes: number; reports: number };
  staff: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    role: string;
    grantedAt: string;
  }>;
  groups: Array<{
    id: string;
    name: string;
    joinCode: string;
    kind: string;
    owner: { id: string; name: string; email: string };
    teachers: Array<{ id: string; name: string; email: string; isActive: boolean; role: string }>;
    members: Array<{
      id: string;
      name: string;
      ageBand: string;
      email: string | null;
      status: string;
    }>;
  }>;
  families: Array<{
    id: string;
    name: string;
    owner: { id: string; name: string; email: string };
    guardians: Array<{ id: string; name: string; email: string; relation: string }>;
    children: Array<{ id: string; name: string; ageBand: string }>;
  }>;
};

function roleLabel(role: string) {
  switch (role) {
    case 'TEACHER':
      return 'Teacher';
    case 'CHAPERONE':
      return 'Chaperone';
    case 'CHILDRENS_CHURCH_LEAD':
      return "Children's church lead";
    case 'PASTOR':
      return 'Pastor';
    case 'PASTOR_NOMINEE':
      return 'Pastor nominee';
    default:
      return role;
  }
}

function ChurchDetailScreen({
  churchId,
  onBack,
}: {
  churchId: string;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<ChurchDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const row = await api<ChurchDetail>(`/api/admin/churches/${churchId}`);
      setDetail(row);
      setDescription(row.description ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load church');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [churchId]);

  async function saveDescription(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    setError('');
    try {
      const updated = await api<{ description: string }>(`/api/admin/churches/${churchId}`, {
        method: 'PATCH',
        body: JSON.stringify({ description }),
      });
      setDescription(updated.description);
      setDetail((d) => (d ? { ...d, description: updated.description } : d));
      setSaveMsg('Description saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save description');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="self-start text-xs font-semibold text-teal hover:underline cursor-pointer bg-transparent border-0 px-0"
          onClick={onBack}
        >
          ← Back to churches
        </button>
        <Spinner label="Loading church…" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="self-start text-xs font-semibold text-teal hover:underline cursor-pointer bg-transparent border-0 px-0"
          onClick={onBack}
        >
          ← Back to churches
        </button>
        <Alert kind="error">{error}</Alert>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="text-xs font-semibold text-teal hover:underline cursor-pointer bg-transparent border-0 px-0 mb-2"
            onClick={onBack}
          >
            ← Back to churches
          </button>
          <PageHeader
            kicker="Church"
            title={detail.name}
            subtitle={`${detail.jurisdiction} · join code ${detail.joinCode} · ${detail._count.families} families · ${detail._count.classes} groups`}
          />
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-teal-tint text-teal border border-teal/20">
          {detail.joinCode}
        </span>
      </div>

      {error ? <Alert kind="error">{error}</Alert> : null}
      {saveMsg ? <Alert kind="ok">{saveMsg}</Alert> : null}

      <form
        className="bg-surface border border-border rounded-card p-5 shadow-xs flex flex-col gap-3"
        onSubmit={(e) => void saveDescription(e)}
      >
        <h3 className="text-sm font-bold text-navy m-0">Church description</h3>
        <p className="text-[11px] text-muted m-0">
          What this congregation is about — shown on the church profile for staff and families.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Short intro: location, youth ministry focus, gathering times…"
          className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-y min-h-[96px]"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-navy hover:bg-teal text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save description'}
          </button>
          <span className="text-[11px] text-muted">{description.length}/4000</span>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-surface border border-border rounded-card p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-navy m-0">Teachers & staff</h3>
            <Badge kind="info">{detail.staff.length}</Badge>
          </div>
          {detail.staff.length === 0 ? (
            <p className="text-xs text-muted m-0">No teachers or church roles assigned yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {detail.staff.map((person) => (
                <li
                  key={`${person.id}-${person.role}`}
                  className="flex flex-col gap-0.5 p-2.5 rounded-lg border border-border bg-cream"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xs font-bold text-navy">{person.name}</strong>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-teal">
                      {roleLabel(person.role)}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted">{person.email}</span>
                  {!person.isActive ? (
                    <span className="text-[11px] text-error font-semibold">Deactivated</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-surface border border-border rounded-card p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-navy m-0">Families</h3>
            <Badge kind="info">{detail.families.length}</Badge>
          </div>
          {detail.families.length === 0 ? (
            <p className="text-xs text-muted m-0">No families have joined this church yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 list-none p-0 m-0 max-h-80 overflow-y-auto">
              {detail.families.map((family) => (
                <li key={family.id} className="p-2.5 rounded-lg border border-border bg-cream flex flex-col gap-1">
                  <strong className="text-xs font-bold text-navy">{family.name}</strong>
                  <span className="text-[11px] text-muted">
                    Owner {family.owner.name} · {family.children.length} child
                    {family.children.length === 1 ? '' : 'ren'}
                  </span>
                  {family.children.length > 0 ? (
                    <span className="text-[11px] text-navy">
                      {family.children.map((c) => c.name).join(', ')}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-surface border border-border rounded-card p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-navy m-0">Groups</h3>
          <Badge kind="info">{detail.groups.length}</Badge>
        </div>
        <p className="text-[11px] text-muted m-0 -mt-2">
          Class groups for this church — who teaches them and who is enrolled.
        </p>
        {detail.groups.length === 0 ? (
          <Empty title="No groups yet" body="Leads create class groups in the mobile app." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detail.groups.map((group) => {
              const approved = group.members.filter((m) => m.status === 'APPROVED');
              const pending = group.members.filter((m) => m.status === 'PENDING');
              return (
                <article
                  key={group.id}
                  className="rounded-xl border border-border bg-cream p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-navy m-0">{group.name}</h4>
                      <p className="text-[11px] text-muted m-0 mt-0.5">
                        Code {group.joinCode} · owned by {group.owner.name}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {approved.length} on roster
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted m-0 mb-1.5">
                      Teachers
                    </p>
                    {group.teachers.length === 0 ? (
                      <p className="text-xs text-muted m-0">No teachers assigned.</p>
                    ) : (
                      <ul className="flex flex-col gap-1 list-none p-0 m-0">
                        {group.teachers.map((t) => (
                          <li key={t.id} className="text-xs text-navy">
                            <span className="font-semibold">{t.name}</span>
                            <span className="text-muted"> · {roleLabel(t.role)} · {t.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted m-0 mb-1.5">
                      On this group
                    </p>
                    {approved.length === 0 && pending.length === 0 ? (
                      <p className="text-xs text-muted m-0">No one enrolled yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-1 list-none p-0 m-0">
                        {approved.map((m) => (
                          <li key={m.id} className="text-xs text-navy">
                            <span className="font-semibold">{m.name}</span>
                            <span className="text-muted"> · {m.ageBand}</span>
                          </li>
                        ))}
                        {pending.map((m) => (
                          <li key={m.id} className="text-xs text-orange">
                            <span className="font-semibold">{m.name}</span>
                            <span> · pending</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function ChurchesPage() {
  const [rows, setRows] = useState<Church[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('US');
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await api<Church[]>('/api/admin/churches'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }
  useEffect(() => {
    load();
  }, []);

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

  if (selectedId) {
    return (
      <ChurchDetailScreen
        churchId={selectedId}
        onBack={() => {
          setSelectedId(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Directory"
        title="Churches"
        subtitle="Open a church to see its description, teachers, and who’s in each group."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
          <h3 className="text-base font-bold text-navy">Registered churches</h3>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {rows.length === 0 ? (
            <Empty title="No churches yet" body="Create one so families can join from the app." />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">
                      Name
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">
                      Join code
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">
                      Families
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">
                      Classes
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">
                      Reports
                    </th>
                    <th className="py-2.5 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 hover:bg-surface-2/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="py-3 px-3 font-medium text-navy">
                        <button
                          type="button"
                          className="text-left font-medium text-navy hover:text-teal bg-transparent border-0 p-0 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(c.id);
                          }}
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-teal-tint text-teal border border-teal/20">
                          {c.joinCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted">{c._count.families}</td>
                      <td className="py-3 px-3 text-muted">{c._count.classes}</td>
                      <td className="py-3 px-3 text-muted">{c._count.reports}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void regen(c.id);
                          }}
                        >
                          New code
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <form
          className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4"
          onSubmit={create}
        >
          <h3 className="text-base font-bold text-navy">Add church</h3>
          <Field label="Church name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grace Community"
              required
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </Field>
          <Field label="Jurisdiction" hint="Used for consent packs (US, GB, NG…)">
            <input
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value.toUpperCase())}
              required
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy uppercase focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </Field>
          {message ? <Alert kind="ok">{message}</Alert> : null}
          <button className="w-full rounded-xl bg-navy hover:bg-teal text-white py-2.5 px-4 font-semibold text-xs shadow-xs hover:shadow transition-all cursor-pointer">
            Create church
          </button>
        </form>
      </div>
    </div>
  );
}

type AdminGroup = {
  id: string;
  name: string;
  kind: 'CHURCH' | 'FAMILY' | string;
  joinCode: string;
  createdAt: string;
  deletionAt: string | null;
  owner: { id: string; name: string; email: string };
  church: { id: string; name: string } | null;
  family: { id: string; name: string } | null;
  teachers: Array<{ id: string; name: string; email: string; isActive: boolean; role: string }>;
  memberCount: number;
  approvedCount: number;
  pendingCount: number;
};

export function GroupsPage() {
  const [rows, setRows] = useState<AdminGroup[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | 'CHURCH' | 'FAMILY'>('ALL');

  useEffect(() => {
    api<AdminGroup[]>('/api/admin/groups')
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtered = rows.filter((g) => {
    if (kindFilter !== 'ALL' && g.kind !== kindFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      g.name.toLowerCase().includes(q) ||
      g.joinCode.toLowerCase().includes(q) ||
      g.owner.name.toLowerCase().includes(q) ||
      g.owner.email.toLowerCase().includes(q) ||
      (g.church?.name ?? '').toLowerCase().includes(q) ||
      (g.family?.name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Directory"
        title="Groups"
        subtitle="Church class groups and family groups across the platform."
      />
      {error ? <Alert kind="error">{error}</Alert> : null}
      <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'CHURCH', 'FAMILY'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  kindFilter === k
                    ? 'bg-navy text-cream border-navy'
                    : 'bg-surface text-muted border-border hover:bg-surface-2'
                }`}
                onClick={() => setKindFilter(k)}
              >
                {k === 'ALL' ? 'All' : k === 'CHURCH' ? 'Church' : 'Family'}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, code, owner, church…"
            aria-label="Search groups"
            className="w-full sm:max-w-xs rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          />
        </div>

        {rows.length === 0 && !error ? (
          <Empty title="No groups yet" body="Families and church leads create groups in the mobile app." />
        ) : filtered.length === 0 ? (
          <Empty title="No matches" body="Try a different search or filter." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Name</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Kind</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Join code</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Linked to</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Owner</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Teachers</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Members</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-navy">
                      {g.name}
                      {g.deletionAt ? (
                        <span className="ml-2">
                          <Badge kind="warn">Deleting</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-3">
                      <Badge kind={g.kind === 'CHURCH' ? 'info' : 'ok'}>{g.kind}</Badge>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-teal-tint text-teal border border-teal/20">
                        {g.joinCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted">
                      {g.church?.name ?? g.family?.name ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-navy">
                      <span className="font-semibold">{g.owner.name}</span>
                      <span className="block text-[11px] text-muted">{g.owner.email}</span>
                    </td>
                    <td className="py-3 px-3 text-muted">{g.teachers.length}</td>
                    <td className="py-3 px-3 text-muted">
                      {g.approvedCount}
                      {g.pendingCount > 0 ? (
                        <span className="text-orange"> · {g.pendingCount} pending</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
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
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Care" title="Safeguarding" subtitle="Controlled investigation access. Status changes are audited against your manager token." />
      <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
        <h3 className="text-base font-bold text-navy">Safeguarding reports — controlled investigation access</h3>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {rows.length === 0 ? <Empty title="No reports" body="New reports from the app will land here." /> : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Church</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Category</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Assignee</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Events</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Created</th>
                  <th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-navy">{r.church?.name || '—'}</td>
                    <td className="py-3 px-3 font-medium text-navy">{r.category}</td>
                    <td className="py-3 px-3"><Badge kind={statusClass[r.status] ?? 'info'}>{r.status}</Badge></td>
                    <td className="py-3 px-3 text-muted">{r.assignee?.name ?? '—'}</td>
                    <td className="py-3 px-3 text-muted">{r.events?.length ?? 0}</td>
                    <td className="py-3 px-3 text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-right">
                      <select
                        aria-label={`Status for ${r.category}`}
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className="rounded-lg border border-border bg-cream px-2 py-1 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
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
          </div>
        )}
      </div>
    </div>
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
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Privacy" title="Deletions" subtitle="0–30 days recoverable · 30–90 days backend-only · 90+ days purge pending." />
      <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
        <h3 className="text-base font-bold text-navy">Deletion lifecycle (0-30d recoverable · 30-90d backend-only · 90+d purge)</h3>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {rows.length === 0 ? <Empty title="No pending deletion requests" body="Family wipe requests from the app appear here." /> : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Family</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Stage</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Requested</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-navy">{d.family?.name || '—'}</td>
                    <td className="py-3 px-3"><Badge kind={stageClass[d.family?.deletionStage ?? ''] ?? 'info'}>{d.family?.deletionStage}</Badge></td>
                    <td className="py-3 px-3 text-muted">{new Date(d.requestedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const QUEST_SCORE_KEYS = ['VIDEO_WATCH', 'TEEN_QUEST_OBJS', 'PRAYER_DECLARATION'] as const;
const QUEST_SCORE_FALLBACK: Record<(typeof QUEST_SCORE_KEYS)[number], number> = {
  VIDEO_WATCH: 10,
  TEEN_QUEST_OBJS: 5,
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

  if (error && !rules) return <div className="bg-surface border border-border rounded-card p-6 shadow-xs"><Alert kind="error">{error}</Alert></div>;
  if (!rules) return <Spinner />;

  const questRules = QUEST_SCORE_KEYS.map((key) => [key, rules[key] ?? QUEST_SCORE_FALLBACK[key]] as const);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Points" title="Quest points" subtitle="Jar points for completing a video, quiz/puzzle, or prayer declaration." />
      <form className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4" onSubmit={save}>
        <h3 className="text-base font-bold text-navy">Teen Quest defaults</h3>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {message ? <Alert kind="ok">{message}</Alert> : null}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-2">
          {questRules.map(([activity, points]) => (
            <label className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-cream" key={activity}>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">{activity.replace(/_/g, ' ')}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={points}
                  aria-label={`${activity.replace(/_/g, ' ')} points`}
                  onChange={(e) => setRules({ ...rules, [activity]: Number(e.target.value) })}
                  className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                />
                <span className="text-xs font-semibold text-teal">{points} pts</span>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Prayer is 1 point until the client confirms the amount. Official video thumbs and Abi/Zach art are drop-in files, not generated here.
        </p>
        <div>
          <button
            className="rounded-xl bg-navy hover:bg-teal text-white py-2.5 px-6 font-semibold text-xs shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save quest points'}
          </button>
        </div>
      </form>
    </div>
  );
}
