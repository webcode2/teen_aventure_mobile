import { usePageCopy } from './use-page-copy';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { PublicLayout } from './public-shell';

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SmartphoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function WorldMapBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none flex items-center justify-center select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[340px] bg-teal/15 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[200px] bg-gold/15 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[220px] bg-teal/10 rounded-full blur-3xl -z-10" />

      {/* Stylized World Map with Global Fellowship Nodes */}
      <svg
        viewBox="0 0 1000 460"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-6xl object-contain opacity-75 select-none scale-105"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="mapHubGlowTeal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#0d9488" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mapHubGlowGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mapArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="continentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#111e38" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {/* Global Coordinate Grids */}
        <g stroke="#111e38" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.25">
          <line x1="40" y1="230" x2="960" y2="230" />
          <line x1="40" y1="140" x2="960" y2="140" />
          <line x1="40" y1="320" x2="960" y2="320" />
          <line x1="240" y1="40" x2="240" y2="420" />
          <line x1="500" y1="40" x2="500" y2="420" />
          <line x1="760" y1="40" x2="760" y2="420" />
        </g>

        {/* Continents / Landmass Shapes */}
        {/* North America */}
        <path
          d="M110 85 Q 170 65 245 80 Q 285 95 265 145 Q 235 165 210 210 Q 185 245 165 225 Q 145 190 120 150 Q 95 120 110 85 Z"
          fill="url(#continentGradient)"
          stroke="#0d9488"
          strokeWidth="0.75"
          strokeOpacity="0.35"
        />
        {/* South America */}
        <path
          d="M225 245 Q 285 255 298 310 Q 275 375 250 425 Q 220 395 210 330 Q 210 275 225 245 Z"
          fill="url(#continentGradient)"
          stroke="#0d9488"
          strokeWidth="0.75"
          strokeOpacity="0.35"
        />
        {/* Europe / UK */}
        <path
          d="M440 80 Q 515 70 540 105 Q 520 145 475 145 Q 435 130 440 80 Z"
          fill="url(#continentGradient)"
          stroke="#0d9488"
          strokeWidth="0.75"
          strokeOpacity="0.35"
        />
        {/* Africa */}
        <path
          d="M455 165 Q 540 155 560 215 Q 550 305 505 355 Q 460 335 440 250 Q 430 195 455 165 Z"
          fill="url(#continentGradient)"
          stroke="#0d9488"
          strokeWidth="0.75"
          strokeOpacity="0.35"
        />
        {/* Asia */}
        <path
          d="M545 80 Q 675 60 800 95 Q 840 165 780 230 Q 695 220 635 190 Q 570 160 545 80 Z"
          fill="url(#continentGradient)"
          stroke="#0d9488"
          strokeWidth="0.75"
          strokeOpacity="0.35"
        />
        {/* Australia */}
        <path
          d="M735 305 Q 825 295 835 355 Q 795 405 730 380 Q 705 340 735 305 Z"
          fill="url(#continentGradient)"
          stroke="#0d9488"
          strokeWidth="0.75"
          strokeOpacity="0.35"
        />

        {/* Regional Hub Nodes & Glowing Rings */}
        {/* North America Hub */}
        <circle cx="210" cy="140" r="24" fill="url(#mapHubGlowTeal)" />
        <circle cx="210" cy="140" r="10" stroke="#0d9488" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
        <circle cx="210" cy="140" r="5" fill="#0d9488" />

        {/* UK / Europe Hub */}
        <circle cx="490" cy="115" r="24" fill="url(#mapHubGlowTeal)" />
        <circle cx="490" cy="115" r="10" stroke="#0d9488" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
        <circle cx="490" cy="115" r="5" fill="#0d9488" />

        {/* West Africa / Nigeria Hub */}
        <circle cx="480" cy="235" r="28" fill="url(#mapHubGlowGold)" />
        <circle cx="480" cy="235" r="12" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.9" />
        <circle cx="480" cy="235" r="6" fill="#d97706" />

        {/* Asia Hub */}
        <circle cx="715" cy="155" r="24" fill="url(#mapHubGlowTeal)" />
        <circle cx="715" cy="155" r="10" stroke="#0d9488" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
        <circle cx="715" cy="155" r="5" fill="#0d9488" />

        {/* South America Hub */}
        <circle cx="265" cy="320" r="22" fill="url(#mapHubGlowTeal)" />
        <circle cx="265" cy="320" r="9" stroke="#0d9488" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
        <circle cx="265" cy="320" r="4.5" fill="#0d9488" />

        {/* Australia Hub */}
        <circle cx="780" cy="350" r="22" fill="url(#mapHubGlowTeal)" />
        <circle cx="780" cy="350" r="9" stroke="#0d9488" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
        <circle cx="780" cy="350" r="4.5" fill="#0d9488" />

        {/* Fellowship Connection Arcs */}
        <path
          d="M210 140 Q 350 55 490 115"
          stroke="url(#mapArcGradient)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d="M490 115 Q 515 175 480 235"
          stroke="url(#mapArcGradient)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d="M210 140 Q 320 210 480 235"
          stroke="url(#mapArcGradient)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d="M490 115 Q 605 80 715 155"
          stroke="url(#mapArcGradient)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d="M480 235 Q 635 275 780 350"
          stroke="url(#mapArcGradient)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d="M210 140 Q 215 240 265 320"
          stroke="url(#mapArcGradient)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
      </svg>
    </div>
  );
}

