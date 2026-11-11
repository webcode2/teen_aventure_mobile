import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { forgotPassword, login, resetPassword } from './api';
import { safeStaffNext } from './path-helpers';
import { PasswordInput, Alert, APP_NAME, Brand, Button, DASHBOARD_TITLE, Field } from './ui';

const DEMO_PASSWORD = 'password123';
const DEMO_ADMINS = [
  { label: 'App Manager', email: 'manager@askhub.local' },
  { label: 'Super Admin', email: 'superadmin@askhub.local' },
  { label: 'Super Editor', email: 'supereditor@askhub.local' },
  { label: 'Editor', email: 'editor@askhub.local' },
] as const;

function AuthPanel() {
  return (
    <aside className="bg-navy text-cream p-8 md:p-12 flex flex-col justify-between min-h-[260px] lg:min-h-screen relative overflow-hidden">
      <div className="flex flex-col gap-6 max-w-md relative z-10">
        <a href="#/" className="inline-block focus:outline-none focus:ring-2 focus:ring-gold/50 rounded-lg w-fit" aria-label={APP_NAME}>
          <Brand size="lg" />
        </a>
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold tracking-widest uppercase text-gold">{APP_NAME} &bull; Admin</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-cream leading-tight">
            Steward the content families actually open.
          </h1>
          <p className="text-xs sm:text-sm text-cream/75 leading-relaxed max-w-sm mt-1">
            Publish Teen Quest weeks, quizzes, and safeguarding workflows from one desk — the same system the Flutter app reads live.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-cream/60 mt-8 pt-6 border-t border-white/10 relative z-10">
        <span>Token sign-in</span>
        <span className="text-cream/30">&bull;</span>
        <span>Reset by email</span>
        <span className="text-cream/30">&bull;</span>
        <span>Dashboard roles</span>
      </div>
    </aside>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string>(import.meta.env.DEV ? DEMO_ADMINS[0].email : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? DEMO_PASSWORD : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(safeStaffNext(searchParams.get('next')));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[minmax(300px,38%)_1fr] bg-cream">
      <AuthPanel />
      <div className="grid place-items-center p-6 md:p-12 bg-cream">
        <form className="w-full max-w-[420px] bg-surface border border-border rounded-card p-7 sm:p-8 shadow-card flex flex-col gap-4" onSubmit={submit}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-navy">Sign in</h2>
            <p className="sr-only">{DASHBOARD_TITLE}</p>
            <p className="text-xs text-muted mt-1">Use your dashboard email. Sessions last 7 days.</p>
          </div>
          <Field label="Email">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-sm text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
            />
          </Field>
          <Field label="Password">
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-sm text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
            />
          </Field>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {import.meta.env.DEV ? <div className="flex flex-wrap gap-1.5">
            {DEMO_ADMINS.map((admin) => (
              <button
                key={admin.email}
                type="button"
                onClick={() => {
                  setEmail(admin.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="px-2 py-1 rounded-md text-[10px] bg-cream hover:bg-teal-tint hover:text-teal font-semibold text-navy border border-border transition-colors cursor-pointer"
              >
                {admin.label}
              </button>
            ))}
          </div> : null}
          <Button type="submit" size="lg" className="w-full mt-1" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <div className="flex items-center justify-between gap-4 mt-2 text-xs">
            <button
              type="button"
              className="text-muted hover:text-navy font-semibold transition-colors cursor-pointer bg-transparent border-none p-0"
              onClick={() => navigate('/app/forgot')}
            >
              Forgot password
            </button>
            <span className="text-muted/80 text-[11px]">Editor, Super Editor, or Super Admin</span>
          </div>
          <div className="pt-3 mt-1 border-t border-border/60 flex flex-col gap-2 text-center text-xs">
            <Button type="button" variant="soft" className="w-full" onClick={() => navigate('/ministry')}>
              Study Circle Leader Portal →
            </Button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-muted hover:text-navy font-medium transition-colors cursor-pointer text-[11px]"
            >
              ← View Public Discipleship Landing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ForgotPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send reset');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[minmax(300px,38%)_1fr] bg-cream">
      <AuthPanel />
      <div className="grid place-items-center p-6 md:p-12 bg-cream">
        <form className="w-full max-w-[420px] bg-surface border border-border rounded-card p-7 sm:p-8 shadow-card flex flex-col gap-4" onSubmit={submit}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-navy">Reset password</h2>
            <p className="text-xs text-muted mt-1">We’ll email a one-hour token link if this address is an App Manager.</p>
          </div>
          <Field label="Email">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-sm text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
            />
          </Field>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {message ? <Alert kind="ok">{message}</Alert> : null}
          <Button type="submit" size="lg" className="w-full mt-1" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
          <div className="flex items-center justify-between gap-4 mt-2 text-xs">
            <button
              type="button"
              className="text-muted hover:text-navy font-semibold transition-colors cursor-pointer bg-transparent border-none p-0"
              onClick={() => navigate('/app/login')}
            >
              Back to sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ResetPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await resetPassword(token, password);
      setMessage(res.message);
      setTimeout(() => navigate('/app/login'), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[minmax(300px,38%)_1fr] bg-cream">
      <AuthPanel />
      <div className="grid place-items-center p-6 md:p-12 bg-cream">
        <form className="w-full max-w-[420px] bg-surface border border-border rounded-card p-7 sm:p-8 shadow-card flex flex-col gap-4" onSubmit={submit}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-navy">Choose a new password</h2>
            <p className="text-xs text-muted mt-1">This token can be used once and expires in one hour.</p>
          </div>
          {!token ? <Alert kind="error">Missing reset token. Open the link from your email.</Alert> : null}
          <Field label="New password" hint="At least 8 characters">
            <PasswordInput
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-sm text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
            />
          </Field>
          <Field label="Confirm password">
            <PasswordInput
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-sm text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
            />
          </Field>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {message ? <Alert kind="ok">{message}</Alert> : null}
          <Button type="submit" size="lg" className="w-full mt-1" disabled={busy || !token}>
            {busy ? 'Updating…' : 'Update password'}
          </Button>
          <div className="flex items-center justify-between gap-4 mt-2 text-xs">
            <button
              type="button"
              className="text-muted hover:text-navy font-semibold transition-colors cursor-pointer bg-transparent border-none p-0"
              onClick={() => navigate('/app/login')}
            >
              Back to sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
