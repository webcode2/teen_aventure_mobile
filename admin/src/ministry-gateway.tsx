import { useContext, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { PublicCopy } from './public-shell';
import { mergeCms } from './cms-fields';
import { DEFAULT_MINISTRY_COPY } from './ministry-copy';
import { Alert, Button } from './ui';

function useMinistryCopy() {
  return mergeCms(DEFAULT_MINISTRY_COPY, useContext(PublicCopy)?.ministryPage);
}

export function MinistryIntro() {
  const copy = useMinistryCopy();
  return <div data-cms-section="ministryPage" className="lg:col-span-7 flex flex-col gap-6">
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-bold text-navy"><span>{copy.badge}</span></div>
    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-navy leading-tight">{copy.title}</h1>
    <p className="text-sm sm:text-base text-muted leading-relaxed">{copy.description}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">{copy.features.map((feature, index) => <div key={index} className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
      <span className="text-xs font-bold text-teal">{feature.title}</span>
      <p className="text-[11px] text-muted mt-1 leading-relaxed">{feature.description}</p>
    </div>)}</div>
  </div>;
}

export function MinistryGateway({ email = '', password = '', onEmail, onPassword, handleLogin, loginBusy = false, loginError = null, preview = false }: {
  email?: string; password?: string; onEmail?: (value: string) => void; onPassword?: (value: string) => void;
  handleLogin?: (event: FormEvent<HTMLFormElement>) => void; loginBusy?: boolean; loginError?: string | null; preview?: boolean;
}) {
  const copy = useMinistryCopy();
  const navigate = useNavigate();
  return (
        <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <MinistryIntro />
          {/* Right: Pastoral & Leadership Sign In Card */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-navy">{copy.signInTitle}</h2>
                <p className="text-xs text-muted mt-1">
                  {copy.signInDescription}
                </p>
              </div>

              {loginError ? <Alert kind="error">{loginError}</Alert> : null}

              <form onSubmit={event => { if (preview) event.preventDefault(); else handleLogin?.(event); }} className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>{copy.emailLabel}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    readOnly={preview}
                    required
                    value={email}
                    onChange={(e) => onEmail?.(e.target.value)}
                    placeholder={copy.emailPlaceholder}
                    className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>{copy.passwordLabel}</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    readOnly={preview}
                    required
                    value={password}
                    onChange={(e) => onPassword?.(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </label>

                <Button size="lg" className="w-full mt-1" type="submit" disabled={loginBusy}>
                  {loginBusy ? copy.busyLabel : copy.submitLabel}
                </Button>
                {preview && <button type="button" className="cursor-pointer text-center text-xs font-semibold text-teal">{copy.newAccountLabel}</button>}
              </form>
            </div>

            <p className="text-[11px] text-muted text-center">
              {copy.adminPrompt}{' '}
              <button
                type="button"
                onClick={() => navigate('/app/login')}
                className="font-semibold text-navy underline hover:text-teal cursor-pointer"
              >
                {copy.adminLinkLabel}
              </button>
            </p>
          </div>
        </div>
  );
}

export function MinistryCopy({ children }: { children: (copy: typeof DEFAULT_MINISTRY_COPY) => ReactNode }) {
  return children(useMinistryCopy());
}
