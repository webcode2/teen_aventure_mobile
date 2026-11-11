import { useEffect, useState } from 'react';
import { api } from './api';
import { askConfirm, askPrompt } from './prompt-dialog';
import { Alert, Button } from './ui';

type Row = { id: string; label: string; stage: string; requestedAt: string; recoverableUntil: string; purgeAfter: string; accounts: number; profiles?: number; families: number; groups: number; ministry: boolean; archivedAt?: string | null; archivedEmails?: string[]; error?: string | null };
export function AccountDeletionQueue({ archiveScope }: { archiveScope?: 'ACCOUNT' | 'MINISTRY' }) {
  const [rows, setRows] = useState<Row[]>([]); const [error, setError] = useState(''); const [feedback, setFeedback] = useState(''); const [busy, setBusy] = useState(false);
  async function load() {
    try { setRows(await api<Row[]>(archiveScope ? `/api/admin/account-deletions/archive?scope=${archiveScope}` : '/api/admin/account-deletions')); }
    catch { setError('Could not load account and ministry deletion requests.'); }
  }
  useEffect(() => { void load(); }, [archiveScope]);
  async function action(row: Row, kind: 'restore' | 'archive' | 'purge') {
    if (kind === 'purge' && !await askConfirm(`Permanently delete ${row.label} and its ${row.accounts} accounts, ${row.profiles ?? 0} explorer profiles, ${row.families} families and ${row.groups} groups now? This bypasses the remaining recovery window and cannot be undone. Safeguarding/legal holds still apply.`, { title: 'Delete completely now', confirmLabel: 'Delete permanently', tone: 'danger' })) return;
    if (kind === 'archive' && !await askConfirm('Archiving ends self-service recovery. An administrator can restore within the original 30-day window if the email has not been reused. The purge date stays the same.', { title: 'Move to archive', confirmLabel: 'Archive' })) return;
    const password = await askPrompt('Confirm your password', { inputType: 'password', title: kind === 'purge' ? 'Verify permanent deletion' : kind === 'archive' ? 'Archive entry; personal data still purges after 90 days' : 'Restore linked resources' });
    if (!password) return;
    setBusy(true); setError(''); setFeedback('');
    try {
      const result = await api<{ pending?: boolean }>(`/api/admin/account-deletions/${row.id}/${kind}`, { method: 'POST', body: JSON.stringify({ password, ...(kind === 'purge' ? { confirmation: 'PURGE PERMANENTLY' } : {}) }) });
      setFeedback(kind === 'archive' ? 'Moved to archive. The 90-day personal-data purge deadline is unchanged.' : kind === 'restore' ? 'Account and linked resources restored.' : result?.pending ? 'Permanent deletion has started. The worker will finish the remaining records and private files; restoration is no longer available.' : 'Personal account data permanently deleted.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-border bg-surface p-5">
    <h2 className="font-bold text-navy">{archiveScope === 'ACCOUNT' ? 'Users archive' : archiveScope === 'MINISTRY' ? 'Ministry archive audit entries' : 'Account & ministry deletion requests'}</h2>
    <p className="mt-1 text-xs text-muted">Scheduled deletion: 0–30 days recoverable · 30–90 days backend-only · purge after 90 days. Use Delete completely now for an immediate permanent purge. Archive retains an audit entry, not personal data indefinitely. Admins can verify their password to purge earlier.</p>
    {error && <Alert kind="error">{error}</Alert>}{feedback && <Alert kind="ok">{feedback}</Alert>}
    <div className="mt-4 space-y-3">{rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
      <div><strong className="text-sm">{row.label} · {row.stage.replaceAll('_', ' ')}</strong>{!!row.archivedEmails?.length && <p className="mt-1 text-xs text-muted">Archived emails: {row.archivedEmails.join(', ')}</p>}<p className="mt-1 text-xs text-muted">{row.accounts} accounts · {row.profiles ?? 0} explorer profiles · {row.families} families · {row.groups} groups</p><p className="text-xs text-muted">Requested {new Date(row.requestedAt).toLocaleDateString()} · Recovery closes {new Date(row.recoverableUntil).toLocaleString()} · Purge eligible {new Date(row.purgeAfter).toLocaleDateString()}</p>{row.stage === 'purged' && <p className="text-xs text-muted">Personal data purged; anonymized audit entry retained.</p>}{row.error && <p className="text-xs text-error">{row.error}</p>}</div>
      <div className="flex flex-wrap gap-2">
        {row.stage === 'recoverable' && <Button variant="secondary" disabled={busy} onClick={() => void action(row, 'restore')}>Restore linked resources</Button>}
        {!row.archivedAt && <Button variant="secondary" disabled={busy} onClick={() => void action(row, 'archive')}>Move to archive</Button>}
        {row.stage !== 'purged' && <Button variant="secondary" disabled={busy} onClick={() => void action(row, 'purge')}>Delete completely now</Button>}
      </div>
    </div>)}</div>
    {!rows.length && !error && <p className="mt-3 text-sm text-muted">{archiveScope ? 'No archived entries.' : 'No pending account or ministry deletion requests.'}</p>}
  </section>;
}
