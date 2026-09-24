import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from 'react-router';
import { ForgotPage, LoginPage, ResetPage } from './auth-pages';
import { RequireGuest, RequireStaff } from './guards';
import { PublicLandingPage } from './pages-landing';
import { NotificationsPage, ConsentPage } from './pages-notify';
import {
  ChurchesPage,
  DeletionsPage,
  GroupsPage,
  OverviewPage,
  ReportsPage,
  ScoringPage,
} from './pages-ops';
import { PastorPortalPage } from './pages-pastor';
import { PeoplePage } from './pages-people';
import { PuzzlesStudioPage } from './pages-puzzles';
import { QuestsPage } from './pages-content';
import { PublishedWeeksPage } from './pages-weeks';
import { isDashboardTab } from './path-helpers';
import type { Tab } from './route';
import { Shell } from './shell';

function DashboardLayout() {
  const params = useParams();
  const tab: Tab =
    params.tab && isDashboardTab(params.tab) ? params.tab : 'dashboard';

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
    people: <PeoplePage />,
    churches: <ChurchesPage />,
    groups: <GroupsPage />,
    weeks: <PublishedWeeksPage />,
    quests: <QuestsPage />,
    puzzles: <PuzzlesStudioPage />,
    notifications: <NotificationsPage />,
    consent: <ConsentPage />,
    reports: <ReportsPage />,
    deletions: <DeletionsPage />,
    scoring: <ScoringPage />,
  }[tab];

  return page ?? <Navigate to="/app/dashboard" replace />;
}

function ResetRoute() {
  const [params] = useSearchParams();
  return <ResetPage token={params.get('token') ?? ''} />;
}

function PastorRoute() {
  const { churchId } = useParams();
  return <PastorPortalPage churchIdFromRoute={churchId} />;
}

function ChurchRedirect() {
  const { churchId } = useParams();
  return <Navigate to={churchId ? `/groups/${churchId}` : '/groups'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPage />} />
      <Route
        path="/app/login"
        element={
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        }
      />
      <Route
        path="/app/forgot"
        element={
          <RequireGuest>
            <ForgotPage />
          </RequireGuest>
        }
      />
      <Route
        path="/app/reset"
        element={
          <RequireGuest>
            <ResetRoute />
          </RequireGuest>
        }
      />
      <Route path="/app/dashboard" element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path=":tab" element={<DashboardTabPage />} />
      </Route>
      <Route path="/groups" element={<PastorRoute />} />
      <Route path="/groups/:churchId" element={<PastorRoute />} />
      <Route path="/pastor" element={<Navigate to="/groups" replace />} />
      <Route path="/church/:churchId" element={<ChurchRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
