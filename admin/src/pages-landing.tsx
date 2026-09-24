import { useNavigate } from 'react-router';
import { Brand } from './ui';
import { ChurchJoinBarcodeCard } from './barcode';

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

function ChurchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2" />
      <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" />
      <path d="M18 22V5l-6-3-6 3v17" />
      <path d="M12 7v5" />
      <path d="M10 9h4" />
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
    <div className="min-h-screen bg-cream text-navy flex flex-col selection:bg-teal selection:text-white">
      {/* Top Banner Alert for Church Pastors */}
      <div className="bg-navy text-cream text-xs py-2 px-4 border-b border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 mx-auto">
          <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="font-medium text-cream/90">
            Are you a Senior Pastor or Youth Ministry Director?
          </span>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="font-bold text-gold hover:text-white underline decoration-gold transition-colors cursor-pointer ml-1"
          >
            Enter Pastor &amp; Church Operations Portal →
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/login')}
          className="text-[11px] text-cream/60 hover:text-cream hidden sm:inline transition-colors cursor-pointer"
        >
          Staff login
        </button>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Brand size="md" />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted">
            <a href="#quests" className="hover:text-navy transition-colors">
              Weekly Quests
            </a>
            <a href="#churches" className="hover:text-navy transition-colors">
              For Churches
            </a>
            <a href="#safeguarding" className="hover:text-navy transition-colors">
              Safeguarding
            </a>
            <a href="#onboarding" className="hover:text-navy transition-colors">
              Mobile App &amp; Join Code
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="px-3.5 py-2 rounded-xl bg-teal-tint border border-teal/30 text-teal hover:bg-teal hover:text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Pastor Portal
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/login')}
              className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>

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
            <div className="relative">
              {/* Speech bubble */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-navy text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-navy">
                "Let's go on a Quest! 🎧"
              </div>
              <img
                src="/zack.png"
                alt="Zack — Teen Bible Adventures character"
                className="w-52 h-auto object-contain drop-shadow-xl animate-[float_6s_ease-in-out_infinite]"
                style={{ animationDelay: '0s' }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-extrabold text-navy">Zack</span>
              <span className="text-[11px] font-medium text-muted bg-orange/15 border border-orange/30 px-2.5 py-0.5 rounded-full">
                Quest Explorer 🎧
              </span>
            </div>
          </div>

          {/* Center: headline, tagline, CTAs, metrics */}
          <div className="flex flex-col items-center text-center gap-12 py-6">
            {/* Badge + headline + tagline group */}
            <div className="flex flex-col items-center gap-7">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/15 border border-gold/40 text-navy text-xs font-bold tracking-widest uppercase">
                <span>✨ Teen Discipleship &bull; Sunday School &bull; Family Care</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy leading-[1.1] max-w-2xl">
                Nurturing Teen Discipleship Through Biblical Truth &amp; Community.
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-muted max-w-xl leading-loose mt-2">
                Teen Bible Adventures connects Christian teenagers, families, and local churches through structured weekly quests,
                video teachings, engaging quizzes, and trusted pastoral oversight.
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
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="px-8 py-4 rounded-xl bg-navy hover:bg-teal text-white text-sm font-bold shadow-card transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
              >
                Pastor &amp; Church Operations Portal →
              </button>
              <a
                href="#onboarding"
                className="px-8 py-4 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy text-sm font-bold transition-all shadow-xs hover:-translate-y-0.5"
              >
                Scan Church Barcode Pass
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-4 pt-10 border-t border-border/60 w-full max-w-2xl text-left">
              <div className="flex flex-col gap-1.5">
                <span className="text-2xl font-extrabold text-navy">52 Weeks</span>
                <span className="text-xs text-muted leading-relaxed">Annual quest journey</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-2xl font-extrabold text-teal">100% Verified</span>
                <span className="text-xs text-muted leading-relaxed">Biblical doctrine</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-2xl font-extrabold text-navy">Protected</span>
                <span className="text-xs text-muted leading-relaxed">COPPA &amp; GDPR privacy</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-2xl font-extrabold text-gold">One Click</span>
                <span className="text-xs text-muted leading-relaxed">Church pass barcode join</span>
              </div>
            </div>
          </div>


          {/* Abi — right character */}
          <div className="hidden lg:flex flex-col items-center justify-end gap-3 pb-4 self-end">
            <div className="relative">
              {/* Speech bubble */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-teal text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-teal">
                "I know this verse! 📖"
              </div>
              <img
                src="/abi.png"
                alt="Abi — Teen Bible Adventures character"
                className="w-52 h-auto object-contain drop-shadow-xl animate-[float_6s_ease-in-out_infinite]"
                style={{ animationDelay: '1.5s' }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-extrabold text-navy">Abi</span>
              <span className="text-[11px] font-medium text-muted bg-teal/10 border border-teal/30 px-2.5 py-0.5 rounded-full">
                Scripture Champion 📖
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars of ASK Hub Discipleship */}
      <section id="quests" className="py-16 sm:py-20 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Core Pillars</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy">
              Everything Your Youth Ministry Needs in One Cohesive Platform
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Built specifically for modern adolescent discipleship — engaging for teenagers, reassuring for parents, and empowering for pastors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-teal-tint text-teal flex items-center justify-center">
                <BookHeartIcon />
              </div>
              <h3 className="font-bold text-navy text-base">Weekly Teen Quests</h3>
              <p className="text-xs text-muted leading-relaxed">
                Scheduled curriculum featuring scripture reading passages, curated video reflections, and 4-option objective quizzes that build biblical literacy.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-sage text-forest flex items-center justify-center">
                <ChurchIcon />
              </div>
              <h3 className="font-bold text-navy text-base">Local Church Connection</h3>
              <p className="text-xs text-muted leading-relaxed">
                Sunday school classes and youth cell groups seamlessly tied to the curriculum. Teachers open class quizzes while pastors monitor overall church engagement.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-gold/20 text-navy flex items-center justify-center">
                <ShieldCheckIcon />
              </div>
              <h3 className="font-bold text-navy text-base">Safeguarding Oversight</h3>
              <p className="text-xs text-muted leading-relaxed">
                Confidential incident reporting console for parents and guardians. Pastors receive instant alerts, escalate care, and audit resolution notes securely.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-navy-tint text-navy flex items-center justify-center">
                <CompassIcon />
              </div>
              <h3 className="font-bold text-navy text-base">TBA Puzzle Studio</h3>
              <p className="text-xs text-muted leading-relaxed">
                Challenging word chains, crossword grids, and Scripture matching exercises that reinforce the weekly lesson themes without gamification distraction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Pastors & Church Operations Highlight */}
      <section id="churches" className="py-16 sm:py-20 px-4 sm:px-8 border-b border-border/60 bg-cream">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-tint border border-teal/30 text-teal text-xs font-bold w-fit">
              <span>Church Leadership &bull; One Pastor, One Church</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-navy tracking-tight leading-snug">
              Pastors: Monitor Your Church Operation in Real Time.
            </h2>

            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              We know your pastoral heart wants to know how your young people are growing in Christ. Our dedicated Church Operations Portal provides your pastoral team with clear, safeguarded visibility into:
            </p>

            <ul className="flex flex-col gap-2.5 text-xs text-navy font-medium">
              <li className="flex items-center gap-2">
                <span className="text-teal font-bold">✓</span>
                <span>Active youth classes, attendance levels, and weekly quest completion rates.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-teal font-bold">✓</span>
                <span>Confidential safeguarding inbox with status management and pastoral action notes.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-teal font-bold">✓</span>
                <span>Ministry staff assignments: Teachers, Chaperones, and Children’s Church Leads.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-teal font-bold">✓</span>
                <span>Church join codes with instant Barcode &amp; QR Code pass generation for Sunday bulletins.</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-navy hover:bg-teal text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <span>Enter Church Operations Portal</span>
                <span>→</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            {/* Live Barcode Card Preview */}
            <div className="w-full">
              <ChurchJoinBarcodeCard
                joinCode="GRACE01"
                churchName="Grace Demo Church"
                jurisdiction="US"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding & Barcode Pass Generator Section */}
      <section id="onboarding" className="py-16 sm:py-20 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-8 text-center">
          <div className="max-w-xl flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Family &amp; Church Onboarding</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy">
              Seamless Church Check-In &amp; Mobile Joining
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Whether you are welcoming a new family on Sunday morning or enrolling students in Wednesday youth group, our instant barcode generator makes connection effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-4xl">
            <div className="p-5 rounded-xl bg-cream border border-border/80 flex flex-col gap-2">
              <div className="text-xs font-bold text-teal">Step 1</div>
              <h4 className="font-bold text-sm text-navy">Pastors Generate Pass</h4>
              <p className="text-xs text-muted leading-relaxed">
                Log into your church console to retrieve or regenerate your church’s unique join code with printable barcode cards.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-cream border border-border/80 flex flex-col gap-2">
              <div className="text-xs font-bold text-teal">Step 2</div>
              <h4 className="font-bold text-sm text-navy">Families Scan or Enter</h4>
              <p className="text-xs text-muted leading-relaxed">
                Parents download the Teen Bible Adventures app, open family setup, and scan the barcode or enter the 6-character code.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-cream border border-border/80 flex flex-col gap-2">
              <div className="text-xs font-bold text-teal">Step 3</div>
              <h4 className="font-bold text-sm text-navy">Youth Connected</h4>
              <p className="text-xs text-muted leading-relaxed">
                Children and teens are linked to your church classes, while parents retain verified oversight of all discipleship activity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safeguarding Commitment */}
      <section id="safeguarding" className="py-14 px-4 sm:px-8 bg-cream border-b border-border/60">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
            <ShieldCheckIcon />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-navy">Uncompromising Commitment to Child &amp; Youth Safety</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              We adhere strictly to COPPA (US), Age-Appropriate Design Code (UK), and national child safety regulations. Children under 13 cannot create unverified accounts; teen logins remain parent-managed; and pastoral safeguarding reports remain strictly confidential.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="px-4 py-2 rounded-xl bg-navy hover:bg-teal text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Pastor Safety Console →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-navy text-cream py-10 px-4 sm:px-8 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-bold text-white text-sm">Teen Bible Adventures</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gold font-bold">ASK Hub</span>
            </div>
            <p className="text-cream/60 text-[11px]">Empowering churches and families in biblical truth.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-cream/70 font-medium">
            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="hover:text-gold transition-colors cursor-pointer"
            >
              Pastor Portal
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/login')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              App Manager Admin
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-[11px] text-cream/50">
          <p>&copy; {new Date().getFullYear()} ASK Hub &bull; Teen Bible Adventures. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Jurisdictions: US &bull; GB &bull; NG</span>
            <span>&bull;</span>
            <span>Family-Verified Discipleship</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
