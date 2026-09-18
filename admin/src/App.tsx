import { useEffect, useState } from 'react';
import { getToken } from './api';
import { ForgotPage, LoginPage, ResetPage } from './auth-pages';
import { QuestsPage } from './pages-content';
import { NotificationsPage, ConsentPage } from './pages-notify';
import { ChurchesPage, DeletionsPage, OverviewPage, ReportsPage, ScoringPage } from './pages-ops';
import { PeoplePage } from './pages-people';
import { parseHash, type Route } from './route';
import { Shell } from './shell';

function readRoute(): Route {
  return parseHash(window.location.hash, Boolean(getToken()));
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener('hashchange', sync);
    window.addEventListener('askhub:route', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('askhub:route', sync);
    };
  }, []);

  if (route.kind === 'auth') {
    if (route.view === 'forgot') return <ForgotPage />;
    if (route.view === 'reset') return <ResetPage token={route.token ?? ''} />;
    return <LoginPage />;
  }

  const page = {
    dashboard: <OverviewPage />,
    people: <PeoplePage />,
    churches: <ChurchesPage />,
    quests: <QuestsPage />,
    notifications: <NotificationsPage />,
    consent: <ConsentPage />,
    reports: <ReportsPage />,
    deletions: <DeletionsPage />,
    scoring: <ScoringPage />,
  }[route.tab];

  return <Shell tab={route.tab}>{page}</Shell>;
}
