import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, API_BASE } from './api';
import { askConfirm } from './prompt-dialog';
import { Alert, Button, Badge, Empty, Field, Spinner } from './ui';

export type ChurchApplicationRow = {
  id: string;
  churchName: string;
  applicantName: string;
  email: string;
  phone: string;
  address: string;
  purpose?: string | null;
  country?: string | null;
  reason: string;
  intendedUse: string;
  identityKind: string;
  identityReference: string;
  identityDocKey?: string | null;
  acceptedTerms: boolean;
  confirmedTruthful: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionReason: string | null;
  seenAt: string | null;
  archivedAt?: string | null;
  createdAt: string;
  church: { id: string; name: string; joinCode: string } | null;
  user: { leadershipTitle: string | null } | null;
};

/** @deprecated Prefer ChurchApplicationRow */
type Application = ChurchApplicationRow;

function refreshAdminBadges() {
  window.dispatchEvent(new Event('askhub:admin-stats-refresh'));
}

export function isUnseenApplication(row: ChurchApplicationRow) {
  return row.status === 'PENDING' && !row.seenAt;
}

function isUnseen(row: Application) {
  return isUnseenApplication(row);
}

const IDENTITY: Record<string, string> = {
  PASSPORT: 'Passport',
  NATIONAL_ID: 'National ID',
  DRIVERS_LICENSE: "Driver's license",
};

const TITLES: Record<string, string> = {
  PASTOR: 'Pastor',
  MINISTRY_LEADER: 'Ministry leader',
  YOUTH_WORKER: 'Youth worker',
  CHILDRENS_MINISTRY_LEAD: "Children's ministry lead",
  TEACHER: 'Teacher',
};

function statusLabel(status: Application['status']) {
  if (status === 'PENDING') return 'Pending';
  if (status === 'APPROVED') return 'Approved';
  return 'Rejected';
}

function ReviewLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[8.5rem_1fr] sm:gap-4 sm:py-3.5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-navy">{value || '—'}</dd>
    </div>
  );
}

function ReviewSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-4 border-b border-border/60 pb-3">
        <h2 className="m-0 text-sm font-bold text-navy">{title}</h2>
        {hint ? <p className="m-0 mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
      </div>
      <dl className="m-0 divide-y divide-border/50">{children}</dl>
    </section>
  );
}

