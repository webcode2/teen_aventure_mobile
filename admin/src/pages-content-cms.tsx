import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { api, apiUpload } from './api';
import {
  DEFAULT_LANDING_CONTENT,
  LandingPageSections,
  type LandingCmsContent,
} from './pages-landing';
import { PublicLayout } from './public-shell';
import { askConfirm } from './prompt-dialog';
import { Button, Badge } from './ui';

function CmsSectionCard({
  title,
  description,
  saveLabel,
  saving,
  onSave,
  headerExtra,
  children,
}: {
  title: string;
  description: string;
  saveLabel: string;
  saving: boolean;
  onSave: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-cream/40 px-5 py-4">
        <div className="min-w-0">
          <h2 className="m-0 text-balance text-base font-bold tracking-tight text-navy">{title}</h2>
          <p className="m-0 mt-1 text-pretty text-[12px] leading-snug text-muted">{description}</p>
        </div>
        {headerExtra}
      </div>
      <div className="flex flex-col gap-5 p-5">{children}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-cream/30 px-5 py-3.5">
        <p className="m-0 text-[11px] text-muted">Saves with the rest of this platform’s content.</p>
        <Button type="button" disabled={saving} onClick={onSave}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </div>
  );
}

function CmsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-navy">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export type PlatformType = 'mobile' | 'web';

const DEFAULT_MOBILE_CONTENT = {
  hero: {
    greeting: 'Hey, Explorer!',
    tagline: "Ready for today's adventure in God's Word?",
    abiUrl: '',
    zackUrl: '',
  },
  announcement: {
    enabled: true,
    badge: 'NEW',
    text: 'Welcome to Teen Bible Adventures! Week 1 is now live.',
    actionLabel: 'Explore Week 1',
  },
  welcome: {
    title: "Discover God's Story",
    subtitle: 'Interactive Bible lessons, puzzles, and community for teens.',
    quote: 'Your word is a lamp to my feet and a light to my path. — Psalm 119:105',
  },
  pillars: {
    seek: {
      title: 'Seek Truth',
      description: 'Engage with dynamic video teachings grounded in Scripture.',
    },
    connect: {
      title: 'Connect Community',
      description: 'Walk together with family, church youth groups, and friends.',
    },
    grow: {
      title: 'Grow Daily',
      description: 'Solve puzzles, earn AskScore gems, and build holy habits.',
    },
  },
  messages: {
    quizSuccess: "Awesome job! You conquered this week's quiz.",
    puzzleSuccess: 'Puzzle solved! Bonus gems and AskScore recorded.',
    supportEmail: 'support@askhub.app',
  },
  system: {
    minVersion: '1.0.0',
    maintenanceMode: false,
    maintenanceMessage: "We're making Teen Bible Adventures even better. Back shortly!",
  },
};

type MobileSectionId = 'hero' | 'announcement' | 'welcome' | 'pillars' | 'messages' | 'system';
type WebSectionId = 'hero' | 'pillars' | 'pass' | 'about';

const MOBILE_SECTIONS: Array<{ id: MobileSectionId; label: string; hint: string }> = [
  { id: 'hero', label: 'Home hero', hint: 'Greeting, tagline, Abi & Zack' },
  { id: 'announcement', label: 'Announcement', hint: 'Home banner' },
  { id: 'welcome', label: 'Welcome', hint: 'Onboarding copy' },
  { id: 'pillars', label: 'Pillars', hint: 'Seek · Connect · Grow' },
  { id: 'messages', label: 'Messages', hint: 'Success & support' },
  { id: 'system', label: 'System', hint: 'Version & maintenance' },
];

const WEB_SECTIONS: Array<{ id: WebSectionId; label: string; hint: string }> = [
  { id: 'hero', label: 'Landing hero', hint: 'Headline & CTAs' },
  { id: 'pillars', label: 'Pillar cards', hint: 'Section header & three cards' },
  { id: 'pass', label: 'Onboarding pass', hint: 'Barcode / invite section' },
  { id: 'about', label: 'Mission & footer', hint: 'About and attribution' },
];

const DEFAULT_WEB_CONTENT: LandingCmsContent = DEFAULT_LANDING_CONTENT;

function mergeMobile(prev: typeof DEFAULT_MOBILE_CONTENT, extra: any) {
  return {
    ...prev,
    ...extra,
    hero: { ...DEFAULT_MOBILE_CONTENT.hero, ...prev.hero, ...(extra?.hero ?? {}) },
    announcement: {
      ...DEFAULT_MOBILE_CONTENT.announcement,
      ...prev.announcement,
      ...(extra?.announcement ?? {}),
    },
    welcome: {
      ...DEFAULT_MOBILE_CONTENT.welcome,
      ...prev.welcome,
      ...(extra?.welcome ?? {}),
    },
  };
}

