import { useEffect, useState } from 'react';
import { api } from './api';
import { Alert, Badge, Empty, Field, PageHeader } from './ui';

type Notice = {
  id: string;
  channel: string;
  to: string;
  subject: string;
  body?: string;
  status: string;
  error?: string | null;
  createdAt?: string;
};

type Pack = {
  id: string;
  jurisdiction: string;
  title: string;
  body: string;
  minAge: number;
};

const statusKind: Record<string, 'ok' | 'warn' | 'bad' | 'info'> = {
  SENT: 'ok', PENDING: 'warn', FAILED: 'bad',
};

export function NotificationsPage() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');

  async function load() {
    try { setRows(await api<Notice[]>('/api/admin/notifications')); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
  }
  useEffect(() => { load(); }, []);

  const visible = rows.filter((n) => filter === 'ALL' || n.channel === filter || n.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Reach"
        title="Notifications"
        subtitle="System outbox only (teen login, deletion, password reset). There is no compose box and no custom message to children."
      />
      <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-navy">System outbox</h3>
          <p className="text-xs text-muted mt-0.5">Queued by the app. Delivery runs when Resend, Twilio, or FCM keys are set. Managers cannot write a custom message here.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-cream border border-border/80 w-fit">
          {['ALL', 'EMAIL', 'SMS', 'PUSH', 'PENDING', 'SENT', 'FAILED'].map((key) => (
            <button
              key={key}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === key
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-muted hover:text-navy hover:bg-surface-2/60'
              }`}
              onClick={() => setFilter(key)}
            >
              {key}
            </button>
          ))}
        </div>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {visible.length === 0 ? <Empty title="No notifications queued" body="System emails from the app (teen login, deletion) appear here." /> : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Channel</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">To</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Subject</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((n) => (
                  <tr key={n.id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-navy">{n.channel}</td>
                    <td className="py-3 px-3 text-navy font-mono text-[11px]">{n.to}</td>
                    <td className="py-3 px-3 text-muted">{n.subject}</td>
                    <td className="py-3 px-3"><Badge kind={statusKind[n.status] ?? 'info'}>{n.status}</Badge></td>
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

export function ConsentPage() {
  const [form, setForm] = useState({ jurisdiction: 'US', title: '', body: '', minAge: 13 });
  const [rows, setRows] = useState<Pack[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    api<Pack[]>('/api/admin/consent-packs').then(setRows).catch((e: Error) => setError(e.message));
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api('/api/admin/consent-packs', {
        method: 'POST',
        body: JSON.stringify({ ...form, minAge: Number(form.minAge), requiresParentalConsent: true }),
      });
      setMessage(`Consent pack saved for ${form.jurisdiction}`);
      setForm({ ...form, title: '', body: '' });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Legal"
        title="Consent"
        subtitle="Jurisdiction packs shown during onboarding. Saving the same title updates the live pack."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <form className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4" onSubmit={submit}>
          <h3 className="text-base font-bold text-navy">Jurisdiction consent pack</h3>
          <Field label="Jurisdiction">
            <input
              value={form.jurisdiction}
              onChange={(e) => setForm({ ...form, jurisdiction: e.target.value.toUpperCase() })}
              placeholder="US / GB / NG"
              required
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy uppercase focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </Field>
          <Field label="Title">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
              required
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </Field>
          <Field label="Legal pack body">
            <textarea
              rows={6}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Legal pack body"
              required
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal font-sans leading-relaxed"
            />
          </Field>
          <Field label="Minimum age">
            <input
              type="number"
              min={0}
              value={form.minAge}
              onChange={(e) => setForm({ ...form, minAge: Number(e.target.value) })}
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </Field>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {message ? <Alert kind="ok">{message}</Alert> : null}
          <button className="w-full rounded-xl bg-navy hover:bg-teal text-white py-2.5 px-4 font-semibold text-xs shadow-xs hover:shadow transition-all cursor-pointer">
            Save consent pack
          </button>
        </form>
        <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
          <h3 className="text-base font-bold text-navy">Published packs</h3>
          {rows.length === 0 ? <Empty title="No packs yet" body="Save a pack to show it in the app." /> : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Where</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Title</th>
                    <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Min age</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-navy">{p.jurisdiction}</td>
                      <td className="py-3 px-3 font-medium text-navy">{p.title}</td>
                      <td className="py-3 px-3 text-muted">{p.minAge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
