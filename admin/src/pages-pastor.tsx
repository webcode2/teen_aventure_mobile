import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, clearPastorSession, getPastorToken, getPastorUser, pastorLogin, type PastorUser } from './api';
import { Alert, Brand, Dialog, Empty, Spinner } from './ui';
import { ChurchJoinBarcodeCard } from './barcode';

type ChurchDetails = {
  id: string;
  name: string;
  joinCode: string;
  jurisdiction?: string;
  description?: string;
  createdAt?: string;
};

type ChurchPerson = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

type ChurchFamily = {
  id: string;
  name: string;
  guardians: Array<{ id: string; name: string; email: string }>;
  children: Array<{ id: string; name: string }>;
};

type ChurchClass = {
  id: string;
  name: string;
  kind: string;
  assignments: Array<{ teacher: { id: string; name: string } }>;
};

type SafeguardingReport = {
  id: string;
  category: string;
  description: string;
  reporterLabel?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ESCALATED' | 'CLOSED';
  investigationLocked?: boolean;
  createdAt: string;
  events?: Array<{
    id: string;
    action: string;
    note?: string;
    actor?: { name: string };
    createdAt: string;
  }>;
};

export function PastorPortalPage({ churchIdFromRoute }: { churchIdFromRoute?: string }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(getPastorToken);
  const [pastorUser, setPastorUser] = useState<PastorUser | null>(getPastorUser);
  const [assignedChurchId, setAssignedChurchId] = useState<string | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Portal dashboard state
  const [activeTab, setActiveTab] = useState<'safeguarding' | 'classes' | 'families' | 'team' | 'barcode'>('safeguarding');
  const [church, setChurch] = useState<ChurchDetails | null>(null);
  const [people, setPeople] = useState<ChurchPerson[]>([]);
  const [families, setFamilies] = useState<ChurchFamily[]>([]);
  const [classes, setClasses] = useState<ChurchClass[]>([]);
  const [reports, setReports] = useState<SafeguardingReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Safeguarding action modal
  const [selectedReport, setSelectedReport] = useState<SafeguardingReport | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<'SUBMITTED' | 'UNDER_REVIEW' | 'ESCALATED' | 'CLOSED'>('UNDER_REVIEW');
  const [pastoralNote, setPastoralNote] = useState('');
  const [savingReport, setSavingReport] = useState(false);

  // Assign staff role modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<'TEACHER' | 'CHAPERONE' | 'CHILDRENS_CHURCH_LEAD' | 'PASTOR'>('TEACHER');
  const [assignBusy, setAssignBusy] = useState(false);

  // Sync session on mount
  useEffect(() => {
    const active = getPastorToken();
    setToken(active);
    if (active) {
      api<{ churchId?: string; churchRole?: string; user?: PastorUser }>('/api/auth/me')
        .then((me) => {
          if (me.churchId) {
            setAssignedChurchId(me.churchId);
          }
        })
        .catch(() => {
          clearPastorSession();
          setToken(null);
        });
    }
  }, []);

  // Determine active church ID (enforcing one pastor, one church)
  const effectiveChurchId = assignedChurchId || churchIdFromRoute || '';

  // Load church data when authenticated
  useEffect(() => {
    if (!token || !effectiveChurchId) return;

    setLoading(true);
    setErrorMsg('');

    Promise.allSettled([
      api<ChurchDetails>(`/api/churches/${effectiveChurchId}`),
      api<ChurchPerson[]>(`/api/churches/${effectiveChurchId}/people`),
      api<ChurchFamily[]>(`/api/churches/${effectiveChurchId}/families`),
      api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`),
      api<SafeguardingReport[]>(`/api/safeguarding/church/${effectiveChurchId}/reports`),
    ]).then(([resChurch, resPeople, resFamilies, resClasses, resReports]) => {
      if (resChurch.status === 'fulfilled') setChurch(resChurch.value);
      if (resPeople.status === 'fulfilled') setPeople(Array.isArray(resPeople.value) ? resPeople.value : []);
      if (resFamilies.status === 'fulfilled') setFamilies(Array.isArray(resFamilies.value) ? resFamilies.value : []);
      if (resClasses.status === 'fulfilled') setClasses(Array.isArray(resClasses.value) ? resClasses.value : []);
      if (resReports.status === 'fulfilled') setReports(Array.isArray(resReports.value) ? resReports.value : []);
      setLoading(false);
    });
  }, [token, effectiveChurchId]);

  // Login handler
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError('');

    try {
      const res = await pastorLogin(email, password);
      setToken(res.token);
      setPastorUser(res.user);

      // Fetch user profile to discover churchId
      const me = await api<{ churchId?: string }>('/api/auth/me');
      if (me.churchId) {
        setAssignedChurchId(me.churchId);
        navigate(`/groups/${me.churchId}`, { replace: true });
      } else {
        navigate('/groups', { replace: true });
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Pastoral sign in failed');
    } finally {
      setLoginBusy(false);
    }
  }

  // Logout handler
  function handleSignOut() {
    clearPastorSession();
    setToken(null);
    setPastorUser(null);
    setAssignedChurchId(null);
    navigate('/groups', { replace: true });
  }

  // Quick fill helper for demo accounts
  function fillDemo(emailStr: string) {
    setEmail(emailStr);
    setPassword('password123');
  }

  // Regenerate join code handler
  async function handleRegenerateCode() {
    if (!effectiveChurchId) return;
    try {
      const res = await api<{ joinCode: string }>(`/api/churches/${effectiveChurchId}/regenerate-join-code`, {
        method: 'POST',
      });
      if (church) {
        setChurch({ ...church, joinCode: res.joinCode });
      }
      setFeedbackMsg(`Join code regenerated: ${res.joinCode}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not regenerate join code');
    }
  }

  // Safeguarding status & note update
  async function handleSaveReport() {
    if (!selectedReport) return;
    setSavingReport(true);
    setErrorMsg('');
    try {
      // Update status
      await api(`/api/safeguarding/reports/${selectedReport.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusUpdate }),
      });

      // Add note if provided
      if (pastoralNote.trim()) {
        await api(`/api/safeguarding/reports/${selectedReport.id}/events`, {
          method: 'POST',
          body: JSON.stringify({ action: 'NOTE', note: pastoralNote.trim() }),
        });
      }

      setFeedbackMsg(`Report ${selectedReport.id.slice(0, 8)} updated to ${statusUpdate}.`);
      setSelectedReport(null);
      setPastoralNote('');

      // Refresh reports
      const updated = await api<SafeguardingReport[]>(`/api/safeguarding/church/${effectiveChurchId}/reports`);
      setReports(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update report');
    } finally {
      setSavingReport(false);
    }
  }

  // Assign staff role handler
  async function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveChurchId || !assignUserId) return;
    setAssignBusy(true);
    setErrorMsg('');
    try {
      await api(`/api/churches/${effectiveChurchId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ userId: assignUserId, role: assignRole }),
      });
      setFeedbackMsg(`Assigned role ${assignRole} successfully.`);
      setAssignModalOpen(false);
      setAssignUserId('');

      // Refresh people
      const updated = await api<ChurchPerson[]>(`/api/churches/${effectiveChurchId}/people`);
      setPeople(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setAssignBusy(false);
    }
  }

  // ==========================================
  // VIEW A: PUBLIC PASTOR LANDING & LOGIN GATEWAY
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-cream text-navy flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-surface border-b border-border/80 px-4 sm:px-8 py-3.5 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brand size="md" />
              <span className="hidden sm:inline text-xs font-bold text-teal bg-teal-tint px-2.5 py-0.5 rounded-full border border-teal/20">
                Church Operations Portal
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-muted hover:text-navy transition-colors cursor-pointer"
              >
                ← Public Landing
              </button>
              <button
                type="button"
                onClick={() => navigate('/app/login')}
                className="text-muted hover:text-navy transition-colors cursor-pointer"
              >
                Staff Desk
              </button>
            </div>
          </div>
        </header>

        {/* Hero & Login Container */}
        <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Mission & Scriptural Mandate */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-navy text-xs font-bold w-fit">
              <span>Shepherd the Flock &bull; 1 Peter 5:2</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-navy leading-tight">
              Oversee Your Youth Discipleship &amp; Church Operations.
            </h1>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Welcome to the Church Operations Portal. Designed for church leaders, youth directors, and ministry administrators to monitor classroom engagement, review safeguarding matters, and generate instant join code barcode passes for church families.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
                <span className="text-xs font-bold text-teal">🛡️ Safeguarding Console</span>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Confidential reports, safety incident escalation, and care audits.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
                <span className="text-xs font-bold text-teal">⛪ Dedicated Church Workspace</span>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Your flock data is strictly scoped and protected for your specific congregation.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
                <span className="text-xs font-bold text-teal">📱 Barcode Onboarding Pass</span>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Generate instant 1D barcode and 2D QR passes for family app check-ins.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
                <span className="text-xs font-bold text-teal">👥 Youth &amp; Family Directory</span>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Monitor active classes, attendance levels, and connected parent guardians.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Pastoral Sign In Card */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-navy">Church Sign In</h2>
                <p className="text-xs text-muted mt-1">
                  Access live church operations for your congregation.
                </p>
              </div>

              {loginError ? <Alert kind="error">{loginError}</Alert> : null}

              <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Church Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="leader@church.com"
                    className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loginBusy}
                  className="w-full mt-1 rounded-xl bg-navy hover:bg-teal text-white py-2.5 px-4 font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loginBusy ? 'Signing in…' : 'Enter Church Operations Console'}
                </button>
              </form>

              {/* Demo Quick-Fill Links */}
              <div className="pt-3 border-t border-border/60 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Quick-Fill Demo Church Accounts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillDemo('pastor@askhub.local')}
                    className="px-2 py-1 rounded-md text-[10px] bg-surface-2 hover:bg-teal-tint hover:text-teal font-semibold text-navy border border-border transition-colors cursor-pointer"
                  >
                    Grace Demo Church
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('pastor-carter@askhub.local')}
                    className="px-2 py-1 rounded-md text-[10px] bg-surface-2 hover:bg-teal-tint hover:text-teal font-semibold text-navy border border-border transition-colors cursor-pointer"
                  >
                    Faith Community
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('pastor-david@askhub.local')}
                    className="px-2 py-1 rounded-md text-[10px] bg-surface-2 hover:bg-teal-tint hover:text-teal font-semibold text-navy border border-border transition-colors cursor-pointer"
                  >
                    Living Spring
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted text-center">
              Looking for curriculum administration?{' '}
              <button
                type="button"
                onClick={() => navigate('/app/login')}
                className="font-semibold text-navy underline hover:text-teal cursor-pointer"
              >
                App Manager login
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Safeguarding check: Enforce one pastor, one church boundary
  const hasBoundaryConflict =
    churchIdFromRoute &&
    assignedChurchId &&
    churchIdFromRoute.toLowerCase() !== assignedChurchId.toLowerCase();

  // ==========================================
  // VIEW B: AUTHENTICATED CHURCH OPERATIONS MONITOR
  // ==========================================
  return (
    <div className="min-h-screen bg-cream text-navy flex flex-col">
      {/* Header Bar */}
      <header className="bg-navy text-cream sticky top-0 z-30 px-4 sm:px-8 py-3.5 border-b border-white/10 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-white text-base tracking-tight">
              {church?.name || 'Church Operations'}
            </span>
            {church?.jurisdiction ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-gold border border-gold/30">
                {church.jurisdiction}
              </span>
            ) : null}
            <span className="hidden sm:inline text-xs text-cream/60">&bull;</span>
            <span className="hidden sm:inline text-xs font-semibold text-gold">
              Join Code: <span className="font-mono">{church?.joinCode || '—'}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{pastorUser?.name || 'Pastor'}</div>
              <div className="text-[10px] text-gold font-semibold uppercase tracking-wider">
                {pastorUser?.churchRole || 'Pastor'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 flex flex-col gap-6">
        {feedbackMsg ? <Alert kind="ok">{feedbackMsg}</Alert> : null}
        {errorMsg ? <Alert kind="error">{errorMsg}</Alert> : null}

        {/* Boundary violation alert (Dedicated Church Workspace) */}
        {hasBoundaryConflict ? (
          <Alert kind="error">
            <div className="flex flex-col gap-1">
              <strong>Congregational Safeguarding Boundary:</strong>
              <span>
                As authorized church leadership, you are steward of{' '}
                <strong className="text-navy">{church?.name || assignedChurchId}</strong>. You cannot monitor other
                church operations.
              </span>
              <button
                type="button"
                onClick={() => navigate(`/groups/${assignedChurchId}`)}
                className="font-bold underline text-left cursor-pointer mt-1"
              >
                Switch back to my church ({church?.name || 'My Congregation'}) →
              </button>
            </div>
          </Alert>
        ) : null}

        {/* Church Overview KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-xs">
            <span className="text-xs text-muted font-medium">Families</span>
            <div className="text-2xl font-extrabold text-navy mt-1 tabular-nums">
              {families.length}
            </div>
            <span className="text-[10px] text-muted">Registered households</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-xs">
            <span className="text-xs text-muted font-medium">Youth &amp; Teens</span>
            <div className="text-2xl font-extrabold text-teal mt-1 tabular-nums">
              {families.reduce((acc, f) => acc + (f.children?.length || 0), 0)}
            </div>
            <span className="text-[10px] text-muted">Enrolled in Sunday discipleship</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-xs">
            <span className="text-xs text-muted font-medium">Classes &amp; Groups</span>
            <div className="text-2xl font-extrabold text-navy mt-1 tabular-nums">
              {classes.length}
            </div>
            <span className="text-[10px] text-muted">Sunday School classes</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-xs">
            <span className="text-xs text-muted font-medium">Safeguarding</span>
            <div className={`text-2xl font-extrabold mt-1 tabular-nums ${reports.length > 0 ? 'text-gold' : 'text-navy'}`}>
              {reports.length}
            </div>
            <span className="text-[10px] text-muted">Confidential cases</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-xs text-muted font-medium">Ministry Team</span>
            <div className="text-2xl font-extrabold text-navy mt-1 tabular-nums">
              {people.length}
            </div>
            <span className="text-[10px] text-muted">Teachers &amp; Leaders</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-1 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'safeguarding'
                ? 'bg-navy text-white shadow-xs'
                : 'text-muted hover:text-navy hover:bg-surface-2'
            }`}
            onClick={() => setActiveTab('safeguarding')}
          >
            🛡️ Safeguarding &amp; Care ({reports.length})
          </button>
          <button
            type="button"
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'classes'
                ? 'bg-navy text-white shadow-xs'
                : 'text-muted hover:text-navy hover:bg-surface-2'
            }`}
            onClick={() => setActiveTab('classes')}
          >
            📖 Classes &amp; Groups ({classes.length})
          </button>
          <button
            type="button"
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'families'
                ? 'bg-navy text-white shadow-xs'
                : 'text-muted hover:text-navy hover:bg-surface-2'
            }`}
            onClick={() => setActiveTab('families')}
          >
            👨‍👩‍👧 Families ({families.length})
          </button>
          <button
            type="button"
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'team'
                ? 'bg-navy text-white shadow-xs'
                : 'text-muted hover:text-navy hover:bg-surface-2'
            }`}
            onClick={() => setActiveTab('team')}
          >
            👥 Ministry Team ({people.length})
          </button>
          <button
            type="button"
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'barcode'
                ? 'bg-navy text-white shadow-xs'
                : 'text-muted hover:text-navy hover:bg-surface-2'
            }`}
            onClick={() => setActiveTab('barcode')}
          >
            🏷️ Barcode &amp; Pass Generator
          </button>
        </div>

        {/* Tab 1: Safeguarding Console */}
        {activeTab === 'safeguarding' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-navy text-base">Safeguarding &amp; Care Incidents</h3>
                <p className="text-xs text-muted mt-0.5">
                  Direct, confidential reports filed by parents and guardians. Visible only to authorized church leadership.
                </p>
              </div>
            </div>

            {loading ? (
              <Spinner label="Loading reports…" />
            ) : reports.length === 0 ? (
              <Empty
                title="No active safeguarding incidents"
                body="Your church currently has zero open safeguarding reports or escalated care cases."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-border/80 bg-cream flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy text-xs uppercase tracking-wide">
                          {r.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'ESCALATED'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : r.status === 'UNDER_REVIEW'
                              ? 'bg-gold/20 text-navy border border-gold/40'
                              : r.status === 'CLOSED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-surface text-navy border border-border'
                          }`}
                        >
                          {r.status}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-navy/90 line-clamp-2 max-w-2xl mt-0.5">
                        {r.description}
                      </p>
                      <div className="text-[11px] text-muted">
                        Reported by: <span className="font-semibold text-navy">{r.reporterLabel || 'Anonymous guardian'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(r);
                        setStatusUpdate(r.status);
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-2xs"
                    >
                      Review Incident →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Classes & Groups */}
        {activeTab === 'classes' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-navy text-base">Sunday School &amp; Youth Classes</h3>
                <p className="text-xs text-muted mt-0.5">
                  Church cell groups linked live to weekly Teen Quest lessons.
                </p>
              </div>
            </div>

            {loading ? (
              <Spinner label="Loading classes…" />
            ) : classes.length === 0 ? (
              <Empty
                title="No classes created yet"
                body="Classes created by teachers or church leads will be displayed here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-border bg-cream flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy text-sm">{c.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-tint text-teal border border-teal/20">
                        {c.kind}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      Teachers:{' '}
                      <span className="font-semibold text-navy">
                        {c.assignments?.map((a) => a.teacher.name).join(', ') || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Church Families */}
        {activeTab === 'families' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-navy text-base">Congregational Families &amp; Youth</h3>
                <p className="text-xs text-muted mt-0.5">
                  Families enrolled using your church join code. Children names safeguarded.
                </p>
              </div>
            </div>

            {loading ? (
              <Spinner label="Loading families…" />
            ) : families.length === 0 ? (
              <Empty
                title="No families enrolled yet"
                body="Share your Church Join Code or Barcode Pass to welcome visiting families."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {families.map((f) => (
                  <div key={f.id} className="p-4 rounded-xl border border-border bg-cream flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy text-sm">{f.name}</span>
                      <span className="text-xs text-teal font-semibold">
                        {f.children?.length || 0} youth enrolled
                      </span>
                    </div>

                    <div className="text-xs text-muted">
                      Guardians:{' '}
                      <span className="text-navy font-medium">
                        {f.guardians?.map((g) => `${g.name} (${g.email})`).join(', ') || '—'}
                      </span>
                    </div>

                    {f.children?.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {f.children.map((c) => (
                          <span
                            key={c.id}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface border border-border text-navy"
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Ministry Team */}
        {activeTab === 'team' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-navy text-base">Ministry Team &amp; Church Leaders</h3>
                <p className="text-xs text-muted mt-0.5">
                  Authorized pastors, teachers, chaperones, and children’s church leads.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-navy hover:bg-teal text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                + Assign staff role
              </button>
            </div>

            {loading ? (
              <Spinner label="Loading team…" />
            ) : people.length === 0 ? (
              <Empty title="No staff records found" body="Assign church roles to leaders and Sunday school teachers." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {people.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl border border-border bg-cream flex flex-col gap-1.5">
                    <span className="font-bold text-navy text-sm">{p.name}</span>
                    <span className="text-xs text-muted">{p.email}</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.roles?.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy text-white"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Barcode & Pass Generator */}
        {activeTab === 'barcode' && (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col items-center gap-6">
            <div className="text-center max-w-md">
              <h3 className="font-bold text-navy text-lg">Church Join Barcode &amp; Pass Generator</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Generate high-resolution 1D barcodes and 2D QR codes for Sunday bulletin inserts, foyer posters, or screen slides.
              </p>
            </div>

            {church ? (
              <ChurchJoinBarcodeCard
                joinCode={church.joinCode}
                churchName={church.name}
                jurisdiction={church.jurisdiction}
              />
            ) : (
              <Spinner label="Loading church pass data…" />
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-border/60">
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
              >
                🔄 Regenerate Church Join Code
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Safeguarding Review Modal */}
      <Dialog
        open={selectedReport !== null}
        onClose={() => setSelectedReport(null)}
        title="Safeguarding Incident Review"
        subtitle={`Incident Case #${selectedReport?.id.slice(0, 8)}`}
      >
        {selectedReport ? (
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-3 rounded-xl bg-cream border border-border flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Category: <strong className="text-navy uppercase">{selectedReport.category}</strong></span>
                <span>{new Date(selectedReport.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-navy leading-relaxed whitespace-pre-wrap mt-1">
                {selectedReport.description}
              </p>
              <div className="text-[11px] text-muted mt-1">
                Reporter: <strong>{selectedReport.reporterLabel || 'Anonymous Guardian'}</strong>
              </div>
            </div>

            {/* Status Selector */}
            <label className="flex flex-col gap-1 font-semibold text-navy">
              <span>Update Case Status:</span>
              <select
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value as typeof statusUpdate)}
                className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
              >
                <option value="SUBMITTED">SUBMITTED (Pending intake)</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW (Care inquiry ongoing)</option>
                <option value="ESCALATED">ESCALATED (Urgent care &amp; leadership notification)</option>
                <option value="CLOSED">CLOSED (Resolved with families)</option>
              </select>
            </label>

            {/* Note Input */}
            <label className="flex flex-col gap-1 font-semibold text-navy">
              <span>Add Confidential Care Note:</span>
              <textarea
                rows={3}
                value={pastoralNote}
                onChange={(e) => setPastoralNote(e.target.value)}
                placeholder="Record actions taken, family contact made, or resolution steps…"
                className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-navy cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingReport}
                onClick={handleSaveReport}
                className="px-4 py-1.5 rounded-xl bg-navy hover:bg-teal text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingReport ? 'Saving…' : 'Record Care Action'}
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Assign Church Role Modal */}
      <Dialog
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Church Ministry Role"
        subtitle="Authorize leaders, Sunday School teachers, and chaperones."
      >
        <form onSubmit={handleAssignRole} className="flex flex-col gap-4 text-xs">
          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Select Church Member:</span>
            <select
              required
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
            >
              <option value="">-- Choose member --</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Ministry Role:</span>
            <select
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value as typeof assignRole)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
            >
              <option value="TEACHER">TEACHER (Can manage Sunday School classes &amp; open quizzes)</option>
              <option value="CHAPERONE">CHAPERONE (Youth event chaperone)</option>
              <option value="CHILDRENS_CHURCH_LEAD">CHILDRENS_CHURCH_LEAD (Department director)</option>
              <option value="PASTOR">PASTOR (Full pastoral oversight &amp; safeguarding)</option>
            </select>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-navy cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignBusy}
              className="px-4 py-1.5 rounded-xl bg-navy hover:bg-teal text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {assignBusy ? 'Assigning…' : 'Confirm Role Assignment'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
