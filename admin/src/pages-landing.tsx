import { normalizeContentNames } from '@askhub/puzzle-contracts';
import { LANDING_EXTRA } from './landing-extra';
import { mergeCms, safeCmsUrl } from './cms-fields';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { publicApi } from './api';
import { ChurchJoinBarcodeCard } from './barcode';
import { PublicLayout, GooglePlayButton, AppStoreButton } from './public-shell';
import { WorldMapBackground } from './pages-contact';
import { safeHref } from './safe-html';

function ShieldCheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BookHeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M13.2 8.5a1.5 1.5 0 0 0-2.4 1.7l1.2 1.4 1.2-1.4a1.5 1.5 0 0 0 0-1.7z" />
    </svg>
  );
}

/** CMS-shaped copy used by the public landing and the admin live preview. */
export type LandingCmsContent = Partial<Omit<typeof LANDING_EXTRA, 'header' | 'ministryPage'>> & {
  header?: Partial<typeof LANDING_EXTRA.header>;
  ministryPage?: Partial<typeof LANDING_EXTRA.ministryPage>;
  hero?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    primaryCta?: string;
    secondaryCta?: string;
    primaryCtaHref?: string;
    secondaryCtaHref?: string;
    abiUrl?: string;
    zachUrl?: string;
  };
  pillars?: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    seek?: { title?: string; description?: string };
    connect?: { title?: string; description?: string };
    grow?: { title?: string; description?: string };
  };
  passSection?: {
    badge?: string;
    title?: string;
    description?: string;
  };
  about?: {
    mission?: string;
    vision?: string;
  };
  footer?: {
    tagline?: string;
    supportEmail?: string;
    copyright?: string;
  };
};

export const DEFAULT_LANDING_CONTENT: typeof LANDING_EXTRA & Required<{
  hero: Required<NonNullable<LandingCmsContent['hero']>>;
  pillars: {
    eyebrow: string;
    title: string;
    subtitle: string;
    seek: Required<NonNullable<NonNullable<LandingCmsContent['pillars']>['seek']>>;
    connect: Required<NonNullable<NonNullable<LandingCmsContent['pillars']>['connect']>>;
    grow: Required<NonNullable<NonNullable<LandingCmsContent['pillars']>['grow']>>;
  };
  passSection: Required<NonNullable<LandingCmsContent['passSection']>>;
  about: Required<NonNullable<LandingCmsContent['about']>>;
  footer: Required<NonNullable<LandingCmsContent['footer']>>;
}> = {
  ...LANDING_EXTRA,
  hero: {
    badge: 'Biblical Discipleship for the Next Generation',
    title: 'Nurturing Christian Teens Through Biblical Truth & Faith Adventures.',
    subtitle:
      'Teen Bible Adventures inspires Christian teenagers and families through structured weekly scripture quests, video reflections, interactive Bible quizzes, and engaging scripture puzzles.',
    primaryCtaHref: '#quests',
    secondaryCtaHref: '/about',
    abiUrl: '/abi.png',
    zachUrl: '/zach.png',
    primaryCta: 'Explore Weekly Quests',
    secondaryCta: 'Our Christian Mission',
  },
  pillars: {
    eyebrow: 'Core Foundations',
    title: 'Everything Christian Youth & Families Need to Grow in Faith',
    subtitle:
      'Built specifically for adolescent Christian spiritual growth — engaging for teenagers, reassuring for parents, and centered on Christ.',
    seek: {
      title: 'Weekly Scripture Quests',
      description:
        'Scheduled curriculum featuring scripture reading passages, curated video reflections, and 4-option objective quizzes that build biblical literacy.',
    },
    connect: {
      title: 'Christian Fellowship',
      description:
        'Connect with Christian friends, youth mentors, and family study circles to walk together in daily faith, encouragement, and scripture reading.',
    },
    grow: {
      title: 'Family Safeguarding',
      description:
        "Confidential, ad-free environment where parents retain full oversight of their teens' accounts, protecting their digital spiritual journey.",
    },
  },
  passSection: {
    badge: 'Getting Started',
    title: 'How Christian Teens & Families Journey Together',
    description: 'Simple, safe, and engaging. Begin your weekly scripture adventure in three easy steps.',
  },
  about: {
    mission: 'To spark lifelong faith in adolescents through Christ-centered discipleship.',
    vision: "Every teen anchored in God's Truth, walking in wisdom and Christian community.",
  },
  footer: {
    tagline: 'Teen Bible Adventures — An AskAdonai Ministry Product',
    supportEmail: 'support@askhub.app',
    copyright: '© 2026 Teen Bible Adventures. All rights reserved.',
  },
};

