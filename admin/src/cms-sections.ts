/** Editor-only organization; persisted content keys stay unchanged. */
export const CMS_NAV_GROUPS = [
  { label: 'Home page', keys: ['header', 'hero', 'pillars', 'mission', 'about', 'passSection', 'onboarding', 'safeguarding'] },
  { label: 'Other pages', keys: ['aboutPage', 'contactPage', 'ministryPage'] },
  { label: 'Shared website content', keys: ['footer', 'faq', 'layout', 'legalLinks'] },
  { label: 'App screens & settings', keys: ['announcement', 'welcome', 'home', 'quest', 'navigation', 'messages', 'system'] },
];

const PAGE_GROUPS: Record<string, { label: string; keys: string[] }[]> = {
  contactPage: [
    { label: 'Hero', keys: ['contactFellowshipSupport', 'wereHereToHelp', 'haveQuestionsAboutBringingTeenBibleAdventures'] },
    { label: 'Contact emails', keys: ['fellowshipEmail', 'supportEmail', 'safetyEmail', 'sponsorshipEmail'] },
    { label: 'Support cards', keys: ['youthCirclesStudyGroups', 'passCodesMultigroupSetupYouthCircleOnboarding', 'appTechSupport', 'deviceSyncBarcodeScanAssistanceAppBugs', 'safeguardingPrivacy', 'parentalConsentCoppaInquiriesDataErasure', 'supportSponsorship', 'ministrySponsorshipCurriculumSuggestionsPartnerships'] },
    { label: 'Success message', keys: ['messageSentSuccessfully', 'thankYouForReachingOut', 'aConfirmationHasBeenNotedFor', 'ourTeamWillReviewYourInquiryRegarding', 'shortly', 'sendAnotherMessage'] },
    { label: 'FAQ & bottom call to action', keys: ['quickAnswers', 'frequentlyAskedQuestions', 'readyToBeginYourAdventure', 'explore52WeeklyGuidedBibleQuestsWith', 'exploreWeeklyQuests'] },
  ],
  aboutPage: [
    { label: 'Hero', keys: ['ourMissionStory', 'discipleshipBuiltForThe', 'nextGeneration', 'teenBibleAdventuresTbaBridgesEternalBiblical', 'exploreWeeklyQuests', 'getInTouch'] },
    { label: 'Abi & Zach', keys: ['meetYourCompanions', 'guidedByAbiZach', 'everyWeekInTeenBibleAdventuresTeens', 'questGuide', 'zach', 'actionDiscovery', 'energeticInquisitiveAndTechsavvyZachLovesTaking', 'boldfaith', 'puzzles', 'reflectionGuide', 'abi', 'wisdomHeart', 'thoughtfulEmpatheticAndScripturegroundedAbiInspiresTeens', 'scripturestudy', 'heartprayer', 'puzzles21'] },
    { label: 'Our story', keys: ['theGenesisOfTeenBibleAdventures', 'whyWeBuiltThisPlatform', 'todaysTeenagersLiveInAHyperconnectedDigital', 'teenBibleAdventures', 'sawAnUrgentNeedNotToFight', 'ratherThanPassiveReadingOrDisconnectedQuizzes', 'teenBibleAdventures28', 'immersesYouthInWeeklyBiblicalNarrativeQuests'] },
    { label: 'Bottom call to action', keys: ['readyToStartTheChristianDiscipleshipJourney', 'getYourStudyPassCodePrintYour', 'exploreWeeklyQuests46', 'contactOurTeam'] },
  ],
};

export function cmsPageGroups(section: string, keys: string[]) {
  const definitions = PAGE_GROUPS[section];
  if (!definitions) return [];
  const assigned = new Set(definitions.flatMap(group => group.keys));
  const groups = definitions.map(group => ({ ...group, keys: group.keys.filter(key => keys.includes(key)) }));
  const remaining = keys.filter(key => !assigned.has(key));
  if (remaining.length) groups.splice(section === 'contactPage' ? 3 : 3, 0, {
    label: section === 'contactPage' ? 'Message form' : 'Foundations & benefits', keys: remaining,
  });
  return groups.filter(group => group.keys.length);
}
