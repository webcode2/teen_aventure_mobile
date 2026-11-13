import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { api } from './api';
import { Alert, Button, Badge, Empty, Field, PageHeader, Spinner } from './ui';

type Notice = {
  id: string;
  channel: string;
  to: string;
  subject: string;
  body?: string;
  status: string;
  error?: string | null;
  createdAt?: string;
  queued?: number;
  sent?: number;
  pending?: number;
  failed?: number;
  audience?: string | null;
};

/** Mirrors the API caps: FCM rejects payloads over 4 KB. */
const PUSH_TITLE_MAX = 150;
const PUSH_BODY_MAX = 1000;
const EMAIL_SUBJECT_MAX = 200;
const EMAIL_BODY_MAX = 20000;

function sendSummary(row: Notice, group: string) {
  const total = row.queued ?? 1;
  const sent = row.sent ?? (row.status === 'SENT' ? total : 0);
  const pending = row.pending ?? (row.status === 'PENDING' ? total : 0);
  const failed = row.failed ?? (row.status === 'FAILED' ? total : 0);
  if (total === 1) {
    if (sent) return 'Delivered.';
    if (pending) return `Queued${row.error ? ` — ${row.error}` : ''}. It will retry automatically.`;
    return `Not delivered${row.error ? ` — ${row.error}` : ''}.`;
  }
  const parts = [`${sent} delivered`];
  if (pending) parts.push(`${pending} queued for retry`);
  if (failed) parts.push(`${failed} failed`);
  const reason = row.error && (pending || failed) ? ` First issue: ${row.error}.` : '';
  return `${total} recipients${group}: ${parts.join(', ')}.${reason}`;
}

type Channel = 'PUSH' | 'EMAIL';
type PreviewPlatform = 'android' | 'ios' | 'web';
/** '' = one specific id; otherwise an account-type group. */
type Audience =
  | ''
  | 'all'
  | 'parents'
  | 'explorers'
  | 'teachers'
  | 'pastors'
  | 'ministry_leads'
  | 'chaperones'
  | 'church_staff';

const CHANNELS: { id: Channel; label: string; hint: string }[] = [
  { id: 'PUSH', label: 'Push', hint: 'FCM device' },
  { id: 'EMAIL', label: 'Email', hint: 'Inbox' },
];

/** Mobile app login is only parents, explorers, and teachers — push audiences match that. */
const AUDIENCES: {
  id: Audience;
  label: string;
  hint: string;
  /** Shown for device push (people who can use the mobile app). */
  appPush: boolean;
}[] = [
  { id: '', label: 'Specific person', hint: 'One id or email', appPush: true },
  { id: 'all', label: 'All', hint: 'Every parent, explorer, and teacher on the app', appPush: true },
  { id: 'parents', label: 'Parents', hint: 'Adult family accounts on the app', appPush: true },
  { id: 'explorers', label: 'Explorers', hint: 'Teens with app login', appPush: true },
  { id: 'teachers', label: 'Teachers', hint: 'Teachers who use the app', appPush: true },
  { id: 'pastors', label: 'Pastors', hint: 'Email only — not on the app', appPush: false },
  { id: 'ministry_leads', label: "Children's ministry leads", hint: 'Email only — not on the app', appPush: false },
  { id: 'chaperones', label: 'Chaperones', hint: 'Email only — not on the app', appPush: false },
  { id: 'church_staff', label: 'All church staff', hint: 'Email only — includes non-app roles', appPush: false },
];

function audiencesForChannel(channel: Channel) {
  return channel === 'PUSH' ? AUDIENCES.filter((a) => a.appPush) : AUDIENCES;
}

function audienceLabel(id: Audience) {
  return AUDIENCES.find((a) => a.id === id)?.label ?? 'Group';
}

const PREVIEW_TABS: { id: PreviewPlatform; label: string }[] = [
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
  { id: 'web', label: 'Web' },
];

