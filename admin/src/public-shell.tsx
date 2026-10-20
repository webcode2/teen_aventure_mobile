import { publicApi } from './api';
import type { LandingCmsContent } from './pages-landing';
import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Brand } from './ui';

export const PublicCopy = createContext<LandingCmsContent | null>(null);

type PublicTab = 'home' | 'about' | 'privacy' | 'contact' | 'ministry' | 'portal';

export interface PublicLayoutProps {
  children: ReactNode;
  content?: LandingCmsContent | null;
  activeTab?: PublicTab;
  /** CMS mini preview: compact chrome that fits a narrow column. */
  stacked?: boolean;
}

export function PublicHeader({
  activeTab,
  stacked = false,
}: {
  activeTab?: PublicTab;
  stacked?: boolean;
}) {
  const copy = useContext(PublicCopy);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  if (stacked) {
    return (
      <header data-cms-section="header" className="border-b border-border/80 bg-surface px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Brand size="header" />
          <span className="rounded-lg border border-navy px-2.5 py-1 text-[10px] font-bold text-navy">
            {copy?.header?.signInLabel ?? 'Sign up / Login'}
          </span>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div
            onClick={() => handleNavClick('/')}
            className="flex items-center gap-3 cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNavClick('/')}
          >
            <Brand size="header" />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm lg:text-base font-bold text-muted">
            <button
              type="button"
              onClick={() => handleNavClick('/')}
              className={`transition-colors cursor-pointer ${
                activeTab === 'home' ? 'text-navy font-extrabold' : 'hover:text-navy'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('/about')}
              className={`transition-colors cursor-pointer ${
                activeTab === 'about' ? 'text-navy font-extrabold' : 'hover:text-navy'
              }`}
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('/contact')}
              className={`transition-colors cursor-pointer ${
                activeTab === 'contact' ? 'text-navy font-extrabold' : 'hover:text-navy'
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleNavClick('/ministry')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-2xs hover:-translate-y-0.5 ${
                activeTab === 'ministry'
                  ? 'bg-teal text-white'
                  : 'border border-navy text-navy hover:bg-navy hover:text-white'
              }`}
            >
              {copy?.header?.signInLabel ?? 'Sign up / Login'}
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-navy hover:bg-surface-2 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-border flex flex-col gap-2 pb-2 animate-fade-in">
            <button
              type="button"
              onClick={() => handleNavClick('/')}
              className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-bold ${
                activeTab === 'home' ? 'bg-teal-tint text-teal font-extrabold' : 'text-navy hover:bg-surface-2'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('/about')}
              className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-bold ${
                activeTab === 'about' ? 'bg-teal-tint text-teal font-extrabold' : 'text-navy hover:bg-surface-2'
              }`}
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('/contact')}
              className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-bold ${
                activeTab === 'contact' ? 'bg-teal-tint text-teal font-extrabold' : 'text-navy hover:bg-surface-2'
              }`}
            >
              Contact Us
            </button>
            <div className="pt-2 border-t border-border/60 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('/ministry')}
                className={`flex-1 text-center py-2.5 rounded-xl text-sm font-bold ${
                  activeTab === 'ministry' ? 'bg-teal text-white' : 'border border-navy text-navy'
                }`}
              >
                {copy?.header?.signInLabel ?? 'Sign up / Login'}
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export function GooglePlayIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M3.609 1.814L13.792 12 3.61 22.186A2.213 2.213 0 0 1 3 20.627V3.373c0-.622.256-1.189.609-1.559z"
        fill="#00D3FF"
      />
      <path
        d="M17.186 8.607L13.792 12l3.394 3.393 3.864-2.208a1.378 1.378 0 0 0 0-2.37l-3.864-2.208z"
        fill="#FFD300"
      />
      <path
        d="M3.609 22.186L13.792 12l3.394 3.393-11.233 6.42c-.655.374-1.423.237-1.953-.193l-.391-.434z"
        fill="#FF3333"
      />
      <path
        d="M3.609 1.814l.391-.434c.53-.43 1.298-.567 1.953-.193l11.233 6.42L13.792 12 3.609 1.814z"
        fill="#00E676"
      />
    </svg>
  );
}

export function GooglePlayButton({
  href = "https://play.google.com/store/apps/details?id=com.askhub.teenbibleadventures",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-teal border border-white/15 text-white transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${className}`}
    >
      <GooglePlayIcon className="w-5 h-5 shrink-0" />
      <div className="flex flex-col text-left leading-none">
        <span className="text-[9px] uppercase font-bold tracking-wider text-cream/75">GET IT ON</span>
        <span className="text-xs sm:text-sm font-extrabold tracking-tight text-white mt-0.5">Google Play</span>
      </div>
    </a>
  );
}

export function AppleAppStoreIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.58.66-1.09 1.73-.95 2.76 1 .08 2.05-.51 2.67-1.26z" />
    </svg>
  );
}

