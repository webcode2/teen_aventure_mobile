import { useNavigate } from 'react-router';
import { ChurchJoinBarcodeCard } from './barcode';
import { PublicLayout, GooglePlayButton, AppStoreButton } from './public-shell';
import { WorldMapBackground } from './pages-contact';

function CompassIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

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

export function PublicLandingPage() {
  const navigate = useNavigate();

  return (
    <PublicLayout activeTab="home">

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-28 sm:pb-36 px-4 sm:px-8 border-b border-border/60">
        {/* Gradient background + decorative blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal/8 via-cream to-gold/5 -z-10" />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-teal/10 blur-3xl -z-10" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl -z-10" />

        {/* 3-column layout: Zack | Content | Abi */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-8 items-end">

          {/* Zack — left character */}
          <div className="hidden lg:flex flex-col items-center justify-end gap-3 pb-4 self-end">
            <img
              src="/zack.png"
              alt="Zack — Teen Bible Adventures character"
              className="w-52 h-auto object-contain drop-shadow-xl"
            />
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-extrabold text-navy">Zack</span>
              <span className="text-[11px] font-medium text-muted bg-orange/15 border border-orange/30 px-2.5 py-0.5 rounded-full">
                Quest Explorer
              </span>
            </div>
          </div>

          {/* Center: headline, tagline, CTAs, metrics */}
          <div className="flex flex-col items-center text-center gap-12 py-6">
            {/* Headline + tagline group */}
            <div className="flex flex-col items-center gap-7">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy leading-[1.1] max-w-2xl">
                Nurturing Christian Teens Through Biblical Truth &amp; Faith Adventures.
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-muted max-w-xl leading-loose mt-2">
                Teen Bible Adventures inspires Christian teenagers and families through structured weekly scripture quests,
                video reflections, interactive Bible quizzes, and engaging scripture puzzles.
              </p>
            </div>

            {/* Mobile characters row — only shows on small screens */}
            <div className="flex lg:hidden items-end justify-center gap-8 py-2">
              <div className="flex flex-col items-center gap-2">
                <img src="/zack.png" alt="Zack" className="w-32 h-auto object-contain drop-shadow-lg" />
                <span className="text-xs font-bold text-navy">Zack</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img src="/abi.png" alt="Abi" className="w-32 h-auto object-contain drop-shadow-lg" />
                <span className="text-xs font-bold text-navy">Abi</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              <a
                href="#quests"
                className="px-8 py-4 rounded-xl bg-navy hover:bg-teal text-white text-sm font-bold shadow-card transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center gap-2"
              >
                <span>Explore Weekly Quests</span>
                <span>→</span>
              </a>
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="px-8 py-4 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy text-sm font-bold transition-all shadow-xs hover:-translate-y-0.5 cursor-pointer"
              >
                Our Christian Mission
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-4 pt-10 border-t border-border/60 w-full max-w-2xl text-left">
              <div className="flex flex-col gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-navy">52 Weeks</span>
                <span className="text-xs sm:text-sm text-text-2 font-medium leading-relaxed">Annual quest journey</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-teal">100% Biblical</span>
                <span className="text-xs sm:text-sm text-text-2 font-medium leading-relaxed">Scripture-rooted truth</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-navy">Protected</span>
                <span className="text-xs sm:text-sm text-text-2 font-medium leading-relaxed">Safe &amp; ad-free for kids and families</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-gold">Interactive</span>
                <span className="text-xs sm:text-sm text-text-2 font-medium leading-relaxed">Quizzes &amp; Bible puzzles</span>
              </div>
            </div>
          </div>


          {/* Abi — right character */}
          <div className="hidden lg:flex flex-col items-center justify-end gap-3 pb-4 self-end">
            <img
              src="/abi.png"
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
        </div>
      </section>

      {/* 4 Pillars of Christian Teen Discipleship */}
      <section id="quests" className="py-16 sm:py-24 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
            <span className="text-sm font-bold uppercase tracking-widest text-teal">Core Foundations</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy">
              Everything Christian Youth &amp; Families Need to Grow in Faith
            </h2>
            <p className="text-base sm:text-lg text-text-2 leading-relaxed">
              Built specifically for adolescent Christian spiritual growth — engaging for teenagers, reassuring for parents, and centered on Christ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
                <BookHeartIcon />
              </div>
              <h3 className="font-extrabold text-navy text-lg sm:text-xl">Weekly Scripture Quests</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Scheduled curriculum featuring scripture reading passages, curated video reflections, and 4-option objective quizzes that build biblical literacy.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-sage text-forest flex items-center justify-center shrink-0">
                <UsersIcon />
              </div>
              <h3 className="font-extrabold text-navy text-lg sm:text-xl">Christian Fellowship</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Connect with Christian friends, youth mentors, and family study circles to walk together in daily faith, encouragement, and scripture reading.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-gold/20 text-navy flex items-center justify-center shrink-0">
                <ShieldCheckIcon />
              </div>
              <h3 className="font-extrabold text-navy text-lg sm:text-xl">Family Safeguarding</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Confidential, ad-free environment where parents retain full oversight of their teens' accounts, protecting their digital spiritual journey.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-navy-tint text-navy flex items-center justify-center shrink-0">
                <CompassIcon />
              </div>
              <h3 className="font-extrabold text-navy text-lg sm:text-xl">TBA Puzzle Studio</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Challenging word chains, crossword grids, and Scripture matching exercises that reinforce the weekly lesson themes without gamification distraction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Christian Living & Discipleship Highlight */}
      <section id="discipleship" className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-8 border-b border-border/60 bg-cream">
        <WorldMapBackground />
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <h2 className="text-3xl sm:text-5xl font-black text-navy tracking-tight leading-tight">
              A Faith-Filled Digital Sanctuary for Today’s Christian Youth.
            </h2>

            <p className="text-base sm:text-lg text-text-2 leading-relaxed">
              We help teenagers navigate modern life firmly grounded in the living Word of God. Teen Bible Adventures provides a safe, vibrant alternative to secular social noise:
            </p>

            <ul className="flex flex-col gap-3 text-sm sm:text-base text-navy font-medium">
              <li className="flex items-start gap-2.5">
                <span className="text-teal font-extrabold text-base sm:text-lg shrink-0 mt-0.5">✓</span>
                <span>Active scripture journeys: 52 weekly guided Bible quests with reflection questions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-teal font-extrabold text-base sm:text-lg shrink-0 mt-0.5">✓</span>
                <span>Engaging video teachings that unpack biblical truth for everyday teen challenges.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-teal font-extrabold text-base sm:text-lg shrink-0 mt-0.5">✓</span>
                <span>Creative Bible puzzles (Crosswords, Word Chains, Scripture Matching) that make learning enjoyable.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-teal font-extrabold text-base sm:text-lg shrink-0 mt-0.5">✓</span>
                <span>Family study passes with instant barcode cards for Christian households and study circles.</span>
              </li>
            </ul>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <GooglePlayButton className="!bg-navy hover:!bg-teal !text-white !py-2.5 !px-3.5 text-xs" />
              <AppStoreButton className="!bg-navy hover:!bg-teal !text-white !py-2.5 !px-3.5 text-xs" />
              <a
                href="#quests"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-navy/20 bg-surface hover:bg-surface-2 text-navy font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs hover:shadow-md"
              >
                <span>Start Weekly Quests</span>
                <span>→</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            {/* Live Barcode Card Preview */}
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

      {/* Onboarding & Pass Section */}
      <section id="onboarding" className="py-16 sm:py-24 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-10 text-center">
          <div className="max-w-2xl flex flex-col gap-3">
            <span className="text-sm font-bold uppercase tracking-widest text-teal">Getting Started</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy">
              How Christian Teens &amp; Families Journey Together
            </h2>
            <p className="text-base sm:text-lg text-text-2 leading-relaxed">
              Simple, safe, and engaging. Begin your weekly scripture adventure in three easy steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-4xl">
            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col gap-2.5 shadow-2xs">
              <div className="text-xs sm:text-sm font-extrabold text-teal uppercase tracking-wider">Step 1</div>
              <h4 className="font-extrabold text-base sm:text-lg text-navy">Get Your Study Pass</h4>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Families and youth study circles receive a unique 6-character pass code or barcode card to connect together.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col gap-2.5 shadow-2xs">
              <div className="text-xs sm:text-sm font-extrabold text-teal uppercase tracking-wider">Step 2</div>
              <h4 className="font-extrabold text-base sm:text-lg text-navy">Download Mobile App</h4>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Parents and teens download the Teen Bible Adventures app for Android or iOS, and scan the pass code.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col gap-2.5 shadow-2xs">
              <div className="text-xs sm:text-sm font-extrabold text-teal uppercase tracking-wider">Step 3</div>
              <h4 className="font-extrabold text-base sm:text-lg text-navy">Grow in Faith Together</h4>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Complete weekly quests, solve creative scripture puzzles, and build lifelong Christian habits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safeguarding Commitment */}
      <section id="safeguarding" className="py-16 px-4 sm:px-8 bg-cream border-b border-border/60">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="h-14 w-14 rounded-2xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
            <ShieldCheckIcon />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-extrabold text-navy">Uncompromising Commitment to Teen &amp; Family Safety</h3>
            <p className="text-sm sm:text-base text-text-2 mt-2 leading-relaxed">
              We adhere strictly to COPPA (US), Age-Appropriate Design Code (UK), and national child safety regulations. Children under 13 cannot create unverified accounts; teen logins remain parent-managed; and all family safety reports remain strictly confidential.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="px-5 py-3 rounded-xl bg-navy hover:bg-teal text-white text-xs sm:text-sm font-bold shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            Safety &amp; Privacy Policy →
          </button>
        </div>
      </section>

    </PublicLayout>
  );
}