const statusKind: Record<string, 'ok' | 'warn' | 'bad' | 'info'> = {
  SENT: 'ok',
  PENDING: 'warn',
  FAILED: 'bad',
};

const inputClass =
  'w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-sm text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/40';

function DataTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto bg-transparent">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">{children}</table>
    </div>
  );
}

function PreviewImage({ src, className }: { src: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);
  if (!src || broken) return null;
  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

function ChannelSwitch({
  value,
  onChange,
}: {
  value: Channel;
  onChange: (next: Channel) => void;
}) {
  return (
    <div
      className="inline-flex w-full sm:w-auto rounded-xl border border-border bg-cream p-1"
      role="tablist"
      aria-label="Delivery channel"
    >
      {CHANNELS.map((ch) => {
        const active = value === ch.id;
        return (
          <button
            key={ch.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(ch.id)}
            className={`flex-1 sm:flex-none cursor-pointer rounded-lg px-4 py-2 text-left transition-colors ${
              active ? 'bg-navy text-cream shadow-xs' : 'text-muted hover:text-navy hover:bg-surface'
            }`}
          >
            <span className="block text-xs font-bold leading-none">{ch.label}</span>
            <span className={`mt-1 block text-[10px] font-medium leading-none ${active ? 'text-cream/70' : 'text-muted/80'}`}>
              {ch.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PushNotificationPreview({
  subject,
  body,
  imageUrl,
  actionLabel,
}: {
  subject: string;
  body: string;
  imageUrl: string;
  actionLabel: string;
}) {
  const [platform, setPlatform] = useState<PreviewPlatform>('android');
  const title = subject.trim() || 'Title on the device';
  const message = body.trim() || 'Message text';
  const image = imageUrl.trim();
  const showAction = Boolean(actionLabel.trim());
  const actionText = actionLabel.trim() || 'Open';

  return (
    <div className="flex flex-col gap-3">
      <div
        className="inline-flex self-start flex-wrap items-center gap-0.5 rounded-full border border-white/15 bg-white/10 p-0.5"
        role="tablist"
        aria-label="Notification preview platform"
      >
        {PREVIEW_TABS.map((tab) => {
          const active = platform === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                active ? 'bg-cream text-navy' : 'text-cream/70 hover:text-cream hover:bg-white/10'
              }`}
              onClick={() => setPlatform(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="flex min-h-[280px] items-center justify-center"
        role="tabpanel"
        aria-label={`${platform} notification preview`}
      >
        {platform === 'android' ? (
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-[#2d2d2d] text-white shadow-lg ring-1 ring-white/10">
            <div className="flex items-start gap-3 px-3.5 pt-3 pb-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">
                TBA
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[11px] text-white/70">Teen Bible Adventures · now</p>
                <p className="m-0 mt-1 truncate text-[13px] font-semibold leading-snug">{title}</p>
                <p className="m-0 mt-0.5 line-clamp-3 text-[12px] leading-snug text-white/85">{message}</p>
              </div>
            </div>
            {image ? <PreviewImage src={image} className="mt-1 h-36 w-full object-cover" /> : null}
            {showAction ? (
              <div className="flex justify-end gap-1 border-t border-white/10 px-2 py-1.5">
                <span className="rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8ab4f8]">
                  {actionText}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {platform === 'ios' ? (
          <div className="w-full max-w-[300px] overflow-hidden rounded-[22px] bg-white/95 text-[#111] shadow-xl">
            <div className="flex items-start gap-2.5 px-3.5 pt-3 pb-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-navy text-[9px] font-bold text-white">
                TBA
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[#6b6b6b]">
                    Teen Bible Adventures
                  </p>
                  <p className="m-0 shrink-0 text-[10px] text-[#8e8e93]">now</p>
                </div>
                <p className="m-0 mt-0.5 truncate text-[13px] font-semibold leading-snug">{title}</p>
                <p className="m-0 mt-0.5 line-clamp-3 text-[12px] leading-snug text-[#3a3a3c]">{message}</p>
              </div>
            </div>
            {image ? <PreviewImage src={image} className="h-40 w-full object-cover" /> : null}
            {showAction ? (
              <div className="border-t border-black/10 px-3.5 py-2 text-center text-[12px] font-semibold text-[#007aff]">
                {actionText}
              </div>
            ) : null}
          </div>
        ) : null}

        {platform === 'web' ? (
          <div className="w-full max-w-[320px] overflow-hidden rounded-xl border border-[#dadce0] bg-white text-[#202124] shadow-md">
            <div className="flex items-start gap-3 px-3.5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-navy text-[9px] font-bold text-white">
                TBA
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13px] font-medium leading-snug">{title}</p>
                <p className="m-0 mt-0.5 text-[11px] text-[#5f6368]">teenbibleadventures.app</p>
                <p className="m-0 mt-1 line-clamp-3 text-[12px] leading-snug text-[#3c4043]">{message}</p>
              </div>
              {image ? <PreviewImage src={image} className="h-14 w-14 shrink-0 rounded object-cover" /> : null}
            </div>
            {showAction ? (
              <div className="flex justify-end border-t border-[#eee] px-2 py-1">
                <span className="rounded px-3 py-1.5 text-[12px] font-medium text-[#1a73e8]">{actionText}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MessagePreview({ to, subject, body }: { channel: Channel; to: string; subject: string; body: string }) {
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-xl border border-border bg-cream text-navy shadow-xs">
      <div className="border-b border-border bg-surface px-3.5 py-2.5">
        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted">Inbox</p>
        <p className="m-0 mt-1 truncate text-sm font-bold">{subject.trim() || 'Subject'}</p>
        <p className="m-0 mt-0.5 truncate text-[11px] text-muted">To {to.trim() || 'name@example.com'}</p>
      </div>
      <p className="m-0 px-3.5 py-3 text-xs leading-relaxed text-text-2 line-clamp-6 whitespace-pre-wrap">{body.trim() || 'Message body'}</p>
    </div>
  );
}

const thClass =
  'whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0';
const tdClass = 'px-3 py-3 align-middle text-navy first:pl-0 last:pr-0';
const rowClass = 'border-b border-border/50 transition-colors hover:bg-surface-2/30';

const FILTERS = ['ALL', 'EMAIL', 'PUSH', 'PENDING', 'SENT', 'FAILED'] as const;

export function NotificationsPage() {
  const [sendError, setSendError] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [sending, setSending] = useState(false);
  const pendingSend = useRef<{ fingerprint: string; key: string } | null>(null);
  const [channel, setChannel] = useState<Channel>('PUSH');
  const [audience, setAudience] = useState<Audience>('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [actionUrl, setActionUrl] = useState('');

  const audienceOptions = audiencesForChannel(channel);

  function chooseChannel(next: Channel) {
    setChannel(next);
    // Drop pastor / staff groups when switching to push — they are not on the app.
    if (next === 'PUSH' && audience && !AUDIENCES.find((a) => a.id === audience)?.appPush) {
      setAudience('');
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    setSendError('');
    setSendNote('');
    setSending(true);
    try {
      const fingerprint = JSON.stringify({ channel, subject, body, audience, to, imageUrl, actionLabel, actionUrl });
      if (pendingSend.current?.fingerprint !== fingerprint) pendingSend.current = { fingerprint, key: crypto.randomUUID() };
      const row = await api<Notice>('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({
          requestKey: pendingSend.current.key,
          channel,
          subject: subject.trim(),
          body: body.trim(),
          ...(audience ? { audience } : { to: to.trim() }),
          ...(channel === 'PUSH'
            ? {
                data: { type: 'account' },
                ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
                ...(actionLabel.trim() ? { actionLabel: actionLabel.trim() } : {}),
                ...(actionUrl.trim() ? { actionUrl: actionUrl.trim() } : {}),
              }
            : {}),
        }),
      });
      pendingSend.current = null;
      const group = audience ? ` (${audienceLabel(audience).toLowerCase()})` : '';
      setSendNote(sendSummary(row, group));
      setSubject('');
      setBody('');
      setImageUrl('');
      setActionLabel('');
      setActionUrl('');
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  const toPlaceholder = channel === 'PUSH' ? 'user id, explorer id, or account email' : 'name@example.com';
  const toHint = channel === 'PUSH' ? 'From People — an id or the email they sign in with' : 'Recipient email';
  const audienceHint = AUDIENCES.find((a) => a.id === audience)?.hint ?? '';
  const subjectMax = channel === 'PUSH' ? PUSH_TITLE_MAX : EMAIL_SUBJECT_MAX;
  const bodyMax = channel === 'PUSH' ? PUSH_BODY_MAX : EMAIL_BODY_MAX;
  const tooLong = subject.trim().length > subjectMax || body.trim().length > bodyMax;
  const canSend =
    Boolean(subject.trim() && body.trim()) &&
    !tooLong &&
    !sending &&
    (audience ? true : Boolean(to.trim()));
  const previewTo = audience ? audienceLabel(audience) : to;

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        kicker="Operations"
        title="Notifications"
        subtitle="Write once, see how it lands, then send."
        actions={
          <Link
            to="/app/dashboard/notifications/history"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal no-underline hover:text-navy"
          >
            History
            <span aria-hidden className="text-base leading-none">
              →
            </span>
          </Link>
        }
      />

      <form onSubmit={(e) => void send(e)} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <section className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ChannelSwitch value={channel} onChange={chooseChannel} />
            {channel === 'PUSH' ? (
              <p className="m-0 text-[11px] text-muted sm:max-w-[16rem] sm:text-right">
                Push only to app users: parents, explorers, teachers.
              </p>
            ) : (
              <p className="m-0 text-[11px] text-muted sm:max-w-[16rem] sm:text-right">
                Email can include pastors and other ministry roles.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Field label="To" hint={audience ? audienceHint : toHint}>
              <div className="flex flex-col gap-2">
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as Audience)}
                  className={inputClass}
                  aria-label="Recipient group"
                >
                  {audienceOptions.map((a) => (
                    <option key={a.id || 'one'} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {!audience ? (
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    required
                    placeholder={toPlaceholder}
                    className={inputClass}
                  />
                ) : (
                  <p className="m-0 rounded-xl border border-teal/25 bg-teal-tint/60 px-3.5 py-2.5 text-xs text-navy">
                    Sends to every <strong>{audienceLabel(audience)}</strong> account that has a{' '}
                    {channel === 'PUSH' ? 'device' : 'email'} on file.
                  </p>
                )}
              </div>
            </Field>
            <Field label="Subject" hint={subject.length > subjectMax * 0.8 ? `${subject.trim().length}/${subjectMax}` : undefined}>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={subjectMax}
                placeholder={channel === 'PUSH' ? 'Title on the device' : 'Subject line'}
                className={inputClass}
              />
            </Field>
            <Field label="Message" hint={body.length > bodyMax * 0.8 ? `${body.trim().length}/${bodyMax}` : undefined}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={bodyMax}
                rows={5}
                placeholder="What should they read?"
                className={`${inputClass} min-h-[120px] resize-y`}
              />
            </Field>
          </div>

          {channel === 'PUSH' ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-muted">Optional extras</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Image URL" hint="Public https image">
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    type="url"
                    placeholder="https://…/banner.png"
                    className={inputClass}
                  />
                </Field>
                <Field label="Action label" hint="In-app banner button while the app is open">
                  <input
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    maxLength={40}
                    placeholder="Open lesson"
                    className={inputClass}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Action URL" hint="Opened when they tap the notification or the banner button">
                    <input
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      type="url"
                      placeholder="https://…"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ) : null}

          {sendError ? <Alert kind="error">{sendError}</Alert> : null}
          {sendNote ? <Alert kind="ok">{sendNote}</Alert> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="m-0 text-[11px] text-muted">
              {channel === 'PUSH'
                ? 'Sends now to every signed-in device; anything undelivered retries for 24 hours.'
                : 'Sends now; large groups finish in the background over the next scheduled runs.'}
            </p>
            <Button size="lg" className="disabled:opacity-45" type="submit"
              disabled={!canSend}>
              {sending ? 'Sending…' : channel === 'PUSH' ? 'Send push' : 'Queue send'}
            </Button>
          </div>
        </section>

        <aside className="xl:sticky xl:top-20">
          <div className="overflow-hidden rounded-card border border-navy/20 bg-gradient-to-b from-navy via-navy-deep to-navy text-cream shadow-md">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div>
                <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-teal">Live preview</p>
                <p className="m-0 mt-0.5 text-xs text-cream/70">
                  {channel === 'PUSH' ? 'How it looks on device' : channel === 'EMAIL' ? 'Inbox sketch' : 'Text bubble'}
                </p>
              </div>
            </div>
            <div className="px-4 py-5">
              {audience ? (
                <p className="m-0 mb-3 text-center text-[11px] font-semibold text-cream/60">
                  Audience · {audienceLabel(audience)}
                </p>
              ) : null}
              {channel === 'PUSH' ? (
                <PushNotificationPreview
                  subject={subject}
                  body={body}
                  imageUrl={imageUrl}
                  actionLabel={actionLabel}
                />
              ) : (
                <div className="flex min-h-[280px] items-center justify-center">
                  <MessagePreview channel={channel} to={previewTo} subject={subject} body={body} />
                </div>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

export function NotificationHistoryPage() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setRows(await api<Notice[]>('/api/admin/notifications'));
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

  const visible = rows.filter((n) => filter === 'ALL' || n.channel === filter || n.status === filter);

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        kicker="Operations"
        title="Notification history"
        subtitle="Queued by the app and the send form. Retries run when Resend or FCM keys are set."
        actions={
          <Link
            to="/app/dashboard/notifications"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal no-underline hover:text-navy"
          >
            ← Compose
          </Link>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-border bg-cream p-1"
            role="tablist"
            aria-label="Outbox filters"
          >
            {FILTERS.map((key) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-navy text-white shadow-xs' : 'text-muted hover:bg-surface hover:text-navy'
                  }`}
                  onClick={() => setFilter(key)}
                >
                  {key}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream"
          >
            Refresh
          </button>
        </div>

        {error ? <Alert kind="error">{error}</Alert> : null}

        {loading ? (
          <Spinner label="Loading notifications…" />
        ) : visible.length === 0 && !error ? (
          <Empty
            title="No notifications queued"
            body="System emails and device pushes appear here."
          />
        ) : visible.length === 0 ? null : (
          <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
            <DataTableShell>
              <thead>
                <tr>
                  <th className={thClass}>Channel</th>
                  <th className={thClass}>To</th>
                  <th className={thClass}>Subject</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((n) => (
                  <tr key={n.id} className={rowClass}>
                    <td className={`${tdClass} font-semibold`}>{n.channel}</td>
                    <td className={`${tdClass} max-w-[16rem] truncate text-muted`}>{n.to}</td>
                    <td className={`${tdClass} max-w-[22rem] truncate text-muted`}>{n.subject}</td>
                    <td className={tdClass}>
                      <Badge kind={statusKind[n.status] ?? 'info'}>{n.status}</Badge>
                    </td>
                    <td className={`${tdClass} max-w-[18rem] truncate text-muted`} title={n.error ?? ''}>
                      {n.error || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTableShell>
          </div>
        )}
      </div>
    </div>
  );
}