function pick(value: string | undefined, fallback: string) {
  return typeof value === 'string' ? value.trim() : fallback;
}

/** Badge can be cleared in the CMS — empty string hides it on the public site. */
function pickBadge(value: string | undefined, fallback: string, fromCms: boolean) {
  if (!fromCms) return fallback;
  if (value === undefined) return fallback;
  return value.trim();
}

export function mergeLandingContent(extra?: LandingCmsContent | null): typeof DEFAULT_LANDING_CONTENT {
  extra = normalizeContentNames(extra);
  const fromCms = extra != null;
  return {
    ...mergeCms(LANDING_EXTRA, extra),
    hero: {
      primaryCtaHref: safeCmsUrl(extra?.hero?.primaryCtaHref, '#quests'),
      secondaryCtaHref: safeCmsUrl(extra?.hero?.secondaryCtaHref, '/about'),
      abiUrl: safeCmsUrl(extra?.hero?.abiUrl, '/abi.png'),
      zachUrl: safeCmsUrl(extra?.hero?.zachUrl, '/zach.png'),
      badge: pickBadge(extra?.hero?.badge, DEFAULT_LANDING_CONTENT.hero.badge, fromCms),
      title: pick(extra?.hero?.title, DEFAULT_LANDING_CONTENT.hero.title),
      subtitle: pick(extra?.hero?.subtitle, DEFAULT_LANDING_CONTENT.hero.subtitle),
      primaryCta: pick(extra?.hero?.primaryCta, DEFAULT_LANDING_CONTENT.hero.primaryCta),
      secondaryCta: pick(extra?.hero?.secondaryCta, DEFAULT_LANDING_CONTENT.hero.secondaryCta),
    },
    pillars: {
      eyebrow: pick(extra?.pillars?.eyebrow, DEFAULT_LANDING_CONTENT.pillars.eyebrow),
      title: pick(extra?.pillars?.title, DEFAULT_LANDING_CONTENT.pillars.title),
      subtitle: pick(extra?.pillars?.subtitle, DEFAULT_LANDING_CONTENT.pillars.subtitle),
      seek: {
        title: pick(extra?.pillars?.seek?.title, DEFAULT_LANDING_CONTENT.pillars.seek.title),
        description: pick(
          extra?.pillars?.seek?.description,
          DEFAULT_LANDING_CONTENT.pillars.seek.description,
        ),
      },
      connect: {
        title: pick(extra?.pillars?.connect?.title, DEFAULT_LANDING_CONTENT.pillars.connect.title),
        description: pick(
          extra?.pillars?.connect?.description,
          DEFAULT_LANDING_CONTENT.pillars.connect.description,
        ),
      },
      grow: {
        title: pick(extra?.pillars?.grow?.title, DEFAULT_LANDING_CONTENT.pillars.grow.title),
        description: pick(
          extra?.pillars?.grow?.description,
          DEFAULT_LANDING_CONTENT.pillars.grow.description,
        ),
      },
    },
    passSection: {
      badge: pick(extra?.passSection?.badge, DEFAULT_LANDING_CONTENT.passSection.badge),
      title: pick(extra?.passSection?.title, DEFAULT_LANDING_CONTENT.passSection.title),
      description: pick(
        extra?.passSection?.description,
        DEFAULT_LANDING_CONTENT.passSection.description,
      ),
    },
    about: {
      mission: pick(extra?.about?.mission, DEFAULT_LANDING_CONTENT.about.mission),
      vision: pick(extra?.about?.vision, DEFAULT_LANDING_CONTENT.about.vision),
    },
    footer: {
      tagline: pick(extra?.footer?.tagline, DEFAULT_LANDING_CONTENT.footer.tagline),
      supportEmail: pick(extra?.footer?.supportEmail, DEFAULT_LANDING_CONTENT.footer.supportEmail),
      copyright: pick(extra?.footer?.copyright, DEFAULT_LANDING_CONTENT.footer.copyright),
    },
  };
}

