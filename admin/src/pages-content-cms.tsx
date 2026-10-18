import { AppResourceAlerts } from './app-resource-alerts';
import { createPortal } from 'react-dom';
import { AboutPage } from './pages-about';
import { ContactPage } from './pages-contact';
import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
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
import { cmsFields, cmsLists, mergeCms, setCmsField, validateCms } from './cms-fields';

/** Map CMS section keys to the `data-cms-section` (or -also) anchor in the phone preview. */
const WEB_PREVIEW_ANCHOR: Record<string, string> = {
  header: 'header',
  hero: 'hero',
  pillars: 'pillars',
  mission: 'mission',
  about: 'mission',
  passSection: 'onboarding',
  onboarding: 'onboarding',
  safeguarding: 'safeguarding',
  footer: 'footer',
};

function scrollPreviewToSection(root: HTMLElement | null, sectionKey: string) {
  if (!root || !sectionKey) return;
  const anchor = WEB_PREVIEW_ANCHOR[sectionKey] ?? sectionKey;
  const target =
    root.querySelector<HTMLElement>(`[data-cms-section="${anchor}"]`) ??
    root.querySelector<HTMLElement>(`[data-cms-section-also="${sectionKey}"]`) ??
    root.querySelector<HTMLElement>(`[data-cms-section="${sectionKey}"]`);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function CmsSectionCard({
  title,
  description,
  saveLabel,
  saving,
  disabled = false,
  onSave,
  headerExtra,
  children,
}: {
  title: string;
  description: string;
  saveLabel: string;
  saving: boolean;
  disabled?: boolean;
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
        <Button type="button" disabled={saving || disabled} onClick={onSave}>
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
      <span className="text-[12px] font-semibold capitalize text-navy">{label}</span>
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
  home: { todayTitle: "Today's Quest", declarationTitle: 'Word Declaration', watched: 'Watched', finished: 'Finished', caughtUp: "You're caught up", allDone: "You've finished every week!", startReading: 'Start Reading', offline: "You're offline" },
  navigation: { home: 'Home', achievements: 'Achievements', quest: 'Quest', groups: 'Groups', classes: 'Classes', profile: 'Profile' },
  quest: {
    title: 'Quest journey',
    myQuest: 'My quest',
    loading: 'Loading your trail…',
    finish: 'Journey finish · Quest 52',
    youAreHere: 'YOU ARE HERE',
    progress: 'Quest {current} of {total}',
  },
  legalLinks: { privacyUrl: '/p/privacy-policy', termsUrl: '/p/terms-of-service', dataCollectionUrl: '/p/data-collection', aboutUrl: '/about', contactUrl: '/contact' },
  system: {
    minVersion: '1.0.0',
    maintenanceMode: false,
    maintenanceMessage: "We're making Teen Bible Adventures even better. Back shortly!",
  },
};

const DEFAULT_WEB_CONTENT: LandingCmsContent = DEFAULT_LANDING_CONTENT;
const SECTION_LABELS: Record<string, string> = {
  legalLinks: 'Legal & resource links', faq: 'Frequently asked questions', aboutPage: 'About page text', contactPage: 'Contact page text', header: 'Header & announcement strip', home: 'Home activity labels', navigation: 'App navigation', hero: 'Hero & calls to action', announcement: 'Home announcement', welcome: 'Welcome & onboarding',
  pillars: 'Pillars', messages: 'Success & support', system: 'App configuration', quest: 'Quest journey',
  passSection: 'Getting started', about: 'Mission & vision', footer: 'Footer',
  mission: 'Discipleship & benefits', onboarding: 'Onboarding steps', safeguarding: 'Safeguarding', layout: 'Section visibility',
};

/** An isolated viewport makes responsive breakpoints match the selected device. */
function WebLandingPreview({ content, focusSection, device }: {
  content: LandingCmsContent;
  focusSection: string;
  device: 'desktop' | 'mobile';
}) {
  const host = useRef<HTMLDivElement>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [availableWidth, setAvailableWidth] = useState(480);
  const viewportWidth = device === 'desktop' ? 1280 : 390;
  const scale = Math.min(1, availableWidth / viewportWidth);

  useEffect(() => {
    if (!host.current) return;
    const measure = () => setAvailableWidth(host.current?.clientWidth || 480);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => scrollPreviewToSection(previewDocument?.body ?? null, focusSection), 80);
    return () => window.clearTimeout(id);
  }, [focusSection, previewDocument, device]);

  const prepare = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.head.replaceChildren();
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => doc.head.append(style.cloneNode(true)));
    doc.documentElement.style.background = '#fcfefc';
    doc.body.style.margin = '0';
    setPreviewDocument(doc);
  }, []);

  return <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
    <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2 text-xs text-muted">
      <span className="h-2.5 w-2.5 rounded-full bg-teal" />
      <span className="flex-1 truncate">teenbibleadventures.app</span>
      <span>{viewportWidth}px</span>
    </div>
    <div ref={host} className="relative h-[min(850px,75vh)] overflow-hidden bg-cream">
      <iframe ref={prepare} title={`${device === 'desktop' ? 'Desktop' : 'Mobile'} website preview`} onLoad={event => prepare(event.currentTarget)}
        className="absolute left-1/2 top-0 border-0 bg-cream"
        style={{ width: viewportWidth, height: `${100 / scale}%`, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }} />
      {previewDocument && createPortal(
        <div className="pointer-events-none select-none">
          {focusSection === 'aboutPage' ? <AboutPage content={content.aboutPage} /> : focusSection === 'contactPage' ? <ContactPage content={content.contactPage} /> : (
            <PublicLayout activeTab="home" content={content} stacked={device === 'mobile'}>
              <LandingPageSections content={content} interactive={false} stacked={device === 'mobile'} />
            </PublicLayout>
          )}
        </div>, previewDocument.body)}
    </div>
  </div>;
}

