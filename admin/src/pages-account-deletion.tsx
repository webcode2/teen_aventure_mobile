import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { API_BASE, clearPastorSession, setApplicantToken } from './api';
import { StandalonePageLayout } from './public-shell';
import { PasswordInput, Alert, Button } from './ui';

type DeletionStatus = { stage: string | null; recoverableUntil?: string; purgeAfter?: string; accounts?: number; groups?: number };
/** The person types this to confirm; matched without regard to capital letters. */
export const DELETION_PHRASE = 'Delete my Account';
const phraseMatches = (value: string) => value.trim().toLowerCase() === DELETION_PHRASE.toLowerCase();
export function AccountDeletionPage() {
  const [params] = useSearchParams();
  const churchId = params.get('churchId');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState(''); const [busy, setBusy] = useState(false);
  const confirmed = phraseMatches(phrase);
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  async function perform(action: 'request-deletion' | 'deletion-status' | 'restore-deletion') {
    if (busy || !email.trim() || !password || (action === 'request-deletion' && !confirmed)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/accounts/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(action === 'request-deletion' ? { confirmation: DELETION_PHRASE, ...(churchId ? { churchId } : {}) } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to process this request.');
      if (action === 'restore-deletion') { setStatus(null); setMessage('Your account and linked resources have been restored. You can sign in again.'); }
      else { setStatus(result); if (!result.stage) setMessage('There is no pending deletion request for this account.'); }
      if (action === 'request-deletion') { clearPastorSession(); setApplicantToken(null); setPhrase(''); }
      setPassword('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to connect. Try again.'); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void perform('request-deletion'); }
  return <StandalonePageLayout><section className="mx-auto max-w-xl px-5 py-8">
    <h1 className="text-3xl font-bold text-navy">{churchId ? 'Account and ministry deletion' : 'Account deletion & recovery'}</h1>
    <p className="mt-4 text-muted">Request deletion of your Teen Bible Adventures account. Main-account requests include owned families, subaccounts and their progress.</p>
    <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm"><li>Type <strong>{DELETION_PHRASE}</strong> and confirm your password.</li><li>Your account is marked <strong>pending deletion</strong>. You can still sign in, but you will only see the deletion notice, not the app or dashboard. You can restore it here during this time.</li><li><strong>After 30 days</strong> the account is permanently deleted, unless safeguarding or legal retention applies.</li></ol>
    {churchId && <p className="mt-4 text-sm text-muted">The ministry and all its groups and teacher assignments follow the same lifecycle. Exclusive ministry staff accounts are included. Teachers with independent families or other ministry roles keep their accounts.</p>}
    <p className="mt-3 text-sm text-muted">An authorized administrator may approve earlier permanent deletion after password confirmation; recovery then ends immediately. Under-15 profiles must be managed by their parent/main account. Verify your password before requesting deletion or recovery. Existing safety investigation records may require retention. Private document cleanup is retried after purge.</p>
    {status?.stage && <div role="status" className="mt-5 rounded-xl border border-border p-4"><strong>Stage: {status.stage.replaceAll('_', ' ')}</strong><p className="mt-2 text-sm">Permanently deleted on: {status.purgeAfter ? new Date(status.purgeAfter).toLocaleString() : '—'}</p></div>}
    {message && <p role="status" className="mt-4 text-sm text-teal">{message}</p>}
    <form onSubmit={submit} className="mt-6 space-y-5">
      {error && <Alert kind="error">{error}</Alert>}
      <label className="block text-sm font-semibold">Account email<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => { setEmail(e.target.value); setStatus(null); }} className="mt-2 w-full rounded-xl border border-border px-3 py-3" /></label>
      <label className="block text-sm font-semibold">Confirm your password<PasswordInput autoComplete="current-password" required maxLength={1024} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-border px-3 py-3" /></label>
      <label className="block text-sm font-semibold">Type <span className="font-mono">{DELETION_PHRASE}</span> to confirm<input type="text" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={64} value={phrase} onChange={e => setPhrase(e.target.value)} placeholder={DELETION_PHRASE} aria-describedby="deletion-phrase-help" className="mt-2 w-full rounded-xl border border-border px-3 py-3" /><span id="deletion-phrase-help" className="mt-1 block text-xs font-normal text-muted">Your account and subaccounts{churchId ? ', ministry and groups' : ''} will be pending deletion for 30 days, then permanently deleted.</span></label>
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!confirmed || busy || !password}>{busy ? 'Processing…' : 'Verify password & request deletion'}</Button><Button type="button" variant="secondary" disabled={busy || !password} onClick={() => void perform('deletion-status')}>Check deletion status</Button></div>
      {status?.stage === 'recoverable' && <Button type="button" variant="secondary" disabled={busy || !password} onClick={() => void perform('restore-deletion')}>Verify password & restore account</Button>}
    </form>
  </section></StandalonePageLayout>;
}
