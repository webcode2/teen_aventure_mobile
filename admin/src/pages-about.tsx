import { usePageCopy } from './use-page-copy';
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

export function AboutPage({ content }: { content?: Record<string, string> } = {}) {
  const pageCopy = usePageCopy('aboutPage', content);
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
            <span>{pageCopy['ourMissionStory']}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-navy tracking-tight leading-[1.15]">{pageCopy['discipleshipBuiltForThe']}{' '}<span className="text-teal">{pageCopy['nextGeneration']}</span>
          </h1>

          <p className="text-base sm:text-lg text-muted max-w-2xl leading-relaxed">{pageCopy['teenBibleAdventuresTbaBridgesEternalBiblical']}</p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/#quests')}
              className="px-6 py-3 rounded-xl bg-teal hover:bg-teal/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >{pageCopy['exploreWeeklyQuests']}</button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="px-6 py-3 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy font-semibold text-xs transition-colors cursor-pointer"
            >{pageCopy['getInTouch']}</button>
          </div>
        </div>
      </section>

      {/* Meet Abi & Zach — The Quest Guides */}
      <section className="py-20 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-teal uppercase tracking-widest">{pageCopy['meetYourCompanions']}</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-navy mt-2 tracking-tight">{pageCopy['guidedByAbiZach']}</h2>
            <p className="text-xs sm:text-sm text-muted mt-3 leading-relaxed">{pageCopy['everyWeekInTeenBibleAdventuresTeens']}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Zach Card */}
            <div className="p-8 rounded-2xl bg-cream border border-border/80 flex flex-col sm:flex-row items-center gap-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="relative shrink-0">
                <div className="w-36 h-36 rounded-2xl bg-teal-tint border border-teal/20 flex items-center justify-center overflow-hidden">
                  <img
                    src="/zach.png"
                    alt="Zach"
                    className="w-32 h-auto object-contain drop-shadow-md"
                  />
                </div>
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-navy text-white text-[10px] font-extrabold tracking-wider">{pageCopy['questGuide']}</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h3 className="text-xl font-black text-navy">{pageCopy['zach']}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-navy font-bold">{pageCopy['actionDiscovery']}</span>
                </div>
                <p className="text-sm sm:text-base text-text-2 leading-relaxed mt-2">{pageCopy['energeticInquisitiveAndTechsavvyZachLovesTaking']}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 justify-center sm:justify-start text-xs font-semibold text-teal">
                  <span className="px-3 py-1 rounded-lg bg-teal-tint">{pageCopy['boldfaith']}</span>
                  <span className="px-3 py-1 rounded-lg bg-teal-tint">{pageCopy['puzzles']}</span>
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
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-navy text-white text-[10px] font-extrabold tracking-wider">{pageCopy['reflectionGuide']}</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h3 className="text-xl font-black text-navy">{pageCopy['abi']}</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gold/20 text-navy font-bold">{pageCopy['wisdomHeart']}</span>
                </div>
                <p className="text-sm sm:text-base text-text-2 leading-relaxed mt-2">{pageCopy['thoughtfulEmpatheticAndScripturegroundedAbiInspiresTeens']}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 justify-center sm:justify-start text-xs font-semibold text-navy">
                  <span className="px-3 py-1 rounded-lg bg-surface-2">{pageCopy['scripturestudy']}</span>
                  <span className="px-3 py-1 rounded-lg bg-surface-2">{pageCopy['heartprayer']}</span>
                  <span className="px-3 py-1 rounded-lg bg-surface-2">{pageCopy['puzzles21']}</span>
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
            <span className="text-xs font-bold text-teal uppercase tracking-widest">{pageCopy['theGenesisOfTeenBibleAdventures']}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">{pageCopy['whyWeBuiltThisPlatform']}</h2>
            <div className="space-y-4 text-sm sm:text-base text-text-2 leading-relaxed">
              <p>{pageCopy['todaysTeenagersLiveInAHyperconnectedDigital']}</p>
              <p>
                <strong>{pageCopy['teenBibleAdventures']}</strong>{pageCopy['sawAnUrgentNeedNotToFight']}</p>
              <p>{pageCopy['ratherThanPassiveReadingOrDisconnectedQuizzes']}<em>{pageCopy['teenBibleAdventures28']}</em>{pageCopy['immersesYouthInWeeklyBiblicalNarrativeQuests']}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars of TBA Discipleship */}
      <section className="py-20 px-4 sm:px-8 bg-surface border-b border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-teal uppercase tracking-widest">{pageCopy['coreFoundations']}</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-navy mt-2 tracking-tight">{pageCopy['theFourDiscipleshipPillars']}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
                <BookOpenIcon />
              </div>
              <h3 className="font-extrabold text-lg text-navy">{pageCopy['1BiblicalIntegrity']}</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">{pageCopy['christcenteredDoctrinallySoundWeeklyLessonsDesignedBy']}</p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-gold/20 text-navy flex items-center justify-center shrink-0">
                <PuzzleIcon />
              </div>
              <h3 className="font-extrabold text-lg text-navy">{pageCopy['2CreativePuzzles']}</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">{pageCopy['scripturePuzzlesThatTurnBibleMemoryInto']}</p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                <HeartHandshakeIcon />
              </div>
              <h3 className="font-extrabold text-lg text-navy">{pageCopy['3ChristianFellowship']}</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">{pageCopy['youthConnectWithChristianPeersMentorsAnd']}</p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-cream border border-border/80 flex flex-col gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-teal-tint text-teal flex items-center justify-center shrink-0">
                <ShieldCheckIcon />
              </div>
              <h3 className="font-extrabold text-lg text-navy">{pageCopy['4DigitalSafety']}</h3>
              <p className="text-sm sm:text-base text-text-2 leading-relaxed">{pageCopy['strictAdherenceToCoppaAndGlobalChild']}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Impact Stats */}
      <section className="py-16 px-4 sm:px-8 bg-navy text-cream">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-3xl sm:text-4xl font-black text-gold">52+</span>
            <span className="text-xs text-cream/70 font-medium">{pageCopy['weeklyScripturalQuests']}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl sm:text-4xl font-black text-teal">3</span>
            <span className="text-xs text-cream/70 font-medium">{pageCopy['puzzleGameStudios']}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl sm:text-4xl font-black text-gold">100%</span>
            <span className="text-xs text-cream/70 font-medium">{pageCopy['parentsupervisedSafety']}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl sm:text-4xl font-black text-teal">0</span>
            <span className="text-xs text-cream/70 font-medium">{pageCopy['commercialAdsOrTrackers']}</span>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 px-4 sm:px-8 bg-cream">
        <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-surface border border-border shadow-xs text-center flex flex-col items-center gap-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy">{pageCopy['readyToStartTheChristianDiscipleshipJourney']}</h2>
          <p className="text-xs sm:text-sm text-muted max-w-xl leading-relaxed">{pageCopy['getYourStudyPassCodePrintYour']}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/#quests')}
              className="px-6 py-3 rounded-xl bg-teal hover:bg-teal/90 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >{pageCopy['exploreWeeklyQuests46']}</button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="px-6 py-3 rounded-xl border border-border bg-cream hover:bg-surface text-navy font-semibold text-xs transition-colors cursor-pointer"
            >{pageCopy['contactOurTeam']}</button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
