import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { publicApi } from './api';
import { PublicLayout } from './public-shell';
import { safePageHtml } from './safe-html';
import { Spinner } from './ui';

type SitePage = {
  id: string;
  slug: string;
  title: string;
  html: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Alias shortcuts used in footer / Play Store forms. */
const SLUG_ALIASES: Record<string, string> = {
  privacy: 'privacy-policy',
  terms: 'terms-of-service',
};

function SitePageView({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const resolved = SLUG_ALIASES[slug] || slug;
  const [doc, setDoc] = useState<SitePage | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    publicApi<SitePage>(`/api/site-pages/${resolved}`)
      .then((res) => {
        if (!cancelled) setDoc(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDoc(null);
          setError(err instanceof Error ? err.message : 'Could not load page');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  const activeTab =
    resolved === 'privacy-policy' || slug === 'privacy'
      ? 'privacy'
      : undefined;

  return (
    <PublicLayout activeTab={activeTab}>
      <section className="border-b border-border/60 bg-gradient-to-br from-teal/8 via-cream to-surface-2/20 px-4 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-teal">Published page</p>
          <h1 className="m-0 text-3xl font-black tracking-tight text-navy sm:text-4xl">
            {doc?.title || (loading ? '…' : 'Page')}
          </h1>
          {doc ? (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
              <span className="rounded-full border border-border bg-surface px-3 py-1.5 font-semibold text-navy">
                Created {formatWhen(doc.createdAt)}
              </span>
              <span className="rounded-full border border-border bg-surface px-3 py-1.5 font-semibold text-navy">
                Updated {formatWhen(doc.updatedAt)}
              </span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="cursor-pointer text-xs font-semibold text-teal underline-offset-2 hover:underline"
          >
            Back to home
          </button>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          {loading ? <Spinner label="Loading…" /> : null}
          {error ? (
            <p className="rounded-xl border border-error/30 bg-error-bg p-4 text-sm font-semibold text-error" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && doc ? (
            <article
              className="rounded-card border border-border bg-surface px-5 py-6 text-sm leading-relaxed text-text-2 shadow-xs sm:px-8 sm:py-8 [&_a]:text-teal [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-navy [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-navy [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: safePageHtml(doc.html) }}
            />
          ) : null}
        </div>
      </section>
    </PublicLayout>
  );
}

export function PrivacyPage() {
  return <SitePageView slug="privacy" />;
}

export function TermsPage() {
  return <SitePageView slug="terms" />;
}

export function PublicSitePage() {
  const { slug } = useParams();
  if (!slug) {
    return (
      <PublicLayout>
        <p className="p-8 text-center text-sm text-muted">Missing page slug.</p>
      </PublicLayout>
    );
  }
  return <SitePageView slug={slug} />;
}
