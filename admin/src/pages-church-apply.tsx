import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  applicantApi,
  api,
  pastorLogin,
  publicWrite,
  setApplicantToken,
  getApplicantToken,
  setPastorSession,
  type PastorUser,
} from './api';
import { PastorPortalPage } from './pages-pastor';
import { PublicLayout } from './public-shell';
import { Alert, Brand, Field, Button } from './ui';

const fieldClass =
  'rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/20';

const IDENTITY = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'DRIVERS_LICENSE', label: "Driver's license" },
] as const;

const MINISTRY_TITLES = [
  { value: 'PASTOR', label: 'Pastor' },
  { value: 'MINISTRY_LEADER', label: 'Ministry leader' },
  { value: 'YOUTH_WORKER', label: 'Youth worker' },
  { value: 'CHILDRENS_MINISTRY_LEAD', label: "Children's ministry lead" },
  { value: 'TEACHER', label: 'Teacher' },
] as const;

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'UG', label: 'Uganda' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'JM', label: 'Jamaica' },
  { value: 'TT', label: 'Trinidad and Tobago' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'IN', label: 'India' },
  { value: 'PH', label: 'Philippines' },
  { value: 'SG', label: 'Singapore' },
  { value: 'OTHER', label: 'Other / not listed' },
] as const;

function ministryTitleLabel(value: string) {
  return MINISTRY_TITLES.find((item) => item.value === value)?.label ?? 'Pastor';
}

type Mine = {
  name: string;
  email: string;
  title: string;
  phone: string;
  createdAt?: string;
  application: {
    id: string;
    churchName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    decisionReason: string | null;
    churchId?: string | null;
  } | null;
};

