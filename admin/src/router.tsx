import { AccountDeletionQueue } from './account-deletion-queue';
import { AccountDeletionPage } from './pages-account-deletion';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router';
import { ForgotPage, LoginPage, ResetPage } from './auth-pages';
import { RequireStaff } from './guards';
import { PublicLandingPage } from './pages-landing';
import { AboutPage } from './pages-about';
import { ContactPage } from './pages-contact';
import { getPastorToken } from './api';
import { ChurchApplicationReviewPage } from './church-applications';
import { ChurchApplyPage, ChurchApplyVerifyPage, MinistryGuidePage } from './pages-church-apply';
import { NotificationHistoryPage, NotificationsPage } from './pages-notify';
import {
  ArchivedChurchesPage,
  ChurchDetailPage,
  ChurchesPage,
  DeletionsPage,
  GroupDetailPage,
  GroupsPage,
  OverviewPage,
  ReportDetailPage,
  ReportsPage,
  ScoringPage,
} from './pages-ops';
import { PastorPortalPage } from './pages-pastor';
import { PeoplePage } from './pages-people';
import { PuzzlesStudioPage } from './pages-puzzles';
import { PuzzleLibraryPage } from './pages-puzzle-library';
import { MatchingStudioPage } from './pages-matching';
import { MatchingLibraryPage } from './pages-matching-library';
import { QuestEditorPage } from './pages-content';
import { QuestsPage } from './pages-quest-list';
import { ContentCmsPage } from './pages-content-cms';
import { LegalDocsPage } from './pages-legal';
import { NudgesPage } from './pages-nudges';
import { PrivacyPage, PublicSitePage, TermsPage } from './pages-legal-public';
import { isDashboardTab } from './path-helpers';
import type { Tab } from './route';
import { Shell } from './shell';

function DashboardLayout() {
  const params = useParams();
  const { pathname } = useLocation();
  const fromPath = pathname.replace(/^\/app\/dashboard\/?/, '').split('/')[0] ?? '';
  const raw = params.tab || fromPath;
  const tab: Tab = raw && isDashboardTab(raw) ? raw : 'dashboard';

  return (
    <RequireStaff>
      <Shell tab={tab}>
        <Outlet />
      </Shell>
    </RequireStaff>
  );
}

function DashboardTabPage() {
  const { tab } = useParams();
  if (!tab || !isDashboardTab(tab) || tab === 'dashboard') {
    return <Navigate to="/app/dashboard" replace />;
  }

  const page = {
    people: <PeoplePage section="users" />,
    pastors: <PeoplePage section="pastors" />,
    staff: <PeoplePage section="staff" />,
    churches: <ChurchesPage />,
    archive: <ArchivedChurchesPage />,
    'users-archive': <AccountDeletionQueue archiveScope="ACCOUNT" />,
    groups: <GroupsPage />,
    quests: <QuestsPage />,
    puzzles: <PuzzlesStudioPage />,
    matching: <MatchingStudioPage />,
    notifications: <NotificationsPage />,
    reports: <ReportsPage />,
    deletions: <DeletionsPage />,
    scoring: <ScoringPage />,
    'content-mobile': <ContentCmsPage platform="mobile" />,
    'content-web': <ContentCmsPage platform="web" />,
    legal: <LegalDocsPage />,
    cheers: <NudgesPage />,
  }[tab];

  return page ?? <Navigate to="/app/dashboard" replace />;
}

function ResetRoute() {
  const [params] = useSearchParams();
  return <ResetPage token={params.get('token') ?? ''} />;
}

const MINISTRY_SECTIONS = ['families', 'groups', 'team', 'nudges', 'care'] as const;

function isMinistrySection(value: string | undefined): value is (typeof MINISTRY_SECTIONS)[number] {
  return Boolean(value && (MINISTRY_SECTIONS as readonly string[]).includes(value));
}

/** Single ministry entry: applicant/apply until approved; ops portal after pastor session. */
function MinistryRoute() {
  const { churchId, section } = useParams();
  if (!getPastorToken()) {
    return <ChurchApplyPage />;
  }
  if (churchId && !section) {
    return <Navigate to={`/ministry/${churchId}/families`} replace />;
  }
  if (churchId && section && !isMinistrySection(section)) {
    return <Navigate to={`/ministry/${churchId}/families`} replace />;
  }
  return (
    <PastorPortalPage
      churchIdFromRoute={churchId}
      sectionFromRoute={isMinistrySection(section) ? section : undefined}
    />
  );
}

function MinistryRedirect() {
  const { churchId } = useParams();
  return <Navigate to={churchId ? `/ministry/${churchId}/families` : '/ministry'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/delete-account" element={<AccountDeletionPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/p/:slug" element={<PublicSitePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/ministry" element={<MinistryRoute />} />
      <Route path="/ministry/verify" element={<ChurchApplyVerifyPage />} />
      <Route path="/ministry/guide" element={<MinistryGuidePage />} />
      <Route path="/ministry/:churchId" element={<MinistryRoute />} />
      <Route path="/ministry/:churchId/:section" element={<MinistryRoute />} />
      <Route path="/apply" element={<Navigate to="/ministry" replace />} />
      <Route path="/apply/verify" element={<Navigate to="/ministry" replace />} />
      <Route path="/app/login" element={<LoginPage />} />
      <Route path="/app/forgot" element={<ForgotPage />} />
      <Route path="/app/reset" element={<ResetRoute />} />
      <Route path="/app/dashboard" element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="quests/new" element={<QuestEditorPage />} />
        <Route path="quests/:week" element={<QuestEditorPage />} />
        <Route path="churches/applications/:applicationId" element={<ChurchApplicationReviewPage />} />
        <Route path="churches/:churchId" element={<ChurchDetailPage />} />
        <Route path="groups/:classId" element={<GroupDetailPage />} />
        <Route path="reports/:reportId" element={<ReportDetailPage />} />
        <Route path="puzzles/library" element={<PuzzleLibraryPage />} />
        <Route path="matching/library" element={<MatchingLibraryPage />} />
        <Route path="notifications/history" element={<NotificationHistoryPage />} />
        <Route path=":tab" element={<DashboardTabPage />} />
      </Route>
      <Route path="/groups" element={<MinistryRedirect />} />
      <Route path="/groups/:churchId" element={<MinistryRedirect />} />
      <Route path="/pastor" element={<Navigate to="/ministry" replace />} />
      <Route path="/church/:churchId" element={<MinistryRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