export function ContactPage({ content }: { content?: Record<string, string> } = {}) {
  const pageCopy = usePageCopy('contactPage', content);
  const navigate = useNavigate();

  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('');
  const [role, setRole] = useState('Christian Youth Mentor / Leader');
  const [topic, setTopic] = useState('Study Pass & Code Setup');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  const faqs = usePageCopy('faq').items;

  return (
    <PublicLayout activeTab="contact">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-16 sm:pt-20 sm:pb-20 px-4 sm:px-8 border-b border-border/60">
        <WorldMapBackground />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-tint border border-teal/20 text-teal text-xs font-bold tracking-wide">
            <MailIcon />
            <span>{pageCopy['contactFellowshipSupport']}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-navy tracking-tight">{pageCopy['wereHereToHelp']}</h1>

          <p className="text-xs sm:text-sm text-muted max-w-xl leading-relaxed">{pageCopy['haveQuestionsAboutBringingTeenBibleAdventures']}</p>
        </div>
      </section>

      {/* Direct Contact Channels */}
      <section className="py-12 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Channel 1: Youth Circles & Study Groups */}
            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex flex-col gap-2.5">
                <div className="h-12 w-12 rounded-xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
                  <UsersIcon />
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-navy">{pageCopy['youthCirclesStudyGroups']}</h3>
                <p className="text-sm text-text-2 leading-relaxed">{pageCopy['passCodesMultigroupSetupYouthCircleOnboarding']}</p>
              </div>
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border/60">
                <span className="text-xs sm:text-sm font-bold text-teal font-mono">{pageCopy['fellowshipaskhuborg']}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(pageCopy['fellowshipEmail'])}
                  className="text-left text-xs text-muted hover:text-navy cursor-pointer transition-colors"
                >
                  {copiedEmail === pageCopy['fellowshipEmail'] ? '✓ Copied!' : 'Click to copy email'}
                </button>
              </div>
            </div>

            {/* Channel 2: App Support */}
            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex flex-col gap-2.5">
                <div className="h-12 w-12 rounded-xl bg-gold/20 text-navy flex items-center justify-center shrink-0">
                  <SmartphoneIcon />
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-navy">{pageCopy['appTechSupport']}</h3>
                <p className="text-sm text-text-2 leading-relaxed">{pageCopy['deviceSyncBarcodeScanAssistanceAppBugs']}</p>
              </div>
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border/60">
                <span className="text-xs sm:text-sm font-bold text-teal font-mono">{pageCopy['supportaskhuborg']}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(pageCopy['supportEmail'])}
                  className="text-left text-xs text-muted hover:text-navy cursor-pointer transition-colors"
                >
                  {copiedEmail === pageCopy['supportEmail'] ? '✓ Copied!' : 'Click to copy email'}
                </button>
              </div>
            </div>

            {/* Channel 3: Safeguarding */}
            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex flex-col gap-2.5">
                <div className="h-12 w-12 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                  <ShieldCheckIcon />
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-navy">{pageCopy['safeguardingPrivacy']}</h3>
                <p className="text-sm text-text-2 leading-relaxed">{pageCopy['parentalConsentCoppaInquiriesDataErasure']}</p>
              </div>
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border/60">
                <span className="text-xs sm:text-sm font-bold text-teal font-mono">{pageCopy['safetyaskhuborg']}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(pageCopy['safetyEmail'])}
                  className="text-left text-xs text-muted hover:text-navy cursor-pointer transition-colors"
                >
                  {copiedEmail === pageCopy['safetyEmail'] ? '✓ Copied!' : 'Click to copy email'}
                </button>
              </div>
            </div>

            {/* Channel 4: Support & Sponsorship */}
            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex flex-col gap-2.5">
                <div className="h-12 w-12 rounded-xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
                  <MailIcon />
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-navy">{pageCopy['supportSponsorship']}</h3>
                <p className="text-sm text-text-2 leading-relaxed">{pageCopy['ministrySponsorshipCurriculumSuggestionsPartnerships']}</p>
              </div>
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border/60">
                <span className="text-xs sm:text-sm font-bold text-teal font-mono">{pageCopy['supportaskhuborg14']}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(pageCopy['supportEmail'])}
                  className="text-left text-xs text-muted hover:text-navy cursor-pointer transition-colors"
                >
                  {copiedEmail === pageCopy['supportEmail'] ? '✓ Copied!' : 'Click to copy email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Form & FAQ Grid */}
      <section className="py-16 px-4 sm:px-8 bg-cream">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-xs">
              <h2 className="text-2xl sm:text-3xl font-black text-navy mb-1.5">{pageCopy['sendUsAMessage']}</h2>
              <p className="text-sm text-text-2 mb-6 leading-relaxed">{pageCopy['fillOutTheFormBelowAndOur']}</p>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-sage border border-forest/30 flex flex-col items-center text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-forest text-white flex items-center justify-center">
                    <CheckIcon />
                  </div>
                  <h3 className="font-extrabold text-forest text-base sm:text-lg">{pageCopy['messageSentSuccessfully']}</h3>
                  <p className="text-sm text-navy leading-relaxed max-w-md">{pageCopy['thankYouForReachingOut']}{' '}<strong>{name}</strong>{pageCopy['aConfirmationHasBeenNotedFor']}{' '}<strong>{email}</strong>{pageCopy['ourTeamWillReviewYourInquiryRegarding']}<em>{topic}</em>{pageCopy['shortly']}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setMessage('');
                    }}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-white border border-forest/20 text-forest text-sm font-bold hover:bg-forest/10 cursor-pointer transition-colors"
                  >{pageCopy['sendAnotherMessage']}</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5 text-sm font-bold text-navy">
                      <span>{pageCopy['yourName']}</span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={pageCopy['namePlaceholder']}
                        className="px-4 py-2.5 rounded-xl border border-border bg-cream text-navy text-sm focus:outline-none focus:border-teal"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-bold text-navy">
                      <span>{pageCopy['emailAddress']}</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={pageCopy['emailPlaceholder']}
                        className="px-4 py-2.5 rounded-xl border border-border bg-cream text-navy text-sm focus:outline-none focus:border-teal"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5 text-sm font-bold text-navy">
                      <span>{pageCopy['yourRole']}</span>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-border bg-cream text-navy text-sm focus:outline-none focus:border-teal"
                      >
                        <option>{pageCopy['christianYouthMentorLeader']}</option>
                        <option>{pageCopy['parentGuardian']}</option>
                        <option>{pageCopy['teenStudent']}</option>
                        <option>{pageCopy['familyStudyCircleHost']}</option>
                        <option>{pageCopy['christianEducatorTeacher']}</option>
                        <option>{pageCopy['otherFellowshipPartner']}</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-bold text-navy">
                      <span>{pageCopy['groupStudyCircleOptional']}</span>
                      <input
                        type="text"
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        placeholder={pageCopy['groupPlaceholder']}
                        className="px-4 py-2.5 rounded-xl border border-border bg-cream text-navy text-sm focus:outline-none focus:border-teal"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1.5 text-sm font-bold text-navy">
                    <span>{pageCopy['inquiryTopic']}</span>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-border bg-cream text-navy text-sm focus:outline-none focus:border-teal"
                    >
                      <option>{pageCopy['studyCirclePassCodeSetup']}</option>
                      <option>{pageCopy['supportSponsorshipInquiries']}</option>
                      <option>{pageCopy['mobileAppHelpTroubleshooting']}</option>
                      <option>{pageCopy['safeguardingParentalConsent']}</option>
                      <option>{pageCopy['bibleCurriculumPuzzleIdeas']}</option>
                      <option>{pageCopy['otherQuestions']}</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm font-bold text-navy">
                    <span>{pageCopy['message']}</span>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={pageCopy['messagePlaceholder']}
                      className="px-4 py-2.5 rounded-xl border border-border bg-cream text-navy text-sm focus:outline-none focus:border-teal resize-none"
                    />
                  </label>

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <span className="text-xs text-muted">{pageCopy['requiredFields']}</span>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-7 py-3 rounded-xl bg-teal hover:bg-teal/90 text-white font-bold text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Sending...' : 'Send Message →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* FAQs (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold text-teal uppercase tracking-widest">{pageCopy['quickAnswers']}</span>
              <h2 className="text-2xl sm:text-3xl font-black text-navy mt-1">{pageCopy['frequentlyAskedQuestions']}</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-5 sm:p-6 rounded-2xl bg-surface border border-border/80 shadow-2xs">
                  <h4 className="font-extrabold text-sm sm:text-base text-navy mb-2">
                    {faq.q}
                  </h4>
                  <p className="text-sm text-text-2 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Explore Quests Card */}
            <div className="p-6 sm:p-7 rounded-2xl bg-navy text-cream flex flex-col gap-3.5">
              <h4 className="font-bold text-white text-base">{pageCopy['readyToBeginYourAdventure']}</h4>
              <p className="text-sm text-cream/80 leading-relaxed">{pageCopy['explore52WeeklyGuidedBibleQuestsWith']}</p>
              <button
                type="button"
                onClick={() => navigate('/#quests')}
                className="mt-1 px-5 py-3 rounded-xl bg-gold hover:bg-gold/90 text-navy font-bold text-sm transition-colors cursor-pointer text-center"
              >{pageCopy['exploreWeeklyQuests']}</button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
