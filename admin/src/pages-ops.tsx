import { AppResourceAlerts } from './app-resource-alerts';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { api, getUser } from './api';
import {
  isUnseenApplication,
  type ChurchApplicationRow,
} from './church-applications';
import { GroupJoinPassImages } from './barcode';
import { askConfirm } from './prompt-dialog';
import { Alert, Badge, Button, Dialog, Drawer, Empty, Field, Pager, slicePage, Spinner } from './ui';
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
    { label: 'Churches', value: stats.churches, color: '#011f3b' },
    ...((stats.queuedNotifications ?? 0) > 0 ? [{ label: 'Notices', value: stats.queuedNotifications!, color: '#e07a5f' }] : []),
    ...(stats.dashboardAdmins ? [{ label: 'Admins', value: stats.dashboardAdmins, color: '#5c7c8a' }] : []),
  ];

  const showAdmins = (stats.dashboardAdmins ?? 0) > 0;
  const showDeletions = (stats.pendingDeletions ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">
      <AppResourceAlerts />
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

      {/* Discipleship & Family Reach KPIs */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 min-w-0">
          <div className="flex items-baseline gap-x-2.5 min-w-0">
            <h2 className="text-base font-extrabold text-navy tracking-tight whitespace-nowrap shrink-0">
              Discipleship &amp; Family Reach
            </h2>
            <p className="text-xs text-muted truncate m-0 min-w-0">
              Active community groups, registered youth, and church ministry network.
            </p>
          </div>
        </div>

        {/* 4 Spacious, non-truncated primary KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Groups"
            value={groupCount}
            icon={<HomeIcon />}
            tone="forest"
            hint="Family & church class groups"
            badgeText="All Circles"
            onClick={() => navigate('/app/dashboard/groups')}
          />
          <StatCard
            label="Kids on parent account"
            value={stats.kidsOnParentAccount}
            icon={<ChildIcon />}
            tone="gold"
            hint="Under 18, guardian managed"
            badgeText="Family"
            onClick={() => navigate('/app/dashboard/people')}
          />
          <StatCard
            label="Standalone teens"
            value={stats.standaloneTeens}
            icon={<UsersIcon />}
            tone="teal"
            hint="Parent-granted direct login"
            badgeText="Direct Login"
            onClick={() => navigate('/app/dashboard/people')}
          />
          <StatCard
            label="Churches"
            value={stats.churches}
            icon={<ChurchIcon />}
            tone="navy"
            hint="Active ministry hubs"
            badgeText="Parishes"
            onClick={() => navigate('/app/dashboard/churches')}
        />
      </div>

        {/* Operational & Safeguarding Sub-Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 rounded-none bg-surface border border-border/80 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-navy font-bold">
            <span className="h-2 w-2 rounded-none bg-teal animate-pulse" />
            <span>Operations &amp; Safeguarding Status:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/app/dashboard/reports')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border font-bold transition-all cursor-pointer ${
                stats.openReports > 0
                  ? 'bg-error-bg text-error border-error/30 hover:bg-error/15'
                  : 'bg-surface-2 text-muted border-border hover:text-navy hover:bg-surface'
              }`}
            >
              <ShieldIcon />
              <span>{stats.openReports > 0 ? `${stats.openReports} open report${stats.openReports === 1 ? '' : 's'}` : 'Safeguarding: All Clear'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/app/dashboard/notifications')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border font-bold transition-all cursor-pointer ${
                (stats.queuedNotifications ?? 0) > 0
                  ? 'bg-terracotta text-orange border-orange/30 hover:bg-orange/15'
                  : 'bg-surface-2 text-muted border-border hover:text-navy hover:bg-surface'
              }`}
            >
              <MailIcon />
              <span>{(stats.queuedNotifications ?? 0) > 0 ? `${stats.queuedNotifications} queued notices` : 'Outbox Clear'}</span>
            </button>

            {showAdmins ? (
              <button
                type="button"
                onClick={() => navigate('/app/dashboard/staff')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-border bg-surface-2 text-navy hover:bg-surface font-bold transition-all cursor-pointer"
              >
                <UsersIcon />
                <span>{stats.dashboardAdmins} desk admins</span>
              </button>
            ) : null}

            {showDeletions ? (
              <button
                type="button"
                onClick={() => navigate('/app/dashboard/deletions')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border font-bold transition-all cursor-pointer ${
                  stats.pendingDeletions! > 0
                    ? 'bg-error-bg text-error border-error/30 hover:bg-error/15'
                    : 'bg-surface-2 text-muted border-border hover:text-navy hover:bg-surface'
                }`}
              >
                <TrashIcon />
                <span>{stats.pendingDeletions} pending deletion{stats.pendingDeletions === 1 ? '' : 's'}</span>
              </button>
            ) : null}
          </div>
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
                onClick={() => navigate('/app/dashboard/quests/new')}
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

type ChurchPastor = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
};

type Church = {
  id: string;
  name: string;
  joinCode: string;
  jurisdiction?: string;
  description?: string;
  disabledAt?: string | null;
  deletedAt?: string | null;
  archivedAt?: string | null;
  auditPastorName?: string | null;
  auditPastorEmail?: string | null;
  pastor?: ChurchPastor | null;
  _count: { families: number; classes: number; reports: number };
};

function ministryState(row: { disabledAt?: string | null; deletedAt?: string | null; archivedAt?: string | null }) {
  if (row.archivedAt) return 'Archived';
  if (row.deletedAt) return 'Deleted';
  if (row.disabledAt) return 'Under review';
  return 'Active';
}

type ChurchDetail = {
  id: string;
  name: string;
  joinCode: string;
  jurisdiction: string;
  description: string;
  disabledAt?: string | null;
  deletedAt?: string | null;
  archivedAt?: string | null;
  auditPastorName?: string | null;
  auditPastorEmail?: string | null;
  createdAt: string;
  _count: { families: number; classes: number; reports: number };
  reports: Array<{
    id: string;
    category: string;
    status: string;
    createdAt: string;
    reporterLabel: string | null;
  }>;
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
  nudgeTemplates?: Array<{
    id: string;
    key: string;
    message: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
    active: boolean;
    rejectionReason?: string | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    revokedAt?: string | null;
    createdAt: string;
    updatedAt: string;
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

export function ChurchDetailPage() {
  const navigate = useNavigate();
  const { churchId = '' } = useParams();
  const [detail, setDetail] = useState<ChurchDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'staff' | 'families' | 'groups'>('all');
  const [rosterQuery, setRosterQuery] = useState('');

  function onBack() {
    navigate('/app/dashboard/churches');
  }

  async function load() {
    if (!churchId) return;
    setLoading(true);
    setError('');
    try {
      const row = await api<ChurchDetail>(`/api/admin/churches/${churchId}`);
      setDetail(row);
      setDescription(row.description ?? '');
      setEditingDescription(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load church');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [churchId]);

  function startEditDescription() {
    setDescription(detail?.description ?? '');
    setEditingDescription(true);
    setSaveMsg('');
    setError('');
  }

  function cancelEditDescription() {
    setDescription(detail?.description ?? '');
    setEditingDescription(false);
    setError('');
  }

  async function setMinistryPaused(paused: boolean) {
    if (!churchId) return;
    const ok = await askConfirm(
      paused
        ? 'People in this ministry’s groups will see Under review, and group activities will stop.'
        : 'Group activities for this ministry will resume.',
      { title: paused ? 'Disable ministry' : 'Enable ministry', confirmLabel: paused ? 'Disable' : 'Enable', tone: paused ? 'danger' : 'default' },
    );
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await api(`/api/admin/churches/${churchId}/${paused ? 'disable' : 'enable'}`, { method: 'POST' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update ministry');
    } finally {
      setSaving(false);
    }
  }

  async function archiveMinistry() {
    if (!churchId) return;
    const ok = await askConfirm(
      'This deleted ministry moves to Church archive.',
      { title: 'Archive ministry', confirmLabel: 'Archive' },
    );
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await api(`/api/admin/churches/${churchId}/archive`, { method: 'POST' });
      navigate('/app/dashboard/archive');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not archive ministry');
    } finally {
      setSaving(false);
    }
  }

  async function removeMinistry() {
    if (!churchId) return;
    const ok = await askConfirm(
      'Group memberships are removed. Member accounts stay. Staff for this ministry are removed. The ministry record stays for audit.',
      { title: 'Delete ministry', confirmLabel: 'Delete', tone: 'danger' },
    );
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await api(`/api/admin/churches/${churchId}/delete`, { method: 'POST' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete ministry');
    } finally {
      setSaving(false);
    }
  }

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
      setEditingDescription(false);
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

  const shownDescription = (detail.description ?? '').trim();
  const pendingEnrollments = detail.groups.reduce(
    (n, g) => n + g.members.filter((m) => m.status === 'PENDING').length,
    0,
  );
  const inactiveStaff = detail.staff.filter((p) => !p.isActive).length;

  const metrics = [
    { id: 'staff' as const, label: 'Staff', value: detail.staff.length, hint: inactiveStaff ? `${inactiveStaff} inactive` : 'Teachers & leads' },
    { id: 'families' as const, label: 'Families', value: detail.families.length, hint: 'Joined households' },
    { id: 'groups' as const, label: 'Groups', value: detail.groups.length, hint: pendingEnrollments ? `${pendingEnrollments} pending` : 'Class groups' },
  ];

  type RosterRow =
    | {
        key: string;
        kind: 'staff';
        badgeRank: number;
        name: string;
        subtitle: string;
        meta: string;
        status: 'active' | 'inactive';
      }
    | {
        key: string;
        kind: 'family';
        badgeRank: number;
        name: string;
        subtitle: string;
        meta: string;
        status: 'active';
      }
    | {
        key: string;
        kind: 'group';
        badgeRank: number;
        name: string;
        subtitle: string;
        meta: string;
        status: 'active' | 'pending';
        pending: number;
        approved: number;
        teachers: string;
        roster: string;
      };

  const rosterRows: RosterRow[] = [
    ...detail.staff.map((person) => ({
      key: `staff-${person.id}-${person.role}`,
      kind: 'staff' as const,
      badgeRank: person.isActive ? 3 : 0,
      name: person.name,
      subtitle: person.email,
      meta: roleLabel(person.role),
      status: person.isActive ? ('active' as const) : ('inactive' as const),
    })),
    ...detail.families.map((family) => ({
      key: `family-${family.id}`,
      kind: 'family' as const,
      badgeRank: 4,
      name: family.name,
      subtitle: `${family.owner.name} · ${family.owner.email}`,
      meta:
        family.children.length === 0
          ? 'No children'
          : family.children.map((c) => c.name).join(', '),
      status: 'active' as const,
    })),
    ...detail.groups.map((group) => {
      const approved = group.members.filter((m) => m.status === 'APPROVED');
      const pending = group.members.filter((m) => m.status === 'PENDING');
      return {
        key: `group-${group.id}`,
        kind: 'group' as const,
        badgeRank: pending.length > 0 ? 1 : 5,
        name: group.name,
        subtitle: `${group.joinCode} · Owner ${group.owner.name}`,
        meta: `${approved.length} on roster${pending.length ? ` · ${pending.length} pending` : ''}`,
        status: pending.length > 0 ? ('pending' as const) : ('active' as const),
        pending: pending.length,
        approved: approved.length,
        teachers:
          group.teachers.length === 0
            ? 'No teachers assigned'
            : group.teachers.map((t) => `${t.name} (${roleLabel(t.role)})`).join(', '),
        roster:
          approved.length === 0 && pending.length === 0
            ? 'No one enrolled yet'
            : [
                ...approved.map((m) => m.name),
                ...pending.map((m) => `${m.name} (pending)`),
              ].join(', '),
      };
    }),
  ].sort((a, b) => a.badgeRank - b.badgeRank || a.name.localeCompare(b.name));

  const filteredRoster = rosterRows.filter((row) => {
    if (rosterFilter === 'staff' && row.kind !== 'staff') return false;
    if (rosterFilter === 'families' && row.kind !== 'family') return false;
    if (rosterFilter === 'groups' && row.kind !== 'group') return false;
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      row.subtitle.toLowerCase().includes(q) ||
      row.meta.toLowerCase().includes(q)
    );
  });

  const filterTabs = [
    { id: 'all' as const, label: 'All', count: rosterRows.length },
    { id: 'staff' as const, label: 'Staff', count: detail.staff.length },
    { id: 'families' as const, label: 'Families', count: detail.families.length },
    { id: 'groups' as const, label: 'Groups', count: detail.groups.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
        onClick={onBack}
      >
        ← Back to churches
      </button>

      <header className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xs">
        <div
          className="px-5 py-6 sm:px-7"
          style={{
            background:
              'linear-gradient(135deg, rgba(230,246,246,0.95) 0%, rgba(255,253,247,1) 48%, rgba(246,231,200,0.4) 100%)',
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-teal">Ministry</p>
              <div className="mt-1.5 flex items-start gap-2">
                <div>
                  <h1 className="m-0 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{detail.name}</h1>
                  {detail.deletedAt && detail.auditPastorName ? (
                    <p className="m-0 mt-1 text-xs text-muted">
                      Pastor on record: {detail.auditPastorName}
                      {detail.auditPastorEmail ? ` · ${detail.auditPastorEmail}` : ''}
                    </p>
                  ) : null}
                </div>
                {!editingDescription ? (
                  <button
                    type="button"
                    onClick={startEditDescription}
                    className="mt-1.5 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border/70 bg-white/70 text-muted transition-colors hover:border-teal/40 hover:text-teal"
                    aria-label="Edit description"
                    title="Edit description"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M12 20h9" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="inline-flex items-center rounded-full border border-border/80 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                {detail.jurisdiction}
              </span>
              <span className="inline-flex items-center rounded-full border border-teal/25 bg-teal-tint px-3 py-1 font-mono text-xs font-bold tracking-wide text-teal">
                {detail.joinCode}
              </span>
              <Badge kind={detail.archivedAt ? 'info' : detail.deletedAt ? 'bad' : detail.disabledAt ? 'warn' : 'ok'}>
                {ministryState(detail)}
              </Badge>
              {detail.deletedAt && !detail.archivedAt ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void archiveMinistry()}
                  className="cursor-pointer rounded-full border border-border bg-white px-3 py-1 text-xs font-bold text-navy hover:bg-cream disabled:opacity-50"
                >
                  Archive
                </button>
              ) : null}
              {detail.deletedAt ? null : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setMinistryPaused(!detail.disabledAt)}
                  className="cursor-pointer rounded-full border border-border bg-white px-3 py-1 text-xs font-bold text-navy hover:bg-cream disabled:opacity-50"
                >
                  {detail.disabledAt ? 'Enable' : 'Disable'}
                </button>
              )}
              {detail.deletedAt ? null : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void removeMinistry()}
                  className="cursor-pointer rounded-full border border-error/30 bg-white px-3 py-1 text-xs font-bold text-error hover:bg-error/5 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              {detail._count.reports > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const reports = detail.reports ?? [];
                    if (reports.length === 1) {
                      navigate(`/app/dashboard/reports/${reports[0].id}`);
                      return;
                    }
                    navigate(`/app/dashboard/reports?churchId=${encodeURIComponent(detail.id)}`);
                  }}
                  className="cursor-pointer border-0 bg-transparent p-0"
                  title={
                    (detail.reports?.length ?? 0) === 1
                      ? 'Open this safeguarding report'
                      : 'Open safeguarding reports for this ministry'
                  }
                >
                  <Badge kind="warn">
                    <span className="underline decoration-orange/50 underline-offset-2">
                      {detail._count.reports} report{detail._count.reports === 1 ? '' : 's'}
                    </span>
                    <span className="ml-1 font-normal opacity-80" aria-hidden>
                      →
                    </span>
                  </Badge>
                </button>
              ) : (
                <Badge kind="ok">No open reports</Badge>
              )}
            </div>
          </div>

          <div className="mt-4">
            {editingDescription ? (
              <form className="flex flex-col gap-2" onSubmit={(e) => void saveDescription(e)}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  autoFocus
                  placeholder="Short intro: location, youth ministry focus, gathering times…"
                  className="min-h-[80px] w-full resize-y rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save description'}
                  </Button>
                  <Button size="sm" type="button" variant="ghost" disabled={saving} onClick={cancelEditDescription}>
                    Cancel
                  </Button>
                  <span className="text-[11px] text-muted">{description.length}/4000</span>
                </div>
              </form>
            ) : (
              <p className={`m-0 max-w-4xl text-sm leading-relaxed ${shownDescription ? 'text-navy/80' : 'italic text-muted'}`}>
                {shownDescription || 'No description yet. Add a short intro for this ministry.'}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-border/60 bg-cream/30 p-4 sm:grid-cols-3 sm:p-5">
          {metrics.map((metric) => (
            <button
              key={metric.id}
              type="button"
              onClick={() => setRosterFilter(metric.id)}
              className={`cursor-pointer rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                rosterFilter === metric.id
                  ? 'border-teal/40 bg-teal-tint shadow-xs'
                  : 'border-border/70 bg-white hover:border-teal/30 hover:bg-teal-tint/40'
              }`}
            >
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{metric.label}</p>
              <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-navy">{metric.value}</p>
              <p className="m-0 mt-1 text-[11px] text-muted">{metric.hint}</p>
            </button>
          ))}
        </div>
      </header>

      {error ? <Alert kind="error">{error}</Alert> : null}
      {saveMsg ? <Alert kind="ok">{saveMsg}</Alert> : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-border bg-cream p-1"
            role="tablist"
            aria-label="Church roster filters"
          >
            {filterTabs.map((tab) => {
              const active = rosterFilter === tab.id;
              const alertCount =
                tab.id === 'staff' ? inactiveStaff : tab.id === 'groups' ? pendingEnrollments : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-navy text-white shadow-xs' : 'text-muted hover:bg-surface hover:text-navy'
                  }`}
                  onClick={() => setRosterFilter(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : alertCount > 0
                          ? 'bg-orange text-white'
                          : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block min-w-[14rem] flex-1 sm:max-w-xs">
            <span className="sr-only">Search roster</span>
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={rosterQuery}
              onChange={(e) => setRosterQuery(e.target.value)}
              placeholder="Search name, email, group…"
              aria-label="Search roster"
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-navy placeholder:text-muted/70 shadow-xs focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
            />
          </label>
        </div>

        {filteredRoster.length === 0 ? (
          <Empty
            title="Nothing here yet"
            body={
              rosterQuery.trim()
                ? 'Try a different search or filter.'
                : 'Staff, families, and groups for this ministry will show up here.'
            }
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Details</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((row) => (
                  <tr key={row.key} className="border-b border-border/70 last:border-0 align-top transition-colors hover:bg-surface-2/30">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-navy">{row.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{row.subtitle}</div>
                      {row.kind === 'group' ? (
                        <div className="mt-2 space-y-1 text-[11px] text-muted">
                          <p className="m-0"><span className="font-semibold text-navy">Teachers:</span> {row.teachers}</p>
                          <p className="m-0"><span className="font-semibold text-navy">Roster:</span> {row.roster}</p>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <Badge kind={row.kind === 'staff' ? 'info' : row.kind === 'family' ? 'ok' : 'warn'}>
                        {row.kind === 'staff' ? 'Staff' : row.kind === 'family' ? 'Family' : 'Group'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-navy">{row.meta}</td>
                    <td className="px-3 py-3">
                      {row.status === 'inactive' ? (
                        <Badge kind="bad">Inactive</Badge>
                      ) : row.status === 'pending' ? (
                        <Badge kind="warn">Pending</Badge>
                      ) : (
                        <Badge kind="ok">Active</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="m-0 text-sm font-extrabold text-navy">Nudges</h2>
            <p className="m-0 mt-0.5 text-xs text-muted">
              Private to this ministry’s groups after approval. Review under{' '}
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-teal hover:underline"
                onClick={() => navigate('/app/dashboard/nudges')}
              >
                Care → Student nudges
              </button>
              .
            </p>
          </div>
          <Badge kind="info">{(detail.nudgeTemplates ?? []).length} total</Badge>
        </div>
        {(detail.nudgeTemplates ?? []).length === 0 ? (
          <Empty
            title="No ministry nudges yet"
            body="When this church submits a cheer for approval, it appears here."
          />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(detail.nudgeTemplates ?? []).map((row) => (
              <li key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-navy">{row.message}</p>
                  {row.rejectionReason ? (
                    <p className="m-0 mt-1 text-[11px] text-muted">Rejection: {row.rejectionReason}</p>
                  ) : null}
                </div>
                <Badge
                  kind={
                    row.status === 'APPROVED'
                      ? 'ok'
                      : row.status === 'REJECTED'
                        ? 'bad'
                        : row.status === 'REVOKED'
                          ? 'warn'
                          : 'info'
                  }
                >
                  {row.status === 'APPROVED'
                    ? 'Approved'
                    : row.status === 'REJECTED'
                      ? 'Rejected'
                      : row.status === 'REVOKED'
                        ? 'Revoked'
                        : 'Pending'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type ChurchListFilter = 'all' | 'applicant' | 'active' | 'approved' | 'rejected';

type ChurchListRow =
  | { key: string; kind: 'applicant'; application: ChurchApplicationRow; sortAt: number; badgeRank: number }
  | { key: string; kind: 'active'; church: Church; sortAt: number; badgeRank: number };

function applicationBadgeRank(app: ChurchApplicationRow) {
  if (isUnseenApplication(app)) return 0;
  if (app.status === 'PENDING') return 1;
  if (app.status === 'REJECTED') return 2;
  return 3;
}

export function ChurchesPage() {
  const navigate = useNavigate();
  const [churches, setChurches] = useState<Church[]>([]);
  const [applications, setApplications] = useState<ChurchApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ChurchListFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('US');
  const [pastorName, setPastorName] = useState('');
  const [pastorEmail, setPastorEmail] = useState('');
  const [pastorPassword, setPastorPassword] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [nextChurches, nextApps] = await Promise.all([
        api<Church[]>('/api/admin/churches'),
        api<ChurchApplicationRow[]>('/api/admin/church-applications'),
      ]);
      setChurches(nextChurches);
      setApplications(nextApps);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const unified = useMemo(() => {
    const churchIdsFromApps = new Set(
      applications.map((a) => a.church?.id).filter((id): id is string => Boolean(id)),
    );
    const rows: ChurchListRow[] = [];

    for (const application of applications) {
      if (application.archivedAt) continue;
      // Approved apps that already created a church appear under Active only.
      if (application.status === 'APPROVED' && application.church?.id) continue;
      rows.push({
        key: `app-${application.id}`,
        kind: 'applicant',
        application,
        sortAt: new Date(application.createdAt).getTime(),
        badgeRank: applicationBadgeRank(application),
      });
    }

    for (const church of churches) {
      if (church.archivedAt) continue;
      rows.push({
        key: `church-${church.id}`,
        kind: 'active',
        church,
        sortAt: 0,
        // Churches linked from applications sit below badge rows but above plain ones.
        badgeRank: churchIdsFromApps.has(church.id) ? 4 : 5,
      });
    }

    // Default: badge rows first (new → pending → rejected), then active, newest applicants first.
    rows.sort((a, b) => {
      if (a.badgeRank !== b.badgeRank) return a.badgeRank - b.badgeRank;
      return b.sortAt - a.sortAt;
    });
    return rows;
  }, [applications, churches]);

  const counts = useMemo(() => {
    const applicant = applications.filter((a) => a.status === 'PENDING').length;
    const rejected = applications.filter((a) => a.status === 'REJECTED' && !a.archivedAt).length;
    const approvedChurchIds = new Set(
      applications.filter((a) => a.status === 'APPROVED' && a.church?.id).map((a) => a.church!.id),
    );
    const approvedOrphans = applications.filter((a) => a.status === 'APPROVED' && !a.church?.id).length;
    return {
      all: unified.length,
      applicant,
      active: churches.filter((c) => !c.deletedAt).length,
      approved: approvedChurchIds.size + approvedOrphans,
      rejected,
    };
  }, [applications, churches.length, unified.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unified.filter((row) => {
      if (filter === 'applicant') {
        if (row.kind !== 'applicant' || row.application.status !== 'PENDING') return false;
      } else if (filter === 'active') {
        if (row.kind !== 'active' || row.church.deletedAt) return false;
      } else if (filter === 'approved') {
        if (row.kind === 'applicant') {
          if (row.application.status !== 'APPROVED') return false;
        } else {
          // Active churches that came from an approved application
          const linked = applications.some(
            (a) => a.status === 'APPROVED' && a.church?.id === row.church.id,
          );
          if (!linked) return false;
        }
      } else if (filter === 'rejected') {
        if (row.kind !== 'applicant' || row.application.status !== 'REJECTED') return false;
      }

      if (!q) return true;
      if (row.kind === 'applicant') {
        const a = row.application;
        return (
          a.churchName.toLowerCase().includes(q) ||
          a.applicantName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
        );
      }
      const c = row.church;
      return (
        c.name.toLowerCase().includes(q) ||
        c.joinCode.toLowerCase().includes(q) ||
        (c.pastor?.name ?? '').toLowerCase().includes(q) ||
        (c.pastor?.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [unified, filter, query, applications]);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const churchPage = slicePage(filtered, page);

  const filterTabs: Array<{ id: ChurchListFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'applicant', label: 'Applicant', count: counts.applicant },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
  ];

  function resetForm() {
    setName('');
    setJurisdiction('US');
    setPastorName('');
    setPastorEmail('');
    setPastorPassword('');
    setFormError('');
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setFormError('');
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await api<{
        name: string;
        joinCode: string;
        pastorAccountCreated?: boolean;
        pastor?: { email: string } | null;
      }>('/api/admin/churches', {
        method: 'POST',
        body: JSON.stringify({
          name,
          jurisdiction,
          pastor: {
            name: pastorName.trim(),
            email: pastorEmail.trim(),
            password: pastorPassword,
          },
        }),
      });
      resetForm();
      closeDrawer();
      const loginNote = res.pastor
        ? res.pastorAccountCreated
          ? ` Pastor login: ${res.pastor.email}.`
          : ` Pastor role attached to existing account ${res.pastor.email}.`
        : '';
      setMessage(`Church created.${loginNote}`);
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Could not create church');
    } finally {
      setBusy(false);
    }
  }

  async function regen(id: string) {
    await api(`/api/admin/churches/${id}/regenerate-join-code`, { method: 'POST' });
    load();
  }

  async function archiveApplication(id: string) {
    const ok = await askConfirm(
      'This rejected application moves to Church archive.',
      { title: 'Archive application', confirmLabel: 'Archive' },
    );
    if (!ok) return;
    await api(`/api/admin/church-applications/${id}/archive`, { method: 'POST' });
    load();
  }

  async function archive(id: string) {
    const ok = await askConfirm(
      'This deleted ministry moves to Church archive.',
      { title: 'Archive ministry', confirmLabel: 'Archive' },
    );
    if (!ok) return;
    await api(`/api/admin/churches/${id}/archive`, { method: 'POST' });
    load();
  }

  function openChurch(id: string) {
    navigate(`/app/dashboard/churches/${id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert kind="error">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-navy">Churches &amp; applications</h2>
            <p className="text-xs leading-relaxed text-muted">
              Review ministry applicants and manage registered churches in one place.
            </p>
          </div>
          <Button
            size="lg"
            className="shrink-0 self-start"
            type="button"
            onClick={() => {
              setMessage('');
              setDrawerOpen(true);
            }}
          >
            + Create church
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-border bg-cream p-1"
            role="tablist"
            aria-label="Church list filters"
          >
            {filterTabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-navy text-white shadow-xs' : 'text-muted hover:bg-surface hover:text-navy'
                  }`}
                  onClick={() => setFilter(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : tab.id === 'applicant' && tab.count > 0
                          ? 'bg-orange text-white'
                          : tab.id === 'rejected' && tab.count > 0
                            ? 'bg-error/15 text-error'
                            : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {loading ? '…' : tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block min-w-[14rem] flex-1 sm:max-w-xs">
            <span className="sr-only">Search churches and applications</span>
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ministry, pastor, code…"
              aria-label="Search churches and applications"
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-navy placeholder:text-muted/70 shadow-xs focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
            />
          </label>
        </div>

        {loading ? (
          <Spinner label="Loading churches…" />
        ) : unified.length === 0 && !error ? (
          <Empty
            title="No churches or applications yet"
            body="Ministry applications and registered churches appear here."
          />
        ) : filtered.length === 0 ? (
          <Empty title="No matches" body="Try a different search or filter." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Ministry</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Contact</th>
                  <th className="px-3 py-2 font-semibold">Details</th>
                  <th className="px-3 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {churchPage.rows.map((row) => {
                  if (row.kind === 'applicant') {
                    const a = row.application;
                    const unseen = isUnseenApplication(a);
                    return (
                      <tr key={row.key} className="border-b border-border/70 last:border-0 transition-colors hover:bg-surface-2/30">
                        <td className="px-3 py-3 font-semibold text-navy">
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {a.churchName}
                            {unseen ? (
                              <span className="rounded-full bg-orange/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange">
                                New
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Badge kind={a.status === 'REJECTED' ? 'bad' : a.status === 'APPROVED' ? 'ok' : 'warn'}>
                            {a.status === 'PENDING' ? 'Applicant' : a.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium text-navy">{a.applicantName}</span>
                            <span className="truncate text-[11px] text-muted">{a.email}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted">
                          {a.status === 'PENDING'
                            ? 'Waiting for review'
                            : a.status === 'REJECTED'
                              ? a.decisionReason || 'Rejected'
                              : 'Approved'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center gap-3">
                            {a.status === 'REJECTED' ? (
                              <button
                                type="button"
                                className="cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-navy transition-colors hover:bg-surface-2"
                                onClick={() => void archiveApplication(a.id)}
                              >
                                Archive
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="cursor-pointer font-semibold text-teal hover:underline"
                              onClick={() => navigate(`/app/dashboard/churches/applications/${a.id}`)}
                            >
                              Review
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  const c = row.church;
                  const contactName = c.pastor?.name || c.auditPastorName;
                  const contactEmail = c.pastor?.email || c.auditPastorEmail;
                  return (
                    <tr
                      key={row.key}
                      className="cursor-pointer border-b border-border/70 last:border-0 transition-colors hover:bg-surface-2/30"
                      onClick={() => openChurch(c.id)}
                    >
                      <td className="px-3 py-3 font-medium text-navy">
                        <button
                          type="button"
                          className="cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-navy hover:text-teal"
                          onClick={(e) => {
                            e.stopPropagation();
                            openChurch(c.id);
                          }}
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <Badge kind={c.deletedAt ? 'bad' : c.disabledAt ? 'warn' : 'ok'}>
                          {ministryState(c)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        {contactName ? (
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium text-navy">{contactName}</span>
                            {contactEmail ? <span className="truncate text-[11px] text-muted">{contactEmail}</span> : null}
                          </div>
                        ) : (
                          <span className="text-muted">No pastor</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-teal/20 bg-teal-tint px-2 py-0.5 font-mono text-xs font-semibold text-teal">
                            {c.joinCode}
                          </span>
                          <span className="text-muted">
                            {c._count.families} fam · {c._count.classes} cls · {c._count.reports} rpt
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {c.deletedAt ? (
                          <button
                            className="cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-navy transition-colors hover:bg-surface-2"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void archive(c.id);
                            }}
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            className="cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-navy transition-colors hover:bg-surface-2"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void regen(c.id);
                            }}
                          >
                            New code
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pager page={churchPage.page} total={churchPage.total} onPage={setPage} />
          </div>
        )}
      </section>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Create church"
        subtitle="Sets up the congregation and a pastor login for management."
        widthClass="max-w-md"
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => void create(e)}>
          <Field label="Church name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grace Community"
              required
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </Field>
          <Field label="Jurisdiction" hint="Country/region code (US, GB, NG…)">
            <input
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value.toUpperCase())}
              required
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy uppercase focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </Field>

          <div className="border-t border-border pt-4 flex flex-col gap-3">
            <div>
              <h4 className="text-sm font-bold text-navy m-0">Pastor login</h4>
              <p className="text-[11px] text-muted m-0 mt-0.5">
                Creates (or attaches) an account with PASTOR access for this church’s dashboard.
              </p>
            </div>
            <Field label="Pastor name">
              <input
                value={pastorName}
                onChange={(e) => setPastorName(e.target.value)}
                placeholder="Pastor Grace"
                required
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </Field>
            <Field label="Pastor email">
              <input
                type="email"
                value={pastorEmail}
                onChange={(e) => setPastorEmail(e.target.value)}
                placeholder="pastor@church.org"
                required
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </Field>
            <Field label="Temporary password" hint="Min 8 characters. Share securely with the pastor.">
              <input
                type="password"
                value={pastorPassword}
                onChange={(e) => setPastorPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </Field>
          </div>

          {formError ? <Alert kind="error">{formError}</Alert> : null}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={closeDrawer}
              className="flex-1 cursor-pointer rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-navy hover:bg-cream"
            >
              Cancel
            </button>
            <Button className="flex-1" type="submit"
              disabled={busy}>
              {busy ? 'Creating…' : 'Create church'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

type ArchiveFilter = 'all' | 'churches' | 'rejected';

export function ArchivedChurchesPage() {
  const navigate = useNavigate();
  const [churches, setChurches] = useState<Church[]>([]);
  const [applications, setApplications] = useState<ChurchApplicationRow[]>([]);
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<Church[]>('/api/admin/churches'),
      api<ChurchApplicationRow[]>('/api/admin/church-applications'),
    ])
      .then(([churchRows, applicationRows]) => {
        setChurches(churchRows.filter((row) => row.archivedAt));
        setApplications(applicationRows.filter((row) => row.archivedAt));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  const visibleChurches = filter === 'rejected' ? [] : churches;
  const visibleApplications = filter === 'churches' ? [] : applications;
  const archiveRows = [
    ...visibleChurches.map((church) => ({ kind: 'church' as const, id: church.id, church, application: null })),
    ...visibleApplications.map((application) => ({ kind: 'application' as const, id: application.id, church: null, application })),
  ];
  const archivePage = slicePage(archiveRows, page);
  const empty = archiveRows.length === 0;

  useEffect(() => {
    setPage(1);
  }, [filter]);
  const tabs: Array<{ id: ArchiveFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: churches.length + applications.length },
    { id: 'churches', label: 'Churches', count: churches.length },
    { id: 'rejected', label: 'Rejected', count: applications.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert kind="error">{error}</Alert> : null}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-navy">Church archive</h2>
          <p className="text-xs leading-relaxed text-muted">Deleted ministries and rejected applications moved here stay on record.</p>
        </div>
        <div
          className="inline-flex flex-wrap items-center gap-0.5 self-start rounded-full border border-border bg-cream p-1"
          role="tablist"
          aria-label="Church archive filters"
        >
          {tabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'bg-navy text-white shadow-xs' : 'text-muted hover:bg-surface hover:text-navy'
                }`}
                onClick={() => setFilter(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-surface-2 text-muted'}`}>
                  {loading ? '…' : tab.count}
                </span>
              </button>
            );
          })}
        </div>
        {loading ? (
          <Spinner label="Loading archive…" />
        ) : empty ? (
          <Empty title="Nothing archived" body="Archive a deleted ministry or a rejected application from Churches and it shows up here." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Ministry</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Contact</th>
                  <th className="px-3 py-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {archivePage.rows.map((row) => row.kind === 'church' && row.church ? (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-3 font-medium text-navy">
                      <button
                        type="button"
                        className="cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-navy hover:text-teal"
                        onClick={() => navigate(`/app/dashboard/churches/${row.church.id}`)}
                      >
                        {row.church.name}
                      </button>
                    </td>
                    <td className="px-3 py-3"><Badge kind="info">Church</Badge></td>
                    <td className="px-3 py-3">
                      {row.church.auditPastorName || row.church.pastor?.name ? (
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-medium text-navy">{row.church.auditPastorName || row.church.pastor?.name}</span>
                          <span className="truncate text-[11px] text-muted">{row.church.auditPastorEmail || row.church.pastor?.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted">No pastor</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted">Deleted ministry</td>
                  </tr>
                ) : row.application ? (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-3 font-medium text-navy">
                      <button
                        type="button"
                        className="cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-navy hover:text-teal"
                        onClick={() => navigate(`/app/dashboard/churches/applications/${row.application.id}`)}
                      >
                        {row.application.churchName}
                      </button>
                    </td>
                    <td className="px-3 py-3"><Badge kind="bad">Rejected</Badge></td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium text-navy">{row.application.applicantName}</span>
                        <span className="truncate text-[11px] text-muted">{row.application.email}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted">{row.application.decisionReason || 'Rejected'}</td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
            <Pager page={archivePage.page} total={archivePage.total} onPage={setPage} />
          </div>
        )}
      </section>
    </div>
  );
}

type AdminGroup = {
  id: string;
  name: string;
  description?: string | null;
  kind: 'CHURCH' | 'FAMILY' | 'CUSTOM' | string;
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

type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  kind: 'CHURCH' | 'FAMILY' | 'CUSTOM' | string;
  joinCode: string;
  createdAt: string;
  deletionAt: string | null;
  owner: { id: string; name: string; email: string };
  church: { id: string; name: string } | null;
  family: { id: string; name: string } | null;
  teachers: Array<{ id: string; name: string; email: string; isActive: boolean; role: string }>;
  members: Array<{
    enrollmentId: string;
    childId: string;
    name: string;
    ageBand: string;
    email: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
    createdAt: string;
    family: { id: string; name: string } | null;
  }>;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  memberCount: number;
};

const GROUP_MEMBERS_PAGE_SIZE = 30;

function groupInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || '?').slice(0, 2).toUpperCase();
}

function groupKindLabel(kind: string) {
  if (kind === 'CHURCH') return 'Church';
  if (kind === 'FAMILY') return 'Family';
  if (kind === 'CUSTOM') return 'Custom';
  return kind;
}

function ageBandLabel(band: string) {
  if (band === 'CHILD') return 'Child';
  if (band === 'TEEN') return 'Teen';
  return band;
}

const groupTh =
  'whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0';
const groupTd = 'px-3 py-3 align-middle text-navy first:pl-0 last:pr-0';

export function GroupsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | 'CHURCH' | 'FAMILY' | 'CUSTOM'>('ALL');
  const [page, setPage] = useState(1);

  async function loadGroups() {
    setLoading(true);
    try {
      const data = await api<AdminGroup[]>('/api/admin/groups');
      setRows(data);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  const filtered = rows.filter((g) => {
    if (kindFilter !== 'ALL' && g.kind !== kindFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      g.name.toLowerCase().includes(q) ||
      (g.description ?? '').toLowerCase().includes(q) ||
      g.joinCode.toLowerCase().includes(q) ||
      g.owner.name.toLowerCase().includes(q) ||
      g.owner.email.toLowerCase().includes(q) ||
      (g.church?.name ?? '').toLowerCase().includes(q) ||
      (g.family?.name ?? '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [query, kindFilter]);

  const groupPage = slicePage(filtered, page);

  const kindTabs: Array<{ id: typeof kindFilter; label: string; count: number }> = [
    { id: 'ALL', label: 'All', count: rows.length },
    { id: 'CHURCH', label: 'Church', count: rows.filter((g) => g.kind === 'CHURCH').length },
    { id: 'FAMILY', label: 'Family', count: rows.filter((g) => g.kind === 'FAMILY').length },
    { id: 'CUSTOM', label: 'Custom', count: rows.filter((g) => g.kind === 'CUSTOM').length },
  ];

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert kind="error">{error}</Alert> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div
          className="inline-flex shrink-0 flex-wrap items-center gap-0.5 rounded-md border border-border bg-cream p-1"
          role="tablist"
          aria-label="Group kinds"
        >
          {kindTabs.map((tab) => {
            const active = kindFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`cursor-pointer rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'bg-navy text-white shadow-xs' : 'text-muted hover:bg-surface hover:text-navy'
                }`}
                onClick={() => setKindFilter(tab.id)}
              >
                {tab.label} ({loading ? '…' : tab.count})
              </button>
            );
          })}
        </div>
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search groups</span>
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, code, owner, church…"
            aria-label="Search groups"
            className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-navy placeholder:text-muted/70 shadow-xs focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
          />
        </label>
      </div>
      

      {loading ? (
        <Spinner label="Loading groups…" />
      ) : rows.length === 0 && !error ? (
        <Empty title="No groups yet" body="Families, adults, and church leads create groups in the app or ministry portal." />
      ) : rows.length === 0 ? null : filtered.length === 0 ? (
        <Empty title="No matches" body="Try a different search or filter." />
      ) : (
        <div className="overflow-x-auto bg-transparent">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className={groupTh}>Name</th>
                <th className={groupTh}>Kind</th>
                <th className={groupTh}>Join code</th>
                <th className={groupTh}>Linked to</th>
                <th className={groupTh}>Owner</th>
                <th className={groupTh}>Teachers</th>
                <th className={groupTh}>Members</th>
              </tr>
            </thead>
            <tbody>
              {groupPage.rows.map((g) => (
                <tr
                  key={g.id}
                  className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-surface-2/30 ${
                    g.deletionAt ? 'opacity-65' : ''
                  }`}
                  onClick={() => navigate(`/app/dashboard/groups/${g.id}`)}
                >
                  <td className={`${groupTd} font-semibold`}>
                    <div className="flex min-w-[10rem] items-center gap-2.5">
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-tight ${
                          g.deletionAt ? 'bg-surface-2 text-muted' : 'bg-navy text-gold'
                        }`}
                        aria-hidden
                      >
                        {groupInitials(g.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{g.name}</span>
                        {g.description ? (
                          <span className="block max-w-[14rem] truncate text-[11px] font-normal text-muted" title={g.description}>
                            {g.description}
                          </span>
                        ) : null}
                        {g.deletionAt ? (
                          <span className="mt-1 inline-block">
                            <Badge kind="warn">Deleting</Badge>
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className={groupTd}>
                    <Badge kind={g.kind === 'CHURCH' ? 'info' : g.kind === 'CUSTOM' ? 'warn' : 'ok'}>
                      {groupKindLabel(g.kind)}
                    </Badge>
                  </td>
                  <td className={`${groupTd} font-mono text-muted`}>{g.joinCode}</td>
                  <td className={`${groupTd} max-w-[12rem] truncate text-muted`}>
                    {g.church?.name ?? g.family?.name ?? (g.kind === 'CUSTOM' ? 'Custom circle' : '—')}
                  </td>
                  <td className={`${groupTd} max-w-[14rem] text-muted`}>
                    <span className="block truncate font-medium text-navy">{g.owner.name}</span>
                    <span className="block truncate text-[11px]">{g.owner.email}</span>
                  </td>
                  <td className={`${groupTd} text-muted`}>{g.teachers.length}</td>
                  <td className={`${groupTd} text-muted`}>
                    {g.approvedCount}
                    {g.pendingCount > 0 ? (
                      <span className="text-orange"> · {g.pendingCount} pending</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={groupPage.page} total={groupPage.total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

export function GroupDetailPage() {
  const navigate = useNavigate();
  const { classId = '' } = useParams();
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [memberQuery, setMemberQuery] = useState('');
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  function onBack() {
    navigate('/app/dashboard/groups');
  }

  async function load() {
    if (!classId) return;
    setLoading(true);
    setError('');
    try {
      const row = await api<GroupDetail>(`/api/admin/groups/${classId}`);
      setDetail(row);
      setEditName(row.name);
      setEditDescription(row.description ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [classId]);

  useEffect(() => {
    setPage(1);
  }, [memberFilter, memberQuery, classId]);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Group name is required');
      return;
    }
    setEditBusy(true);
    setEditError('');
    try {
      await api(`/api/admin/groups/${detail.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmedName,
          description: editDescription.trim() || null,
        }),
      });
      setFeedback(`Group “${trimmedName}” updated.`);
      setEditing(false);
      await load();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setEditBusy(false);
    }
  }

  async function handleRemoveMember(member: GroupDetail['members'][number]) {
    if (!detail) return;
    const ok = await askConfirm(
      `Remove ${member.name} from “${detail.name}”? They will lose access to this group’s activities until they rejoin.`,
      {
        title: 'Remove member',
        confirmLabel: 'Remove member',
        cancelLabel: 'Keep member',
        tone: 'danger',
      },
    );
    if (!ok) return;
    setRemovingId(member.enrollmentId);
    setError('');
    setFeedback('');
    try {
      await api(`/api/admin/groups/${detail.id}/enrollments/${member.enrollmentId}`, {
        method: 'DELETE',
      });
      setFeedback(`${member.name} was removed from the group.`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
          onClick={onBack}
        >
          ← Back to groups
        </button>
        <Spinner label="Loading group…" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
          onClick={onBack}
        >
          ← Back to groups
        </button>
        <Alert kind="error">{error}</Alert>
      </div>
    );
  }

  if (!detail) return null;

  const shownDescription = (detail.description ?? '').trim();
  const linkedTo = detail.church?.name ?? detail.family?.name ?? (detail.kind === 'CUSTOM' ? 'Custom circle' : '—');

  const metrics = [
    {
      id: 'approved' as const,
      label: 'On roster',
      value: detail.approvedCount,
      hint: 'Approved members',
    },
    {
      id: 'pending' as const,
      label: 'Pending',
      value: detail.pendingCount,
      hint: detail.pendingCount ? 'Awaiting approval' : 'No pending joins',
    },
    {
      id: 'teachers' as const,
      label: 'Teachers',
      value: detail.teachers.length,
      hint: detail.teachers.filter((t) => !t.isActive).length
        ? `${detail.teachers.filter((t) => !t.isActive).length} inactive`
        : 'Assigned leaders',
    },
  ];

  const filteredMembers = detail.members.filter((m) => {
    if (memberFilter === 'approved' && m.status !== 'APPROVED') return false;
    if (memberFilter === 'pending' && m.status !== 'PENDING') return false;
    if (memberFilter === 'rejected' && m.status !== 'REJECTED') return false;
    const q = memberQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.family?.name ?? '').toLowerCase().includes(q) ||
      m.status.toLowerCase().includes(q)
    );
  });

  const needsPagination = filteredMembers.length > GROUP_MEMBERS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / GROUP_MEMBERS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * GROUP_MEMBERS_PAGE_SIZE;
  const pageMembers = needsPagination
    ? filteredMembers.slice(pageStart, pageStart + GROUP_MEMBERS_PAGE_SIZE)
    : filteredMembers;

  const filterTabs = [
    { id: 'all' as const, label: 'All', count: detail.members.length },
    { id: 'approved' as const, label: 'Approved', count: detail.approvedCount },
    { id: 'pending' as const, label: 'Pending', count: detail.pendingCount },
    { id: 'rejected' as const, label: 'Rejected', count: detail.rejectedCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
        onClick={onBack}
      >
        ← Back to groups
      </button>

      <header className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xs">
        <div
          className="px-5 py-6 sm:px-7"
          style={{
            background:
              'linear-gradient(135deg, rgba(230,246,246,0.95) 0%, rgba(255,253,247,1) 48%, rgba(246,231,200,0.4) 100%)',
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-teal">Group</p>
              <div className="mt-1.5 flex items-start gap-2.5">
                <span
                  className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tracking-tight ${
                    detail.deletionAt ? 'bg-surface-2 text-muted' : 'bg-navy text-gold'
                  }`}
                  aria-hidden
                >
                  {groupInitials(detail.name)}
                </span>
                <div className="min-w-0">
                  <h1 className="m-0 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{detail.name}</h1>
                  <p className="m-0 mt-1 text-xs text-muted">
                    Owner {detail.owner.name} · {detail.owner.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:justify-end">
              <Badge kind={detail.kind === 'CHURCH' ? 'info' : detail.kind === 'CUSTOM' ? 'warn' : 'ok'}>
                {groupKindLabel(detail.kind)}
              </Badge>
              {detail.joinCode ? (
                <span className="inline-flex items-center rounded-full border border-teal/25 bg-teal-tint/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-teal">
                  {detail.joinCode}
                </span>
              ) : null}
              {detail.deletionAt ? <Badge kind="warn">Deleting</Badge> : <Badge kind="ok">Active</Badge>}
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditName(detail.name);
                  setEditDescription(detail.description ?? '');
                  setEditError('');
                  setEditing(true);
                }}
              >
                Edit group
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-row items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Purpose</p>
              <p className={`m-0 mt-1.5 text-sm leading-relaxed ${shownDescription ? 'text-navy/80' : 'italic text-muted'}`}>
                {shownDescription || 'No description yet. Add a short purpose for this group.'}
              </p>
              <p className="m-0 mt-2 text-[11px] text-muted">Linked to {linkedTo}</p>
            </div>
            {detail.joinCode ? (
              <GroupJoinPassImages
                joinCode={detail.joinCode}
                groupName={detail.name}
                className="shrink-0 items-end"
              />
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-border/60 bg-cream/30 p-4 sm:grid-cols-3 sm:p-5">
          {metrics.map((metric) => (
            <button
              key={metric.id}
              type="button"
              onClick={() => {
                if (metric.id === 'teachers') return;
                setMemberFilter(metric.id);
              }}
              className={`cursor-pointer rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                memberFilter === metric.id
                  ? 'border-teal/40 bg-teal-tint shadow-xs'
                  : 'border-border/70 bg-white hover:border-teal/30 hover:bg-teal-tint/40'
              } ${metric.id === 'teachers' ? 'cursor-default hover:border-border/70 hover:bg-white' : ''}`}
            >
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{metric.label}</p>
              <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-navy">{metric.value}</p>
              <p className="m-0 mt-1 text-[11px] text-muted">{metric.hint}</p>
            </button>
          ))}
        </div>
      </header>

      {error ? <Alert kind="error">{error}</Alert> : null}
      {feedback ? <Alert kind="ok">{feedback}</Alert> : null}

      {detail.teachers.length > 0 ? (
        <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-xs sm:p-5">
          <h2 className="m-0 text-sm font-bold text-navy">Teachers</h2>
          <ul className="m-0 mt-3 list-none space-y-2 p-0">
            {detail.teachers.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="m-0 text-xs font-semibold text-navy">{t.name}</p>
                  <p className="m-0 text-[11px] text-muted">{t.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">{roleLabel(t.role)}</span>
                  {t.isActive ? <Badge kind="ok">Active</Badge> : <Badge kind="bad">Inactive</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-border bg-cream p-1"
            role="tablist"
            aria-label="Member filters"
          >
            {filterTabs.map((tab) => {
              const active = memberFilter === tab.id;
              const alertCount = tab.id === 'pending' ? detail.pendingCount : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-navy text-white shadow-xs' : 'text-muted hover:bg-surface hover:text-navy'
                  }`}
                  onClick={() => setMemberFilter(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : alertCount > 0
                          ? 'bg-orange text-white'
                          : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block min-w-[14rem] flex-1 sm:max-w-xs">
            <span className="sr-only">Search members</span>
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Search name, family, email…"
              aria-label="Search members"
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-navy placeholder:text-muted/70 shadow-xs focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
            />
          </label>
        </div>

        {filteredMembers.length === 0 ? (
          <Empty
            title="No members here"
            body={
              memberQuery.trim()
                ? 'Try a different search or filter.'
                : 'Enrolled kids and teens will show up here when they join this group.'
            }
          />
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-semibold">Member</th>
                    <th className="px-3 py-2 font-semibold">Family</th>
                    <th className="px-3 py-2 font-semibold">Age</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageMembers.map((m) => (
                    <tr
                      key={m.enrollmentId}
                      className="border-b border-border/70 last:border-0 align-middle transition-colors hover:bg-surface-2/30"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-gold"
                            aria-hidden
                          >
                            {groupInitials(m.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-navy">{m.name}</span>
                            {m.email ? (
                              <span className="block truncate text-[11px] text-muted">{m.email}</span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">{m.family?.name ?? '—'}</td>
                      <td className="px-3 py-3 text-muted">{ageBandLabel(m.ageBand)}</td>
                      <td className="px-3 py-3">
                        {m.status === 'PENDING' ? (
                          <Badge kind="warn">Pending</Badge>
                        ) : m.status === 'REJECTED' ? (
                          <Badge kind="bad">Rejected</Badge>
                        ) : (
                          <Badge kind="ok">Approved</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={removingId === m.enrollmentId}
                          onClick={() => void handleRemoveMember(m)}
                          className="cursor-pointer rounded-xl border border-orange/40 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-orange transition-colors hover:bg-orange/10 disabled:cursor-wait disabled:opacity-60"
                        >
                          {removingId === m.enrollmentId ? 'Removing…' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {needsPagination ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                <p className="m-0 text-[11px] text-muted">
                  Showing {pageStart + 1}–{Math.min(pageStart + GROUP_MEMBERS_PAGE_SIZE, filteredMembers.length)} of{' '}
                  {filteredMembers.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold tabular-nums text-muted">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title={`Edit ${detail.name}`}
        subtitle="Update group name and description."
      >
        <form onSubmit={(e) => void handleSaveEdit(e)} className="flex flex-col gap-4 text-xs">
          {editError ? <Alert kind="error">{editError}</Alert> : null}
          <Field label="Group Name">
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </Field>
          <Field label="Description (optional)" hint="Visible to members and search. Max 1000 characters.">
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              maxLength={1000}
              placeholder="Short description of this group’s focus or schedule…"
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </Field>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy"
            >
              Cancel
            </button>
            <Button size="sm" type="submit" disabled={editBusy || !editName.trim()}>
              {editBusy ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Dialog>
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
  church?: { id: string; name: string };
  assignee?: { name: string } | null;
  events?: unknown[];
};

type ReportDetail = {
  id: string;
  category: string;
  description: string;
  status: string;
  investigationLocked: boolean;
  retainedUntil: string | null;
  reporterLabel: string | null;
  followUpEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  createdAt: string;
  church: { id: string; name: string; joinCode: string; jurisdiction: string } | null;
  reporter: { id: string; name: string; email: string } | null;
  assignee: { id: string; name: string; email: string } | null;
  events: Array<{
    id: string;
    action: string;
    note: string | null;
    fromStatus: string | null;
    toStatus: string | null;
    createdAt: string;
    actor: { id: string; name: string; email: string };
  }>;
};

export function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const churchIdFilter = searchParams.get('churchId')?.trim() || '';
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      setRows(await api<Report[]>('/api/admin/reports'));
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    await api(`/api/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  const filtered = churchIdFilter
    ? rows.filter((r) => r.church?.id === churchIdFilter)
    : rows;
  const filterChurchName = filtered[0]?.church?.name
    ?? rows.find((r) => r.church?.id === churchIdFilter)?.church?.name
    ?? null;

  useEffect(() => {
    setPage(1);
  }, [churchIdFilter]);

  const reportPage = slicePage(filtered, page);

  const soleFilteredId = !loading && churchIdFilter && filtered.length === 1 ? filtered[0].id : '';
  useEffect(() => {
    if (soleFilteredId) {
      navigate(`/app/dashboard/reports/${soleFilteredId}`, { replace: true });
    }
  }, [soleFilteredId, navigate]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
        <h3 className="text-base font-bold text-navy">Safeguarding reports — controlled investigation access</h3>
        {churchIdFilter ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange/30 bg-orange/5 px-3 py-2 text-xs">
            <p className="m-0 text-navy">
              Showing reports for{' '}
              <strong>{filterChurchName || 'this ministry'}</strong>
              {filtered.length === 0 && !loading ? ' — none in the current list.' : null}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-teal hover:underline"
                onClick={() => navigate(`/app/dashboard/churches/${churchIdFilter}`)}
              >
                ← Ministry detail
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-navy"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('churchId');
                  setSearchParams(next, { replace: true });
                }}
              >
                Clear filter
              </button>
            </div>
          </div>
        ) : null}
        {error ? <Alert kind="error">{error}</Alert> : null}
        {loading ? <Spinner label="Loading reports…" /> : rows.length === 0 && !error ? <Empty title="No reports" body="New reports from the app will land here." /> : filtered.length === 0 ? (
          <Empty
            title="No reports for this ministry"
            body="Try clearing the filter to see all safeguarding reports."
          />
        ) : (
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
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide text-right">Actions</th>
                </tr>
              </thead>
            <tbody>
              {reportPage.rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`cursor-pointer border-b border-border/50 hover:bg-surface-2/30 transition-colors ${
                      churchIdFilter && r.church?.id === churchIdFilter ? 'bg-orange/5' : ''
                    }`}
                    onClick={() => navigate(`/app/dashboard/reports/${r.id}`)}
                  >
                    <td className="py-3 px-3 font-medium text-navy">{r.church?.name || '—'}</td>
                    <td className="py-3 px-3 font-medium text-navy">{r.category}</td>
                    <td className="py-3 px-3"><Badge kind={statusClass[r.status] ?? 'info'}>{r.status}</Badge></td>
                    <td className="py-3 px-3 text-muted">{r.assignee?.name ?? '—'}</td>
                    <td className="py-3 px-3 text-muted">{r.events?.length ?? 0}</td>
                    <td className="py-3 px-3 text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          className="cursor-pointer rounded-lg border border-teal/30 bg-teal-tint px-2.5 py-1 text-[11px] font-semibold text-teal"
                          onClick={() => navigate(`/app/dashboard/reports/${r.id}`)}
                        >
                          Open
                        </button>
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
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={reportPage.page} total={reportPage.total} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportDetailPage() {
  const navigate = useNavigate();
  const { reportId = '' } = useParams();
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function load() {
    if (!reportId) return;
    setLoading(true);
    setError('');
    try {
      const row = await api<ReportDetail>(`/api/admin/reports/${reportId}`);
      setDetail(row);
      setStatus(row.status);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [reportId]);

  async function saveStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!detail || !status || status === detail.status) return;
    setSaving(true);
    setFeedback('');
    setError('');
    try {
      await api(`/api/admin/reports/${detail.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setFeedback('Status updated.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
          onClick={() => navigate('/app/dashboard/reports')}
        >
          ← Back to reports
        </button>
        <Spinner label="Loading report…" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
          onClick={() => navigate('/app/dashboard/reports')}
        >
          ← Back to reports
        </button>
        <Alert kind="error">{error}</Alert>
      </div>
    );
  }

  if (!detail) return null;

  const caseRef = detail.id.slice(0, 8).toUpperCase();
  const aboutTarget = detail.targetName?.trim()
    || (detail.targetType ? detail.targetType : null);

  return (
    <div className="flex flex-col gap-6">
      {detail.church ? (
        <button
          type="button"
          className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
          onClick={() => navigate(`/app/dashboard/churches/${detail.church!.id}`)}
        >
          ← Back to {detail.church.name}
        </button>
      ) : (
        <button
          type="button"
          className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
          onClick={() => navigate('/app/dashboard/reports')}
        >
          ← Back to reports
        </button>
      )}

      <header className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xs">
        <div
          className="px-5 py-6 sm:px-7"
          style={{
            background:
              'linear-gradient(135deg, rgba(230,246,246,0.95) 0%, rgba(255,253,247,1) 48%, rgba(246,231,200,0.4) 100%)',
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-teal">Safeguarding case</p>
              <h1 className="m-0 mt-1.5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                {detail.category.replace(/_/g, ' ')}
              </h1>
              <p className="m-0 mt-1 text-xs text-muted">
                Case {caseRef} · Filed {new Date(detail.createdAt).toLocaleString()}
                {aboutTarget ? ` · About ${aboutTarget}` : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Badge kind={statusClass[detail.status] ?? 'info'}>{detail.status}</Badge>
              {detail.investigationLocked ? <Badge kind="warn">Retention locked</Badge> : null}
              {detail.church ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-full border border-teal/25 bg-teal-tint px-3 py-1 font-mono text-xs font-bold tracking-wide text-teal"
                  onClick={() => navigate(`/app/dashboard/churches/${detail.church!.id}`)}
                >
                  {detail.church.joinCode}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {error ? <Alert kind="error">{error}</Alert> : null}
      {feedback ? <Alert kind="ok">{feedback}</Alert> : null}

      <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-xs sm:p-5">
        <h2 className="m-0 text-sm font-bold text-navy">Complaint details</h2>
        <p className="m-0 mt-3 whitespace-pre-wrap text-sm leading-relaxed text-navy/90">{detail.description}</p>
        {detail.followUpEmail ? (
          <p className="m-0 mt-3 text-xs text-muted">
            Follow-up requested at{' '}
            <span className="font-semibold text-navy">{detail.followUpEmail}</span>
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-xs">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Ministry</p>
          <p className="m-0 mt-1 text-sm font-semibold text-navy">{detail.church?.name || 'App team only'}</p>
          <p className="m-0 mt-0.5 text-[11px] text-muted">{detail.church?.jurisdiction || 'No ministry linked'}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-xs">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Reporter</p>
          <p className="m-0 mt-1 text-sm font-semibold text-navy">
            {detail.reporter?.name || detail.reporterLabel || 'Anonymous'}
          </p>
          <p className="m-0 mt-0.5 text-[11px] text-muted">
            {detail.reporter?.email || detail.followUpEmail || detail.reporterLabel || 'No account linked'}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-xs">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Assignee</p>
          <p className="m-0 mt-1 text-sm font-semibold text-navy">{detail.assignee?.name || 'Unassigned'}</p>
          <p className="m-0 mt-0.5 text-[11px] text-muted">{detail.assignee?.email || '—'}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-xs sm:p-5">
        <h2 className="m-0 text-sm font-bold text-navy">Case controls</h2>
        <dl className="m-0 mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Investigation lock</dt>
            <dd className="m-0 mt-1 text-navy">{detail.investigationLocked ? 'Yes — retention held open' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Retained until</dt>
            <dd className="m-0 mt-1 text-navy">
              {detail.retainedUntil ? new Date(detail.retainedUntil).toLocaleString() : 'Standard lifecycle'}
            </dd>
          </div>
        </dl>
        <form className="mt-4 flex flex-wrap items-end gap-3 border-t border-border/60 pt-4" onSubmit={(e) => void saveStatus(e)}>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold text-navy">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            >
              {['SUBMITTED', 'UNDER_REVIEW', 'ESCALATED', 'CLOSED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <Button size="sm" type="submit" disabled={saving || status === detail.status}>
            {saving ? 'Saving…' : 'Update status'}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-xs sm:p-5">
        <h2 className="m-0 text-sm font-bold text-navy">Case timeline</h2>
        {detail.events.length === 0 ? (
          <p className="m-0 mt-3 text-xs text-muted">No investigation notes or status events yet.</p>
        ) : (
          <ol className="m-0 mt-3 list-none space-y-3 p-0">
            {detail.events.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-border/70 bg-cream/40 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-teal">{ev.action}</span>
                  <span className="text-[11px] text-muted">{new Date(ev.createdAt).toLocaleString()}</span>
                </div>
                {ev.fromStatus || ev.toStatus ? (
                  <p className="m-0 mt-1 text-xs text-navy">
                    {ev.fromStatus || '—'} → {ev.toStatus || '—'}
                  </p>
                ) : null}
                {ev.note ? (
                  <p className="m-0 mt-1 whitespace-pre-wrap text-xs leading-relaxed text-navy/90">{ev.note}</p>
                ) : null}
                <p className="m-0 mt-1 text-[11px] text-muted">
                  {ev.actor.name} · {ev.actor.email}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

type Deletion = {
  id: string;
  familyId: string;
  requestedBy: string;
  source: 'USER' | 'ADMIN' | string;
  reason: string | null;
  reservedEmails?: string[];
  requestedAt: string;
  purgedAt: string | null;
  requester: { id: string; name: string; email: string; platformRole: string } | null;
  family: {
    id: string;
    name: string;
    jurisdiction: string;
    deletionStage: string | null;
    deletionAt: string | null;
    createdAt: string;
    owner: { id: string; name: string; email: string };
    church: { id: string; name: string } | null;
    _count: { children: number; guardians: number };
  } | null;
};

function canAdminRestoreDeletion(stage: string | null | undefined) {
  return stage === 'recoverable' || stage === 'group_scheduled';
}

function deletionSourceLabel(source: string) {
  return source === 'ADMIN' ? 'Admin' : 'User';
}

export function DeletionsPage() {
  const [rows, setRows] = useState<Deletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Deletion | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await api<Deletion[]>('/api/admin/deletions'));
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load deletions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirmRestore() {
    if (!selected) return;
    const name = selected.family?.name || 'this family';
    setRestoringId(selected.id);
    setError('');
    setFeedback('');
    try {
      await api(`/api/admin/deletions/${selected.id}/restore`, { method: 'POST' });
      setFeedback(`“${name}” was restored.`);
      setSelected(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to restore account');
    } finally {
      setRestoringId(null);
    }
  }

  const stageClass: Record<string, 'warn' | 'info' | 'bad'> = {
    recoverable: 'warn', backend_only: 'info', purge_pending: 'bad', group_scheduled: 'warn',
  };

  const selectedRestorable = canAdminRestoreDeletion(selected?.family?.deletionStage);
  const selectedReason = (selected?.reason ?? '').trim();

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
        <h3 className="text-base font-bold text-navy">Deletion lifecycle (0-30d recoverable · 30-90d backend-only · 90+d purge)</h3>
        <p className="m-0 text-xs text-muted">Open a row to review who started deletion, their reason, and restore if still recoverable.</p>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {feedback ? <Alert kind="ok">{feedback}</Alert> : null}
        {loading ? <Spinner label="Loading deletions…" /> : rows.length === 0 && !error ? <Empty title="No pending deletion requests" body="Family wipe requests from the app appear here." /> : rows.length === 0 ? null : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Family</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Initiated</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Stage</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Requested</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide text-right">Actions</th>
                </tr>
              </thead>
            <tbody>
              {rows.map((d) => {
                const stage = d.family?.deletionStage ?? '';
                const restorable = canAdminRestoreDeletion(d.family?.deletionStage);
                return (
                  <tr
                    key={d.id}
                    className="cursor-pointer border-b border-border/50 hover:bg-surface-2/30 transition-colors"
                    onClick={() => setSelected(d)}
                  >
                    <td className="py-3 px-3 font-medium text-navy">
                      <span className="block">{d.family?.name || '—'}</span>
                      {d.reason ? (
                        <span className="mt-0.5 block max-w-[16rem] truncate text-[11px] font-normal text-muted" title={d.reason}>
                          {d.reason}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-3">
                      <Badge kind={d.source === 'ADMIN' ? 'info' : 'ok'}>{deletionSourceLabel(d.source)}</Badge>
                    </td>
                    <td className="py-3 px-3"><Badge kind={stageClass[stage] ?? 'info'}>{stage || '—'}</Badge></td>
                    <td className="py-3 px-3 text-muted">{new Date(d.requestedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(d);
                        }}
                        className="cursor-pointer rounded-xl border border-border bg-cream px-2.5 py-1.5 text-[11px] font-semibold text-navy transition-colors hover:bg-surface-2"
                      >
                        {restorable ? 'Review / Restore' : 'View details'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.family?.name ? `Deletion · ${selected.family.name}` : 'Deletion details'}
        subtitle="Review who requested deletion and why before restoring."
      >
        {selected ? (
          <div className="flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-cream/40 px-3 py-2.5">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Initiated by</p>
                <p className="m-0 mt-1 font-semibold text-navy">{deletionSourceLabel(selected.source)}</p>
                <p className="m-0 mt-1 text-muted">
                  {selected.requester
                    ? `${selected.requester.name} · ${selected.requester.email}`
                    : 'Requester record unavailable'}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-cream/40 px-3 py-2.5">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Lifecycle stage</p>
                <p className="m-0 mt-1">
                  <Badge kind={stageClass[selected.family?.deletionStage ?? ''] ?? 'info'}>
                    {selected.family?.deletionStage || '—'}
                  </Badge>
                </p>
                <p className="m-0 mt-1 text-muted">
                  Requested {new Date(selected.requestedAt).toLocaleString()}
                  {selected.family?.deletionAt
                    ? ` · clock started ${new Date(selected.family.deletionAt).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-white px-3 py-2.5">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Reason</p>
              <p className={`m-0 mt-1.5 text-sm leading-relaxed ${selectedReason ? 'text-navy' : 'italic text-muted'}`}>
                {selectedReason || 'No reason was recorded for this request.'}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-white px-3 py-2.5">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Emails held during deletion</p>
              {(selected.reservedEmails?.length ?? 0) > 0 ? (
                <ul className="m-0 mt-1.5 list-none space-y-1 p-0">
                  {selected.reservedEmails!.map((email) => (
                    <li key={email} className="font-mono text-[11px] text-navy">{email}</li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-1.5 italic text-muted">No reserved emails recorded for this request.</p>
              )}
              <p className="m-0 mt-2 text-[11px] text-muted">
                These addresses cannot be used to register a new account while this family is in the deletion period.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-cream/40 px-3 py-2.5">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Family details</p>
              <dl className="m-0 mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Owner</dt>
                  <dd className="m-0 text-navy">
                    {selected.family?.owner.name ?? '—'}
                    {selected.family?.owner.email ? (
                      <span className="block text-[11px] text-muted">{selected.family.owner.email}</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Jurisdiction</dt>
                  <dd className="m-0 text-navy">{selected.family?.jurisdiction ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Household</dt>
                  <dd className="m-0 text-navy">
                    {selected.family
                      ? `${selected.family._count.children} child${selected.family._count.children === 1 ? '' : 'ren'} · ${selected.family._count.guardians} guardian${selected.family._count.guardians === 1 ? '' : 's'}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Linked ministry</dt>
                  <dd className="m-0 text-navy">{selected.family?.church?.name ?? 'None (detached)'}</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy"
              >
                Close
              </button>
              {selectedRestorable ? (
                <Button
                  size="sm"
                  type="button"
                  disabled={restoringId === selected.id}
                  onClick={() => void confirmRestore()}
                >
                  {restoringId === selected.id ? 'Restoring…' : 'Restore account'}
                </Button>
              ) : (
                <span className="text-[11px] text-muted">Not in the recoverable window</span>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

const QUEST_SCORE_KEYS = ['VIDEO_WATCH', 'TEEN_QUEST_OBJS', 'PUZZLE_SOLVE', 'PRAYER_DECLARATION'] as const;

function questScoreLabel(activity: string) {
  if (activity === 'TEEN_QUEST_OBJS') return 'Quiz';
  if (activity === 'PUZZLE_SOLVE') return 'Puzzle';
  return activity.replace(/_/g, ' ');
}
const QUEST_SCORE_FALLBACK: Record<(typeof QUEST_SCORE_KEYS)[number], number> = {
  VIDEO_WATCH: 10,
  TEEN_QUEST_OBJS: 5,
  PUZZLE_SOLVE: 5,
  PRAYER_DECLARATION: 1,
};

const QUEST_SCORE_META: Record<
  (typeof QUEST_SCORE_KEYS)[number],
  { label: string; hint: string; tone: 'teal' | 'forest' | 'orange' | 'gold' }
> = {
  VIDEO_WATCH: {
    label: 'Video watch',
    hint: 'Each video finished',
    tone: 'teal',
  },
  TEEN_QUEST_OBJS: {
    label: 'Quiz',
    hint: 'Week quiz finished',
    tone: 'forest',
  },
  PUZZLE_SOLVE: {
    label: 'Puzzle',
    hint: 'Week puzzle finished',
    tone: 'orange',
  },
  PRAYER_DECLARATION: {
    label: 'Prayer declaration',
    hint: 'Spoken week declaration',
    tone: 'gold',
  },
};

const VIDEOS_PER_WEEK = 3;
const MAX_QUEST_AWARDS = 12;

type QuestAward = { id: string; title: string; weekNumber: number; weeksExpected: number; criteria: string };

function withExpectedWeeks(awards: QuestAward[]) {
  let cursor = 0;
  return awards.map((award) => {
    const weeksExpected = Math.min(52, Math.max(1, Number(award.weeksExpected) || 1));
    cursor += weeksExpected;
    return { ...award, weeksExpected, weekNumber: cursor };
  });
}

const SCORE_TONE: Record<'teal' | 'forest' | 'orange' | 'gold', string> = {
  teal: 'bg-teal',
  forest: 'bg-forest',
  orange: 'bg-orange',
  gold: 'bg-gold',
};

export function ScoringPage() {
  const [rules, setRules] = useState<Record<string, number> | null>(null);
  const [awards, setAwards] = useState<QuestAward[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [awardError, setAwardError] = useState('');
  const [awardMessage, setAwardMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [awardBusy, setAwardBusy] = useState(false);
  const [editingAwardIds, setEditingAwardIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    api<Record<string, number>>('/api/admin/scoring-rules').then(setRules).catch((e: Error) => setError(e.message));
    api<QuestAward[]>('/api/admin/quest-awards')
      .then((rows) => setAwards(withExpectedWeeks(rows.map((row) => ({
        ...row,
        weeksExpected: row.weeksExpected ?? 1,
      })))))
      .catch((e: Error) => setAwardError(e.message));
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
      setMessage('Saved. Each finished activity awards this total — not a sum of question points.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function saveAwards(e: React.FormEvent) {
    e.preventDefault();
    if (!awards) return;
    setAwardBusy(true);
    setAwardError('');
    setAwardMessage('');
    try {
      const saved = await api<QuestAward[]>('/api/admin/quest-awards', {
        method: 'PUT',
        body: JSON.stringify(withExpectedWeeks(awards).map((award) => ({
          id: award.id,
          title: award.title.trim(),
          weeksExpected: award.weeksExpected,
        }))),
      });
      setAwards(withExpectedWeeks(saved.map((row) => ({
        ...row,
        weeksExpected: row.weeksExpected ?? 1,
      }))));
      setEditingAwardIds(new Set());
      setAwardMessage('Saved. Each badge is earned after its weeks, then the next one begins.');
    } catch (err: unknown) {
      setAwardError(err instanceof Error ? err.message : 'Could not save awards');
    } finally {
      setAwardBusy(false);
    }
  }

  if (error && !rules) {
    return (
      <div className="border border-border bg-surface rounded-card p-6">
        <Alert kind="error">{error}</Alert>
      </div>
    );
  }
  if (!rules) return <Spinner />;

  const questRules = QUEST_SCORE_KEYS.map((key) => ({
    key,
    points: rules[key] ?? QUEST_SCORE_FALLBACK[key],
    ...QUEST_SCORE_META[key],
  }));
  const jarIfAllDone = questRules.reduce((sum, row) => {
    const points = Number(row.points || 0);
    return sum + (row.key === 'VIDEO_WATCH' ? points * VIDEOS_PER_WEEK : points);
  }, 0);
  const sortedAwards = awards;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border bg-navy-tint/60 px-3.5 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Full week
          </span>
          <span className="font-mono text-lg font-extrabold tabular-nums text-navy leading-none">
            {jarIfAllDone}
          </span>
          <span className="text-xs font-semibold text-teal">pts</span>
        </div>
      </div>

      <form className="flex flex-col gap-3" onSubmit={saveAwards}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-navy">Award milestones</h2>
              {awards ? (
                <span className="rounded-full bg-teal-tint px-2 py-0.5 text-[10px] font-bold tabular-nums text-teal">
                  {awards.length}/{MAX_QUEST_AWARDS}
                </span>
              ) : null}
            </div>
            <p className="m-0 mt-0.5 text-xs text-muted">Weeks to finish this badge before the next one starts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-navy transition-colors hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-50"
              disabled={awardBusy || !awards || awards.length >= MAX_QUEST_AWARDS}
              onClick={() => {
                if (!awards || awards.length >= MAX_QUEST_AWARDS) return;
                const id = crypto.randomUUID();
                setAwards(withExpectedWeeks([
                  ...awards,
                  { id, title: '', weekNumber: 1, weeksExpected: 1, criteria: '' },
                ]));
                setEditingAwardIds((current) => new Set(current).add(id));
                setAwardMessage('');
                setAwardError('');
              }}
            >
              Add award
            </button>
            <Button type="submit"
               
              disabled={awardBusy || !awards}>
              {awardBusy ? 'Saving…' : 'Save awards'}
            </Button>
          </div>
        </div>

        {awardError ? <Alert kind="error">{awardError}</Alert> : null}
        {awardMessage ? <Alert kind="ok">{awardMessage}</Alert> : null}

        {awards ? (
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-cream/90 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  <th scope="col" className="px-4 py-2.5 font-bold">#</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Badge</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Name</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Weeks</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Span</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Ends</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-bold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(sortedAwards ?? awards).map((award, toneIndex) => {
                  const index = awards.findIndex((row) => row.id === award.id);
                  const weeks = Math.min(52, Math.max(1, Number(award.weeksExpected) || 1));
                  const endsAt = Number(award.weekNumber) || weeks;
                  const startsAt = Math.max(1, endsAt - weeks + 1);
                  const editing = editingAwardIds.has(award.id);
                  const tone = [
                    'text-orange bg-orange/15',
                    'text-forest bg-forest/15',
                    'text-teal bg-teal/15',
                    'text-gold bg-gold/25',
                  ][toneIndex % 4];
                  const quietField =
                    'border-0 bg-transparent p-0 text-navy outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0';
                  return (
                    <tr key={award.id} className="group border-b border-border last:border-b-0 hover:bg-cream/35">
                      <td className="px-4 py-3 align-middle">
                        <span className="font-mono text-xs font-bold tabular-nums text-muted">
                          {String(toneIndex + 1).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className={`grid h-9 w-9 place-items-center rounded-full ${tone}`} aria-hidden>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M7 6H5a3 3 0 0 0 3 3M17 6h2a3 3 0 0 1-3 3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        {editing ? (
                          <input
                            required
                            aria-label={`Award ${index + 1} name`}
                            placeholder="Badge name"
                            value={award.title}
                            onChange={(e) => {
                              const next = [...awards];
                              next[index] = { ...award, title: e.target.value };
                              setAwards(next);
                            }}
                            className={`w-full min-w-[10rem] text-sm font-semibold placeholder:text-muted/55 ${quietField}`}
                          />
                        ) : (
                          <span className="text-sm font-semibold text-navy">{award.title || 'Untitled badge'}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        {editing ? (
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={52}
                              required
                              aria-label={`${award.title || 'Award'} weeks`}
                              value={award.weeksExpected}
                              onChange={(e) => {
                                const next = [...awards];
                                next[index] = { ...award, weeksExpected: Number(e.target.value) };
                                setAwards(withExpectedWeeks(next));
                              }}
                              className={`w-10 text-center font-mono text-sm font-extrabold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${quietField}`}
                            />
                            <span className="text-[11px] font-semibold text-muted">wk</span>
                          </label>
                        ) : (
                          <span className="font-mono text-sm font-extrabold tabular-nums text-navy">
                            {weeks} <span className="text-[11px] font-semibold text-muted">wk</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="font-mono text-xs font-semibold tabular-nums text-text-2">
                          W{startsAt}
                          {startsAt !== endsAt ? `–W${endsAt}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="text-xs font-bold tabular-nums text-teal">Week {endsAt}</span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <button
                          type="button"
                          aria-pressed={editing}
                          className="cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100 hover:text-teal"
                          onClick={() => {
                            setEditingAwardIds((current) => {
                              const next = new Set(current);
                              if (next.has(award.id)) next.delete(award.id);
                              else next.add(award.id);
                              return next;
                            });
                          }}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100 hover:bg-error-bg hover:text-error disabled:cursor-not-allowed"
                          aria-label={`Delete ${award.title || `award ${index + 1}`}`}
                          disabled={awardBusy || awards.length <= 1}
                          onClick={() => {
                            setAwards(withExpectedWeeks(awards.filter((row) => row.id !== award.id)));
                            setEditingAwardIds((current) => {
                              const next = new Set(current);
                              next.delete(award.id);
                              return next;
                            });
                            setAwardMessage('');
                            setAwardError('');
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : awardError ? null : (
          <Spinner label="Loading awards…" />
        )}
      </form>

      {/* Completion ledger — flat instrument strip, not nested cards */}
      <form className="flex flex-col gap-4" onSubmit={save}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-navy">Completion ledger</h2>
            <p className="m-0 mt-0.5 text-xs text-muted">
              One amount per finished activity.
            </p>
          </div>
          <Button type="submit"
             
            disabled={busy}>
            {busy ? 'Saving…' : 'Save quest points'}
          </Button>
        </div>

        {error ? <Alert kind="error">{error}</Alert> : null}
        {message ? <Alert kind="ok">{message}</Alert> : null}

        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_7.5rem] gap-3 border-b border-border bg-cream/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            <span>Activity</span>
            <span className="text-right">Points</span>
          </div>
          <ul className="m-0 list-none divide-y divide-border p-0">
            {questRules.map((row) => (
              <li
                key={row.key}
                className="grid grid-cols-1 items-center gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_7.5rem] sm:gap-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-1.5 h-8 w-1 shrink-0 rounded-full ${SCORE_TONE[row.tone]}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-bold text-navy">{row.label}</p>
                    <p className="m-0 mt-0.5 text-xs text-muted">{row.hint}</p>
                    {questScoreLabel(row.key) === row.label ? null : (
                      <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-wider text-muted/80">
                        {questScoreLabel(row.key)}
                      </p>
                    )}
                  </div>
                </div>
                <label className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted sm:sr-only">
                    Points
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={10000}
                      value={row.points}
                      aria-label={`${questScoreLabel(row.key)} points`}
                      onChange={(e) => setRules({ ...rules, [row.key]: Number(e.target.value) })}
                      className="w-[5.5rem] rounded-md border border-border bg-cream px-2.5 py-1.5 text-right font-mono text-base font-extrabold tabular-nums text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
                    />
                    <span className="w-8 text-[11px] font-semibold text-muted">
                      {row.key === 'VIDEO_WATCH' ? 'each' : 'pts'}
                    </span>
              </span>
            </label>
              </li>
          ))}
          </ul>
        </div>
      </form>

    </div>
  );
}