export function AppStoreButton({
  href = "https://apps.apple.com/app/teen-bible-adventures/id123456789",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-teal border border-white/15 text-white transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${className}`}
    >
      <AppleAppStoreIcon className="w-5 h-5 shrink-0 fill-current text-white" />
      <div className="flex flex-col text-left leading-none">
        <span className="text-[9px] uppercase font-bold tracking-wider text-cream/75">Download on the</span>
        <span className="text-xs sm:text-sm font-extrabold tracking-tight text-white mt-0.5">App Store</span>
      </div>
    </a>
  );
}

export function PublicFooter({ stacked = false }: { stacked?: boolean }) {
  const copy = useContext(PublicCopy);
  const navigate = useNavigate();

  return (
    <footer
      data-cms-section="footer"
      className={`mt-auto bg-navy text-cream text-xs ${stacked ? 'py-8 px-4' : 'py-12 px-4 sm:px-8'}`}
    >
      <div
        className={`max-w-7xl mx-auto grid gap-8 border-b border-white/10 pb-10 ${
          stacked ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'
        }`}
      >
        {/* Brand Column */}
        <div className={`flex flex-col gap-3 ${stacked ? '' : 'md:col-span-1'}`}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">Teen Bible Adventures</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gold font-bold">
              Faith &bull; Discipleship
            </span>
          </div>
          <p className="text-cream/70 text-xs leading-relaxed">
            {copy?.footer?.tagline ?? 'Christian faith discipleship designed for contemporary teenagers. Connecting teens and families through interactive scripture journeys.'}
          </p>
          <div className="text-[11px] text-cream/50 mt-1">
            Empowered by Teen Bible Adventures &bull; 100% Ad-free &bull; Parent-verified
          </div>
        </div>

        {/* Explore Platform Column */}
        <div className="flex flex-col gap-2.5">
          <h4 className="font-bold text-gold text-xs uppercase tracking-wider">Explore Platform</h4>
          <a href="/#quests" className="text-cream/70 hover:text-white transition-colors">
            Weekly Scripture Quests
          </a>
          <a href="/#safeguarding" className="text-cream/70 hover:text-white transition-colors">
            Family Safeguarding
          </a>
          <a href="/#onboarding" className="text-cream/70 hover:text-white transition-colors">
            Getting Started Pass
          </a>
          <button
            type="button"
            onClick={() => navigate('/about')}
            className="text-left text-cream/70 hover:text-white transition-colors cursor-pointer"
          >
            Our Mission &amp; Story
          </button>
        </div>

        {/* Portals & Leadership Column */}
        <div className="flex flex-col gap-2.5">
          <h4 className="font-bold text-gold text-xs uppercase tracking-wider">Portals &amp; Operations</h4>
          <button
            type="button"
            onClick={() => navigate('/ministry')}
            className="text-left text-cream/70 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Ministry</span>
            <span className="text-xs">⛪</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/dashboard')}
            className="text-left text-cream/70 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Admin Dashboard</span>
            <span className="text-xs">🛡️</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/p/privacy-policy')}
            className="text-left text-cream/70 hover:text-white transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => navigate('/p/terms-of-service')}
            className="text-left text-cream/70 hover:text-white transition-colors cursor-pointer"
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => navigate('/p/data-collection')}
            className="text-left text-cream/70 hover:text-white transition-colors cursor-pointer"
          >
            Data Collection
          </button>
          <button
            type="button"
            onClick={() => navigate('/contact')}
            className="text-left text-cream/70 hover:text-white transition-colors cursor-pointer"
          >
            Contact &amp; Support
          </button>
        </div>

        {/* Connect & Mobile App Column */}
        <div className="flex flex-col gap-3">
          <h4 className="font-bold text-gold text-xs uppercase tracking-wider">Get the Mobile App</h4>
          {copy?.footer?.supportEmail && <a className="break-words text-cream/80" href={`mailto:${copy.footer.supportEmail}`}>{copy.footer.supportEmail}</a>}
          <p className="text-cream/70 text-xs leading-relaxed">
            Download Teen Bible Adventures for Android and iOS devices.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <GooglePlayButton className="w-[168px] shrink-0 justify-start" />
            <AppStoreButton className="w-[168px] shrink-0 justify-start" />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className={`max-w-7xl mx-auto flex items-center justify-between gap-3 pt-6 text-xs text-cream/60 ${
          stacked ? 'flex-col text-center' : 'flex-col sm:flex-row'
        }`}
      >
        <p>{copy?.footer?.copyright ?? `© ${new Date().getFullYear()} Teen Bible Adventures. All rights reserved.`}</p>
        <div className={`flex items-center gap-4 text-cream/70 ${stacked ? 'flex-wrap justify-center' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/ministry')}
            className="hover:text-gold transition-colors cursor-pointer"
          >
            Ministry
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => navigate('/app/dashboard')}
            className="hover:text-gold transition-colors cursor-pointer"
          >
            Admin Dashboard
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="hover:text-gold transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <span>&bull;</span>
          <button type="button" onClick={() => navigate('/delete-account')} className="hover:text-gold transition-colors cursor-pointer">Delete account</button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => navigate('/terms')}
            className="hover:text-gold transition-colors cursor-pointer"
          >
            Terms
          </button>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children, activeTab, stacked = false, content }: PublicLayoutProps) {
  const [remote, setRemote] = useState<LandingCmsContent | null>(null);
  useEffect(() => {
    if (content !== undefined) return;
    let cancelled = false;
    publicApi<LandingCmsContent>('/api/content/web').then(value => { if (!cancelled) setRemote(value); }).catch(() => {});
    return () => { cancelled = true; };
  }, [content]);
  return <PublicCopy.Provider value={content === undefined ? remote : content}>
    <div className="flex min-h-screen flex-col bg-cream font-sans text-navy">
      <PublicHeader activeTab={activeTab} stacked={stacked} />
      <main className="flex-1">{children}</main>
      <PublicFooter stacked={stacked} />
    </div>
  </PublicCopy.Provider>;
}
