import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PublicLayout } from './public-shell';

function ShieldCheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function PrivacyPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('all');

  const sections = [
    {
      id: 'audience',
      title: '1. Audience & Age Eligibility',
      content: (
        <>
          <p className="mb-3">
            <strong>Audience:</strong> Teen Bible Adventures is designed for teenagers aged 13 and older, as well as Christian families and youth study circles.
          </p>
          <p className="mb-3">
            In compliance with the Children’s Online Privacy Protection Act (COPPA), the UK Age-Appropriate Design Code, and national child safety regulations, the app is not directed at unaccompanied children under the age of 13.
          </p>
          <div className="p-4 rounded-xl bg-teal-tint border border-teal/20 text-xs text-navy leading-relaxed">
            <strong>Under-13 Participation:</strong> Children under 13 may only participate under direct parental supervision or through a verified parent-administered family profile where consent has been recorded.
          </div>
        </>
      ),
    },
    {
      id: 'device-data',
      title: '2. Data Stored on Your Device',
      content: (
        <>
          <p className="mb-3">
            Teen Bible Adventures employs a <strong>device-first architecture</strong> for everyday play:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>
              <strong>Scores, Streaks &amp; Achievements:</strong> Quiz answers, puzzle completion times, weekly streaks, and in-app preferences remain stored directly on your physical mobile device via local storage.
            </li>
            <li>
              <strong>No Mandatory Online Profile:</strong> General solo play does not require creating an online social profile or sharing personal identifiers.
            </li>
          </ul>
          <p>
            You can reset or wipe this data at any time simply by clearing the application storage in your mobile operating system settings or reinstalling the app.
          </p>
        </>
      ),
    },
    {
      id: 'network-sync',
      title: '3. Network Services & Study Circle Synchronization',
      content: (
        <>
          <p className="mb-3">
            When your mobile device connects to our secure API endpoints (over encrypted HTTPS/TLS 1.3):
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>
              <strong>Curriculum Downloads:</strong> The app fetches weekly scripture lesson metadata, puzzle layouts (crosswords, word chains, matching games), and devotional prompts.
            </li>
            <li>
              <strong>Study Circle Synchronization &amp; Join Codes:</strong> When a teen or family links to a youth circle or family group using a 6-character code or scanned barcode, their quest progress and quiz participation may be synced with their study group so mentors and parents can provide targeted encouragement.
            </li>
          </ul>
          <p>
            We strictly enforce that publishers and lesson authors do not include unnecessary personal data in lesson titles or quest prompts.
          </p>
        </>
      ),
    },
    {
      id: 'youtube-media',
      title: '4. Third-Party Media & YouTube Playback',
      content: (
        <>
          <p className="mb-3">
            Some weekly lessons and adventure quests feature multimedia reflections streamed through YouTube’s in-app embedded player.
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>
              <strong>No Content Ripping:</strong> Teen Bible Adventures does not download, rip, or redistribute YouTube videos. Playback occurs solely through official API components.
            </li>
            <li>
              <strong>Google Privacy Terms:</strong> Video streaming is subject to Google’s Privacy Policy (<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-teal underline font-semibold">policies.google.com/privacy</a>).
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'zero-ads',
      title: '5. Zero Ads & Strictly No Sale of Data',
      content: (
        <>
          <div className="p-4 rounded-xl bg-sage/60 border border-forest/20 text-xs text-navy leading-relaxed mb-3">
            <span className="font-bold text-forest block mb-1">Our Sacred Promise to Families:</span>
            Teen Bible Adventures contains <strong>zero third-party advertisements</strong> and will never display commercial popups, banner ads, or behaviorally targeted promotions.
          </div>
          <p className="mb-3">
            <strong>We do NOT sell, rent, or trade personal information</strong> to data brokers, ad networks, or commercial third parties under any circumstance.
          </p>
          <p>
            Your teen's spiritual growth and scripture reflections are personal. They are never treated as commodified data points.
          </p>
        </>
      ),
    },
    {
      id: 'parental-rights',
      title: '6. Parental Oversight & Deletion Requests',
      content: (
        <>
          <p className="mb-3">
            Parents and legal guardians maintain absolute rights regarding their minor children’s engagement on our platform:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>
              <strong>Right to Review:</strong> Parents may request a copy of any data associated with their child’s linked family or study group profile.
            </li>
            <li>
              <strong>Right to Disconnect:</strong> Parents may disconnect their teen from a study circle or group at any time.
            </li>
            <li>
              <strong>Right to Complete Erasure:</strong> To request deletion of any cloud-synced account data, email our Safeguarding Team at <a href="mailto:safety@askhub.org" className="text-teal underline font-semibold">safety@askhub.org</a>. Deletion requests are fulfilled within 14 business days.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'security',
      title: '7. Information Security & Safeguarding',
      content: (
        <>
          <p className="mb-3">
            We implement administrative, technical, and physical security measures to safeguard data against unauthorized access, loss, or alteration:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>All communications between client devices and our backend use strict TLS 1.3 encryption.</li>
            <li>Administrative leader logins require secure authentication with session token validation.</li>
            <li>Safeguarding incident reports and administrative care notes remain confidential and restricted only to verified authorized mentors or guardians.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'contact-officer',
      title: '8. Contacting Our Data & Safeguarding Officer',
      content: (
        <>
          <p className="mb-3">
            If you have questions, concerns, or requests regarding this Privacy Policy or our child protection practices:
          </p>
          <div className="p-4 rounded-xl bg-surface border border-border/80 text-xs space-y-1.5">
            <p className="font-bold text-navy">Teen Bible Adventures Safeguarding &amp; Data Protection</p>
            <p className="text-muted">Email: <a href="mailto:safety@askhub.org" className="text-teal font-semibold">safety@askhub.org</a></p>
            <p className="text-muted">General Ministry Support: <a href="mailto:support@askhub.org" className="text-teal font-semibold">support@askhub.org</a></p>
            <p className="text-muted">Google Play Developer Contact: Listed on the Google Play store page.</p>
          </div>
        </>
      ),
    },
  ];

  return (
    <PublicLayout activeTab="privacy">
      {/* Header */}
      <section className="relative overflow-hidden pt-16 pb-16 sm:pt-20 sm:pb-20 px-4 sm:px-8 border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-teal/8 via-cream to-surface-2/20 -z-10" />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-tint border border-teal/20 text-teal text-xs font-bold tracking-wide">
            <ShieldCheckIcon />
            <span>SAFEGUARDING &amp; PRIVACY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-navy tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-xs sm:text-sm text-muted max-w-xl leading-relaxed">
            Our transparent commitment to protecting teens, honoring parental authority, and keeping discipleship safe, private, and ad-free.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-text-2">
            <span className="font-semibold">Last Updated:</span>
            <span className="px-2.5 py-1 rounded-full bg-surface border border-border text-navy font-bold">
              September 2026
            </span>
            <span className="text-muted mx-1">&bull;</span>
            <span className="text-teal font-medium">Audience: Ages 13+ &amp; Verified Families</span>
          </div>
        </div>
      </section>

      {/* Key Guarantees Badges */}
      <section className="py-8 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-cream border border-border/80 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-teal-tint text-teal flex items-center justify-center shrink-0">
              <CheckCircleIcon />
            </div>
            <div>
              <div className="font-bold text-xs text-navy">100% Ad-Free</div>
              <div className="text-[11px] text-muted">No banners, no tracking</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cream border border-border/80 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-forest/15 text-forest flex items-center justify-center shrink-0">
              <ShieldCheckIcon />
            </div>
            <div>
              <div className="font-bold text-xs text-navy">No Data Selling</div>
              <div className="text-[11px] text-muted">Zero commercial data trade</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cream border border-border/80 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gold/20 text-navy flex items-center justify-center shrink-0">
              <LockIcon />
            </div>
            <div>
              <div className="font-bold text-xs text-navy">Device-First</div>
              <div className="text-[11px] text-muted">Streaks &amp; quizzes on device</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cream border border-border/80 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-teal-tint text-teal flex items-center justify-center shrink-0">
              <CheckCircleIcon />
            </div>
            <div>
              <div className="font-bold text-xs text-navy">Parent Oversight</div>
              <div className="text-[11px] text-muted">Full deletion &amp; review rights</div>
            </div>
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-16 px-4 sm:px-8 bg-cream">
        <div className="max-w-4xl mx-auto">
          {/* Quick jump filter */}
          <div className="mb-10 pb-6 border-b border-border/80 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-navy mr-2">Jump to:</span>
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeSection === 'all'
                  ? 'bg-teal text-white'
                  : 'bg-surface border border-border text-text-2 hover:bg-surface-2'
                }`}
            >
              All Sections
            </button>
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeSection === s.id
                    ? 'bg-teal text-white'
                    : 'bg-surface border border-border text-text-2 hover:bg-surface-2'
                  }`}
              >
                {s.title.split('.')[1]?.trim() || s.title}
              </button>
            ))}
          </div>

          {/* Sections Stack */}
          <div className="space-y-8">
            {sections
              .filter((s) => activeSection === 'all' || activeSection === s.id)
              .map((section) => (
                <article
                  key={section.id}
                  id={section.id}
                  className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-2xs"
                >
                  <h2 className="text-lg sm:text-xl font-black text-navy mb-4 border-b border-border/60 pb-3">
                    {section.title}
                  </h2>
                  <div className="text-xs sm:text-sm text-text-2 leading-relaxed">
                    {section.content}
                  </div>
                </article>
              ))}
          </div>

          {/* Terms & Conditions Notice Box */}
          <div className="mt-12 p-6 rounded-2xl bg-surface-2/40 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-navy">Looking for Terms of Use?</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Review guidelines regarding app usage, Bible lesson media, and acceptable conduct.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="px-4 py-2 rounded-xl bg-navy hover:bg-teal text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
            >
              Contact Legal &amp; Support →
            </button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