function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-[min(720px,calc(100vh-7rem))] w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border-[5px] border-navy bg-[#fcfefc] font-sans shadow-xl">
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
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
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
  focusSection,
}: {
  content: typeof DEFAULT_MOBILE_CONTENT;
  focusSection: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const id = window.setTimeout(() => {
      if (focusSection === 'hero') {
        root.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const target = root.querySelector<HTMLElement>(`[data-cms-section="${focusSection}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => window.clearTimeout(id);
  }, [focusSection]);

  return (
    <PhoneChrome>
      {/* Hero pinned under app bar; quest list scrolls below */}
      <div data-cms-section="hero" className="shrink-0 bg-[#fcfefc] px-3 pt-2">
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

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#fcfefc] px-3 pb-4 pt-3 scrollbar-none"
      >
        {content.system?.maintenanceMode ? (
          <div
            data-cms-section="system"
            className="rounded-xl border border-error/30 bg-error-bg p-2.5 text-center"
          >
            <span className="block text-[11px] font-bold text-error">Maintenance Mode</span>
            <span className="text-[10px] text-navy/80">{content.system?.maintenanceMessage}</span>
          </div>
        ) : null}

        {content.announcement?.enabled ? (
          <div
            data-cms-section="announcement"
            className="flex items-center justify-between gap-2 rounded-xl border border-orange/30 bg-orange/15 px-2.5 py-2"
          >
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
  return <CmsWorkspace key={platform} platform={platform} />;
}

function CmsWorkspace({ platform }: { platform: PlatformType }) {
  const navigate = useNavigate();
  const defaults = platform === 'mobile' ? DEFAULT_MOBILE_CONTENT : DEFAULT_WEB_CONTENT;
  const [content, setContent] = useState<any>(defaults);
  const [baseline, setBaseline] = useState(JSON.stringify(defaults));
  const [section, setSection] = useState('hero');
  const [query, setQuery] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remoteReady, setRemoteReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [future, setFuture] = useState<any[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const draftKey = `askhub_cms_draft_${platform}`;
  const dirty = JSON.stringify(content) !== baseline;
  const fields = cmsFields(content);
  const errors = validateCms(content);
  const matches = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase());
  const sectionOrder = ['legalLinks', 'header', 'hero', 'pillars', 'mission', 'about', 'passSection', 'onboarding', 'safeguarding', 'footer', 'aboutPage', 'contactPage', 'faq', 'layout', 'announcement', 'welcome', 'home', 'quest', 'navigation', 'messages', 'system'];
  const sections = Object.keys(defaults).sort((a, b) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b)).filter(key => !query || matches(SECTION_LABELS[key] ?? key) || fields.some(field => field.path[0] === key && matches(`${field.label} ${field.value}`)));
  const displayed = query ? sections : [section];

  useEffect(() => {
    let cancelled = false;
    api<any>(`/api/admin/content/${platform}`).then(remote => {
      if (cancelled) return;
      const loaded = mergeCms(defaults, remote);
      setRemoteReady(true);
      setBaseline(JSON.stringify(loaded));
      let draft: unknown;
      try { const raw = localStorage.getItem(draftKey); if (raw) draft = JSON.parse(raw); } catch { /* unavailable storage */ }
      setContent(draft ? mergeCms(loaded, draft) : loaded);
      if (draft) setNotice('Restored your browser draft. Save changes to update the live content.');
    }).catch(() => {
      if (!cancelled) setError('Could not load live content. Reload before publishing to avoid overwriting newer changes.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [platform]);

  useEffect(() => {
    if (loading) return;
    try { if (dirty) localStorage.setItem(draftKey, JSON.stringify(content)); else if (remoteReady) localStorage.removeItem(draftKey); } catch { /* editing remains available */ }
  }, [content, dirty, loading, draftKey]);

  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);

  const edit = (next: any) => {
    setHistory(previous => [...previous.slice(-39), content]);
    setFuture([]); setContent(next); setNotice(null);
  };
  const save = async () => {
    if (loading || !remoteReady || saving || errors.length) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const response = await api<any>(`/api/admin/content/${platform}`, { method: 'PUT', body: JSON.stringify(content) });
      const saved = mergeCms(content, response);
      setContent(saved); setBaseline(JSON.stringify(saved)); setHistory([]); setFuture([]);
      try { localStorage.removeItem(draftKey); } catch { /* saved remotely */ }
      setNotice('Saved to the live platform.');
    } catch (err) {
      setError(`Not published. Your edits remain in the editor. ${err instanceof Error ? err.message : 'Please retry.'}`);
    } finally { setSaving(false); }
  };
  const resetSection = async () => {
    if (!(await askConfirm(`Restore default text for ${SECTION_LABELS[section] ?? section}? This stays a draft until saved.`, { title: 'Reset section', confirmLabel: 'Reset section', tone: 'danger' }))) return;
    edit({ ...content, [section]: structuredClone((defaults as any)[section]) });
  };
  const switchPlatform = async (next: PlatformType) => {
    if (dirty && !(await askConfirm('Leave this editor? Your draft is kept in this browser.', { title: 'Unsaved changes', confirmLabel: 'Switch platform' }))) return;
    navigate(`/app/dashboard/content-${next}`);
  };
  const upload = async (field: string, file: File) => {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) { setError('Choose an image smaller than 8 MB.'); return; }
    setUploading(true); setError(null);
    try { const response = await apiUpload<{ url: string }>('/api/admin/content/mobile/images', file, field); edit(setCmsField(content, ['hero', `${field}Url`], response.url)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Image upload failed'); }
    finally { setUploading(false); }
  };
  const importContent = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Content files must be smaller than 1 MB.');
      const data = JSON.parse(await file.text());
      if (data.platform !== platform || !data.content || typeof data.content !== 'object' || Array.isArray(data.content)) throw new Error('Choose a content export for this platform.');
      const next = mergeCms(defaults, data.content);
      if (validateCms(next).length) throw new Error(validateCms(next).join(' '));
      edit(next); setNotice('Imported as a draft. Review before saving.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Invalid content file'); }
    if (importRef.current) importRef.current.value = '';
  };
  const exportContent = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ platform, content }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `teen-bible-${platform}-content.json`; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="flex flex-col gap-4 pb-8">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Content studio</p><h1 className="text-xl font-bold text-navy">{platform === 'web' ? 'Website content' : 'App content'}</h1><p className="mt-1 text-sm text-muted">{fields.length} editable fields · {Object.keys(defaults).length} sections</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => switchPlatform(platform === 'web' ? 'mobile' : 'web')}>Open {platform === 'web' ? 'app' : 'website'} editor</Button>
        <Badge kind={dirty ? 'warn' : 'ok'}>{loading ? 'Loading…' : dirty ? 'Unpublished changes' : 'Up to date'}</Badge>
        <Button type="button" disabled={loading || !remoteReady || saving || uploading || !dirty || !!errors.length} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </header>
    {platform === 'mobile' && <AppResourceAlerts refreshKey={baseline} />}
    {error && <div role="alert" className="rounded-xl border border-error/30 bg-error-bg p-3 text-sm text-error">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-forest/30 bg-sage/20 p-3 text-sm text-forest">{notice}</div>}
    {!!errors.length && <div role="alert" className="rounded-xl bg-error-bg p-3 text-sm text-error">{errors.map(message => <p key={message}>{message}</p>)}</div>}
    <div className="flex flex-wrap items-center gap-2">
      <input className="input min-h-11 min-w-48 flex-1 rounded-xl border border-border bg-surface px-3 py-2" aria-label="Search sections and text" placeholder="Search sections, fields, or text…" value={query} onChange={event => setQuery(event.target.value)} />
      <Button type="button" variant="secondary" disabled={!history.length || saving || uploading} onClick={() => { setFuture([content, ...future]); setContent(history.at(-1)); setHistory(history.slice(0, -1)); }}>Undo</Button>
      <Button type="button" variant="secondary" disabled={!future.length || saving || uploading} onClick={() => { setHistory([...history, content]); setContent(future[0]); setFuture(future.slice(1)); }}>Redo</Button>
      <Button type="button" variant="secondary" disabled={loading} onClick={exportContent}>Export</Button>
      <Button type="button" variant="secondary" disabled={loading || saving} onClick={() => importRef.current?.click()}>Import</Button>
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={event => importContent(event.target.files?.[0])} />
    </div>
    <div className={`grid items-start gap-4 ${previewExpanded ? 'grid-cols-1' : 'lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[160px_minmax(280px,1fr)_minmax(440px,1.3fr)]'}`}>
      <nav hidden={previewExpanded} aria-label="Content sections" className={`${previewExpanded ? 'hidden' : 'flex'} gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-2 lg:sticky lg:top-20 lg:flex-col`}>
        {sections.map(key => <button type="button" key={key} aria-current={!query && section === key ? 'page' : undefined} onClick={() => { setSection(key); setQuery(''); }} className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-left text-sm font-semibold ${section === key && !query ? 'bg-navy text-white' : 'text-navy hover:bg-cream'}`}>{SECTION_LABELS[key] ?? key}<span className="ml-2 text-xs opacity-60">{fields.filter(field => field.path[0] === key).length}</span></button>)}
      </nav>
      <div className={previewExpanded ? 'hidden' : 'min-w-0 space-y-4'}>
        {!sections.length && <p className="rounded-xl border border-border p-5 text-muted">No matching content. Try another search.</p>}
        {displayed.map(key => <CmsSectionCard key={key} title={SECTION_LABELS[key] ?? key} description={platform === 'mobile' && ['system', 'pillars'].includes(key) ? 'Stored app configuration. Some app screens use their own built-in defaults.' : 'Edit text, then review the preview before saving to the live platform.'} saveLabel="Save all changes" saving={saving} disabled={loading || !remoteReady || uploading || !!errors.length || !dirty} onSave={save}>
          {platform === 'mobile' && key === 'legalLinks' && <p className="mb-4 text-sm text-muted">Use a published page path such as /p/privacy-policy, or a full HTTPS URL. Links update in the app without a rebuild. External sites must allow embedded viewing; verify them separately.</p>}
          <fieldset disabled={loading || saving || uploading} className="flex min-w-0 flex-col gap-4 border-0 p-0">
            {cmsFields(content[key], [key]).filter(field => !query || matches(`${field.label} ${field.value}`) || matches(SECTION_LABELS[key] ?? key)).map(field => <CmsField key={field.path.join('.')} label={field.label.split(' / ').slice(1).join(' / ')} hint={field.path.at(-1) === 'progress' ? 'Keep {current} and {total} to show the explorer’s level.' : undefined}>
              {typeof field.value === 'boolean' ? <input type="checkbox" checked={field.value} onChange={event => edit(setCmsField(content, field.path, event.target.checked))} /> : typeof field.value === 'number' ? <input className="input" type="number" value={field.value} onChange={event => edit(setCmsField(content, field.path, Number(event.target.value)))} /> : <textarea className="input min-h-20 resize-y rounded-lg border border-border bg-cream/20 px-3 py-2 text-sm focus:outline-2 focus:outline-teal" rows={field.value.length > 150 ? 4 : 2} value={field.value} onChange={event => edit(setCmsField(content, field.path, event.target.value))} />}
            </CmsField>)}
            {cmsLists(content[key], [key]).map(list => <div key={list.path.join('.')} className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-xs font-bold text-navy">{list.path.at(-1)} · {list.value.length} items</p>
              {list.value.map((_, index) => <div className="flex flex-wrap items-center gap-2" key={index}>
                <span className="mr-auto text-xs text-muted">Item {index + 1}</span>
                <Button variant="secondary" disabled={index === 0} aria-label={`Move item ${index + 1} up`} onClick={() => { const items = [...list.value]; [items[index - 1], items[index]] = [items[index], items[index - 1]]; edit(setCmsField(content, list.path, items)); }}>Up</Button>
                <Button variant="secondary" disabled={index === list.value.length - 1} aria-label={`Move item ${index + 1} down`} onClick={() => { const items = [...list.value]; [items[index + 1], items[index]] = [items[index], items[index + 1]]; edit(setCmsField(content, list.path, items)); }}>Down</Button>
                <Button variant="secondary" aria-label={`Remove item ${index + 1}`} onClick={() => { const items = list.value.filter((_, i) => i !== index); edit(setCmsField(content, list.path, items)); }}>Remove</Button>
              </div>)}
              <Button variant="secondary" onClick={() => { const sample = list.value[0] ?? cmsLists((defaults as any)[key], [key]).find(item => item.path.join('.') === list.path.join('.'))?.value[0]; const item = typeof sample === 'string' ? 'New item' : Object.fromEntries(Object.keys(sample as object ?? {}).map((name, i) => [name, i ? '' : 'New item'])); edit(setCmsField(content, list.path, [...list.value, item])); }}>Add item</Button>
            </div>)}
            {platform === 'mobile' && key === 'hero' && <div className="grid gap-3 sm:grid-cols-2">{['abi', 'zack'].map(name => <CmsField key={name} label={`Upload ${name === 'abi' ? 'Abi' : 'Zack'} image`}><input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(name, file); }} /></CmsField>)}</div>}
          </fieldset>
          {!query && <Button type="button" variant="secondary" disabled={loading || saving || uploading} onClick={resetSection}>Reset this section</Button>}
        </CmsSectionCard>)}
      </div>
      <aside className={`min-w-0 space-y-3 ${previewExpanded ? '' : 'lg:col-span-2 xl:col-span-1 xl:sticky xl:top-20'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Preview</h2>
          <div className="flex flex-wrap gap-2">
            {platform === 'web' && <div className="flex gap-1 rounded-lg border border-border bg-surface p-1" aria-label="Preview device">
              {(['desktop', 'mobile'] as const).map(device => <button key={device} type="button" aria-pressed={previewDevice === device} onClick={() => setPreviewDevice(device)} className={`min-h-10 rounded-md px-3 text-sm font-semibold ${previewDevice === device ? 'bg-navy text-white' : 'text-navy hover:bg-cream'}`}>{device === 'desktop' ? 'Desktop' : 'Mobile'}</button>)}
            </div>}
            <Button type="button" variant="secondary" aria-expanded={previewExpanded} onClick={() => setPreviewExpanded(value => !value)}>{previewExpanded ? 'Back to editor' : 'Expand preview'}</Button>
          </div>
        </div>
        {platform === 'web' ? (
          <WebLandingPreview content={content} focusSection={section} device={previewDevice} />
        ) : section === 'welcome' ? (
          <MobileWelcomeOnboardingPreview content={content} />
        ) : section === 'hero' || section === 'announcement' || section === 'system' ? (
          <MobileExplorerHomePreview content={content} focusSection={section} />
        ) : (
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-bold text-navy">{SECTION_LABELS[section]}</h3>
            {cmsFields(content[section]).map((field) => (
              <div key={field.path.join('.')}>
                <p className="text-xs font-semibold text-muted">{field.label}</p>
                <p className="whitespace-pre-wrap break-words text-sm text-navy">{String(field.value)}</p>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  </div>;
}