function ApplySection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border/80 py-6 first:border-t-0 first:pt-1">
      <div>
        <h2 className="text-sm font-bold text-navy">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-pretty text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function ChurchApplyPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signup' | 'signin' | 'check-email' | 'home' | 'apply'>('signin');
  const [name, setName] = useState('');
  const [title, setTitle] = useState<(typeof MINISTRY_TITLES)[number]['value']>('PASTOR');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [mine, setMine] = useState<Mine | null>(null);
  const [churchName, setChurchName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]['value']>('US');
  const [purpose, setPurpose] = useState('');
  const [identityKind, setIdentityKind] = useState<(typeof IDENTITY)[number]['value']>('PASSPORT');
  const [identityReference, setIdentityReference] = useState('');
  const [identityDocKey, setIdentityDocKey] = useState('');
  const [identityDocName, setIdentityDocName] = useState('');
  const [identityPreviewUrl, setIdentityPreviewUrl] = useState('');
  const [identityPreviewKind, setIdentityPreviewKind] = useState<'image' | 'pdf' | ''>('');
  const identityPreviewRef = useRef('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmedTruthful, setConfirmedTruthful] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function loadMine() {
    if (!getApplicantToken()) {
      setReady(true);
      return;
    }
    try {
      const status = await applicantApi<Mine>('/api/church-applications/mine');
      setMine(status);
      setName(status.name);
      setEmail(status.email);
      setMode('home');
    } catch {
      setApplicantToken(null);
      setMode('signin');
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    loadMine();
  }, []);

  useEffect(() => () => {
    if (identityPreviewRef.current) URL.revokeObjectURL(identityPreviewRef.current);
  }, []);

  function showIdentityPreview(file: File) {
    if (identityPreviewRef.current) URL.revokeObjectURL(identityPreviewRef.current);
    const url = URL.createObjectURL(file);
    identityPreviewRef.current = url;
    setIdentityPreviewUrl(url);
    setIdentityPreviewKind(file.type === 'application/pdf' ? 'pdf' : 'image');
  }

  function clearIdentityPreview() {
    if (identityPreviewRef.current) URL.revokeObjectURL(identityPreviewRef.current);
    identityPreviewRef.current = '';
    setIdentityPreviewUrl('');
    setIdentityPreviewKind('');
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await publicWrite('/api/church-applications/account', { name, email, password, title });
      setMode('check-email');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create the account');
    } finally {
      setBusy(false);
    }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await publicWrite<{ token: string }>('/api/church-applications/session', { email, password });
      setApplicantToken(res.token);
      await loadMine();
    } catch {
      // Approved leaders use the same /ministry sign-in; fall through to portal auth.
      try {
        const res = await pastorLogin(email, password);
        const me = await api<{ churchId?: string }>('/api/auth/me');
        const churchId = me.churchId || res.user.churchId;
        navigate(churchId ? `/ministry/${churchId}/families` : '/ministry', { replace: true });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not sign in');
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await publicWrite<{ token: string }>('/api/church-applications/verify-email', {
        email,
        token: code,
      });
      setApplicantToken(res.token);
      await loadMine();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not verify this code');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError('');
    try {
      await publicWrite('/api/church-applications/resend-verification', { email });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not resend the email');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setApplicantToken(null);
    setMine(null);
    setMode('signin');
    setPassword('');
    setError('');
  }

  async function uploadIdentityDoc(file: File | null) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Identity documents must be 10 MB or smaller.');
      return;
    }
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    if (!allowed.has(file.type)) {
      setError('Upload a JPEG, PNG, WebP, or PDF of the document.');
      return;
    }
    setUploadingDoc(true);
    setError('');
    showIdentityPreview(file);
    try {
      const storage = await applicantApi<{
        storage: 'local' | 'r2' | null;
        directUpload: boolean;
        ready: boolean;
        message?: string;
      }>('/api/church-applications/identity-doc/storage');

      if (!storage.ready) {
        throw new Error(storage.message || 'Identity document storage is not ready.');
      }

      // R2: our server signs the PUT, the browser uploads to R2, then we send the public URL back.
      if (storage.directUpload) {
        const signed = await applicantApi<{
          key: string;
          uploadUrl: string;
          publicUrl: string;
          headers: Record<string, string>;
        }>('/api/church-applications/identity-doc/presign', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name || 'identity.bin', contentType: file.type }),
        });
        const put = await fetch(signed.uploadUrl, {
          method: 'PUT',
          headers: signed.headers,
          body: file,
        });
        if (!put.ok) {
          throw new Error('Could not upload the document to private storage.');
        }
        const registered = await applicantApi<{ key: string; url: string }>(
          '/api/church-applications/identity-doc/complete',
          { method: 'POST', body: JSON.stringify({ url: signed.publicUrl }) },
        );
        setIdentityDocKey(registered.key);
        setIdentityDocName(file.name);
        return;
      }

      const body = new FormData();
      body.append('file', file);
      const res = await applicantApi<{ key: string; storage: string }>('/api/church-applications/identity-doc', {
        method: 'POST',
        body,
      });
      setIdentityDocKey(res.key);
      setIdentityDocName(file.name);
    } catch (e: unknown) {
      setIdentityDocKey('');
      setIdentityDocName('');
      clearIdentityPreview();
      setError(e instanceof Error ? e.message : 'Could not upload the document');
    } finally {
      setUploadingDoc(false);
    }
  }

  async function apply(event: FormEvent) {
    event.preventDefault();
    if (churchName.trim().length < 2 || phone.trim().length < 6 || address.trim().length < 8) {
      setError('Add the ministry name, phone, and current address.');
      return;
    }
    if (purpose.trim().length < 10) {
      setError('Describe who will use Teen Bible Adventures and about how many families.');
      return;
    }
    if (identityReference.trim().length < 4) {
      setError('Add the document number.');
      return;
    }
    if (!identityDocKey) {
      setError('Upload a photo or scan of the selected identity document.');
      return;
    }
    if (!acceptedTerms || !confirmedTruthful) {
      setError('Accept the terms and confirm the information is true before applying.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await applicantApi('/api/church-applications', {
        method: 'POST',
        body: JSON.stringify({
          churchName,
          phone,
          address,
          country,
          purpose: purpose.trim(),
          identityKind,
          identityReference,
          identityDocKey,
          acceptedTerms: true,
          confirmedTruthful: true,
        }),
      });
      await loadMine();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send the application');
    } finally {
      setBusy(false);
    }
  }

  if (ready && mine && (mode === 'home' || mode === 'apply')) {
    return (
      <PastorPortalPage
        applicantHome={{
          name: mine.name,
          email: mine.email,
          title: ministryTitleLabel(mine.title),
          titleValue: MINISTRY_TITLES.some((item) => item.value === mine.title) ? mine.title as (typeof MINISTRY_TITLES)[number]['value'] : 'PASTOR',
          phone: mine.phone ?? '',
          joinedAt: mine.createdAt,
          application: mine.application,
          onProfileSave: async (next) => {
            const updated = await applicantApi<Mine>('/api/church-applications/mine', {
              method: 'PATCH',
              body: JSON.stringify(next),
            });
            setMine(updated);
            setName(updated.name);
          },
          onApply: () => {
            setMode('apply');
            setError('');
            if (!phone.trim() && mine.phone) setPhone(mine.phone);
          },
          onSignOut: signOut,
          onEnterMinistry: async () => {
            const session = await applicantApi<{ token: string; user: PastorUser; churchId: string }>(
              '/api/church-applications/enter',
              { method: 'POST', body: JSON.stringify({}) },
            );
            setPastorSession(session.token, session.user);
            setApplicantToken(null);
            navigate(`/ministry/${session.churchId}/families`, { replace: true });
          },
        }}
        applicantPanel={mode === 'apply' ? (
          <form noValidate onSubmit={apply} className="flex flex-col rounded-card border border-border bg-surface px-5 py-6 shadow-xs sm:px-8 sm:py-8">
            <div className="flex flex-col items-center text-center">
              <Brand size="md" />
              <h1 className="mt-4 text-2xl font-bold text-balance text-navy">Apply for a ministry</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-pretty text-muted">
                Teen Bible Adventures reads this before your ministry can care for families and a team.
              </p>
            </div>
            {error ? <div className="mt-5"><Alert kind="error">{error}</Alert></div> : null}
            <div className="mt-2">
              <ApplySection
                title="Applicant"
                description={`${mine.name} · ${ministryTitleLabel(mine.title)} · ${mine.email}`}
              >
                <p className="text-sm leading-relaxed text-muted">
                  Update your name, title, or phone from the profile menu in the header before you submit if needed.
                </p>
              </ApplySection>
              <ApplySection title="Ministry" description="The name, country, and address families will recognize.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ministry name">
                    <input className={fieldClass} value={churchName} onChange={(e) => setChurchName(e.target.value)} autoComplete="organization" />
                  </Field>
                  <Field label="Phone">
                    <input className={fieldClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+1 555 0100" />
                  </Field>
                  <Field
                    label="Country"
                    hint="Stored on the ministry as its region. Choose Other if your country is not listed."
                  >
                    <select
                      className={fieldClass}
                      value={country}
                      onChange={(e) => setCountry(e.target.value as typeof country)}
                    >
                      {COUNTRIES.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Ministry address">
                  <textarea
                    className={`${fieldClass} min-h-20 resize-y`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                    placeholder="Street, city, and postal code where the ministry meets."
                  />
                </Field>
              </ApplySection>
              <ApplySection
                title="Purpose"
                description="Who will use Teen Bible Adventures, and about how many families."
              >
                <Field label="Who will use it and about how many families">
                  <textarea
                    className={`${fieldClass} min-h-32 resize-y`}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Youth and children’s ministry for about 40 families in our congregation."
                  />
                </Field>
              </ApplySection>
              <ApplySection title="Identity" description="Document number plus a private upload. Only Teen Bible Adventures Care can open the file.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Proof of identity">
                    <select className={fieldClass} value={identityKind} onChange={(e) => setIdentityKind(e.target.value as typeof identityKind)}>
                      {IDENTITY.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Document number">
                    <input className={fieldClass} value={identityReference} onChange={(e) => setIdentityReference(e.target.value)} autoComplete="off" />
                  </Field>
                </div>
                <Field label="Document upload">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className={`${fieldClass} w-full file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
                        disabled={uploadingDoc}
                        onChange={(e) => {
                          const input = e.currentTarget;
                          void uploadIdentityDoc(input.files?.[0] ?? null).finally(() => {
                            input.value = '';
                          });
                        }}
                      />
                      <p className="mt-1.5 text-xs text-muted">
                        {uploadingDoc
                          ? 'Uploading privately…'
                          : identityDocKey
                            ? `Uploaded: ${identityDocName || 'document'}`
                            : 'JPEG, PNG, WebP, or PDF · max 10 MB · stored privately'}
                      </p>
                      {identityDocKey ? (
                        <button
                          type="button"
                          className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
                          onClick={() => {
                            setIdentityDocKey('');
                            setIdentityDocName('');
                            clearIdentityPreview();
                          }}
                        >
                          Remove upload
                        </button>
                      ) : null}
                    </div>
                    {identityPreviewUrl ? (
                      <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-white sm:w-44">
                        {identityPreviewKind === 'pdf' ? (
                          <iframe title="Identity document preview" src={identityPreviewUrl} className="h-full w-full" />
                        ) : (
                          <img src={identityPreviewUrl} alt="Identity document preview" className="h-full w-full object-contain" />
                        )}
                      </div>
                    ) : null}
                  </div>
                </Field>
              </ApplySection>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-cream px-4 py-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-navy">
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-navy" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                <span>
                  I accept the{' '}
                  <a
                    href="#/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    terms and conditions
                  </a>
                  . I understand a ministry account can be disabled or deleted if a violation is found.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-navy">
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-navy" checked={confirmedTruthful} onChange={(e) => setConfirmedTruthful(e.target.checked)} />
                <span>I confirm that all information in this application is true.</span>
              </label>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/80 pt-5">
              <button
                type="button"
                className="cursor-pointer rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-surface-2"
                onClick={() => {
                  setError('');
                  setMode('home');
                }}
              >
                Back
              </button>
              <Button size="lg" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Submit application'}
              </Button>
            </div>
          </form>
        ) : undefined}
      />
    );
  }

  const gateInputClass =
    'w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal';

  return (
    <PublicLayout activeTab="portal">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 p-4 sm:p-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-bold text-navy">
            <span>Shepherd the Flock &bull; 1 Peter 5:2</span>
          </div>

          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-5xl">
            Oversee Your Teenager Discipleship &amp; Ministry Groups.
          </h1>

          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Welcome to the Ministry Portal. Designed for ministry leaders, teenage ministry directors, and mentors to
            manage groups, review student attendance streaks, dispatch announcements, and safeguard teenage disciples.
          </p>

          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-2xs">
              <span className="text-xs font-bold text-teal">🛡️ Safeguarding Console</span>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Confidential reports, safety incident escalation, and care audits.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-2xs">
              <span className="text-xs font-bold text-teal">⛪ Custom Group Hub</span>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Create cell groups, approve student enrollments, and track live activity.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-2xs">
              <span className="text-xs font-bold text-teal">📱 Barcode Onboarding Pass</span>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Each group has its own code. A person joins that group on their own.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-2xs">
              <span className="text-xs font-bold text-teal">📢 Broadcast Announcements</span>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Send announcements directly to group parents, teens, or combined rosters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-navy">
                {mode === 'signup' ? 'Create ministry account' : mode === 'check-email' ? 'Verify email' : 'Ministry Sign In'}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {mode === 'signup'
                  ? 'Register to apply for a ministry. This account is not for the mobile app.'
                  : mode === 'check-email'
                    ? `Enter the 5-letter code sent to ${email || 'your email'}.`
                    : 'Sign in to manage your ministry, or create an account to apply.'}
              </p>
            </div>

            {!ready ? (
              <p className="text-xs text-muted">Loading…</p>
            ) : mode === 'signup' ? (
              <form onSubmit={createAccount} className="flex flex-col gap-3.5">
                {error ? <Alert kind="error">{error}</Alert> : null}
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Your name</span>
                  <input
                    className={gateInputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Your title</span>
                  <select
                    className={gateInputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value as typeof title)}
                    required
                  >
                    {MINISTRY_TITLES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <span className="font-medium text-muted">How your ministry home addresses you.</span>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Ministry email</span>
                  <input
                    type="email"
                    className={gateInputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="leader@ministry.org"
                    autoComplete="email"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Password</span>
                  <input
                    type="password"
                    className={gateInputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <span className="font-medium text-muted">At least 8 characters. Not for the mobile app.</span>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    className={gateInputClass}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </label>
                <Button size="lg" className="mt-1 w-full" type="submit" disabled={busy}>
                  {busy ? 'Creating…' : 'Create account'}
                </Button>
                <button
                  type="button"
                  className="cursor-pointer text-center text-xs font-semibold text-teal"
                  onClick={() => {
                    setMode('signin');
                    setError('');
                  }}
                >
                  Already have an account? Sign in
                </button>
              </form>
            ) : mode === 'check-email' ? (
              <form onSubmit={verifyCode} className="flex flex-col gap-3.5">
                {error ? <Alert kind="error">{error}</Alert> : null}
                <Alert kind="ok">
                  We sent a 5-letter code to {email}. This account cannot sign in to the mobile app.
                </Alert>
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Verification code</span>
                  <input
                    className={`${gateInputClass} max-w-[9rem] text-center text-lg font-bold uppercase tracking-[0.35em]`}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 5))}
                    autoComplete="one-time-code"
                    inputMode="text"
                    maxLength={5}
                    minLength={5}
                    required
                    aria-label="5-letter verification code"
                  />
                </label>
                <Button size="lg" className="w-full" type="submit" disabled={busy || code.length !== 5}>
                  {busy ? 'Checking…' : 'Verify email'}
                </Button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={resend}
                  className="cursor-pointer text-center text-xs font-semibold text-teal disabled:opacity-60"
                >
                  Resend email
                </button>
              </form>
            ) : (
              <form onSubmit={signIn} className="flex flex-col gap-3.5">
                {error ? <Alert kind="error">{error}</Alert> : null}
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Ministry email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="leader@ministry.org"
                    className={gateInputClass}
                    autoComplete="email"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={gateInputClass}
                    autoComplete="current-password"
                  />
                </label>
                <Button size="lg" className="mt-1 w-full" type="submit" disabled={busy}>
                  {busy ? 'Signing in…' : 'Enter ministry'}
                </Button>
                <button
                  type="button"
                  className="cursor-pointer text-center text-xs font-semibold text-teal"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                >
                  New here? Create a ministry account
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-[11px] text-muted">
            Looking for curriculum administration?{' '}
            <button
              type="button"
              onClick={() => navigate('/app/login')}
              className="cursor-pointer font-semibold text-navy underline hover:text-teal"
            >
              App Manager login
            </button>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

export function MinistryGuidePage() {
  const navigate = useNavigate();
  const steps = [
    'Create a ministry account and choose the title people should use for you.',
    'Verify your email with the 5-letter code. This account cannot sign in to the mobile app.',
    'From your ministry home, apply with the ministry name, your phone, address, purpose, and proof of identity.',
    'Teen Bible Adventures reviews the application and emails the decision.',
    'After approval, sign in to the ministry portal with the same password to care for families and your team.',
  ];
  return (
    <PublicLayout activeTab="ministry">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal">Setup guide</p>
          <h1 className="mt-1 text-2xl font-bold text-navy">How to use your ministry account</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A ministry account opens Teen Bible Adventures for your congregation, youth group, or Christian school. Activities begin after the ministry is approved.
          </p>
        </div>
        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={step} className="rounded-2xl border border-border bg-surface p-4 text-sm leading-relaxed text-navy">
              <span className="font-bold">{index + 1}. </span>
              {step}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => navigate('/ministry')}
          className="cursor-pointer self-start text-sm font-semibold text-teal"
        >
          Back to your account
        </button>
      </main>
    </PublicLayout>
  );
}

export function ChurchApplyVerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('This verification link is missing a token.');
      return;
    }
    publicWrite<{ token: string }>('/api/church-applications/verify-email', { token })
      .then((res) => {
        setApplicantToken(res.token);
        navigate('/ministry', { replace: true });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Could not verify this email');
      });
  }, [params, navigate]);

  return (
    <PublicLayout activeTab="ministry">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10">
        {error ? <Alert kind="error">{error}</Alert> : <p className="text-sm text-navy">Verifying your email…</p>}
      </main>
    </PublicLayout>
  );
}
