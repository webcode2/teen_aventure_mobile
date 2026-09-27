import { useNavigate } from 'react-router';
import { PublicLayout } from './public-shell';

function HeartHandshakeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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

function PuzzleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19.439 7.85c-.049-.322-.059-.514 0-.85.162-.923.83-1.63 1.76-1.76.924-.13 1.8.468 2.01 1.37.198.857-.34 1.76-1.2 2.02-.32.098-.5.1-.81.04" />
      <rect x="2" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <PublicLayout activeTab="about">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-8 border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-cream to-gold/10 -z-10" />
        <div className="absolute top-10 left-1/4 w-80 h-80 rounded-full bg-teal/10 blur-3xl -z-10" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-gold/15 blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-tint border border-teal/20 text-teal text-xs font-bold tracking-wide">
            <BookOpenIcon />
            <span>OUR MISSION &amp; STORY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-navy tracking-tight leading-[1.15]">
            Discipleship Built for the <span className="text-teal">Next Generation</span>
          </h1>

          <p className="text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
            Teen Bible Adventures (TBA) bridges eternal biblical truth with modern youth culture through gamified quests, interactive puzzles, and faith-connected Christian mentorship.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/#quests')}
              className="px-6 py-3 rounded-xl bg-teal hover:bg-teal/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Explore Weekly Quests →
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="px-6 py-3 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy font-semibold text-xs transition-colors cursor-pointer"
            >
              Get in Touch
            </button>
          </div>
        </div>
      </section>

      {/* Meet Abi & Zack — The Quest Guides */}
      <section className="py-20 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-teal uppercase tracking-widest">
              Meet Your Companions
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-navy mt-2 tracking-tight">
              Guided by Abi &amp; Zack
            </h2>
            <p className="text-xs sm:text-sm text-muted mt-3 leading-relaxed">
              Every week in Teen Bible Adventures, teens journey alongside Abi and Zack as they explore scripture, solve puzzles, and unpack real-life challenges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Zack Card */}
            <div className="p-8 rounded-2xl bg-cream border border-border/80 flex flex-col sm:flex-row items-center gap-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="relative shrink-0">
                <div className="w-36 h-36 rounded-2xl bg-teal-tint border border-teal/20 flex items-center justify-center overflow-hidden">
                  <img
                    src="/zack.png"
                    alt="Zack"
                    className="w-32 h-auto object-contain drop-shadow-md"
                  />
                </div>
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-navy text-white text-[10px] font-extrabold tracking-wider">
                  QUEST GUIDE
                </span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h3 className="text-xl font-black text-navy">Zack</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-navy font-bold">
                    Action &amp; Discovery
                  </span>
                </div>
                <p className="text-sm sm:text-base text-text-2 leading-relaxed mt-2">
                  Energetic, inquisitive, and tech-savvy. Zack loves taking on weekly scripture challenges, word puzzles, and showing how faith applies to sports, friendship, and everyday teenage life.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 justify-center sm:justify-start text-xs font-semibold text-teal">
                  <span className="px-3 py-1 rounded-lg bg-teal-tint">#WordChains</span>
                  <span className="px-3 py-1 rounded-lg bg-teal-tint">#BoldFaith</span>
                  <span className="px-3 py-1 rounded-lg bg-teal-tint">#Puzzles</span>
                </div>
              </div>
            </div>

            {/* Abi Card */}
            <div className="p-8 rounded-2xl bg-cream border border-border/80 flex flex-col sm:flex-row items-center gap-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="relative shrink-0">
                <div className="w-36 h-36 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center overflow-hidden">
                  <img
                    src="/abi.png"
                    alt="Abi"
                    className="w-32 h-auto object-contain drop-shadow-md"
                  />
                </div>
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-navy text-white text-[10px] font-extrabold tracking-wider">
                  REFLECTION GUIDE
                </span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h3 className="text-xl font-black text-navy">Abi</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gold/20 text-navy font-bold">
                    Wisdom &amp; Heart
                  </span>
                </div>
                <p className="text-sm sm:text-base text-text-2 leading-relaxed mt-2">
                  Thoughtful, empathetic, and scripture-grounded. Abi inspires teens to dig deeper into the Word, pray with vulnerability, and navigate doubts with the confidence that God loves them unconditionally.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 justify-center sm:justify-start text-xs font-semibold text-navy">
                  <span className="px-3 py-1 rounded-lg bg-surface-2">#ScriptureStudy</span>
                  <span className="px-3 py-1 rounded-lg bg-surface-2">#HeartPrayer</span>
                  <span className="px-3 py-1 rounded-lg bg-surface-2">#Crosswords</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Built TBA — The Story */}
      <section className="py-20 px-4 sm:px-8 bg-cream border-b border-border/60">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-6 text-center sm:text-left">
            <span className="text-xs font-bold text-teal uppercase tracking-widest">
              The Genesis of Teen Bible Adventures
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              Why We Built This Platform
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-text-2 leading-relaxed">
              <p>
                Today’s teenagers live in a hyper-connected digital landscape flooded with competing voices, algorithmic echo chambers, and endless distractions. While screen time is at an all-time high, genuine engagement with scripture and authentic Christian fellowship often struggle to compete.
              </p>
              <p>
                <strong>Teen Bible Adventures</strong> saw an urgent need: not to fight the screen, but to redeem it. We set out to create a vibrant, safe, and engaging mobile discipleship experience that speaks the language of youth without compromising the depth and authority of the Bible.
              </p>
              <p>
                Rather than passive reading or disconnected quizzes, <em>Teen Bible Adventures</em> immerses youth in weekly biblical narrative quests, thoughtful reflection, and puzzle challenges—while connecting them to Christian peers, mentors, and families through verified study circles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars of TBA Discipleship */}
      <section className="py-20 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-teal uppercase tracking-widest">
              Core Foundations
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-navy mt-2 tracking-tight">
              The Four Discipleship Pillars
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
                <BookOpenIcon />
              </div>
              <h3 className="font-extrabold text-lg text-navy">1. Biblical Integrity</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Christ-centered, doctrinally sound weekly lessons designed by seasoned educators, youth mentors, and theologians.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-gold/20 text-navy flex items-center justify-center shrink-0">
                <PuzzleIcon />
              </div>
              <h3 className="font-extrabold text-lg text-navy">2. Creative Puzzles</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Word chains, thematic crosswords, and matching challenges that turn scripture memory into joyful mastery.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                <HeartHandshakeIcon />
              </div>
              <h3 className="font-extrabold text-lg text-navy">3. Christian Fellowship</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Youth connect with Christian peers, mentors, and family study circles to walk together in daily faith and biblical encouragement.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
                <ShieldCheckIcon />
              </div>
              <h3 className="font-extrabold text-lg text-navy">4. Digital Safety</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                Strict adherence to COPPA and global child protection standards. Zero advertising, no data sales, and parent-verified controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Impact Stats */}
      <section className="py-16 px-4 sm:px-8 bg-navy text-cream">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-3xl sm:text-4xl font-black text-gold">52+</span>
            <span className="text-xs text-cream/70 font-medium">Weekly Scriptural Quests</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl sm:text-4xl font-black text-teal">3</span>
            <span className="text-xs text-cream/70 font-medium">Puzzle Game Studios</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl sm:text-4xl font-black text-gold">100%</span>
            <span className="text-xs text-cream/70 font-medium">Parent-Supervised Safety</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl sm:text-4xl font-black text-teal">0</span>
            <span className="text-xs text-cream/70 font-medium">Commercial Ads or Trackers</span>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 px-4 sm:px-8 bg-cream">
        <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-surface border border-border shadow-xs text-center flex flex-col items-center gap-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy">
            Ready to Start the Christian Discipleship Journey?
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-xl leading-relaxed">
            Get your study pass code, print your barcode card, and empower your teens to grow in Christ every week.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/#quests')}
              className="px-6 py-3 rounded-xl bg-teal hover:bg-teal/90 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              Explore Weekly Quests →
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="px-6 py-3 rounded-xl border border-border bg-cream hover:bg-surface text-navy font-semibold text-xs transition-colors cursor-pointer"
            >
              Contact Our Team
            </button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
