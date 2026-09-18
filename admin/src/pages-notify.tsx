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
    <>
      <PageHeader
        kicker="Reach"
        title="Notifications"
        subtitle="System outbox only (teen login, deletion, password reset). There is no compose box and no custom message to children."
      />
      <div className="card">
        <h3>System outbox</h3>
        <p className="muted">Queued by the app. Delivery runs when Resend, Twilio, or FCM keys are set. Managers cannot write a custom message here.</p>
        <div className="tabs-inline">
          {['ALL', 'EMAIL', 'SMS', 'PUSH', 'PENDING', 'SENT', 'FAILED'].map((key) => (
            <button key={key} type="button" className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{key}</button>
          ))}
        </div>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {visible.length === 0 ? <Empty title="No notifications queued" body="System emails from the app (teen login, deletion) appear here." /> : (
          <table>
            <thead><tr><th>Channel</th><th>To</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              {visible.map((n) => (
                <tr key={n.id}>
                  <td>{n.channel}</td>
                  <td>{n.to}</td>
                  <td>{n.subject}</td>
                  <td><Badge kind={statusKind[n.status] ?? 'info'}>{n.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
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
    <>
      <PageHeader
        kicker="Legal"
        title="Consent"
        subtitle="Jurisdiction packs shown during onboarding. Saving the same title updates the live pack."
      />
      <div className="two-col">
        <form className="card" onSubmit={submit}>
          <h3>Jurisdiction consent pack</h3>
          <Field label="Jurisdiction">
            <input value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value.toUpperCase() })} placeholder="US / GB / NG" required />
          </Field>
          <Field label="Title">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" required />
          </Field>
          <Field label="Legal pack body">
            <textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Legal pack body" required />
          </Field>
          <Field label="Minimum age">
            <input type="number" min={0} value={form.minAge} onChange={(e) => setForm({ ...form, minAge: Number(e.target.value) })} />
          </Field>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {message ? <Alert kind="ok">{message}</Alert> : null}
          <button className="btn">Save consent pack</button>
        </form>
        <div className="card">
          <h3>Published packs</h3>
          {rows.length === 0 ? <Empty title="No packs yet" body="Save a pack to show it in the app." /> : (
            <table>
              <thead><tr><th>Where</th><th>Title</th><th>Min age</th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.jurisdiction}</td>
                    <td>{p.title}</td>
                    <td>{p.minAge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
