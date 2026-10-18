import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { api, clearPastorSession, getPastorToken, getPastorUser, pastorLogin, type PastorUser } from './api';
import { askConfirm } from './prompt-dialog';
import { HomeIcon, ShieldIcon, UsersIcon } from './dashboard-helpers';
import { CheerIcon, GroupsIcon } from './nav-icons';
import { SideNavLayout, type SideNavGroup } from './side-nav';
import { Alert, Badge, Brand, Dialog, Drawer, Empty, Field, PencilIcon, Spinner, Button } from './ui';
import { GroupJoinBarcodeCard } from './barcode';
import { PublicLayout } from './public-shell';
import type { NudgeTemplate } from './pages-nudges';

export const MINISTRY_PAGE_IDS = ['families', 'groups', 'team', 'nudges', 'care'] as const;
export type PastorTab = (typeof MINISTRY_PAGE_IDS)[number];

function ministryPagePath(churchId: string, page: PastorTab) {
  return `/ministry/${churchId}/${page}`;
}

type ChurchDetails = {
  id: string;
  name: string;
  joinCode: string;
  jurisdiction?: string;
  description?: string;
  disabledAt?: string | null;
  createdAt?: string;
};

type ChurchPerson = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive?: boolean;
};

type ChurchFamily = {
  id: string;
  name: string;
  isPersonal?: boolean;
  guardians: Array<{ id: string; name: string; email: string }>;
  children: Array<{ id: string; name: string }>;
};