export type LandingPageSectionsProps = {
  content?: LandingCmsContent | null;
  /** When false, CTAs render as inert elements (CMS preview). */
  interactive?: boolean;
  /** Force narrow/mobile stacking for CMS preview (viewport breakpoints don't apply in a mini column). */
  stacked?: boolean;
};

/** Shared landing body — used by the public site and the CMS mini preview. */
export function LandingPageSections({
  content,
  interactive = true,
  stacked = false,
}: LandingPageSectionsProps) {
  const navigate = useNavigate();
  const copy = mergeLandingContent(content);

  const primaryCtaClass = stacked
    ? 'w-full justify-center px-5 py-3 rounded-xl bg-navy text-white text-xs font-bold shadow-card inline-flex items-center gap-2'
    : 'px-8 py-4 rounded-xl bg-navy hover:bg-teal text-white text-sm font-bold shadow-card transition-all inline-flex items-center gap-2';
  const secondaryCtaClass = stacked
    ? 'w-full justify-center px-5 py-3 rounded-xl border border-border bg-surface text-navy text-xs font-bold shadow-xs inline-flex'
    : 'px-8 py-4 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy text-sm font-bold transition-all shadow-xs';

  return (
    <>
      {/* Hero Section */}
      <section
        data-cms-section="hero"
        hidden={!copy.layout.hero}
        className={`relative overflow-hidden border-b border-border/60 ${
          stacked ? 'px-4 pt-10 pb-12' : 'pt-16 pb-24 sm:pt-28 sm:pb-36 px-4 sm:px-8'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 12% 18%, rgba(21,154,156,0.18), transparent 55%), radial-gradient(ellipse 70% 55% at 88% 12%, rgba(244,185,66,0.16), transparent 50%), radial-gradient(ellipse 55% 45% at 78% 88%, rgba(232,117,36,0.10), transparent 55%), radial-gradient(ellipse 50% 40% at 18% 92%, rgba(1,31,59,0.06), transparent 50%), linear-gradient(165deg, #eef7f7 0%, #fcfefc 42%, #fff8ee 100%)',
            }}
          />
          <svg className="absolute inset-0 h-full w-full opacity-[0.45]" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="tba-hero-dots" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.15" fill="#011f3b" opacity="0.08" />
              </pattern>
              <linearGradient id="tba-hero-arc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#159a9c" stopOpacity="0.35" />
                <stop offset="55%" stopColor="#f4b942" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#e87524" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            <rect width="1200" height="720" fill="url(#tba-hero-dots)" />
            <path
              d="M-40 520 C 180 380, 320 620, 520 470 S 860 280, 1240 420"
              fill="none"
              stroke="url(#tba-hero-arc)"
              strokeWidth="64"
              strokeLinecap="round"
              opacity="0.35"
            />
            <path
              d="M-20 180 C 220 80, 420 260, 640 140 S 980 40, 1260 160"
              fill="none"
              stroke="#159a9c"
              strokeWidth="2.5"
              opacity="0.18"
            />
            <path
              d="M80 680 C 300 560, 480 700, 700 580 S 1020 480, 1220 560"
              fill="none"
              stroke="#011f3b"
              strokeWidth="1.5"
              opacity="0.12"
            />
            <circle cx="180" cy="140" r="120" fill="none" stroke="#159a9c" strokeWidth="1.25" opacity="0.16" />
            <circle cx="180" cy="140" r="72" fill="none" stroke="#159a9c" strokeWidth="1" opacity="0.12" />
            <circle cx="1040" cy="560" r="160" fill="none" stroke="#f4b942" strokeWidth="1.25" opacity="0.18" />
            <circle cx="1040" cy="560" r="96" fill="none" stroke="#e87524" strokeWidth="1" opacity="0.12" />
            <circle cx="980" cy="120" r="8" fill="#f4b942" opacity="0.35" />
            <circle cx="240" cy="600" r="6" fill="#159a9c" opacity="0.3" />
            <circle cx="720" cy="80" r="5" fill="#011f3b" opacity="0.15" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#fcfefc] to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Public site: headline spans full hero width (not squeezed between character columns). */}
          {!stacked ? (
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-7 px-2 pb-10 text-center sm:px-4">
              {copy.hero.badge ? (
                <span className="inline-flex max-w-full items-center justify-center rounded-full border border-teal/25 bg-teal/10 px-3.5 py-1.5 text-center text-[10px] font-bold uppercase leading-snug tracking-[0.06em] text-teal text-balance whitespace-normal sm:max-w-xl sm:px-4 sm:text-[11px] sm:tracking-wider">
                  {copy.hero.badge}
                </span>
              ) : null}
              <h1 className="w-full max-w-4xl text-3xl font-extrabold leading-[1.1] tracking-tight text-navy sm:text-5xl lg:text-6xl">
                {copy.hero.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-loose text-muted sm:text-base lg:text-lg">
                {copy.hero.subtitle}
              </p>
            </div>
          ) : null}

          <div
            className={`grid items-end gap-8 ${
              stacked ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[280px_1fr_280px]'
            }`}
          >
            {!stacked ? (
              <div className="hidden lg:flex flex-col items-center justify-end gap-3 pb-4 self-end">
                <img
                  src={copy.hero.zachUrl}
                  alt="Zach — Teen Bible Adventures character"
                  className="w-52 h-auto object-contain drop-shadow-xl"
                />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-extrabold text-navy">Zach</span>
                  <span className="text-[11px] font-medium text-muted bg-orange/15 border border-orange/30 px-2.5 py-0.5 rounded-full">
                    Quest Explorer
                  </span>
                </div>
              </div>
            ) : null}

            <div className={`flex flex-col items-center text-center py-6 ${stacked ? 'gap-8' : 'gap-12'}`}>
              {stacked ? (
                <div className="flex flex-col items-center gap-4">
                  {copy.hero.badge ? (
                    <span className="inline-flex max-w-full items-center justify-center rounded-full border border-teal/25 bg-teal/10 px-3.5 py-1.5 text-center text-[10px] font-bold uppercase leading-snug tracking-[0.06em] text-teal text-balance whitespace-normal sm:max-w-xl sm:px-4 sm:text-[11px] sm:tracking-wider">
                      {copy.hero.badge}
                    </span>
                  ) : null}
                  <h1 className="max-w-2xl text-2xl font-extrabold leading-[1.1] tracking-tight text-navy">
                    {copy.hero.title}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-loose text-muted">{copy.hero.subtitle}</p>
                </div>
              ) : null}

              <div
                className={`grid grid-cols-2 gap-3 w-full max-w-sm ${
                  stacked ? '' : 'lg:hidden sm:gap-5 sm:max-w-md'
                }`}
              >
                <figure className="m-0 flex flex-col rounded-2xl border border-orange/25 bg-surface shadow-xs overflow-hidden">
                  <div className="bg-gradient-to-b from-orange/5 to-orange/20 pt-4 px-3 flex items-end justify-center">
                    <img src={copy.hero.zachUrl} alt="Zach" className="w-full max-w-[160px] h-auto object-contain block" />
                  </div>
                  <figcaption className="flex flex-col items-center gap-1 py-2.5 px-2">
                    <span className="text-sm font-extrabold text-navy">Zach</span>
                    <span className="text-[10px] font-semibold text-orange bg-orange/10 border border-orange/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Quest Explorer
                    </span>
                  </figcaption>
                </figure>
                <figure className="m-0 flex flex-col rounded-2xl border border-teal/25 bg-surface shadow-xs overflow-hidden">
                  <div className="bg-gradient-to-b from-teal/5 to-teal/20 pt-4 px-3 flex items-end justify-center">
                    <img src={copy.hero.abiUrl} alt="Abi" className="w-full max-w-[160px] h-auto object-contain block" />
                  </div>
                  <figcaption className="flex flex-col items-center gap-1 py-2.5 px-2">
                    <span className="text-sm font-extrabold text-navy">Abi</span>
                    <span className="text-[10px] font-semibold text-teal bg-teal/10 border border-teal/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Scripture Champion
                    </span>
                  </figcaption>
                </figure>
              </div>

              <div
                className={`mt-2 flex items-center justify-center gap-3 ${
                  stacked ? 'w-full flex-col' : 'flex-wrap gap-4'
                }`}
              >
                {interactive ? (
                  <a href={safeHref(copy.hero.primaryCtaHref)} className={`${primaryCtaClass} cursor-pointer hover:-translate-y-0.5 hover:shadow-lg`}>
                    <span>{copy.hero.primaryCta}</span>
                    <span>→</span>
                  </a>
                ) : (
                  <span className={primaryCtaClass}>
                    <span>{copy.hero.primaryCta}</span>
                    <span>→</span>
                  </span>
                )}
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => { const href = safeHref(copy.hero.secondaryCtaHref, '/'); if (href.startsWith('/')) navigate(href); else window.location.assign(href); }}
                    className={`${secondaryCtaClass} cursor-pointer hover:-translate-y-0.5`}
                  >
                    {copy.hero.secondaryCta}
                  </button>
                ) : (
                  <span className={secondaryCtaClass}>{copy.hero.secondaryCta}</span>
                )}
              </div>

              <div
                className={`mt-4 grid w-full max-w-2xl gap-6 border-t border-border/60 pt-8 text-left ${
                  stacked ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4 gap-8 pt-10'
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <span className={`font-black text-navy ${stacked ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>52 Weeks</span>
                  <span className="text-xs text-text-2 font-medium leading-relaxed">Annual quest journey</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={`font-black text-teal ${stacked ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>100% Biblical</span>
                  <span className="text-xs text-text-2 font-medium leading-relaxed">Scripture-rooted truth</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={`font-black text-navy ${stacked ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>Protected</span>
                  <span className="text-xs text-text-2 font-medium leading-relaxed">
                    Safe &amp; ad-free for kids and families
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={`font-black text-gold ${stacked ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>Interactive</span>
                  <span className="text-xs text-text-2 font-medium leading-relaxed">Quizzes &amp; Bible puzzles</span>
                </div>
              </div>
            </div>

            {!stacked ? (
              <div className="hidden lg:flex flex-col items-center justify-end gap-3 pb-4 self-end">
                <img
                  src={copy.hero.abiUrl}
                  alt="Abi — Teen Bible Adventures character"
                  className="w-52 h-auto object-contain drop-shadow-xl"
                />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-extrabold text-navy">Abi</span>
                  <span className="text-[11px] font-medium text-muted bg-teal/10 border border-teal/30 px-2.5 py-0.5 rounded-full">
                    Scripture Champion
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 3 Pillars */}
      <section
        data-cms-section="pillars"
        hidden={!copy.layout.pillars}
        id="quests"
        className={`bg-surface border-b border-border/60 ${stacked ? 'py-12 px-4' : 'py-16 sm:py-24 px-4 sm:px-8'}`}
      >
        <div className={`max-w-6xl mx-auto flex flex-col ${stacked ? 'gap-8' : 'gap-12'}`}>
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
            {copy.pillars.eyebrow ? (
              <span className="text-sm font-bold uppercase tracking-widest text-teal">{copy.pillars.eyebrow}</span>
            ) : null}
            <h2
              className={`font-extrabold tracking-tight text-navy ${
                stacked ? 'text-2xl' : 'text-3xl sm:text-4xl lg:text-5xl'
              }`}
            >
              {copy.pillars.title}
            </h2>
            <p className={`text-text-2 leading-relaxed ${stacked ? 'text-sm' : 'text-base sm:text-lg'}`}>
              {copy.pillars.subtitle}
            </p>
          </div>

          <div
            className={`grid gap-4 ${
              stacked ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3 gap-6'
            }`}
          >
            <div className="p-5 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3 shadow-xs">
              <div className="h-11 w-11 rounded-xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
                <BookHeartIcon />
              </div>
              <h3 className={`font-extrabold text-navy ${stacked ? 'text-base' : 'text-lg sm:text-xl'}`}>
                {copy.pillars.seek.title}
              </h3>
              <p className="text-sm text-text-2 leading-relaxed">{copy.pillars.seek.description}</p>
            </div>

            <div className="p-5 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3 shadow-xs">
              <div className="h-11 w-11 rounded-xl bg-sage text-forest flex items-center justify-center shrink-0">
                <UsersIcon />
              </div>
              <h3 className={`font-extrabold text-navy ${stacked ? 'text-base' : 'text-lg sm:text-xl'}`}>
                {copy.pillars.connect.title}
              </h3>
              <p className="text-sm text-text-2 leading-relaxed">{copy.pillars.connect.description}</p>
            </div>

            <div className="p-5 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3 shadow-xs">
              <div className="h-11 w-11 rounded-xl bg-gold/20 text-navy flex items-center justify-center shrink-0">
                <ShieldCheckIcon />
              </div>
              <h3 className={`font-extrabold text-navy ${stacked ? 'text-base' : 'text-lg sm:text-xl'}`}>
                {copy.pillars.grow.title}
              </h3>
              <p className="text-sm text-text-2 leading-relaxed">{copy.pillars.grow.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Discipleship + barcode */}
      <section
        data-cms-section="mission"
        data-cms-section-also="about"
        hidden={!copy.layout.mission}
        id="discipleship"
        className={`relative overflow-hidden border-b border-border/60 bg-cream ${
          stacked ? 'py-12 px-4' : 'py-16 sm:py-24 px-4 sm:px-8'
        }`}
      >
        <WorldMapBackground />
        <div
          className={`max-w-6xl mx-auto grid items-center gap-8 ${
            stacked ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12 gap-10'
          }`}
        >
          <div className={`flex flex-col gap-5 ${stacked ? '' : 'lg:col-span-7 gap-6'}`}>
            <h2
              className={`font-black text-navy tracking-tight leading-tight ${
                stacked ? 'text-2xl' : 'text-3xl sm:text-5xl'
              }`}
            >
              {copy.mission.title}
            </h2>

            <p className={`text-text-2 leading-relaxed ${stacked ? 'text-sm' : 'text-base sm:text-lg'}`}>
              {copy.about.mission}
            </p>
            <p className={`text-muted leading-relaxed ${stacked ? 'text-sm' : 'text-sm sm:text-base'}`}>
              {copy.about.vision}
            </p>

            <ul className="flex flex-col gap-3 text-sm font-medium text-navy">
              {copy.mission.benefits.map((benefit, index) => <li key={index} className="flex items-start gap-2.5"><span aria-hidden className="text-teal">✓</span><span>{benefit}</span></li>)}
            </ul>

            <div className={`pt-2 flex gap-3 ${stacked ? 'w-full flex-col' : 'flex-wrap items-center'}`}>
              <div className={`items-stretch gap-3 ${stacked ? 'flex w-full flex-col' : 'hidden lg:flex items-center'}`}>
                <GooglePlayButton className="!bg-navy hover:!bg-teal !text-white !py-2.5 !px-3.5 text-xs w-full justify-start" />
                <AppStoreButton className="!bg-navy hover:!bg-teal !text-white !py-2.5 !px-3.5 text-xs w-full justify-start" />
              </div>
              {interactive ? (
                <a
                  href="#quests"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-navy/20 bg-surface hover:bg-surface-2 text-navy font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs hover:shadow-md"
                >
                  <span>{copy.mission.actionLabel}</span>
                  <span>→</span>
                </a>
              ) : (
                <span className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-navy/20 bg-surface text-navy font-bold text-xs shadow-xs">
                  <span>{copy.mission.actionLabel}</span>
                  <span>→</span>
                </span>
              )}
            </div>
          </div>

          <div className={`flex justify-center ${stacked ? '' : 'lg:col-span-5'}`}>
            <div className="w-full">
              <ChurchJoinBarcodeCard
                joinCode="FAITH52"
                churchName="Christian Discipleship Circle"
                jurisdiction="Global"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding */}
      <section
        data-cms-section="onboarding"
        data-cms-section-also="passSection"
        hidden={!copy.layout.onboarding}
        id="onboarding"
        className={`bg-surface border-b border-border/60 ${stacked ? 'py-12 px-4' : 'py-16 sm:py-24 px-4 sm:px-8'}`}
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-8 text-center">
          <div className="max-w-2xl flex flex-col gap-3">
            <span className="text-sm font-bold uppercase tracking-widest text-teal">{copy.passSection.badge}</span>
            <h2
              className={`font-extrabold tracking-tight text-navy ${
                stacked ? 'text-2xl' : 'text-3xl sm:text-4xl lg:text-5xl'
              }`}
            >
              {copy.passSection.title}
            </h2>
            <p className={`text-text-2 leading-relaxed ${stacked ? 'text-sm' : 'text-base sm:text-lg'}`}>
              {copy.passSection.description}
            </p>
          </div>

          <div
            className={`grid text-left w-full max-w-4xl gap-4 ${
              stacked ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3 gap-6'
            }`}
          >
            {copy.onboarding.steps.map((step, index) => (
              <div key={index} className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-cream p-5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-teal">Step {index + 1}</div>
                <h4 className="text-base font-extrabold text-navy">{step.title}</h4>
                <p className="text-sm leading-relaxed text-text-2">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safeguarding */}
      <section
        data-cms-section="safeguarding"
        hidden={!copy.layout.safeguarding}
        id="safeguarding"
        className={`bg-cream border-b border-border/60 ${stacked ? 'py-10 px-4' : 'py-16 px-4 sm:px-8'}`}
      >
        <div
          className={`max-w-4xl mx-auto flex items-center gap-5 p-5 rounded-2xl bg-surface border border-border shadow-xs ${
            stacked ? 'flex-col text-center' : 'flex-col sm:flex-row p-6 sm:p-8 gap-6'
          }`}
        >
          <div className="h-14 w-14 rounded-2xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
            <ShieldCheckIcon />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-extrabold text-navy">
              {copy.safeguarding.title}
            </h3>
            <p className="text-sm sm:text-base text-text-2 mt-2 leading-relaxed">
              {copy.safeguarding.description}
            </p>
          </div>
          {interactive ? (
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className={`px-5 py-3 rounded-xl bg-navy hover:bg-teal text-white text-xs sm:text-sm font-bold shrink-0 transition-colors cursor-pointer shadow-xs ${
                stacked ? 'w-full' : ''
              }`}
            >
              {copy.safeguarding.actionLabel}
            </button>
          ) : (
            <span
              className={`px-5 py-3 rounded-xl bg-navy text-white text-xs font-bold shrink-0 shadow-xs ${
                stacked ? 'w-full' : ''
              }`}
            >
              {copy.safeguarding.actionLabel}
            </span>
          )}
        </div>
      </section>
    </>
  );
}

export function PublicLandingPage() {
  const [content, setContent] = useState<LandingCmsContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicApi<LandingCmsContent>('/api/content/web')
      .then((res) => {
        if (!cancelled && res) setContent(res);
      })
      .catch(() => {
        /* keep defaults when API is offline */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicLayout activeTab="home" content={content}>
      <LandingPageSections content={content} />
    </PublicLayout>
  );
}