export function ChurchApplicationsPanel({ onChanged: _onChanged }: { onChanged: () => void }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const next = await api<Application[]>('/api/admin/church-applications');
        if (!cancelled) {
          setRows(next);
          setError('');
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unseenCount = rows.filter(isUnseen).length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-1 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-navy">Applications</h2>
          {unseenCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-[10px] font-bold text-white tabular-nums">
              {unseenCount > 9 ? '9+' : unseenCount}
            </span>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Ministry accounts waiting for Teen Bible Adventures to approve or reject.
        </p>
      </div>
      {error ? <Alert kind="error">{error}</Alert> : null}
      {loading ? (
        <Spinner label="Loading applications…" />
      ) : rows.length === 0 && !error ? (
        <Empty
          title="No ministry applications yet"
          body="Applications sent from a ministry account appear here. Teen Bible Adventures approves or rejects each one."
        />
      ) : rows.length === 0 ? null : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-semibold">Ministry</th>
                <th className="px-3 py-2 font-semibold">Applicant</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-3 font-semibold text-navy">
                    <span className="inline-flex items-center gap-2">
                      {row.churchName}
                      {isUnseen(row) ? (
                        <span className="rounded-full bg-orange/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange">
                          New
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-navy">{row.applicantName}</div>
                    <div className="text-muted">{row.email}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge kind={row.status === 'APPROVED' ? 'ok' : row.status === 'REJECTED' ? 'bad' : 'warn'}>
                      {statusLabel(row.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="cursor-pointer font-semibold text-teal hover:underline"
                        onClick={() => navigate(`/app/dashboard/churches/applications/${row.id}`)}
                      >
                        Review
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ChurchApplicationReviewPage() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const [row, setRow] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  async function archiveRejected() {
    if (!applicationId) return;
    const ok = await askConfirm(
      'This rejected application moves to Church archive.',
      { title: 'Archive application', confirmLabel: 'Archive' },
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/church-applications/${applicationId}/archive`, { method: 'POST' });
      navigate('/app/dashboard/archive');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not archive application');
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    if (!applicationId) return;
    setLoading(true);
    setError('');
    try {
      setRow(await api<Application>(`/api/admin/church-applications/${applicationId}`));
    } catch (e: unknown) {
      setRow(null);
      setError(e instanceof Error ? e.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [applicationId]);

  function back() {
    navigate('/app/dashboard/churches');
  }

  async function approve() {
    if (!row) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/api/admin/church-applications/${row.id}/approve`, { method: 'POST' });
      setMessage('Ministry approved. The applicant can open the ministry portal and create groups.');
      setRejecting(false);
      setReason('');
      refreshAdminBadges();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not approve');
    } finally {
      setBusy(false);
    }
  }

  async function openIdentityDoc(id: string) {
    setError('');
    try {
      const meta = await api<{ url: string; mode: 'presigned' | 'stream' }>(
        `/api/admin/church-applications/${id}/identity-doc-url`,
        { method: 'POST' },
      );
      if (meta.mode === 'presigned') {
        window.open(meta.url, '_blank', 'noopener,noreferrer');
        return;
      }
      const res = await fetch(`${API_BASE}${meta.url}`, {
        credentials: 'include',
        headers: {
          Accept: '*/*',
          'X-Dashboard-Request': '1',
        },
      });
      if (!res.ok) throw new Error('Could not open identity document');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not open identity document');
    }
  }

  async function reject() {
    if (!row) return;
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError('Enter a rejection reason (at least 5 characters).');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/api/admin/church-applications/${row.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: trimmed }),
      });
      setMessage('Rejection sent. Teen Bible Adventures emailed the reason to the applicant.');
      setRejecting(false);
      setReason('');
      refreshAdminBadges();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not reject');
    } finally {
      setBusy(false);
    }
  }

  async function markSeen() {
    if (!row) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await api<Application>(`/api/admin/church-applications/${row.id}/seen`, {
        method: 'POST',
      });
      setRow(updated);
      setMessage('Marked as seen. The Churches badge no longer counts this application.');
      refreshAdminBadges();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not mark as seen');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <button
          type="button"
          className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
          onClick={back}
        >
          ← Back to churches
        </button>
        <Spinner label="Loading application…" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="flex flex-col gap-5">
        <button
          type="button"
          className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
          onClick={back}
        >
          ← Back to churches
        </button>
        {error ? <Alert kind="error">{error}</Alert> : <Empty title="Application not found" body="It may have been removed." />}
      </div>
    );
  }

  const titleLabel =
    TITLES[row.user?.leadershipTitle ?? ''] ?? row.user?.leadershipTitle ?? 'Not recorded';

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        className="self-start cursor-pointer border-0 bg-transparent px-0 text-xs font-semibold text-teal hover:underline"
        onClick={back}
      >
        ← Back to churches
      </button>

      <header className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xs">
        <div
          className="border-b border-border/60 px-5 py-6 sm:px-7"
          style={{
            background:
              'linear-gradient(135deg, rgba(230,246,246,0.95) 0%, rgba(255,253,247,1) 45%, rgba(246,231,200,0.35) 100%)',
          }}
        >
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-teal">Ministry application</p>
          <div className="mt-2 flex flex-wrap items-start gap-3">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{row.churchName}</h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge kind={row.status === 'APPROVED' ? 'ok' : row.status === 'REJECTED' ? 'bad' : 'warn'}>
                {statusLabel(row.status)}
              </Badge>
              {isUnseen(row) ? (
                <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange">
                  New
                </span>
              ) : null}
            </div>
          </div>
          <p className="m-0 mt-2 text-sm text-muted">
            Submitted by <span className="font-semibold text-navy">{row.applicantName}</span>
            {titleLabel !== 'Not recorded' ? (
              <>
                {' '}
                · <span className="text-navy">{titleLabel}</span>
              </>
            ) : null}
          </p>
          <p className="m-0 mt-1 text-xs text-muted">
            {new Date(row.createdAt).toLocaleString()}
            {row.church ? (
              <>
                {' '}
                · Join code{' '}
                <span className="font-mono font-semibold text-teal">{row.church.joinCode}</span>
              </>
            ) : null}
          </p>
        </div>

        {row.status === 'PENDING' ? (
          <div className="flex flex-col gap-3 border-b border-border/60 bg-cream/40 px-5 py-4 sm:px-7">
            {error ? <Alert kind="error">{error}</Alert> : null}
            {message ? <Alert kind="ok">{message}</Alert> : null}
            {!rejecting ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={busy} onClick={() => void approve()}>
                    {busy ? 'Approving…' : 'Approve ministry'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      setRejecting(true);
                      setError('');
                      setMessage('');
                    }}
                  >
                    Reject with reason
                  </Button>
                  {isUnseen(row) ? (
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => void markSeen()}>
                      Mark as seen
                    </Button>
                  ) : null}
                </div>
                <p className="m-0 text-xs leading-relaxed text-muted">
                  Approval creates the ministry and opens group management for this account. Rejection emails the
                  reason. Mark as seen clears the Churches badge without deciding.
                </p>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <Field label="Rejection reason">
                  <textarea
                    className="min-h-28 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/25"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Teen Bible Adventures emails this reason to the applicant."
                    disabled={busy}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy || reason.trim().length < 5}
                    onClick={() => void reject()}
                  >
                    {busy ? 'Sending…' : 'Send rejection'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setRejecting(false);
                      setReason('');
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-b border-border/60 px-5 py-4 sm:px-7">
            {error ? <Alert kind="error">{error}</Alert> : null}
            {message ? <Alert kind="ok">{message}</Alert> : null}
            {row.decisionReason ? (
              <p className="m-0 text-sm leading-relaxed text-navy">
                <span className="font-semibold">Decision note:</span> {row.decisionReason}
              </p>
            ) : (
              <p className="m-0 text-sm text-muted">
                This application is {statusLabel(row.status).toLowerCase()}. No further action is needed here.
              </p>
            )}
            {row.status === 'REJECTED' && !row.archivedAt ? (
              <Button
                type="button"
                className="mt-3"
                disabled={busy}
                onClick={() => void archiveRejected()}
              >
                Archive
              </Button>
            ) : null}
          </div>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReviewSection title="Applicant" hint="Who opened the ministry account.">
          <ReviewLine label="Name" value={row.applicantName} />
          <ReviewLine label="Title" value={titleLabel} />
          <ReviewLine label="Email" value={row.email} />
          <ReviewLine label="Phone" value={row.phone} />
        </ReviewSection>

        <ReviewSection title="Ministry" hint="Where families will recognize this congregation.">
          <ReviewLine label="Ministry" value={row.churchName} />
          <ReviewLine
            label="Country"
            value={
              row.country?.trim()
                ? row.country.trim().toUpperCase() === 'OTHER'
                  ? 'Other / not listed'
                  : row.country.trim().toUpperCase()
                : '—'
            }
          />
          <ReviewLine label="Address" value={row.address} />
          <ReviewLine label="Submitted" value={new Date(row.createdAt).toLocaleString()} />
          <ReviewLine label="Status" value={statusLabel(row.status)} />
          {row.church ? <ReviewLine label="Join code" value={row.church.joinCode} /> : null}
        </ReviewSection>

        <ReviewSection title="Identity &amp; consent" hint="Document details and agreements.">
          <ReviewLine label="Identity" value={IDENTITY[row.identityKind] ?? row.identityKind} />
          <ReviewLine label="Document number" value={row.identityReference} />
          <ReviewLine
            label="Document file"
            value={
              row.identityDocKey ? (
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
                  onClick={() => void openIdentityDoc(row.id)}
                >
                  Open private upload
                </button>
              ) : (
                'Not uploaded'
              )
            }
          />
          <ReviewLine label="Terms accepted" value={row.acceptedTerms ? 'Yes' : 'No'} />
          <ReviewLine label="Confirmed true" value={row.confirmedTruthful ? 'Yes' : 'No'} />
          {row.decisionReason ? <ReviewLine label="Decision" value={row.decisionReason} /> : null}
        </ReviewSection>
      </div>

      <ReviewSection title="Purpose" hint="Who will use Teen Bible Adventures and about how many families.">
        <ReviewLine
          label="Purpose"
          value={
            (row.purpose && row.purpose.trim()) ||
            [row.reason, row.intendedUse].filter(Boolean).join('\n\n') ||
            '—'
          }
        />
      </ReviewSection>
    </div>
  );
}
