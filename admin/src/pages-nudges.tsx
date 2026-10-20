import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from './api';
import { askConfirm, askPrompt } from './prompt-dialog';
import { Alert, Button, Badge, Empty, Field, PageHeader, Pager, slicePage, Spinner } from './ui';

export type NudgeTemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

export type NudgeTemplateChurch = {
  id: string;
  name: string;
  joinCode: string;
  jurisdiction: string;
  description?: string | null;
};

export type NudgeTemplate = {
  id: string;
  key: string;
  message: string;
  active: boolean;
  status: NudgeTemplateStatus;
  churchId?: string | null;
  church?: NudgeTemplateChurch | null;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type NudgeTab = 'platform' | 'church-pending' | 'church-approved' | 'church-rejected' | 'revoked';

const NUDGE_TABS: NudgeTab[] = [
  'platform',
  'church-pending',
  'church-approved',
  'church-rejected',
  'revoked',
];

function parseNudgeTab(value: string | null): NudgeTab | null {
  if (!value) return null;
  return NUDGE_TABS.includes(value as NudgeTab) ? (value as NudgeTab) : null;
}

function refreshAdminBadges() {
  window.dispatchEvent(new Event('askhub:admin-stats-refresh'));
}

function statusBadge(status: NudgeTemplateStatus) {
  if (status === 'APPROVED') return <Badge kind="ok">Approved</Badge>;
  if (status === 'REVOKED') return <Badge kind="warn">Revoked</Badge>;
  if (status === 'REJECTED') return <Badge kind="bad">Rejected</Badge>;
  return <Badge kind="info">Pending review</Badge>;
}

function ChurchMeta({ church }: { church: NudgeTemplateChurch }) {
  return (
    <div className="mt-1 space-y-0.5 text-[11px] text-muted">
      <p className="m-0">
        <span className="font-semibold text-navy">Ministry:</span>{' '}
        <Link className="text-teal hover:underline" to={`/app/dashboard/churches/${church.id}`}>
          {church.name}
        </Link>
      </p>
      <p className="m-0">
        Join code <span className="font-mono font-semibold text-navy">{church.joinCode}</span>
        {' · '}
        {church.jurisdiction}
      </p>
      {church.description?.trim() ? (
        <p className="m-0 line-clamp-2 text-navy/70">{church.description.trim()}</p>
      ) : null}
    </div>
  );
}

export function NudgesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<NudgeTemplate[]>([]);
  const [tab, setTab] = useState<NudgeTab>(
    () => parseNudgeTab(searchParams.get('tab')) ?? 'platform',
  );
  const [messageDraft, setMessageDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await api<NudgeTemplate[]>('/api/admin/nudge-templates'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load nudge templates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const fromUrl = parseNudgeTab(searchParams.get('tab'));
    if (fromUrl && fromUrl !== tab) setTab(fromUrl);
  }, [searchParams, tab]);

  function selectTab(next: NudgeTab) {
    setTab(next);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'platform') params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true },
    );
  }

  async function onSubmitPlatform(e: FormEvent) {
    e.preventDefault();
    if (!messageDraft.trim()) {
      setError('Message is required');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api('/api/admin/nudge-templates', {
        method: 'POST',
        body: JSON.stringify({ message: messageDraft.trim() }),
      });
      setMessageDraft('');
      setMessage('Platform cheer registered — available to every group immediately.');
      selectTab('platform');
      await load();
      refreshAdminBadges();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not register platform template');
    } finally {
      setSaving(false);
    }
  }

  async function onApprove(row: NudgeTemplate) {
    setError('');
    try {
      await api(`/api/admin/nudge-templates/${row.id}/approve`, { method: 'POST' });
      setMessage(
        row.church
          ? `Approved for ${row.church.name} groups only`
          : 'Platform template approved for every group',
      );
      await load();
      refreshAdminBadges();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not approve');
    }
  }

  async function onReject(row: NudgeTemplate) {
    if (!row.churchId) return;
    const reason = await askPrompt('Rejection reason (optional)', {
      title: 'Reject ministry nudge?',
      message: `“${row.message}” from ${row.church?.name ?? 'this ministry'} will return for edit and resubmit.`,
      confirmLabel: 'Reject',
    });
    if (reason === null) return;
    setError('');
    try {
      await api(`/api/admin/nudge-templates/${row.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      setMessage('Rejected — ministry can edit and resubmit');
      await load();
      refreshAdminBadges();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reject');
    }
  }

  async function onRevoke(row: NudgeTemplate) {
    const ok = await askConfirm(
      `Revoke “${row.message}”? Groups can no longer pick it. Past sends keep their snapshot.`,
      { title: 'Revoke template?', confirmLabel: 'Revoke', tone: 'danger' },
    );
    if (!ok) return;
    setError('');
    try {
      await api(`/api/admin/nudge-templates/${row.id}/revoke`, { method: 'POST' });
      setMessage('Permission revoked');
      await load();
      refreshAdminBadges();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not revoke');
    }
  }

  const platform = rows.filter((r) => !r.churchId && r.status !== 'REVOKED');
  const pendingChurch = rows.filter((r) => r.status === 'PENDING' && r.churchId);
  const approvedChurch = rows.filter((r) => r.status === 'APPROVED' && r.churchId);
  const rejected = rows.filter((r) => r.status === 'REJECTED');
  const revoked = rows.filter((r) => r.status === 'REVOKED');

  const tabs: Array<{ id: NudgeTab; label: string; count: number; hidden?: boolean }> = [
    { id: 'platform', label: 'Platform', count: platform.length },
    { id: 'church-pending', label: 'Churches · Pending', count: pendingChurch.length },
    { id: 'church-approved', label: 'Churches · Approved', count: approvedChurch.length },
    { id: 'church-rejected', label: 'Rejected', count: rejected.length, hidden: rejected.length === 0 },
    { id: 'revoked', label: 'Revoked', count: revoked.length, hidden: revoked.length === 0 },
  ];

  const visibleTabs = tabs.filter((t) => !t.hidden);
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : 'platform';

  let list: NudgeTemplate[] = [];
  if (activeTab === 'platform') list = platform;
  else if (activeTab === 'church-pending') list = pendingChurch;
  else if (activeTab === 'church-approved') list = approvedChurch;
  else if (activeTab === 'church-rejected') list = rejected;
  else list = revoked;

  const nudgePage = slicePage(list, page);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student nudges"
        actions={
          <div
            className="inline-flex flex-wrap items-center justify-end gap-1"
            role="tablist"
            aria-label="Nudge template filters"
          >
            {visibleTabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-none px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-navy text-white shadow-xs' : 'text-muted hover:bg-surface hover:text-navy'
                  }`}
                  onClick={() => selectTab(item.id)}
                >
                  <span>{item.label}</span>
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-none px-1.5 text-[10px] font-bold tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : item.count > 0 && item.id === 'church-pending'
                          ? 'bg-orange text-white'
                          : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        }
      />

      {error ? <Alert kind="error">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}

      <div
        className={
          activeTab === 'platform'
            ? 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]'
            : undefined
        }
      >
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          {loading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <Empty
              title={
                activeTab === 'platform'
                  ? 'No platform cheers'
                  : activeTab === 'church-pending'
                    ? 'No pending church templates'
                    : activeTab === 'church-approved'
                      ? 'No approved church templates'
                      : activeTab === 'church-rejected'
                        ? 'No rejected templates'
                        : 'No revoked templates'
              }
              body={
                activeTab === 'platform'
                  ? 'Register one on the right — it goes live for every group.'
                  : activeTab === 'church-pending'
                    ? 'Ministry submissions waiting for Care appear here with church details.'
                    : activeTab === 'church-approved'
                      ? 'Approved private cheers for a single ministry’s groups show here.'
                      : activeTab === 'church-rejected'
                        ? 'Rejected ministry templates wait for the church to edit and resubmit.'
                        : 'Revoked templates stay for audit. Re-approve to restore sending.'
              }
            />
          ) : (
            <>
            <ul className="divide-y divide-border">
              {nudgePage.rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-bold ${
                        row.status === 'APPROVED' || row.status === 'PENDING' ? 'text-navy' : 'text-navy/80'
                      }`}
                    >
                      {row.message}
                    </p>
                    {row.church ? (
                      <ChurchMeta church={row.church} />
                    ) : (
                      <p className="mt-0.5 text-[11px] text-muted">Platform · all groups</p>
                    )}
                    {row.rejectionReason ? (
                      <p className="mt-1 text-[11px] text-muted">Reason: {row.rejectionReason}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(row.status)}
                    {row.status === 'PENDING' && row.churchId ? (
                      <>
                        <Button type="button" onClick={() => void onApprove(row)}>
                          Approve
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => void onReject(row)}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {row.status === 'PENDING' && !row.churchId ? (
                      <>
                        <Button type="button" onClick={() => void onApprove(row)}>
                          Approve
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => void onRevoke(row)}>
                          Revoke
                        </Button>
                      </>
                    ) : null}
                    {row.status === 'APPROVED' ? (
                      <Button type="button" variant="ghost" onClick={() => void onRevoke(row)}>
                        Revoke
                      </Button>
                    ) : null}
                    {row.status === 'REVOKED' ? (
                      <Button type="button" variant="ghost" onClick={() => void onApprove(row)}>
                        Re-approve
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <Pager page={nudgePage.page} total={nudgePage.total} onPage={setPage} />
            </>
          )}
        </section>

        {activeTab === 'platform' ? (
          <section className="h-fit rounded-2xl border border-border bg-surface p-4 sm:p-5 lg:sticky lg:top-4">
            <h2 className="mb-3 text-sm font-extrabold text-navy">Register platform cheer</h2>
            <p className="mb-3 text-xs text-muted">
              App-team catalog only. Goes live for every group. Churches submit private messages from the ministry
              portal.
            </p>
            <form className="space-y-3" onSubmit={onSubmitPlatform}>
              <Field label="Message">
                <textarea
                  className="w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-sm text-navy"
                  rows={3}
                  maxLength={200}
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Keep your daily streak going"
                  required
                />
              </Field>
              <Button type="submit" disabled={saving}>
                {saving ? 'Registering…' : 'Register for all groups'}
              </Button>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
