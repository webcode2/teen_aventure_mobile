import { DEFAULT_MINISTRY_COPY } from './ministry-copy';
import { PUBLIC_PAGE_COPY } from './public-page-copy';
/** Public sections formerly embedded directly in the page JSX. */
export const LANDING_EXTRA = {
  ...PUBLIC_PAGE_COPY,
  ministryPage: DEFAULT_MINISTRY_COPY,
  header: {
    banner: 'Faith-Rooted Christian Discipleship for Teenagers & Families • 100% Ad-Free',
    missionLink: 'Learn About Our Christian Mission →',
    signInLabel: 'Sign up / Login',
  },
  mission: {
    title: 'A Faith-Filled Digital Sanctuary for Today’s Christian Youth.',
    actionLabel: 'Start Weekly Quests',
    benefits: [
      'Active scripture journeys: 52 weekly guided Bible quests with reflection questions.',
      'Engaging video teachings that unpack biblical truth for everyday teen challenges.',
      'Creative Bible puzzles that make learning enjoyable.',
      'Family study passes with instant barcode cards for Christian households and study circles.',
    ],
  },
  onboarding: {
    steps: [
      { title: 'Get Your Study Pass', description: 'Families and youth study circles receive a unique 6-character pass code or barcode card to connect together.' },
      { title: 'Download Mobile App', description: 'Parents and teens download the Teen Bible Adventures app for Android or iOS, and scan the pass code.' },
      { title: 'Grow in Faith Together', description: 'Complete weekly quests, solve creative scripture puzzles, and build lifelong Christian habits.' },
    ],
  },
  safeguarding: {
    title: 'Uncompromising Commitment to Teen & Family Safety',
    description: 'We adhere strictly to COPPA (US), Age-Appropriate Design Code (UK), and national child safety regulations. Children under 13 cannot create unverified accounts; teen logins remain parent-managed; and all family safety reports remain strictly confidential.',
    actionLabel: 'Safety & Privacy Policy →',
  },
  layout: { hero: true, pillars: true, mission: true, onboarding: true, safeguarding: true },
};