type ChurchClass = {
  id: string;
  name: string;
  description?: string | null;
  kind: string;
  joinCode?: string;
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

type ClassEnrollment = {
  id: string;
  classId: string;
  childId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  child: {
    id: string;
    name: string;
    streak?: { current: number; lastDay: string | null } | null;
  };
};

type ClassActivityScore = {
  id: string;
  childId: string;
  activityType: string;
  refKey: string;
  points: number;
  createdAt: string;
  child: { id: string; name: string };
};

type ClassActivity = {
  enrollments: ClassEnrollment[];
  recentScores: ClassActivityScore[];
};

const PROFILE_TITLES = [
  { value: 'PASTOR', label: 'Pastor' },
  { value: 'MINISTRY_LEADER', label: 'Ministry leader' },
  { value: 'YOUTH_WORKER', label: 'Youth worker' },
  { value: 'CHILDRENS_MINISTRY_LEAD', label: "Children's ministry lead" },
  { value: 'TEACHER', label: 'Teacher' },
] as const;

export type MinistryTitleValue = (typeof PROFILE_TITLES)[number]['value'];

export type PastorApplicantHome = {
  name: string;
  email: string;
  title: string;
  titleValue: MinistryTitleValue;
  phone: string;
  joinedAt?: string;
  application: {
    churchName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    decisionReason: string | null;
    churchId?: string | null;
  } | null;
  onApply: () => void;
  onSignOut: () => void;
  onEnterMinistry?: () => Promise<void>;
  onProfileSave: (next: { name: string; title: MinistryTitleValue; phone: string }) => Promise<void>;
};

export function MinistryProfileAside({
  open,
  onClose,
  home,
}: {
  open: boolean;
  onClose: () => void;
  home: PastorApplicantHome;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(home.name);
  const [title, setTitle] = useState<MinistryTitleValue>(home.titleValue);
  const [phone, setPhone] = useState(home.phone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const letter = home.name.trim().charAt(0).toUpperCase() || '?';
  const ministryLabel = home.application
    ? home.application.status === 'APPROVED'
      ? home.application.churchName
      : home.application.status === 'PENDING'
        ? 'Pending'
        : 'Not approved'
    : 'No ministry';

  useEffect(() => {
    setName(home.name);
    setTitle(home.titleValue);
    setPhone(home.phone);
  }, [home.name, home.titleValue, home.phone]);

  function cancelEdit() {
    setName(home.name);
    setTitle(home.titleValue);
    setPhone(home.phone);
    setError('');
    setEditing(false);
  }

  function close() {
    cancelEdit();
    onClose();
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      await home.onProfileSave({ name: name.trim(), title, phone: phone.trim() });
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save your profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      widthClass="max-w-md"
      headerActions={
        editing ? (
          <button
            type="button"
            className="cursor-pointer rounded-xl border border-border bg-cream px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-navy"
            onClick={cancelEdit}
          >
            Cancel
          </button>
        ) : null
      }
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      {!editing ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-[1.75rem] border border-border/70 bg-surface px-5 pb-5 pt-6 shadow-xs">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 rounded-full bg-[#F3E6D8] p-1.5">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-2xl font-black tracking-tight text-white shadow-xs">
                  {letter}
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <h4 className="m-0 text-lg font-extrabold tracking-tight text-navy">{home.name}</h4>
                <button
                  type="button"
                  className="cursor-pointer rounded-lg p-1 text-muted transition-colors hover:bg-cream hover:text-navy"
                  aria-label="Edit account"
                  onClick={() => setEditing(true)}
                >
                  <PencilIcon />
                </button>
              </div>
              <p className="m-0 mt-0.5 text-sm text-muted">{home.title}</p>
              <p className="m-0 mt-1 max-w-full truncate font-mono text-[11px] text-muted/80">{home.email}</p>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h5 className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Overview</h5>
                <Badge kind="ok">Active</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-tint text-teal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.8L12 14.8 7.7 16.5l.8-4.8L5 8.3l4.8-.8L12 3z" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-navy">{home.title}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${home.application?.status === 'APPROVED' ? 'bg-teal-tint text-teal' : 'bg-surface-2 text-muted/50'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M3 21h18M6 21V10l6-4 6 4v11M10 21v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-navy">{ministryLabel}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${home.phone ? 'bg-teal-tint text-teal' : 'bg-surface-2 text-muted/50'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-navy">{home.phone ? 'Phone on file' : 'No phone'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h5 className="m-0 mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Account</h5>
              <div className="divide-y divide-border/50 rounded-2xl bg-cream/80 px-3.5">
                <div className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="text-muted">Email</span>
                  <span className="max-w-[14rem] truncate font-mono font-semibold text-navy">{home.email}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="text-muted">Phone</span>
                  <span className="font-semibold text-navy">{home.phone || 'Not added'}</span>
                </div>
                {home.joinedAt ? (
                  <div className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <span className="text-muted">Joined</span>
                    <span className="font-semibold text-navy">{new Date(home.joinedAt).toLocaleDateString()}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" onClick={() => setEditing(true)}
            >
              <PencilIcon />
              <span>Edit details</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Edit account details</span>
            <button type="button" className="cursor-pointer text-xs text-muted underline hover:text-navy" onClick={cancelEdit}>
              Cancel editing
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Display name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              />
            </Field>
            <Field label="Title">
              <select
                value={title}
                onChange={(event) => setTitle(event.target.value as MinistryTitleValue)}
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                {PROFILE_TITLES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              />
            </Field>
            <Field label="Email" hint="This is the address you use to sign in.">
              <p className="m-0 text-xs font-medium text-muted">{home.email}</p>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelEdit}
              className="cursor-pointer rounded-full border border-border bg-cream px-3.5 py-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function ApprovedMinistry({ home }: { home: PastorApplicantHome }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function openMinistry() {
    if (!home.onEnterMinistry) return;
    setBusy(true);
    setError('');
    try {
      await home.onEnterMinistry();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not open your ministry');
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-2 py-8 text-center">
      <Brand size="md" />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-teal">Approved</p>
        <h1 className="mt-1 text-2xl font-bold text-navy">{home.application?.churchName}</h1>
      </div>
      <p className="text-sm leading-relaxed text-navy">
        Teen Bible Adventures approved this ministry. You can create and manage groups with the same account.
      </p>
      {error ? <Alert kind="error">{error}</Alert> : null}
      <Button size="lg" type="button" disabled={busy || !home.onEnterMinistry} onClick={openMinistry}>
        {busy ? 'Opening…' : 'Open your ministry'}
      </Button>
    </section>
  );
}

function UnverifiedMinistryWelcome({ home }: { home: PastorApplicantHome }) {
  const navigate = useNavigate();
  const title = home.title.toLowerCase();
  const application = home.application;

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-2 py-8 text-center">
      <Brand size="md" />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-teal">Welcome</p>
        <h1 className="mt-1 text-2xl font-bold text-navy">Welcome, {home.name}</h1>
      </div>
      <p className="text-sm leading-relaxed text-navy">
        This {title} account has no activities yet. Apply to have a ministry, families, and a team on Teen Bible Adventures.
      </p>
      {application?.status === 'PENDING' ? (
        <Alert kind="ok">
          Your application for {application.churchName} is with Teen Bible Adventures. We will email {home.email} with the decision.
        </Alert>
      ) : application?.status === 'REJECTED' ? (
        <Alert kind="error">
          Your application for {application.churchName} was not approved. {application.decisionReason ?? ''}
        </Alert>
      ) : (
        <Button size="lg" type="button" onClick={home.onApply}>
          Apply for a ministry
        </Button>
      )}
      <p className="text-sm leading-relaxed text-muted">
        For more on how to use this account and how to set it up, read the{' '}
        <button
          type="button"
          onClick={() => navigate('/ministry/guide')}
          className="cursor-pointer font-semibold text-teal underline"
        >
          setup guide
        </button>
        .
      </p>
    </section>
  );
}

export function PastorPortalPage({
  churchIdFromRoute,
  sectionFromRoute,
  applicantHome,
  applicantPanel,
}: {
  churchIdFromRoute?: string;
  sectionFromRoute?: PastorTab;
  applicantHome?: PastorApplicantHome;
  applicantPanel?: ReactNode;
}) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => (applicantHome ? null : getPastorToken()));
  const [profileOpen, setProfileOpen] = useState(false);
  const [pastorUser, setPastorUser] = useState<PastorUser | null>(() => (applicantHome ? null : getPastorUser()));
  const [assignedChurchId, setAssignedChurchId] = useState<string | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Portal page from URL (`/ministry/:churchId/:section`)
  const activeTab: PastorTab = sectionFromRoute ?? 'families';
  const [church, setChurch] = useState<ChurchDetails | null>(null);
  const [people, setPeople] = useState<ChurchPerson[]>([]);
  const [families, setFamilies] = useState<ChurchFamily[]>([]);
  const [classes, setClasses] = useState<ChurchClass[]>([]);
  const [reports, setReports] = useState<SafeguardingReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!feedbackMsg) return;
    const timer = window.setTimeout(() => setFeedbackMsg(''), 4500);
    return () => window.clearTimeout(timer);
  }, [feedbackMsg]);

  // Custom Groups / Classes management state
  const [classQuery, setClassQuery] = useState('');
  const [createClassModalOpen, setCreateClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [createClassBusy, setCreateClassBusy] = useState(false);
  const [createClassError, setCreateClassError] = useState('');

  // Edit class modal state
  const [editClassModalOpen, setEditClassModalOpen] = useState(false);
  const [selectedClassForEdit, setSelectedClassForEdit] = useState<ChurchClass | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassDescription, setEditClassDescription] = useState('');
  const [editClassBusy, setEditClassBusy] = useState(false);
  const [editClassError, setEditClassError] = useState('');

  // Assign teacher to class modal
  const [assignTeacherModalOpen, setAssignTeacherModalOpen] = useState(false);
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<ChurchClass | null>(null);
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState('');
  const [assignTeacherBusy, setAssignTeacherBusy] = useState(false);

  // Class Roster & Approvals Modal
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<ChurchClass | null>(null);
  const [rosterEnrollments, setRosterEnrollments] = useState<ClassEnrollment[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterUpdatingId, setRosterUpdatingId] = useState<string | null>(null);

  // Class Activity & Streaks Modal
  const [selectedClassForActivity, setSelectedClassForActivity] = useState<ChurchClass | null>(null);
  const [classActivityData, setClassActivityData] = useState<ClassActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Objective Quiz activate / class standing (teachers + pastors)
  type QuestWeekOpt = { id: string; weekNumber: number; title: string };
  type ClassStandingRow = {
    childId?: string;
    childName: string;
    points: number;
    isBlurred?: boolean;
    rank?: number;
  };
  const [selectedClassForQuiz, setSelectedClassForQuiz] = useState<ChurchClass | null>(null);
  const [questWeeks, setQuestWeeks] = useState<QuestWeekOpt[]>([]);
  const [activeActivations, setActiveActivations] = useState<
    Array<{ questId: string; isActive: boolean; quest?: { weekNumber: number; title: string } }>
  >([]);
  const [quizQuestId, setQuizQuestId] = useState('');
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [selectedClassForStanding, setSelectedClassForStanding] = useState<ChurchClass | null>(null);
  const [classStanding, setClassStanding] = useState<ClassStandingRow[]>([]);
  const [loadingStanding, setLoadingStanding] = useState(false);

  // Group QR / join pass modal
  const [selectedClassForPass, setSelectedClassForPass] = useState<ChurchClass | null>(null);

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

  // Register new teacher modal
  const [registerTeacherModalOpen, setRegisterTeacherModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBirthYear, setRegBirthYear] = useState('');
  const [regRole, setRegRole] = useState<'TEACHER' | 'CHAPERONE' | 'CHILDRENS_CHURCH_LEAD' | 'PASTOR'>('TEACHER');
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState('');

  // Update roles modal
  const [editRolePerson, setEditRolePerson] = useState<ChurchPerson | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [editRoleBusy, setEditRoleBusy] = useState(false);
  const [editRoleError, setEditRoleError] = useState('');

  // Restricting state
  const [restrictingId, setRestrictingId] = useState<string | null>(null);

  // Nudge template creation (private to this ministry; Care approves)
  const [nudgeTemplates, setNudgeTemplates] = useState<NudgeTemplate[]>([]);
  const [nudgeDraft, setNudgeDraft] = useState('');
  const [nudgePane, setNudgePane] = useState<'new' | 'custom' | 'system'>('new');

  const [loadingNudges, setLoadingNudges] = useState(false);
  const [savingNudge, setSavingNudge] = useState(false);
  const [editingNudgeId, setEditingNudgeId] = useState<string | null>(null);
  const [editNudgeDraft, setEditNudgeDraft] = useState('');
  const [resubmittingNudge, setResubmittingNudge] = useState(false);

  // Sync session on mount
  useEffect(() => {
    if (applicantHome) return;
    const active = getPastorToken();
    setToken(active);
    const u = getPastorUser();
    if (u) {
      setPastorUser(u);
      if (u.churchId) setAssignedChurchId(u.churchId);
    }
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
  const effectiveChurchId = assignedChurchId || pastorUser?.churchId || churchIdFromRoute || '';
  const customNudgeCount = nudgeTemplates.filter(row => row.churchId === effectiveChurchId).length;
  const nudgeLimitReached = customNudgeCount >= 30;
  const visibleNudges = (nudgePane === 'system'
    ? nudgeTemplates.filter(row => !row.churchId)
    : nudgeTemplates.filter(row => row.churchId === effectiveChurchId));

  // Refresh church dataset
  async function refreshChurchData() {
    if (!token || !effectiveChurchId) return;
    setLoading(true);
    try {
      const [resChurch, resPeople, resFamilies, resClasses, resReports, resNudges] = await Promise.allSettled([
        api<ChurchDetails>(`/api/churches/${effectiveChurchId}`),
        api<ChurchPerson[]>(`/api/churches/${effectiveChurchId}/people`),
        api<ChurchFamily[]>(`/api/churches/${effectiveChurchId}/families`),
        api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`),
        api<SafeguardingReport[]>(`/api/safeguarding/church/${effectiveChurchId}/reports`),
        api<NudgeTemplate[]>(`/api/churches/${effectiveChurchId}/nudge-templates`),
      ]);
      if (resChurch.status === 'fulfilled') setChurch(resChurch.value);
      if (resPeople.status === 'fulfilled') setPeople(Array.isArray(resPeople.value) ? resPeople.value : []);
      if (resFamilies.status === 'fulfilled') {
        setFamilies(Array.isArray(resFamilies.value) ? resFamilies.value : []);
      } else {
        setFamilies([]);
        const reason = resFamilies.reason;
        setErrorMsg(reason instanceof Error ? reason.message : 'Failed to load families');
      }
      if (resClasses.status === 'fulfilled') setClasses(Array.isArray(resClasses.value) ? resClasses.value : []);
      if (resReports.status === 'fulfilled') setReports(Array.isArray(resReports.value) ? resReports.value : []);
      if (resNudges.status === 'fulfilled') {
        setNudgeTemplates(Array.isArray(resNudges.value) ? resNudges.value : []);
      }
    } finally {
      setLoading(false);
    }
  }

  // Load church data when authenticated; refresh when returning to the tab.
  useEffect(() => {
    if (token && effectiveChurchId) {
      refreshChurchData();
    }
  }, [token, effectiveChurchId]);

  // Canonical ops URLs are `/ministry/:churchId/:section`.
  useEffect(() => {
    if (applicantHome || applicantPanel) return;
    if (!token || !effectiveChurchId || sectionFromRoute) return;
    navigate(ministryPagePath(effectiveChurchId, 'families'), { replace: true });
  }, [token, effectiveChurchId, sectionFromRoute, applicantHome, applicantPanel, navigate]);

  useEffect(() => {
    if (!token || !effectiveChurchId) return;
    const onFocus = () => {
      void refreshChurchData();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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

      const me = await api<{ churchId?: string }>('/api/auth/me');
      if (me.churchId) {
        setAssignedChurchId(me.churchId);
        navigate(ministryPagePath(me.churchId, 'families'), { replace: true });
      } else {
        navigate('/ministry', { replace: true });
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Ministry sign in failed');
    } finally {
      setLoginBusy(false);
    }
  }

  // Logout handler
  function handleSignOut() {
    if (applicantHome) {
      applicantHome.onSignOut();
      return;
    }
    clearPastorSession();
    setToken(null);
    setPastorUser(null);
    setAssignedChurchId(null);
    navigate('/ministry', { replace: true });
  }

  // Clipboard copy helper
  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  // Create custom class / group handler
  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    if (!effectiveChurchId) {
      setCreateClassError('No ministry identifier found for this session. Please refresh or sign in again.');
      return;
    }

    setCreateClassBusy(true);
    setCreateClassError('');
    try {
      const created = await api<ChurchClass>(`/api/classes/church/${effectiveChurchId}`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: newClassDescription.trim() || undefined,
        }),
      });
      setFeedbackMsg(`Custom group "${created.name}" created successfully.`);
      setCreateClassModalOpen(false);
      setNewClassName('');
      setNewClassDescription('');
      setCreateClassError('');

      // Refresh classes list
      const updatedClasses = await api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`);
      setClasses(Array.isArray(updatedClasses) ? updatedClasses : []);
    } catch (err: unknown) {
      setCreateClassError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setCreateClassBusy(false);
    }
  }

  // Edit custom class / group handler
  async function handleEditClass(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassForEdit || !effectiveChurchId) return;
    const trimmed = editClassName.trim();
    if (!trimmed) {
      setEditClassError('Class name is required');
      return;
    }

    setEditClassBusy(true);
    setEditClassError('');
    try {
      await api(`/api/classes/${selectedClassForEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmed,
          description: editClassDescription.trim() || null,
        }),
      });
      setFeedbackMsg(`Group "${trimmed}" updated successfully.`);
      setEditClassModalOpen(false);
      const updatedClasses = await api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`);
      setClasses(Array.isArray(updatedClasses) ? updatedClasses : []);
    } catch (err: unknown) {
      setEditClassError(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setEditClassBusy(false);
    }
  }

  // Assign teacher to class handler
  async function handleAssignTeacherToClass(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassForTeacher || !selectedTeacherUserId) return;

    setAssignTeacherBusy(true);
    setErrorMsg('');
    try {
      await api(`/api/classes/${selectedClassForTeacher.id}/teachers`, {
        method: 'POST',
        body: JSON.stringify({ teacherUserId: selectedTeacherUserId }),
      });
      setFeedbackMsg(`Assigned teacher to "${selectedClassForTeacher.name}".`);
      setAssignTeacherModalOpen(false);
      setSelectedClassForTeacher(null);
      setSelectedTeacherUserId('');

      // Refresh classes
      const updatedClasses = await api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`);
      setClasses(Array.isArray(updatedClasses) ? updatedClasses : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to assign teacher');
    } finally {
      setAssignTeacherBusy(false);
    }
  }

  // Open Class Roster Modal
  async function openClassRoster(cls: ChurchClass) {
    setSelectedClassForRoster(cls);
    setLoadingRoster(true);
    try {
      const res = await api<ClassEnrollment[]>(`/api/classes/${cls.id}/enrollments`);
      setRosterEnrollments(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load class roster');
    } finally {
      setLoadingRoster(false);
    }
  }

  // Update student enrollment status
  async function handleUpdateEnrollmentStatus(enrollmentId: string, status: 'APPROVED' | 'REJECTED') {
    if (!selectedClassForRoster) return;
    setRosterUpdatingId(enrollmentId);
    try {
      await api(`/api/classes/enrollment/${enrollmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setRosterEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status } : e))
      );
      setFeedbackMsg(`Student enrollment marked as ${status}.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update enrollment');
    } finally {
      setRosterUpdatingId(null);
    }
  }

  // Open Class Activity & Streaks Modal
  async function openClassActivity(cls: ChurchClass) {
    setSelectedClassForActivity(cls);
    setLoadingActivity(true);
    try {
      const res = await api<ClassActivity>(`/api/classes/${cls.id}/activity`);
      setClassActivityData(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load class activity');
    } finally {
      setLoadingActivity(false);
    }
  }

  async function openClassQuiz(cls: ChurchClass) {
    setSelectedClassForQuiz(cls);
    setLoadingQuiz(true);
    setErrorMsg('');
    try {
      const [weeks, active] = await Promise.all([
        api<QuestWeekOpt[]>('/api/teen-quest/weeks'),
        api<Array<{ questId: string; isActive: boolean; quest?: { weekNumber: number; title: string } }>>(
          `/api/teen-quest/class/${cls.id}/active`,
        ),
      ]);
      setQuestWeeks(Array.isArray(weeks) ? weeks : []);
      setActiveActivations(Array.isArray(active) ? active : []);
      const firstActive = (Array.isArray(active) ? active : []).find((a) => a.isActive)?.questId;
      setQuizQuestId(firstActive || (Array.isArray(weeks) && weeks[0] ? weeks[0].id : ''));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load quiz controls');
    } finally {
      setLoadingQuiz(false);
    }
  }

  async function setClassQuizActive(isActive: boolean) {
    if (!selectedClassForQuiz || !quizQuestId) return;
    setSavingQuiz(true);
    setErrorMsg('');
    try {
      await api(`/api/teen-quest/class/${selectedClassForQuiz.id}/activate`, {
        method: 'POST',
        body: JSON.stringify({ questId: quizQuestId, quizType: 'OBJS', isActive }),
      });
      setFeedbackMsg(
        isActive
          ? `Objective Quiz activated for ${selectedClassForQuiz.name}.`
          : `Objective Quiz deactivated for ${selectedClassForQuiz.name}.`,
      );
      const active = await api<
        Array<{ questId: string; isActive: boolean; quest?: { weekNumber: number; title: string } }>
      >(`/api/teen-quest/class/${selectedClassForQuiz.id}/active`);
      setActiveActivations(Array.isArray(active) ? active : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update quiz activation');
    } finally {
      setSavingQuiz(false);
    }
  }

  async function openClassStanding(cls: ChurchClass) {
    setSelectedClassForStanding(cls);
    setLoadingStanding(true);
    setErrorMsg('');
    try {
      const res = await api<ClassStandingRow[]>(`/api/teen-quest/class/${cls.id}/leaderboard`);
      setClassStanding(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load class standing');
      setClassStanding([]);
    } finally {
      setLoadingStanding(false);
    }
  }

  async function loadNudgeTemplates() {
    if (!effectiveChurchId) return;
    setLoadingNudges(true);
    setErrorMsg('');
    try {
      const rows = await api<NudgeTemplate[]>(`/api/churches/${effectiveChurchId}/nudge-templates`);
      setNudgeTemplates(Array.isArray(rows) ? rows : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load nudge templates');
    } finally {
      setLoadingNudges(false);
    }
  }

  async function handleSubmitNudgeTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveChurchId || !nudgeDraft.trim() || nudgeLimitReached) return;
    setSavingNudge(true);
    setErrorMsg('');
    try {
      await api(`/api/churches/${effectiveChurchId}/nudge-templates`, {
        method: 'POST',
        body: JSON.stringify({ message: nudgeDraft.trim() }),
      });
      setNudgeDraft('');
      setFeedbackMsg(
        'Submitted for Teen Bible Adventures review. If approved, only this ministry’s groups can send it.',
      );
      await loadNudgeTemplates();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not submit nudge template');
    } finally {
      setSavingNudge(false);
    }
  }

  async function handleResubmitNudgeTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveChurchId || !editingNudgeId || !editNudgeDraft.trim()) return;
    setResubmittingNudge(true);
    setErrorMsg('');
    try {
      await api(`/api/churches/${effectiveChurchId}/nudge-templates/${editingNudgeId}`, {
        method: 'PUT',
        body: JSON.stringify({ message: editNudgeDraft.trim() }),
      });
      setEditingNudgeId(null);
      setEditNudgeDraft('');
      setFeedbackMsg('Resubmitted for Teen Bible Adventures review.');
      await loadNudgeTemplates();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not resubmit nudge template');
    } finally {
      setResubmittingNudge(false);
    }
  }

  // Safeguarding status & note update
  async function handleSaveReport() {
    if (!selectedReport) return;
    setSavingReport(true);
    setErrorMsg('');
    try {
      await api(`/api/safeguarding/reports/${selectedReport.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusUpdate }),
      });

      if (pastoralNote.trim()) {
        await api(`/api/safeguarding/reports/${selectedReport.id}/events`, {
          method: 'POST',
          body: JSON.stringify({ action: 'NOTE', note: pastoralNote.trim() }),
        });
      }

      setFeedbackMsg(`Report ${selectedReport.id.slice(0, 8)} updated to ${statusUpdate}.`);
      setSelectedReport(null);
      setPastoralNote('');

      const updated = await api<SafeguardingReport[]>(`/api/safeguarding/church/${effectiveChurchId}/reports`);
      setReports(Array.isArray(updated) ? updated : []);
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

      const updated = await api<ChurchPerson[]>(`/api/churches/${effectiveChurchId}/people`);
      setPeople(Array.isArray(updated) ? updated : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setAssignBusy(false);
    }
  }

  // Register new teacher directly by church
  async function handleRegisterTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveChurchId) return;
    setRegBusy(true);
    setRegError('');
    try {
      const res = await api<{ user: { id: string; name: string; email: string }; role: string }>(
        `/api/churches/${effectiveChurchId}/teachers`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: regName.trim(),
            email: regEmail.trim(),
            password: regPassword,
            role: regRole,
            birthYear: Number(regBirthYear),
          }),
        },
      );
      setFeedbackMsg(`Successfully registered ${res.user.name} (${res.user.email}) as ${res.role}!`);
      setRegisterTeacherModalOpen(false);
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegBirthYear('');
      setRegRole('TEACHER');

      const [updatedPeople, updatedClasses] = await Promise.all([
        api<ChurchPerson[]>(`/api/churches/${effectiveChurchId}/people`),
        api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`),
      ]);
      setPeople(Array.isArray(updatedPeople) ? updatedPeople : []);
      setClasses(Array.isArray(updatedClasses) ? updatedClasses : []);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Failed to register teacher');
    } finally {
      setRegBusy(false);
    }
  }

  // Update roles for a team member
  async function handleUpdateRoles(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveChurchId || !editRolePerson) return;
    setEditRoleBusy(true);
    setEditRoleError('');
    try {
      await api(`/api/churches/${effectiveChurchId}/people/${editRolePerson.id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles: selectedRoles }),
      });
      setFeedbackMsg(`Updated roles for ${editRolePerson.name}.`);
      setEditRolePerson(null);

      const [updatedPeople, updatedClasses] = await Promise.all([
        api<ChurchPerson[]>(`/api/churches/${effectiveChurchId}/people`),
        api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`),
      ]);
      setPeople(Array.isArray(updatedPeople) ? updatedPeople : []);
      setClasses(Array.isArray(updatedClasses) ? updatedClasses : []);
    } catch (err: unknown) {
      setEditRoleError(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setEditRoleBusy(false);
    }
  }

  async function handleDeleteGroup(cls: ChurchClass) {
    if (!effectiveChurchId) return;
    const ok = await askConfirm(
      `Delete group "${cls.name}"?\n\nEmpty groups are removed immediately. Groups with members are scheduled for deletion so families can see the notice.`,
      { title: 'Delete group', confirmLabel: 'Delete group', tone: 'danger' },
    );
    if (!ok) return;
    setErrorMsg('');
    try {
      const res = await api<{ immediate?: boolean; pending?: boolean }>('/api/memberships/delete', {
        method: 'POST',
        body: JSON.stringify({ kind: 'CLASS', id: cls.id }),
      });
      setFeedbackMsg(
        res.immediate
          ? `Deleted "${cls.name}".`
          : `"${cls.name}" is scheduled for deletion. Members will see the notice.`,
      );
      const updatedClasses = await api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`);
      setClasses(Array.isArray(updatedClasses) ? updatedClasses : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete group');
    }
  }

  async function handleRemoveStaff(person: ChurchPerson) {
    if (!effectiveChurchId) return;
    if (pastorUser?.id && person.id === pastorUser.id) {
      setErrorMsg('You cannot remove yourself from this ministry.');
      return;
    }
    const ok = await askConfirm(
      `Remove ${person.name} (${person.email}) from this ministry team?\n\nTheir ministry roles and group teacher assignments will be cleared. Their personal account is not deleted.`,
      { title: 'Remove staff', confirmLabel: 'Remove', tone: 'danger' },
    );
    if (!ok) return;
    setRestrictingId(person.id);
    setErrorMsg('');
    try {
      await api(`/api/churches/${effectiveChurchId}/people/${person.id}`, { method: 'DELETE' });
      setFeedbackMsg(`Removed ${person.name} from the ministry team.`);
      const [updatedPeople, updatedClasses] = await Promise.all([
        api<ChurchPerson[]>(`/api/churches/${effectiveChurchId}/people`),
        api<ChurchClass[]>(`/api/churches/${effectiveChurchId}/classes`),
      ]);
      setPeople(Array.isArray(updatedPeople) ? updatedPeople : []);
      setClasses(Array.isArray(updatedClasses) ? updatedClasses : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove staff');
    } finally {
      setRestrictingId(null);
    }
  }

  // Restrict or reactivate member
  async function handleToggleRestrict(person: ChurchPerson) {
    if (!effectiveChurchId) return;
    const willRestrict = person.isActive !== false;
    const confirmPrompt = willRestrict
      ? `Restrict ${person.name} (${person.email})?\n\nThey will be suspended from signing in and leading groups.`
      : `Reactivate ${person.name} (${person.email})?\n\nThey will be able to sign in and resume their ministry responsibilities.`;
    const ok = await askConfirm(confirmPrompt, {
      title: willRestrict ? 'Restrict access' : 'Reactivate',
      confirmLabel: willRestrict ? 'Restrict' : 'Reactivate',
      tone: willRestrict ? 'danger' : 'default',
    });
    if (!ok) return;

    setRestrictingId(person.id);
    setErrorMsg('');
    try {
      await api(`/api/churches/${effectiveChurchId}/people/${person.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !willRestrict }),
      });
      setFeedbackMsg(
        willRestrict
          ? `Restricted ${person.name}. Access suspended.`
          : `Reactivated ${person.name}. Access restored.`,
      );
      const updated = await api<ChurchPerson[]>(`/api/churches/${effectiveChurchId}/people`);
      setPeople(Array.isArray(updated) ? updated : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setRestrictingId(null);
    }
  }

  // Filtered classes
  const filteredClasses = classes.filter((c) => {
    const q = classQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.joinCode ?? '').toLowerCase().includes(q) ||
      c.assignments?.some((a) => a.teacher.name.toLowerCase().includes(q))
    );
  });

  // ==========================================
  // VIEW A: PUBLIC PASTOR & LEADER GATEWAY
  // ==========================================
  if (!token && !applicantHome) {
    return (
      <PublicLayout activeTab="portal">
        {/* Hero & Login Container */}
        <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Mission & Mandate */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-navy text-xs font-bold w-fit">
              <span>Shepherd the Flock &bull; 1 Peter 5:2</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-navy leading-tight">
              Oversee Your Teenager Discipleship &amp; Ministry Groups.
            </h1>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Welcome to the Ministry Portal. Designed for ministry leaders, teenage ministry directors, and mentors to manage groups, review student attendance streaks, dispatch announcements, and safeguard teenage disciples.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
                <span className="text-xs font-bold text-teal">🛡️ Safeguarding Console</span>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Confidential reports, safety incident escalation, and care audits.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
                <span className="text-xs font-bold text-teal">⛪ Custom Group Hub</span>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Create cell groups, approve student enrollments, and track live activity.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
                <span className="text-xs font-bold text-teal">📱 Barcode Onboarding Pass</span>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Each group has its own code. A person joins that group on their own.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs">
                <span className="text-xs font-bold text-teal">💬 Approved student nudges</span>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  Group leaders cheer members from Teen Bible Adventures–approved templates only — no freeform spam.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Pastoral & Leadership Sign In Card */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-navy">Ministry Sign In</h2>
                <p className="text-xs text-muted mt-1">
                  Access ministry operations and group management for your congregation.
                </p>
              </div>

              {loginError ? <Alert kind="error">{loginError}</Alert> : null}

              <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
                  <span>Ministry email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="leader@ministry.org"
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

                <Button size="lg" className="w-full mt-1" type="submit" disabled={loginBusy}>
                  {loginBusy ? 'Signing in…' : 'Enter ministry'}
                </Button>
              </form>
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
        </div>
      </PublicLayout>
    );
  }

  // Safeguarding check: Enforce one pastor, one church boundary
  const hasBoundaryConflict =
    churchIdFromRoute &&
    assignedChurchId &&
    churchIdFromRoute.toLowerCase() !== assignedChurchId.toLowerCase();

  // ==========================================
  // VIEW B: AUTHENTICATED CHURCH OPERATIONS & CUSTOM GROUP HUB
  // ==========================================
  const applicantMode = Boolean(applicantPanel || applicantHome);
  const ministryNav: SideNavGroup[] = [
    {
      label: 'Ministry',
      items: [
        {
          id: 'families',
          label: 'Families',
          count: families.length,
          icon: <HomeIcon />,
        },
        ...(applicantHome
          ? []
          : [
              {
                id: 'groups' as const,
                label: 'Groups',
                count: classes.length,
                icon: <GroupsIcon />,
              },
            ]),
        {
          id: 'team',
          label: 'Team',
          count: people.length,
          icon: <UsersIcon />,
        },
        ...(applicantHome
          ? []
          : [
              {
                id: 'nudges' as const,
                label: 'Nudges',
                count: nudgeTemplates.filter((t) => t.status === 'PENDING').length || undefined,
                icon: <CheerIcon />,
              },
            ]),
        {
          id: 'care',
          label: 'Care',
          count: reports.length,
          icon: <ShieldIcon />,
        },
      ],
    },
  ];

  const ministryAlerts = (
    <>
      {church?.disabledAt ? (
        <p className="rounded-xl border border-gold/40 bg-gold/15 p-3 text-xs font-semibold text-navy" role="status">
          Under review. Group activities are paused.
        </p>
      ) : null}
      {feedbackMsg ? <Alert kind="ok">{feedbackMsg}</Alert> : null}
      {errorMsg ? <Alert kind="error">{errorMsg}</Alert> : null}
      {hasBoundaryConflict ? (
        <Alert kind="error">
          <div className="flex flex-col gap-1">
            <strong>Congregational Safeguarding Boundary:</strong>
            <span>
              As authorized ministry leadership, you are steward of{' '}
              <strong className="text-navy">{church?.name || assignedChurchId}</strong>. You cannot monitor other
              ministry operations.
            </span>
                <button
                  type="button"
              onClick={() => navigate(ministryPagePath(assignedChurchId, 'families'))}
              className="mt-1 cursor-pointer text-left font-bold underline"
                >
              Switch back to my ministry ({church?.name || 'My ministry'}) →
                </button>
            </div>
        </Alert>
      ) : null}
    </>
  );

  const signOutButton = (
    <button
      type="button"
      onClick={handleSignOut}
      className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-surface-2"
    >
      Sign out
    </button>
  );

  if (applicantMode) {
    return (
      <div className="flex min-h-screen flex-col bg-cream text-navy">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-navy px-4 py-3.5 text-cream shadow-xs sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-xl bg-white px-2 py-1">
                <Brand size="sm" />
              </div>
              <div className="min-w-0">
                <span className="block text-base font-extrabold tracking-tight text-white">
                  {church?.name || applicantHome?.application?.churchName || 'Ministry'}
                </span>
                {church?.description ? (
                  <p className="mt-0.5 line-clamp-2 max-w-xl text-[11px] leading-snug text-cream/75" title={church.description}>
                    {church.description}
                  </p>
                ) : null}
            </div>
            </div>
            <div className="flex items-center gap-3">
              {applicantHome ? (
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="cursor-pointer text-right"
                  aria-label="Open your profile"
                >
                  <div className="text-xs font-bold text-white">{applicantHome.name}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gold">{applicantHome.title}</div>
                  <div className="text-[10px] text-cream/70">{applicantHome.email}</div>
                </button>
              ) : null}
            <button
              type="button"
              onClick={handleSignOut}
                className="cursor-pointer rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-8">
          {ministryAlerts}
          {applicantPanel ? (
            <div className="mx-auto w-full max-w-3xl">{applicantPanel}</div>
          ) : applicantHome?.application?.status === 'APPROVED' ? (
            <ApprovedMinistry home={applicantHome} />
          ) : applicantHome ? (
            <UnverifiedMinistryWelcome home={applicantHome} />
          ) : null}
        </main>
        {applicantHome ? (
          <MinistryProfileAside open={profileOpen} onClose={() => setProfileOpen(false)} home={applicantHome} />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <SideNavLayout
        groups={ministryNav}
        activeId={activeTab}
        onSelect={(id) => {
          const next = id as PastorTab;
          const churchId = effectiveChurchId || assignedChurchId;
          if (!churchId) return;
          navigate(ministryPagePath(churchId, next));
          if (next === 'families' || next === 'team' || next === 'groups') {
            void refreshChurchData();
          }
          if (next === 'nudges') {
            void loadNudgeTemplates();
          }
        }}
        topBar={
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Ministry portal</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold leading-tight tracking-tight text-navy">
                {church?.name || 'Ministry'}
              </h2>
              {church?.jurisdiction ? (
                <span className="rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-navy">
                  {church.jurisdiction}
              </span>
              ) : null}
            </div>
            {church?.description ? (
              <p className="mt-0.5 line-clamp-1 max-w-xl text-[11px] text-muted" title={church.description}>
                {church.description}
              </p>
        ) : null}
          </div>
        }
        topActions={
          <>
            <div className="hidden text-right sm:block">
              <div className="text-xs font-bold text-navy">{pastorUser?.name || 'Ministry leader'}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {pastorUser?.churchRole || 'Pastor'}
              </div>
            </div>
            {signOutButton}
          </>
        }
        footer={
          <div className="px-2 py-1 text-left">
            <strong className="block truncate text-xs font-bold text-white">
              {pastorUser?.name || 'Ministry leader'}
            </strong>
            <span className="block truncate text-[11px] text-cream/60">
              {pastorUser?.churchRole || 'Pastor'}
            </span>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
        {ministryAlerts}

        {/* Ministry overview */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
          <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-xs">
            <span className="text-xs font-medium text-muted">Custom Groups</span>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-navy">
              {classes.length}
            </div>
            <span className="text-[10px] text-muted">Active classes &amp; cells</span>
          </div>

          <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-xs">
            <span className="text-xs font-medium text-muted">Teenagers</span>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-teal">
              {families.reduce((acc, f) => acc + (f.children?.length || 0), 0)}
            </div>
            <span className="text-[10px] text-muted">Enrolled in discipleship</span>
          </div>

          <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-xs">
            <span className="text-xs font-medium text-muted">Families</span>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-navy">
              {families.length}
            </div>
            <span className="text-[10px] text-muted">Registered households</span>
          </div>

          <div className="rounded-xl border border-border/80 bg-surface p-4 shadow-xs">
            <span className="text-xs font-medium text-muted">Safeguarding</span>
            <div className={`mt-1 text-2xl font-extrabold tabular-nums ${reports.length > 0 ? 'text-gold' : 'text-navy'}`}>
              {reports.length}
            </div>
            <span className="text-[10px] text-muted">Confidential cases</span>
          </div>

          <div className="col-span-2 rounded-xl border border-border/80 bg-surface p-4 shadow-xs sm:col-span-1">
            <span className="text-xs font-medium text-muted">Team</span>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-navy">
              {people.length}
            </div>
            <span className="text-[10px] text-muted">Teachers &amp; Leaders</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: SAFEGUARDING & CARE CONSOLE */}
        {/* ========================================================= */}
        {activeTab === 'care' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-navy text-base">Care</h3>
                <p className="text-xs text-muted mt-0.5">
                  Direct, confidential reports filed by parents and guardians. Visible only to authorized ministry leadership.
                </p>
              </div>
            </div>

            {loading ? (
              <Spinner label="Loading reports…" />
            ) : reports.length === 0 ? (
              <Empty
                title="No active safeguarding incidents"
                body="Your ministry currently has zero open safeguarding reports or escalated care cases."
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

        {/* ========================================================= */}
        {/* TAB 2: CUSTOM GROUPS & SUNDAY SCHOOL CLASSES */}
        {/* ========================================================= */}
        {activeTab === 'groups' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-navy text-base">Groups</h3>
                <p className="text-xs text-muted mt-0.5">
                  Cell groups and Sunday School cohorts linked live to weekly Teen Quest curriculum.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="search"
                  value={classQuery}
                  onChange={(e) => setClassQuery(e.target.value)}
                  placeholder="Search groups, join codes, teachers…"
                  aria-label="Search custom groups"
                  className="rounded-xl border border-border bg-cream px-3 py-1.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal w-48 sm:w-64"
                />
                <Button size="sm" className="whitespace-nowrap" type="button" onClick={() => setCreateClassModalOpen(true)}>
                  + Create Custom Group
                </Button>
              </div>
            </div>

            {loading ? (
              <Spinner label="Loading ministry groups…" />
            ) : filteredClasses.length === 0 ? (
              <Empty
                title={classQuery ? 'No matching custom groups' : 'No custom groups created yet'}
                body={
                  classQuery
                    ? 'Try refining your search query.'
                    : 'Create your first teenager group, cell circle, or Sunday School class to start tracking discipleship!'
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl border border-border bg-cream/70 hover:bg-cream transition-colors flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex flex-col gap-2.5">
                      {/* Title & Badge & Edit */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-navy text-sm sm:text-base leading-snug">
                            {c.name}
                          </span>
                          {c.description ? (
                            <span className="text-[11px] text-muted font-normal mt-0.5 leading-snug">
                              {c.description}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClassForEdit(c);
                              setEditClassName(c.name);
                              setEditClassDescription(c.description ?? '');
                              setEditClassError('');
                              setEditClassModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold border border-border bg-surface hover:bg-surface-2 text-navy cursor-pointer transition-colors"
                            title="Edit group name and description"
                          >
                            Edit
                          </button>
                          {applicantHome ? null : (
                            <button
                              type="button"
                              onClick={() => void handleDeleteGroup(c)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 bg-surface hover:bg-red-50 text-red-700 cursor-pointer transition-colors"
                              title="Delete this ministry group"
                            >
                              Delete
                            </button>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-tint text-teal border border-teal/20">
                            {c.kind}
                          </span>
                        </div>
                      </div>

                      {/* Join Code Indicator */}
                      {c.joinCode ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted font-medium">Group Code:</span>
                          <span className="font-mono font-bold bg-surface px-2 py-0.5 rounded border border-border text-navy">
                            {c.joinCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.joinCode!)}
                            className="text-[11px] text-teal hover:underline font-semibold cursor-pointer"
                          >
                            {copiedCode === c.joinCode ? '✓ Copied' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedClassForPass(c)}
                            className="text-[11px] text-teal hover:underline font-semibold cursor-pointer"
                          >
                            QR &amp; share
                          </button>
                        </div>
                      ) : null}

                      {/* Teachers */}
                      <div className="text-xs text-muted flex items-center justify-between pt-1 border-t border-border/50">
                        <span>
                          Leader:{' '}
                          <span className="font-semibold text-navy">
                            {c.assignments?.map((a) => a.teacher.name).join(', ') || 'Unassigned'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassForTeacher(c);
                            setSelectedTeacherUserId(c.assignments?.[0]?.teacher.id || '');
                            setAssignTeacherModalOpen(true);
                          }}
                          className="text-[11px] text-navy font-semibold hover:text-teal underline cursor-pointer"
                        >
                          {c.assignments?.length ? 'Change' : '+ Assign'}
                        </button>
                      </div>
                    </div>

                    {/* Interactive Action Hub — cheers use approved templates in the mobile app */}
                    <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => openClassRoster(c)}
                        className="p-2 rounded-xl bg-surface hover:bg-surface-2 border border-border/80 text-[11px] font-bold text-navy text-center transition-colors cursor-pointer shadow-2xs"
                        title="Manage class roster and approve student enrollments"
                      >
                        Roster
                      </button>

                      <button
                        type="button"
                        onClick={() => openClassActivity(c)}
                        className="p-2 rounded-xl bg-surface hover:bg-surface-2 border border-border/80 text-[11px] font-bold text-navy text-center transition-colors cursor-pointer shadow-2xs"
                        title="View student streak engagement and quiz score feed"
                      >
                        Streaks
                      </button>

                      <button
                        type="button"
                        onClick={() => void openClassQuiz(c)}
                        className="p-2 rounded-xl bg-surface hover:bg-surface-2 border border-border/80 text-[11px] font-bold text-navy text-center transition-colors cursor-pointer shadow-2xs"
                        title="Activate or deactivate this week’s Objective Quiz for the class"
                      >
                        Quiz
                      </button>

                      <button
                        type="button"
                        onClick={() => void openClassStanding(c)}
                        className="p-2 rounded-xl bg-surface hover:bg-surface-2 border border-border/80 text-[11px] font-bold text-navy text-center transition-colors cursor-pointer shadow-2xs"
                        title="View class leaderboard / standing"
                      >
                        Standing
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CONGREGATIONAL FAMILIES */}
        {/* ========================================================= */}
        {activeTab === 'families' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-navy text-base">Congregational Families &amp; Teenagers</h3>
                <p className="text-xs text-muted mt-0.5">
                  People appear on a group roster after they join that group. Children names safeguarded.
                </p>
              </div>
            </div>

            {loading ? (
              <Spinner label="Loading families…" />
            ) : families.length === 0 ? (
              <Empty
                title="No families enrolled yet"
                body="People join a group with that group's code. Each person enrolls on their own."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {families.map((f) => (
                  <div key={f.id} className="p-4 rounded-xl border border-border bg-cream flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-navy text-sm">{f.name}</span>
                      <span className="text-xs text-teal font-semibold shrink-0">
                        {f.children?.length || 0} teenager{(f.children?.length || 0) === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="text-xs text-muted">
                      {f.isPersonal ? 'Explorer account' : 'Guardians'}:{' '}
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

        {/* ========================================================= */}
        {/* TAB 4: MINISTRY LEADERSHIP TEAM */}
        {/* ========================================================= */}
        {activeTab === 'team' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-navy text-base">Team</h3>
                <p className="text-xs text-muted mt-0.5">
                  Authorized pastors, teachers, chaperones, and department leads. Directly register teachers, manage roles, and control access.
                </p>
              </div>
              {applicantHome ? null : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegError('');
                    setRegisterTeacherModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-teal hover:bg-navy text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>+</span> Register New Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-border hover:bg-cream text-navy text-xs font-semibold transition-colors cursor-pointer"
                >
                  Assign Member Role
                </button>
              </div>
              )}
            </div>

            {loading ? (
              <Spinner label="Loading team…" />
            ) : people.length === 0 ? (
              <Empty title="No staff records found" body="Register teachers and assign ministry roles to your team." />
            ) : (
              <div className="overflow-x-auto bg-transparent">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0">
                        Name
                      </th>
                      <th className="whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0">
                        Email
                      </th>
                      <th className="whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0">
                        Roles
                      </th>
                      <th className="whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0">
                        Status
                      </th>
                      <th className="whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                {people.map((p) => {
                  const isRestricted = p.isActive === false;
                      const nameParts = p.name.trim().split(/\s+/).filter(Boolean);
                      const initials =
                        nameParts.length >= 2
                          ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                          : (nameParts[0] || '?').slice(0, 2).toUpperCase();
                  return (
                        <tr
                      key={p.id}
                          className={`border-b border-border/50 transition-colors hover:bg-surface-2/30 ${
                            isRestricted ? 'opacity-65' : ''
                          }`}
                        >
                          <td className="px-3 py-3 align-middle font-semibold text-navy first:pl-0 last:pr-0">
                            <div className="flex min-w-[10rem] items-center gap-2.5">
                              <span
                                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-tight ${
                                  isRestricted ? 'bg-surface-2 text-muted' : 'bg-navy text-gold'
                                }`}
                                aria-hidden
                              >
                                {initials}
                              </span>
                              <span className={`truncate ${isRestricted ? 'line-through decoration-muted' : ''}`}>
                            {p.name}
                          </span>
                        </div>
                          </td>
                          <td className="max-w-[14rem] truncate px-3 py-3 align-middle text-muted first:pl-0 last:pr-0">
                            {p.email}
                          </td>
                          <td className="px-3 py-3 align-middle text-navy first:pl-0 last:pr-0">
                          {p.roles && p.roles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.roles.map((r) => (
                              <span
                                key={r}
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isRestricted ? 'bg-muted text-surface' : 'bg-navy text-white'
                                }`}
                              >
                                {r}
                              </span>
                                ))}
                              </div>
                            ) : (
                              <span className="italic text-muted">No ministry roles assigned</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-middle first:pl-0 last:pr-0">
                            <Badge kind={isRestricted ? 'bad' : 'ok'}>
                              {isRestricted ? 'Restricted' : 'Active'}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 align-middle first:pl-0 last:pr-0">
                            <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditRoleError('');
                            setEditRolePerson(p);
                            setSelectedRoles([...(p.roles || [])]);
                          }}
                                className="cursor-pointer text-[11px] font-semibold text-navy transition-colors hover:text-teal"
                        >
                          ✎ Update Roles
                        </button>
                        <button
                          type="button"
                          disabled={restrictingId === p.id}
                          onClick={() => handleToggleRestrict(p)}
                                className={`cursor-pointer text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                            isRestricted
                                    ? 'font-bold text-teal hover:text-navy'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                        >
                          {restrictingId === p.id
                            ? 'Updating…'
                            : isRestricted
                            ? 'Reactivate'
                            : 'Restrict'}
                        </button>
                        {pastorUser?.id === p.id || !(p.roles && p.roles.length > 0) ? null : (
                          <button
                            type="button"
                            disabled={restrictingId === p.id}
                            onClick={() => void handleRemoveStaff(p)}
                            className="cursor-pointer text-[11px] font-semibold text-red-700 transition-colors hover:text-red-900 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                          </td>
                        </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: NUDGE TEMPLATE CREATION */}
        {/* ========================================================= */}
        {activeTab === 'nudges' && (
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-5">
            <div className="pb-3 border-b border-border/60">
              <h3 className="font-bold text-navy text-base">Ministry nudge templates</h3>
              <p className="text-xs text-muted mt-0.5">
                Submit short student cheers for Teen Bible Adventures review. Approved messages stay private to this
                ministry’s groups. Every group also sees the shared platform catalog registered by the app team.
              </p>
            </div>

            <div role="tablist" aria-label="Nudge templates" className="flex gap-6 border-b border-border/60">
              {(['new', 'custom', 'system'] as const).map((id) => (
                <button
                  key={id}
                  id={`nudge-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={nudgePane === id}
                  aria-controls={`nudge-panel-${id}`}
                  tabIndex={nudgePane === id ? 0 : -1}
                  onClick={() => setNudgePane(id)}
                  onKeyDown={(event) => {
                    const order = ['new', 'custom', 'system'] as const;
                    const index = order.indexOf(nudgePane);
                    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? order[(index + 1) % 3]
                      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? order[(index + 2) % 3]
                      : event.key === 'Home' ? 'new'
                      : event.key === 'End' ? 'system'
                      : null;
                    if (!next) return;
                    event.preventDefault();
                    setNudgePane(next);
                    document.getElementById(`nudge-tab-${next}`)?.focus();
                  }}
                  className={`min-h-11 cursor-pointer border-b-2 px-1 text-sm font-semibold ${nudgePane === id ? 'border-teal text-navy' : 'border-transparent text-muted hover:text-navy'}`}
                >
                  {id === 'new' ? 'New' : id === 'custom' ? 'Custom' : 'System'}
                </button>
              ))}
            </div>

            <div role="tabpanel" id="nudge-panel-new" aria-labelledby="nudge-tab-new" hidden={nudgePane !== 'new'}>
            <form
              onSubmit={(e) => void handleSubmitNudgeTemplate(e)}
              className="rounded-xl border border-border bg-cream/70 p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-navy">New private template</span><span className="text-xs text-muted">{customNudgeCount} / 30 custom messages</span></div>
              {nudgeLimitReached && <p role="status" className="text-sm text-muted">You’ve reached the 30-message limit. System nudges remain available, and rejected messages can still be edited and resubmitted.</p>}
              <textarea
                required
                rows={3}
                maxLength={200}
                value={nudgeDraft}
                disabled={nudgeLimitReached || loadingNudges}
                onChange={(e) => setNudgeDraft(e.target.value)}
                placeholder="e.g. Keep your daily streak going"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
              <div className="flex justify-end">
                <Button size="sm" type="submit" disabled={savingNudge || loadingNudges || nudgeLimitReached || !nudgeDraft.trim()}>
                  {savingNudge ? 'Submitting…' : 'Submit for review'}
                </Button>
              </div>
            </form>
            </div>

            {nudgePane !== 'new' ? (
            <div role="tabpanel" id={`nudge-panel-${nudgePane}`} aria-labelledby={`nudge-tab-${nudgePane}`}>
            {loadingNudges ? (
              <Spinner label="Loading templates…" />
            ) : visibleNudges.length === 0 ? (
              <Empty
                title={nudgePane === 'custom' ? 'No custom messages' : 'No system nudges'}
                body={nudgePane === 'custom' ? 'Submit one from the New tab. Approved messages stay private to this ministry.' : 'Shared platform messages will show up here.'}
              />
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {visibleNudges.map((row) => (
                  <li key={row.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="mb-1 text-[11px] font-semibold text-muted">{row.churchId ? 'Private ministry message' : 'System nudge · Available to all ministries'}</p>
                        <p className="text-sm font-semibold text-navy">{row.message}</p>
                        {row.status === 'REJECTED' && row.rejectionReason ? (
                          <p className="mt-1 text-[11px] text-muted">Feedback: {row.rejectionReason}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          kind={
                            row.status === 'APPROVED'
                              ? 'ok'
                              : row.status === 'REVOKED'
                                ? 'warn'
                                : row.status === 'REJECTED'
                                  ? 'bad'
                                  : 'info'
                          }
                        >
                          {row.status === 'APPROVED'
                            ? 'Approved'
                            : row.status === 'REVOKED'
                              ? 'Revoked'
                              : row.status === 'REJECTED'
                                ? 'Rejected'
                                : 'Pending review'}
                        </Badge>
                        {row.churchId && row.status === 'REJECTED' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                type="button"
                            onClick={() => {
                              setEditingNudgeId(row.id);
                              setEditNudgeDraft(row.message);
                            }}
                          >
                            Edit & resubmit
                          </Button>
                        ) : null}
            </div>
          </div>
                    {editingNudgeId === row.id ? (
                      <form
                        onSubmit={(e) => void handleResubmitNudgeTemplate(e)}
                        className="rounded-xl border border-border bg-cream/70 p-3 flex flex-col gap-2"
                      >
                        <textarea
                          required
                          rows={3}
                          maxLength={200}
                          value={editNudgeDraft}
                          onChange={(e) => setEditNudgeDraft(e.target.value)}
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            disabled={resubmittingNudge}
                            onClick={() => {
                              setEditingNudgeId(null);
                              setEditNudgeDraft('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            type="submit"
                            disabled={resubmittingNudge || !editNudgeDraft.trim()}
                          >
                            {resubmittingNudge ? 'Resubmitting…' : 'Resubmit for review'}
                          </Button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            </div>
            ) : null}
          </div>
        )}
        </div>
      </SideNavLayout>

      {/* ========================================================= */}
      {/* MODAL 1: CREATE CUSTOM GROUP */}
      {/* ========================================================= */}
      <Dialog
        open={createClassModalOpen}
        onClose={() => {
          setCreateClassModalOpen(false);
          setCreateClassError('');
        }}
        title="Create ministry group"
        subtitle="Establish a new cell cohort, teenager group, or Sunday School class."
      >
        <form onSubmit={handleCreateClass} className="flex flex-col gap-4 text-xs">
          {createClassError ? <Alert kind="error">{createClassError}</Alert> : null}
          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Group Name:</span>
            <input
              type="text"
              required
              autoFocus
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Senior High Disciples, Junior Explorers…"
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </label>

          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Description (optional):</span>
            <textarea
              rows={3}
              value={newClassDescription}
              onChange={(e) => setNewClassDescription(e.target.value)}
              placeholder="Focus, meeting times, or notes for this class…"
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </label>

          <p className="text-[11px] text-muted">
            Creating this group will automatically assign a unique 6-character Join Code that teenagers and parents can use to enroll.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateClassModalOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-navy cursor-pointer"
            >
              Cancel
            </button>
            <Button size="sm" type="submit" disabled={createClassBusy || !newClassName.trim()}>
              {createClassBusy ? 'Creating…' : 'Create Group'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 1B: EDIT GROUP */}
      {/* ========================================================= */}
      <Dialog
        open={editClassModalOpen}
        onClose={() => {
          setEditClassModalOpen(false);
          setEditClassError('');
        }}
        title={`Edit ${selectedClassForEdit?.name || 'Group'}`}
        subtitle="Update this group's name and description."
      >
        <form onSubmit={handleEditClass} className="flex flex-col gap-4 text-xs">
          {editClassError ? <Alert kind="error">{editClassError}</Alert> : null}
          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Group Name:</span>
            <input
              type="text"
              required
              autoFocus
              value={editClassName}
              onChange={(e) => setEditClassName(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </label>

          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Description (optional):</span>
            <textarea
              rows={3}
              value={editClassDescription}
              onChange={(e) => setEditClassDescription(e.target.value)}
              placeholder="Focus, meeting times, or notes for this class…"
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setEditClassModalOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-navy cursor-pointer"
            >
              Cancel
            </button>
            <Button size="sm" type="submit" disabled={editClassBusy || !editClassName.trim()}>
              {editClassBusy ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL: GROUP JOIN QR / SHARE PASS */}
      {/* ========================================================= */}
      <Dialog
        open={selectedClassForPass !== null}
        onClose={() => setSelectedClassForPass(null)}
        title="Group join pass"
        subtitle="Generate a QR code families and explorers can scan, or share the group code."
      >
        {selectedClassForPass?.joinCode ? (
          <div className="flex flex-col items-center gap-3">
            <GroupJoinBarcodeCard
              joinCode={selectedClassForPass.joinCode}
              groupName={selectedClassForPass.name}
              description={selectedClassForPass.description ?? undefined}
              kind={selectedClassForPass.kind}
            />
            <button
              type="button"
              onClick={() => setSelectedClassForPass(null)}
              className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-navy"
            >
              Done
            </button>
          </div>
        ) : (
          <Empty title="No join code" body="This group does not have a join code yet." />
        )}
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: ASSIGN TEACHER / LEADER */}
      {/* ========================================================= */}
      <Dialog
        open={assignTeacherModalOpen}
        onClose={() => setAssignTeacherModalOpen(false)}
        title="Assign Group Leader / Teacher"
        subtitle={`Select teacher or mentor for "${selectedClassForTeacher?.name || 'Class'}"`}
      >
        <form onSubmit={handleAssignTeacherToClass} className="flex flex-col gap-4 text-xs">
          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Select leader from the ministry team:</span>
            <select
              required
              value={selectedTeacherUserId}
              onChange={(e) => setSelectedTeacherUserId(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
            >
              <option value="">-- Choose leader / teacher --</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email}) - Roles: {p.roles.join(', ') || 'Member'}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignTeacherModalOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-navy cursor-pointer"
            >
              Cancel
            </button>
            <Button size="sm" type="submit" disabled={assignTeacherBusy || !selectedTeacherUserId}>
              {assignTeacherBusy ? 'Assigning…' : 'Confirm Assignment'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 3: ROSTER & APPROVALS */}
      {/* ========================================================= */}
      <Dialog
        open={selectedClassForRoster !== null}
        onClose={() => setSelectedClassForRoster(null)}
        title={`Group Roster: ${selectedClassForRoster?.name || ''}`}
        subtitle={`Join Code: ${selectedClassForRoster?.joinCode || '—'} • Review student enrollment & status`}
      >
        <div className="flex flex-col gap-4 text-xs">
          {loadingRoster ? (
            <Spinner label="Loading enrolled teenagers…" />
          ) : rosterEnrollments.length === 0 ? (
            <Empty
              title="No students enrolled yet"
              body={`Students can join by entering group join code "${selectedClassForRoster?.joinCode || '—'}" in the mobile app.`}
            />
          ) : (
            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {rosterEnrollments.map((e) => (
                <div
                  key={e.id}
                  className="p-3 rounded-xl border border-border bg-cream flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy text-xs">{e.child.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : e.status === 'PENDING'
                            ? 'bg-gold/20 text-navy border border-gold/40'
                            : 'bg-surface text-muted border border-border'
                        }`}
                      >
                        {e.status}
                      </span>
                    </div>

                    {e.child.streak?.current ? (
                      <span className="text-[11px] font-semibold text-teal">
                        🔥 {e.child.streak.current} day discipleship streak
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted">No active streak</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {e.status !== 'APPROVED' && (
                      <button
                        type="button"
                        disabled={rosterUpdatingId === e.id}
                        onClick={() => handleUpdateEnrollmentStatus(e.id, 'APPROVED')}
                        className="px-2.5 py-1 rounded-lg bg-teal text-white text-[11px] font-bold hover:bg-navy transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Approve ✓
                      </button>
                    )}
                    {e.status !== 'REJECTED' && (
                      <button
                        type="button"
                        disabled={rosterUpdatingId === e.id}
                        onClick={() => handleUpdateEnrollmentStatus(e.id, 'REJECTED')}
                        className="px-2.5 py-1 rounded-lg border border-border bg-surface text-muted hover:text-red-700 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Reject ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end pt-2 border-t border-border/60">
            <Button size="sm" type="button" onClick={() => setSelectedClassForRoster(null)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 4: STREAKS & ACTIVITY FEED */}
      {/* ========================================================= */}
      <Dialog
        open={selectedClassForActivity !== null}
        onClose={() => setSelectedClassForActivity(null)}
        title={`Discipleship Activity: ${selectedClassForActivity?.name || ''}`}
        subtitle="Live streak stats & quest quiz activity log"
      >
        <div className="flex flex-col gap-4 text-xs">
          {loadingActivity ? (
            <Spinner label="Loading activity & streaks…" />
          ) : !classActivityData ? (
            <Empty title="No activity data" body="No student activity has been recorded yet." />
          ) : (
            <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-1">
              {/* Student Streaks Summary */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-navy text-xs uppercase tracking-wider">
                  🔥 Active Student Streaks:
                </span>
                {classActivityData.enrollments.length === 0 ? (
                  <p className="text-muted text-[11px]">No enrolled students.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {classActivityData.enrollments.map((en) => (
                      <div
                        key={en.id}
                        className="p-2.5 rounded-xl border border-border bg-cream flex flex-col gap-0.5"
                      >
                        <span className="font-bold text-navy text-xs truncate">{en.child.name}</span>
                        <span className="text-[11px] font-semibold text-teal">
                          {en.child.streak?.current ? `🔥 ${en.child.streak.current} Days` : '0 Days'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Feed */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                <span className="font-bold text-navy text-xs uppercase tracking-wider">
                  ⚡ Recent Quest &amp; Quiz Scores:
                </span>
                {classActivityData.recentScores.length === 0 ? (
                  <p className="text-muted text-[11px]">No scores recorded yet this week.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {classActivityData.recentScores.slice(0, 50).map((score) => (
                      <div
                        key={score.id}
                        className="p-2.5 rounded-xl border border-border bg-cream flex items-center justify-between gap-2"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-navy">{score.child.name}</span>
                            <span className="text-[10px] text-muted">completed {score.activityType}</span>
                          </div>
                          <span className="text-[10px] text-muted font-mono">{score.refKey}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-teal">+{score.points} pts</span>
                          <div className="text-[10px] text-muted">
                            {new Date(score.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end pt-2 border-t border-border/60">
            <Button size="sm" type="button" onClick={() => setSelectedClassForActivity(null)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={selectedClassForQuiz !== null}
        onClose={() => setSelectedClassForQuiz(null)}
        title={`Objective Quiz: ${selectedClassForQuiz?.name || ''}`}
        subtitle="Activate for this class so explorers can take the weekly Objective Quiz."
      >
        <div className="flex flex-col gap-4 text-xs">
          {loadingQuiz ? (
            <Spinner label="Loading quest weeks…" />
          ) : (
            <>
              <label className="flex flex-col gap-1 font-semibold text-navy">
                <span>Quest week</span>
                <select
                  className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy"
                  value={quizQuestId}
                  onChange={(e) => setQuizQuestId(e.target.value)}
                >
                  {questWeeks.length === 0 ? <option value="">No published weeks</option> : null}
                  {questWeeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      Week {w.weekNumber}: {w.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-border bg-cream px-3 py-2 text-[11px] text-muted">
                {activeActivations.some((a) => a.isActive)
                  ? `Active: ${activeActivations
                      .filter((a) => a.isActive)
                      .map((a) =>
                        a.quest
                          ? `Week ${a.quest.weekNumber} — ${a.quest.title}`
                          : a.questId,
                      )
                      .join(', ')}`
                  : 'No Objective Quiz is active for this class right now.'}
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  disabled={savingQuiz || !quizQuestId}
                  onClick={() => void setClassQuizActive(false)}
                >
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={savingQuiz || !quizQuestId}
                  onClick={() => void setClassQuizActive(true)}
                >
                  {savingQuiz ? 'Saving…' : 'Activate quiz'}
                </Button>
            </div>
            </>
          )}
        </div>
      </Dialog>

      <Dialog
        open={selectedClassForStanding !== null}
        onClose={() => setSelectedClassForStanding(null)}
        title={`Class standing: ${selectedClassForStanding?.name || ''}`}
        subtitle="Points for approved members of this group."
      >
        <div className="flex flex-col gap-3 text-xs">
          {loadingStanding ? (
            <Spinner label="Loading standing…" />
          ) : classStanding.length === 0 ? (
            <Empty title="No standing yet" body="Approved members earn points as they complete quest steps." />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border max-h-[420px] overflow-y-auto">
              {classStanding.map((row, i) => (
                <li key={row.childId || String(i)} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="font-semibold text-navy">
                    {row.rank ?? i + 1}. {row.childName}
                  </span>
                  <span className="font-bold tabular-nums text-teal">{row.points} pts</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button size="sm" type="button" onClick={() => setSelectedClassForStanding(null)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 5: SAFEGUARDING REVIEW */}
      {/* ========================================================= */}
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
              <Button size="sm" type="button" disabled={savingReport} onClick={handleSaveReport}>
                {savingReport ? 'Saving…' : 'Record Care Action'}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 7: ASSIGN CHURCH MINISTRY ROLE */}
      {/* ========================================================= */}
      <Dialog
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign ministry role"
        subtitle="Authorize leaders, Sunday School teachers, and chaperones."
      >
        <form onSubmit={handleAssignRole} className="flex flex-col gap-4 text-xs">
          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Select ministry member:</span>
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
              <option value="CHAPERONE">CHAPERONE (Teenager event chaperone)</option>
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
            <Button size="sm" type="submit" disabled={assignBusy}>
              {assignBusy ? 'Assigning…' : 'Confirm Role Assignment'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 8: REGISTER NEW TEACHER / STAFF BY CHURCH */}
      {/* ========================================================= */}
      <Dialog
        open={registerTeacherModalOpen}
        onClose={() => setRegisterTeacherModalOpen(false)}
        title="Register New Teacher / Ministry Leader"
        subtitle="The ministry creates teacher credentials and assigns their first role."
      >
        <form onSubmit={handleRegisterTeacher} className="flex flex-col gap-4 text-xs">
          {regError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {regError}
            </div>
          )}

          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Teacher Full Name:</span>
            <input
              type="text"
              required
              placeholder="e.g. Deborah Campbell"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </label>

          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Teacher Email Address:</span>
            <input
              type="email"
              required
              placeholder="deborah@ministry.org"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </label>

          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Initial Password:</span>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
            />
            <span className="text-[10px] text-muted font-normal">
              The teacher can use this password to sign in to the web dashboard and mobile app.
            </span>
          </label>

          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Birth Year:</span>
            <input
              type="number"
              inputMode="numeric"
              required
              min={1900}
              max={new Date().getFullYear() - 20}
              placeholder="e.g. 1988"
              value={regBirthYear}
              onChange={(e) => setRegBirthYear(e.target.value)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
            />
            <span className="text-[10px] text-muted font-normal">
              Staff accounts are for adults aged 20 and over.
            </span>
          </label>

          <label className="flex flex-col gap-1 font-semibold text-navy">
            <span>Ministry Role:</span>
            <select
              value={regRole}
              onChange={(e) => setRegRole(e.target.value as typeof regRole)}
              className="rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
            >
              <option value="TEACHER">TEACHER (Can manage Sunday School classes &amp; open quizzes)</option>
              <option value="CHAPERONE">CHAPERONE (Teenager chaperone &amp; group helper)</option>
              <option value="CHILDRENS_CHURCH_LEAD">CHILDRENS_CHURCH_LEAD (Department lead)</option>
              <option value="PASTOR">PASTOR (Full pastoral oversight)</option>
            </select>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setRegisterTeacherModalOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-navy cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={regBusy}
              className="px-4 py-1.5 rounded-xl bg-teal hover:bg-navy text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {regBusy ? 'Registering…' : 'Register Teacher Account'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 9: UPDATE USER CHURCH ROLES */}
      {/* ========================================================= */}
      <Dialog
        open={editRolePerson !== null}
        onClose={() => setEditRolePerson(null)}
        title={`Update Ministry Roles: ${editRolePerson?.name || ''}`}
        subtitle={`Select ministry roles for ${editRolePerson?.email || ''}`}
      >
        <form onSubmit={handleUpdateRoles} className="flex flex-col gap-4 text-xs">
          {editRoleError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {editRoleError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="font-semibold text-navy text-xs">Select ministry roles:</span>
            {[
              { role: 'TEACHER', desc: 'TEACHER — Sunday School group leader; manages quizzes & rosters' },
              { role: 'CHAPERONE', desc: 'CHAPERONE — Teenager event helper & chaperone' },
              { role: 'CHILDRENS_CHURCH_LEAD', desc: 'CHILDRENS_CHURCH_LEAD — Department coordinator' },
              { role: 'PASTOR', desc: 'PASTOR — Full congregation oversight & safeguarding lead' },
            ].map(({ role, desc }) => {
              const checked = selectedRoles.includes(role);
              return (
                <label
                  key={role}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? 'border-teal/50 bg-teal/5 text-navy font-semibold'
                      : 'border-border bg-cream/50 text-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, role]);
                      } else {
                        setSelectedRoles(selectedRoles.filter((r) => r !== role));
                      }
                    }}
                    className="mt-0.5 rounded text-teal focus:ring-teal"
                  />
                  <span className="text-xs leading-tight">{desc}</span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setEditRolePerson(null)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-navy cursor-pointer"
            >
              Cancel
            </button>
            <Button size="sm" type="submit" disabled={editRoleBusy}>
              {editRoleBusy ? 'Saving…' : 'Save Roles'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