/** Narrow browser mock: stacked mobile layout, full page height (no crop). */
function WebLandingPreview({ content }: { content: LandingCmsContent }) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="min-w-0 flex-1 truncate rounded-md border border-border bg-white px-2.5 py-1 text-[10px] font-medium text-muted">
          teenbibleadventures.app
        </div>
      </div>

      <div className="w-full overflow-x-hidden bg-cream" aria-hidden>
        <div className="pointer-events-none select-none w-full">
          <PublicLayout activeTab="home" stacked>
            <LandingPageSections content={content} interactive={false} stacked />
          </PublicLayout>
        </div>
      </div>
    </div>
  );
}

function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col overflow-hidden rounded-[28px] border-[5px] border-navy bg-[#fcfefc] font-sans shadow-xl">
      <div className="flex shrink-0 items-center justify-between gap-2 bg-navy px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span className="flex-1 truncate text-center text-[11px] font-bold tracking-tight text-[#fcfefc]">
          Teen Bible Adventures
        </span>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z"
              stroke="white"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M10 18.5a2 2 0 0 0 4 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Onboarding prompt: background scene with welcome title, subtitle, and scripture card. */
function MobileWelcomeOnboardingPreview({
  content,
}: {
  content: typeof DEFAULT_MOBILE_CONTENT;
}) {
  const title = (content.welcome?.title || '').trim() || DEFAULT_MOBILE_CONTENT.welcome.title;
  const subtitle =
    (content.welcome?.subtitle || '').trim() || DEFAULT_MOBILE_CONTENT.welcome.subtitle;
  const quote = (content.welcome?.quote || '').trim() || DEFAULT_MOBILE_CONTENT.welcome.quote;
  const abiSrc = (content.hero?.abiUrl || '').trim() || '/abi.png';
  const zackSrc = (content.hero?.zackUrl || '').trim() || '/zack.png';

  return (
    <PhoneChrome>
      <div className="relative flex min-h-[520px] flex-col overflow-hidden">
        {/* App home behind the prompt */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#011F3B',
            backgroundImage:
              'radial-gradient(ellipse at 20% 0%, rgba(21,154,156,0.45), transparent 55%), radial-gradient(ellipse at 90% 20%, rgba(244,185,66,0.28), transparent 45%), radial-gradient(ellipse at 50% 100%, rgba(232,117,36,0.22), transparent 50%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex h-[42%] items-end justify-center opacity-40">
          <img
            src={abiSrc}
            alt=""
            className="h-[160px] w-auto max-w-[42%] object-contain object-bottom"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/abi.png';
            }}
          />
          <img
            src={zackSrc}
            alt=""
            className="-ml-4 h-[160px] w-auto max-w-[42%] object-contain object-bottom"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/zack.png';
            }}
          />
        </div>
        <div className="absolute inset-0 bg-navy/55" aria-hidden />

        {/* Prompted onboarding message */}
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-4 py-6">
          <div className="w-full rounded-none border border-white/20 bg-[#fcfefc] p-5 shadow-xl">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-teal">
              Welcome
            </p>
            <h2 className="m-0 mt-2 text-[22px] font-semibold leading-tight tracking-tight text-navy">
              {title}
            </h2>
            <p className="m-0 mt-2 text-[13px] leading-snug text-[#3E5A73]">{subtitle}</p>
            {quote ? (
              <div className="mt-4 border-l-2 border-gold bg-[#FFF8EE] px-3 py-2.5">
                <p className="m-0 text-[12px] font-medium italic leading-relaxed text-navy">
                  {quote}
                </p>
              </div>
            ) : null}
            <div className="mt-5 flex w-full items-center justify-center bg-navy px-3 py-2.5 text-[12px] font-bold text-white">
              Continue
            </div>
          </div>
          <p className="m-0 mt-3 text-center text-[10px] font-semibold text-white/70">
            Shown once when explorers first open the app
          </p>
        </div>
      </div>
    </PhoneChrome>
  );
}

