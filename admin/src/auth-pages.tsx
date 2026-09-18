import { useState } from 'react';
import { forgotPassword, login, resetPassword } from './api';
import { navigate } from './route';
import { Alert, APP_NAME, Brand, DASHBOARD_TITLE, Field } from './ui';

function AuthPanel() {
  return (
    <aside className="auth-panel">
      <div>
        <p className="eyebrow">{APP_NAME} · Admin</p>
        <h1>Steward the content families actually open.</h1>
        <p>Publish Teen Quest weeks, quizzes, and safeguarding workflows from one desk — the same system the Flutter app reads live.</p>
      </div>
      <div className="auth-marks">
        <span>Token sign-in</span>
        <span>Reset by email</span>
        <span>Dashboard roles</span>
      </div>
    </aside>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate({ kind: 'app', tab: 'dashboard' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthPanel />
      <div className="auth-form-wrap">
        <form className="auth-card" onSubmit={submit}>
          <Brand size="lg" />
          <h2>Sign in</h2>
          <p className="visually-hidden">{DASHBOARD_TITLE}</p>
          <p className="lede">Use your dashboard email. Sessions last 7 days.</p>
          <Field label="Email">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </Field>
          <Field label="Password">
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </Field>
          {error ? <Alert kind="error">{error}</Alert> : null}
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="auth-links">
            <button type="button" onClick={() => navigate({ kind: 'auth', view: 'forgot' })}>Forgot password</button>
            <span className="muted">Editor, Super Editor, or Super Admin</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ForgotPage() {
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
    <div className="auth-shell">
      <AuthPanel />
      <div className="auth-form-wrap">
        <form className="auth-card" onSubmit={submit}>
          <Brand size="lg" />
          <h2>Reset password</h2>
          <p className="lede">We’ll email a one-hour token link if this address is an App Manager.</p>
          <Field label="Email">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {message ? <Alert kind="ok">{message}</Alert> : null}
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <div className="auth-links">
            <button type="button" onClick={() => navigate({ kind: 'auth', view: 'login' })}>Back to sign in</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ResetPage({ token }: { token: string }) {
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
      setTimeout(() => navigate({ kind: 'auth', view: 'login' }), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthPanel />
      <div className="auth-form-wrap">
        <form className="auth-card" onSubmit={submit}>
          <Brand size="lg" />
          <h2>Choose a new password</h2>
          <p className="lede">This token can be used once and expires in one hour.</p>
          {!token ? <Alert kind="error">Missing reset token. Open the link from your email.</Alert> : null}
          <Field label="New password" hint="At least 8 characters">
            <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </Field>
          <Field label="Confirm password">
            <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
          </Field>
          {error ? <Alert kind="error">{error}</Alert> : null}
          {message ? <Alert kind="ok">{message}</Alert> : null}
          <button className="btn" style={{ width: '100%' }} disabled={busy || !token}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
          <div className="auth-links">
            <button type="button" onClick={() => navigate({ kind: 'auth', view: 'login' })}>Back to sign in</button>
          </div>
        </form>
      </div>
    </div>
  );
}