/** Phone mock that mirrors the teen Explorer home tab (hero → quest → declaration). */
function MobileExplorerHomePreview({
  content,
}: {
  content: typeof DEFAULT_MOBILE_CONTENT;
}) {
  const greeting = (content.hero?.greeting || '').trim() || 'Hey, Explorer!';
  const tagline =
    (content.hero?.tagline || '').trim() || "Ready for today's adventure in God's Word?";
  const abiSrc = (content.hero?.abiUrl || '').trim() || '/abi.png';
  const zackSrc = (content.hero?.zackUrl || '').trim() || '/zack.png';
  const sampleVideos = [
    'The Book of Genesis – Part 4',
    'The Book of Genesis – Part 5',
    'The Book of Genesis – Part 6',
  ];

  return (
    <PhoneChrome>
      {/* Hero pinned under app bar so it always shows (not lost in scroll) */}
      <div className="shrink-0 bg-[#fcfefc] px-3 pt-2">
        <div
          className="relative flex h-[156px] overflow-hidden rounded-[22px] border border-[#F6E7C8]"
          style={{
            backgroundColor: '#FFF8EE',
            backgroundImage:
              'radial-gradient(circle at 92% 15%, rgba(230,246,246,0.55), transparent 42%), radial-gradient(circle at 72% 105%, rgba(248,231,223,0.7), transparent 40%), radial-gradient(circle at 8% 95%, rgba(246,231,200,0.55), transparent 30%)',
          }}
        >
          <div className="relative z-[1] flex min-w-0 flex-1 flex-col justify-center py-3 pl-3.5 pr-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mb-1.5">
              <circle cx="12" cy="12" r="9" stroke="#F4B942" strokeWidth="1.8" />
              <path
                d="M12 7.2v4.3l3 1.8"
                stroke="#F4B942"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="1.35" fill="#F4B942" />
            </svg>
            <div className="text-[22px] font-semibold leading-[1.05] tracking-tight text-[#011f3b]">
              {greeting}
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-[#011f3b]">{tagline}</p>
          </div>
          <div className="relative z-[1] flex w-[46%] shrink-0 items-end justify-end pr-0.5">
            <img
              src={abiSrc}
              alt="Abi"
              className="h-[140px] w-auto max-w-[55%] object-contain object-bottom"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/abi.png';
              }}
            />
            <img
              src={zackSrc}
              alt="Zack"
              className="-ml-3 h-[140px] w-auto max-w-[55%] object-contain object-bottom"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/zack.png';
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto bg-[#fcfefc] px-3 pb-4 pt-3 scrollbar-none">
        {content.system?.maintenanceMode ? (
          <div className="rounded-xl border border-error/30 bg-error-bg p-2.5 text-center">
            <span className="block text-[11px] font-bold text-error">Maintenance Mode</span>
            <span className="text-[10px] text-navy/80">{content.system?.maintenanceMessage}</span>
          </div>
        ) : null}

        {content.announcement?.enabled ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-orange/30 bg-orange/15 px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded bg-orange px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                {content.announcement?.badge || 'NEW'}
              </span>
              <span className="line-clamp-1 text-[11px] font-semibold leading-tight text-navy">
                {content.announcement?.text}
              </span>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-orange">
              {content.announcement?.actionLabel} →
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1">
            <span className="flex h-7 w-7 items-center justify-center text-lg leading-none text-navy">‹</span>
            <h3 className="flex-1 text-center text-[15px] font-semibold leading-tight tracking-tight text-navy">
              Today&apos;s Quest · Week 2
            </h3>
            <span className="flex h-7 w-7 items-center justify-center text-lg leading-none text-navy">›</span>
          </div>
          <p className="-mt-1 text-center text-[12px] text-muted">Genesis 28:15</p>

          <div className="relative h-[148px] overflow-hidden rounded-[18px] bg-navy shadow-md">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `url(${zackSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'right center',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-transparent" />
            <div className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white">
              ▶
            </div>
            <div className="relative z-10 flex h-full w-[62%] flex-col p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#fcfefc]">
                <span style={{ color: '#F4B942' }}>📖</span>
                <span>Video 1</span>
              </div>
              <div className="mt-1.5 text-[17px] font-semibold leading-tight tracking-tight text-[#fcfefc]">
                Genesis 24–27
              </div>
              <div className="mt-0.5 truncate text-[11px] text-[#fcfefc]">{sampleVideos[0]}</div>
              <div className="mt-auto">
                <span className="inline-flex items-center rounded-xl bg-orange px-3 py-1.5 text-[11px] font-bold text-white">
                  Start Reading
                </span>
              </div>
            </div>
          </div>

          {[
            { title: sampleVideos[1], accent: 'bg-[#FFF1E8] text-orange', icon: '▶' },
            { title: sampleVideos[2], accent: 'bg-[#FFF1E8] text-orange', icon: '▶' },
            { title: 'Quiz', accent: 'bg-[#E8EEF4] text-navy', icon: '?' },
            { title: 'Puzzle', subtitle: 'Finished', accent: 'bg-[#E9F4EC] text-forest', icon: '✓' },
          ].map((row) => (
            <div
              key={row.title}
              className="flex items-center gap-2.5 rounded-[18px] border border-border/90 bg-[#FFFDF7] px-3 py-2.5 shadow-xs"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-sm font-bold ${row.accent}`}
              >
                {row.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-extrabold tracking-tight text-navy">{row.title}</div>
                {row.subtitle ? (
                  <div className="mt-0.5 text-[11px] font-medium text-muted">{row.subtitle}</div>
                ) : null}
              </div>
              <span className="text-sm text-muted">›</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 rounded-[18px] border border-border bg-white p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange/15 text-sm text-orange">
              💬
            </span>
            <span className="flex-1 text-[13px] font-extrabold text-navy">Word Declaration</span>
            <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold text-orange">
              0/10
            </span>
          </div>
          <p className="text-[12px] font-medium leading-snug text-navy">
            I declare: I am strong and courageous. The Lord my God is with me wherever I go.
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#F3E7D6]">
            <div className="h-full w-0 rounded-full bg-orange" />
          </div>
          <p className="text-[11px] font-semibold text-forest">— Joshua 1:9 · 0/10 · Tap</p>
        </div>
      </div>
    </PhoneChrome>
  );
}

export function ContentCmsPage({ platform }: { platform: PlatformType }) {
  const navigate = useNavigate();
  const [mobileContent, setMobileContent] = useState(DEFAULT_MOBILE_CONTENT);
  const [webContent, setWebContent] = useState(DEFAULT_WEB_CONTENT);
  const [mobileSection, setMobileSection] = useState<MobileSectionId>('hero');
  const [webSection, setWebSection] = useState<WebSectionId>('hero');
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'abi' | 'zack' | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (platform === 'mobile') setMobileSection('hero');
    else setWebSection('hero');
  }, [platform]);

  // Load content from API or localStorage
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const localKey = `askhub_content_${platform}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (platform === 'mobile') setMobileContent((prev) => mergeMobile(prev, parsed));
        else setWebContent(parsed);
      } catch (_) {}
    }

    api<any>(`/api/admin/content/${platform}`)
      .then((res) => {
        if (cancelled || !res) return;
        if (platform === 'mobile') {
          setMobileContent((prev) => mergeMobile(prev, res));
        } else {
          setWebContent((prev) => ({ ...prev, ...res }));
        }
        localStorage.setItem(localKey, JSON.stringify(res));
      })
      .catch((err) => {
        if (cancelled) return;
        // If 404 or backend offline, fall back to default/local content
        console.warn('Could not load remote content, using cached/default:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    const payload = platform === 'mobile' ? mobileContent : webContent;
    const localKey = `askhub_content_${platform}`;
    localStorage.setItem(localKey, JSON.stringify(payload));

    try {
      await api(`/api/admin/content/${platform}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setSavedMessage(`Successfully saved ${platform === 'mobile' ? 'Mobile App' : 'Web Platform'} static content!`);
    } catch (err: any) {
      // Saved to localStorage at least
      setSavedMessage(`Saved locally to browser cache (${err.message || 'Server sync error'})`);
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMessage(null), 4000);
    }
  };

  const uploadHeroImage = async (field: 'abi' | 'zack', file: File) => {
    setUploading(field);
    setError(null);
    try {
      const res = await apiUpload<{ url: string }>('/api/admin/content/mobile/images', file, field);
      setMobileContent((prev) => ({
        ...prev,
        hero: { ...prev.hero, [`${field}Url`]: res.url },
      }));
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleReset = async () => {
    const ok = await askConfirm('Reset all fields for this platform to default copy?', {
      title: 'Reset copy',
      confirmLabel: 'Reset',
      tone: 'danger',
    });
    if (!ok) return;
    if (platform === 'mobile') {
      setMobileContent(DEFAULT_MOBILE_CONTENT);
      localStorage.removeItem('askhub_content_mobile');
    } else {
      setWebContent(DEFAULT_WEB_CONTENT);
      localStorage.removeItem('askhub_content_web');
    }
    setSavedMessage('Reset to defaults.');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const sections = platform === 'mobile' ? MOBILE_SECTIONS : WEB_SECTIONS;
  const activeSection = platform === 'mobile' ? mobileSection : webSection;

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Content Management
          </p>
          <h1 className="m-0 text-lg font-bold tracking-tight text-navy">
            {platform === 'mobile' ? 'Mobile app copy' : 'Web platform copy'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 p-1">
          <button
            type="button"
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              platform === 'mobile'
                ? 'bg-navy text-white shadow-xs'
                  : 'text-muted hover:bg-surface hover:text-navy'
            }`}
            onClick={() => navigate('/app/dashboard/content-mobile')}
          >
              Mobile
          </button>
          <button
            type="button"
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              platform === 'web'
                ? 'bg-navy text-white shadow-xs'
                  : 'text-muted hover:bg-surface hover:text-navy'
            }`}
            onClick={() => navigate('/app/dashboard/content-web')}
          >
              Web
          </button>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-error"
            onClick={handleReset}
          >
            Reset
          </button>
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {savedMessage ? (
        <div className="flex items-center justify-between rounded-xl border border-forest/30 bg-sage/20 p-3 text-xs font-semibold text-forest">
          <span>✓ {savedMessage}</span>
          <button type="button" onClick={() => setSavedMessage(null)} className="cursor-pointer text-muted hover:text-navy">✕</button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-error/30 bg-error-bg p-3 text-xs font-semibold text-error">
          <span>⚠ {error}</span>
          <button type="button" onClick={() => setError(null)} className="cursor-pointer text-muted hover:text-navy">✕</button>
        </div>
      ) : null}

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 items-start gap-4 ${
          platform === 'web'
            ? 'xl:grid-cols-[200px_minmax(0,1fr)_minmax(300px,400px)]'
            : 'xl:grid-cols-[220px_minmax(0,1fr)_340px]'
        }`}
      >
        {/* Sub-sidebar: section list */}
        <aside className="rounded-2xl border border-border bg-surface p-2 shadow-xs xl:sticky xl:top-20">
          <p className="m-0 px-2.5 pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Sections
          </p>
          <nav className="flex gap-1 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0" aria-label="Content sections">
            {sections.map((item) => {
              const active = item.id === activeSection;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (platform === 'mobile') setMobileSection(item.id as MobileSectionId);
                    else setWebSection(item.id as WebSectionId);
                  }}
                  className={`flex min-w-[9.5rem] cursor-pointer flex-col items-start rounded-xl px-3 py-2.5 text-left transition-colors xl:min-w-0 ${
                    active
                      ? 'bg-navy text-white'
                      : 'text-navy hover:bg-cream'
                  }`}
                >
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className={`mt-0.5 text-[10px] leading-snug ${active ? 'text-white/70' : 'text-muted'}`}>
                    {item.hint}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Middle: active section editor */}
        <div className="flex min-w-0 flex-col gap-4">
          {platform === 'mobile' ? (
            <>
              {mobileSection === 'hero' ? (
              <CmsSectionCard
                title="Explorer home hero"
                description="Greeting, tagline, and Abi & Zack on the teen home tab. Last saved copy stays on device until the server answers."
                saveLabel="Save hero"
                saving={saving}
                onSave={handleSave}
              >
                <CmsField label="Greeting" hint="Shown as written — the explorer’s name is not inserted.">
                  <input
                    type="text"
                    maxLength={48}
                    className="input text-sm"
                    placeholder="Hey, Explorer!"
                    value={mobileContent.hero?.greeting ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, greeting: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Tagline" hint={`${(mobileContent.hero?.tagline ?? '').length}/90`}>
                  <textarea
                    rows={2}
                    maxLength={90}
                    className="input resize-y text-sm leading-relaxed"
                    placeholder="Ready for today's adventure in God's Word?"
                    value={mobileContent.hero?.tagline ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, tagline: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <div>
                  <p className="m-0 mb-2 text-[12px] font-semibold text-navy">Character art</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(['abi', 'zack'] as const).map((field) => {
                    const url = field === 'abi' ? mobileContent.hero?.abiUrl : mobileContent.hero?.zackUrl;
                    const label = field === 'abi' ? 'Abi' : 'Zack';
                    return (
                        <div
                          key={field}
                          className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-cream/50 p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-navy">{label}</span>
                            {url ? (
                              <button
                                type="button"
                                className="cursor-pointer text-[11px] font-semibold text-muted hover:text-error"
                                onClick={() =>
                                  setMobileContent((prev) => ({
                                    ...prev,
                                    hero: { ...prev.hero, [`${field}Url`]: '' },
                                  }))
                                }
                              >
                                Use bundled
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                                Bundled
                              </span>
                            )}
                          </div>
                          <div className="flex h-32 items-end justify-center rounded-xl border border-border/60 bg-white">
                        <img
                          src={url || `/${field}.png`}
                          alt={label}
                              className="h-[7.5rem] w-auto object-contain object-bottom"
                        />
                          </div>
                          <label className="flex cursor-pointer flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-navy hover:border-teal hover:text-teal">
                              {uploading === field ? 'Uploading…' : 'Choose image'}
                            </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                              className="sr-only"
                          disabled={uploading !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void uploadHeroImage(field, file);
                          }}
                        />
                            <span className="text-[11px] text-muted">PNG, JPEG, or WebP</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CmsSectionCard>
              ) : null}

              {mobileSection === 'announcement' ? (
              <CmsSectionCard
                title="Home announcement"
                description="Short tip at the top of the Teen Explorer home tab. Turn it off anytime."
                saveLabel="Save announcement"
                saving={saving}
                onSave={handleSave}
                headerExtra={
                          <button
                            type="button"
                    role="switch"
                    aria-checked={mobileContent.announcement?.enabled ?? true}
                            onClick={() =>
                              setMobileContent((prev) => ({
                                ...prev,
                        announcement: {
                          ...prev.announcement,
                          enabled: !(prev.announcement?.enabled ?? true),
                        },
                      }))
                    }
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      mobileContent.announcement?.enabled ?? true
                        ? 'border-forest/25 bg-sage/40 text-forest'
                        : 'border-border bg-surface text-muted'
                    }`}
                  >
                    <span
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        mobileContent.announcement?.enabled ?? true ? 'bg-forest' : 'bg-border'
                      }`}
                      aria-hidden
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                          mobileContent.announcement?.enabled ?? true ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                    {(mobileContent.announcement?.enabled ?? true) ? 'Showing on home' : 'Hidden'}
                          </button>
                }
              >
                <div
                  className={`rounded-2xl border p-3 transition-opacity ${
                    mobileContent.announcement?.enabled ?? true
                      ? 'border-orange/25 bg-orange/10'
                      : 'border-border bg-cream/60 opacity-55'
                  }`}
                >
                  <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    How teens see it
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-orange/30 bg-orange/15 px-2.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded bg-orange px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                        {(mobileContent.announcement?.badge || 'NEW').trim() || 'NEW'}
                      </span>
                      <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-navy">
                        {(mobileContent.announcement?.text || '').trim() || 'Write your announcement…'}
                      </span>
                      </div>
                    <span className="shrink-0 text-[10px] font-bold text-orange">
                      {(mobileContent.announcement?.actionLabel || 'Open').trim() || 'Open'} →
                    </span>
                </div>
              </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CmsField label="Badge" hint={`Short label · ${(mobileContent.announcement?.badge ?? '').length}/16`}>
                    <input
                      type="text"
                      maxLength={16}
                      className="input text-sm"
                      placeholder="NEW"
                      value={mobileContent.announcement?.badge ?? 'NEW'}
                      onChange={(e) =>
                        setMobileContent((prev) => ({
                          ...prev,
                          announcement: { ...prev.announcement, badge: e.target.value },
                        }))
                      }
                    />
                  </CmsField>
                  <CmsField label="Action button" hint={`Tap label · ${(mobileContent.announcement?.actionLabel ?? '').length}/28`}>
                      <input
                        type="text"
                      maxLength={28}
                      className="input text-sm"
                      placeholder="Explore Week 1"
                        value={mobileContent.announcement?.actionLabel ?? 'Explore Week 1'}
                        onChange={(e) =>
                          setMobileContent((prev) => ({
                            ...prev,
                            announcement: { ...prev.announcement, actionLabel: e.target.value },
                          }))
                        }
                      />
                  </CmsField>
                </div>

                <CmsField label="Message" hint={`One or two lines · ${(mobileContent.announcement?.text ?? '').length}/140`}>
                  <textarea
                    rows={3}
                    maxLength={140}
                    className="input resize-y text-sm leading-relaxed"
                    placeholder="Welcome to Teen Bible Adventures! Week 1 is now live."
                    value={mobileContent.announcement?.text ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        announcement: { ...prev.announcement, text: e.target.value },
                      }))
                    }
                  />
                </CmsField>
              </CmsSectionCard>
              ) : null}

              {mobileSection === 'welcome' ? (
              <CmsSectionCard
                title="Welcome & onboarding"
                description="First impression copy shown to teens and explorers."
                saveLabel="Save welcome"
                saving={saving}
                onSave={handleSave}
              >
                <CmsField label="Title">
                  <input
                    type="text"
                    className="input text-sm"
                    value={mobileContent.welcome?.title ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        welcome: { ...prev.welcome, title: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Subtitle">
                  <input
                    type="text"
                    className="input text-sm"
                    value={mobileContent.welcome?.subtitle ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        welcome: { ...prev.welcome, subtitle: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Scripture / quote of the day">
                  <textarea
                    rows={3}
                    className="input resize-y text-sm leading-relaxed"
                    value={mobileContent.welcome?.quote ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        welcome: { ...prev.welcome, quote: e.target.value },
                      }))
                    }
                  />
                </CmsField>
              </CmsSectionCard>
              ) : null}

              {mobileSection === 'pillars' ? (
              <CmsSectionCard
                title="Discipleship pillars"
                description="Seek · Connect · Grow — core tracks shown in learning pathways."
                saveLabel="Save pillars"
                saving={saving}
                onSave={handleSave}
              >
                {(
                  [
                    ['seek', 'Seek', mobileContent.pillars?.seek],
                    ['connect', 'Connect', mobileContent.pillars?.connect],
                    ['grow', 'Grow', mobileContent.pillars?.grow],
                  ] as const
                ).map(([key, label, pillar]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-cream/50 p-3.5"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                      Pillar · {label}
                    </span>
                    <input
                      type="text"
                      className="input text-sm font-semibold"
                      placeholder={`${label} title`}
                      value={pillar?.title ?? ''}
                      onChange={(e) =>
                        setMobileContent((prev) => ({
                          ...prev,
                          pillars: {
                            ...prev.pillars,
                            [key]: { ...prev.pillars[key], title: e.target.value },
                          },
                        }))
                      }
                    />
                    <textarea
                      rows={2}
                      className="input resize-y text-sm leading-relaxed"
                      placeholder={`${label} description`}
                      value={pillar?.description ?? ''}
                      onChange={(e) =>
                        setMobileContent((prev) => ({
                          ...prev,
                          pillars: {
                            ...prev.pillars,
                            [key]: { ...prev.pillars[key], description: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </CmsSectionCard>
              ) : null}

              {mobileSection === 'messages' ? (
              <CmsSectionCard
                title="Completion messages"
                description="Feedback teens see after finishing quiz or puzzle steps, plus support contact."
                saveLabel="Save messages"
                saving={saving}
                onSave={handleSave}
              >
                <CmsField label="Quiz success">
                    <input
                      type="text"
                    className="input text-sm"
                    value={mobileContent.messages?.quizSuccess ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        messages: { ...prev.messages, quizSuccess: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Puzzle success">
                  <input
                    type="text"
                    className="input text-sm"
                    value={mobileContent.messages?.puzzleSuccess ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        messages: { ...prev.messages, puzzleSuccess: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Support email">
                  <input
                    type="email"
                    className="input text-sm"
                    value={mobileContent.messages?.supportEmail ?? ''}
                    onChange={(e) =>
                      setMobileContent((prev) => ({
                        ...prev,
                        messages: { ...prev.messages, supportEmail: e.target.value },
                      }))
                    }
                  />
                </CmsField>
              </CmsSectionCard>
              ) : null}

              {mobileSection === 'system' ? (
              <CmsSectionCard
                title="App version & maintenance"
                description="Minimum app version and the launch notice when service is paused."
                saveLabel="Save system"
                saving={saving}
                onSave={handleSave}
                headerExtra={
                  <button
                    type="button"
                    role="switch"
                    aria-checked={mobileContent.system?.maintenanceMode ?? false}
                    onClick={() =>
                        setMobileContent((prev) => ({
                          ...prev,
                        system: {
                          ...prev.system,
                          maintenanceMode: !(prev.system?.maintenanceMode ?? false),
                        },
                      }))
                    }
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      mobileContent.system?.maintenanceMode
                        ? 'border-orange/30 bg-orange/15 text-orange'
                        : 'border-border bg-surface text-muted'
                    }`}
                  >
                    <span
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        mobileContent.system?.maintenanceMode ? 'bg-orange' : 'bg-border'
                      }`}
                      aria-hidden
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                          mobileContent.system?.maintenanceMode ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                    {mobileContent.system?.maintenanceMode ? 'Maintenance on' : 'Live'}
                  </button>
                }
              >
                <CmsField label="Minimum app version" hint="Example: 1.0.0">
                    <input
                      type="text"
                    className="input text-sm"
                      value={mobileContent.system?.minVersion ?? '1.0.0'}
                      onChange={(e) =>
                        setMobileContent((prev) => ({
                          ...prev,
                          system: { ...prev.system, minVersion: e.target.value },
                        }))
                      }
                    />
                </CmsField>
                {mobileContent.system?.maintenanceMode ? (
                  <CmsField label="Maintenance notice">
                    <textarea
                      rows={3}
                      className="input resize-y text-sm font-semibold leading-relaxed text-orange"
                      value={mobileContent.system?.maintenanceMessage ?? ''}
                      onChange={(e) =>
                        setMobileContent((prev) => ({
                          ...prev,
                          system: { ...prev.system, maintenanceMessage: e.target.value },
                        }))
                      }
                    />
                  </CmsField>
                ) : (
                  <p className="m-0 rounded-xl border border-border bg-cream/50 px-3 py-2.5 text-[12px] text-muted">
                    App is live. Turn on maintenance to show a launch notice instead.
                  </p>
                )}
              </CmsSectionCard>
              ) : null}
            </>
          ) : (
            <>
              {webSection === 'hero' ? (
              <CmsSectionCard
                title="Landing page hero"
                description="Primary headline and calls to action on the public site."
                saveLabel="Save hero"
                saving={saving}
                onSave={handleSave}
              >
                <CmsField
                  label="Badge"
                  hint="Pill above the headline. Clear the field and save to hide it on the site."
                >
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Biblical Discipleship for the Next Generation"
                    value={webContent.hero?.badge ?? ''}
                    onChange={(e) =>
                      setWebContent((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, badge: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Title">
                  <input
                    type="text"
                    className="input text-sm font-semibold"
                    value={webContent.hero?.title ?? ''}
                    onChange={(e) =>
                      setWebContent((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, title: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Subtitle">
                  <textarea
                    rows={3}
                    className="input resize-y text-sm leading-relaxed"
                    value={webContent.hero?.subtitle ?? ''}
                    onChange={(e) =>
                      setWebContent((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, subtitle: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CmsField label="Primary button">
                    <input
                      type="text"
                      className="input text-sm"
                      value={webContent.hero?.primaryCta ?? 'Get Started Free'}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, primaryCta: e.target.value },
                        }))
                      }
                    />
                  </CmsField>
                  <CmsField label="Secondary button">
                    <input
                      type="text"
                      className="input text-sm"
                      value={webContent.hero?.secondaryCta ?? 'Church Leader Portal'}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, secondaryCta: e.target.value },
                        }))
                      }
                    />
                  </CmsField>
                </div>
              </CmsSectionCard>
              ) : null}

              {webSection === 'pillars' ? (
              <CmsSectionCard
                title="Landing pillar cards"
                description="Section header and three discipleship cards on the public landing page."
                saveLabel="Save pillars"
                saving={saving}
                onSave={handleSave}
              >
                <div className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-cream/50 p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    Section header
                  </span>
                  <CmsField label="Eyebrow">
                    <input
                      type="text"
                      className="input text-sm"
                      value={webContent.pillars?.eyebrow ?? DEFAULT_LANDING_CONTENT.pillars.eyebrow}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          pillars: {
                            ...DEFAULT_LANDING_CONTENT.pillars,
                            ...prev.pillars,
                            eyebrow: e.target.value,
                          },
                        }))
                      }
                    />
                  </CmsField>
                  <CmsField label="Title">
                    <input
                      type="text"
                      className="input text-sm font-semibold"
                      value={webContent.pillars?.title ?? DEFAULT_LANDING_CONTENT.pillars.title}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          pillars: {
                            ...DEFAULT_LANDING_CONTENT.pillars,
                            ...prev.pillars,
                            title: e.target.value,
                          },
                        }))
                      }
                    />
                  </CmsField>
                  <CmsField label="Subtitle">
                    <textarea
                      rows={2}
                      className="input resize-y text-sm leading-relaxed"
                      value={webContent.pillars?.subtitle ?? DEFAULT_LANDING_CONTENT.pillars.subtitle}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          pillars: {
                            ...DEFAULT_LANDING_CONTENT.pillars,
                            ...prev.pillars,
                            subtitle: e.target.value,
                          },
                        }))
                      }
                    />
                  </CmsField>
                </div>
                {(
                  [
                    ['seek', 'Seek'],
                    ['connect', 'Connect'],
                    ['grow', 'Grow'],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-cream/50 p-3.5"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                      Card · {label}
                    </span>
                    <input
                      type="text"
                      className="input text-sm font-semibold"
                      value={webContent.pillars?.[key]?.title ?? ''}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          pillars: {
                            ...DEFAULT_WEB_CONTENT.pillars,
                            ...prev.pillars,
                            [key]: {
                              ...DEFAULT_WEB_CONTENT.pillars?.[key],
                              ...prev.pillars?.[key],
                              title: e.target.value,
                            },
                          },
                        }))
                      }
                    />
                    <textarea
                      rows={2}
                      className="input resize-y text-sm leading-relaxed"
                      value={webContent.pillars?.[key]?.description ?? ''}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          pillars: {
                            ...DEFAULT_WEB_CONTENT.pillars,
                            ...prev.pillars,
                            [key]: {
                              ...DEFAULT_WEB_CONTENT.pillars?.[key],
                              ...prev.pillars?.[key],
                              description: e.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </CmsSectionCard>
              ) : null}

              {webSection === 'pass' ? (
              <CmsSectionCard
                title="Onboarding pass"
                description="Highlight for church barcode passes and invite setup."
                saveLabel="Save pass section"
                saving={saving}
                onSave={handleSave}
              >
                <CmsField label="Badge">
                    <input
                      type="text"
                    className="input text-sm"
                    value={webContent.passSection?.badge ?? 'Easy Onboarding'}
                    onChange={(e) =>
                      setWebContent((prev) => ({
                        ...prev,
                        passSection: { ...prev.passSection, badge: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Title">
                  <input
                    type="text"
                    className="input text-sm font-semibold"
                    value={webContent.passSection?.title ?? ''}
                    onChange={(e) =>
                      setWebContent((prev) => ({
                        ...prev,
                        passSection: { ...prev.passSection, title: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Description">
                  <textarea
                    rows={3}
                    className="input resize-y text-sm leading-relaxed"
                    value={webContent.passSection?.description ?? ''}
                    onChange={(e) =>
                      setWebContent((prev) => ({
                        ...prev,
                        passSection: { ...prev.passSection, description: e.target.value },
                      }))
                    }
                  />
                </CmsField>
              </CmsSectionCard>
              ) : null}

              {webSection === 'about' ? (
              <CmsSectionCard
                title="Mission & footer"
                description="Brand mission, vision, and footer attribution."
                saveLabel="Save about"
                saving={saving}
                onSave={handleSave}
              >
                <CmsField label="Mission">
                  <input
                    type="text"
                    className="input text-sm"
                    value={webContent.about?.mission ?? ''}
                    onChange={(e) =>
                      setWebContent((prev) => ({
                        ...prev,
                        about: { ...prev.about, mission: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <CmsField label="Vision">
                  <input
                    type="text"
                    className="input text-sm"
                    value={webContent.about?.vision ?? ''}
                    onChange={(e) =>
                      setWebContent((prev) => ({
                        ...prev,
                        about: { ...prev.about, vision: e.target.value },
                      }))
                    }
                  />
                </CmsField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CmsField label="Footer tagline">
                    <input
                      type="text"
                      className="input text-sm"
                      value={webContent.footer?.tagline ?? ''}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          footer: { ...prev.footer, tagline: e.target.value },
                        }))
                      }
                    />
                  </CmsField>
                  <CmsField label="Copyright">
                    <input
                      type="text"
                      className="input text-sm"
                      value={webContent.footer?.copyright ?? ''}
                      onChange={(e) =>
                        setWebContent((prev) => ({
                          ...prev,
                          footer: { ...prev.footer, copyright: e.target.value },
                        }))
                      }
                    />
                  </CmsField>
                </div>
              </CmsSectionCard>
              ) : null}
            </>
          )}
        </div>

        {/* Right: live preview — web shows full stacked page (not sticky/cropped) */}
        <div
          className={`flex flex-col gap-4 ${
            platform === 'web' ? '' : 'xl:sticky xl:top-20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Live preview
            </span>
            <Badge kind="info">{platform === 'mobile' ? 'Mobile' : 'Web'}</Badge>
          </div>

          {platform === 'mobile' ? (
            mobileSection === 'welcome' ? (
              <MobileWelcomeOnboardingPreview content={mobileContent} />
            ) : (
              <MobileExplorerHomePreview content={mobileContent} />
            )
          ) : (
            <WebLandingPreview content={webContent} />
          )}
        </div>
      </div>
    </div>
  );
}
