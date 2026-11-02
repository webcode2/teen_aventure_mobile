import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from './App';
import { api, setToken, clearPastorSession, setPastorSession, publicWrite } from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: vi.fn(),
    login: vi.fn(),
    pastorLogin: vi.fn(),
    publicWrite: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
});

// jsdom has no Element.scrollTo; the CMS preview calls it.
Element.prototype.scrollTo = vi.fn();

const mockedApi = vi.mocked(api);
const mockedLogin = vi.mocked((await import('./api')).login);
const mockedPastorLogin = vi.mocked((await import('./api')).pastorLogin);
const mockedPublicWrite = vi.mocked(publicWrite);
const mockedForgot = vi.mocked((await import('./api')).forgotPassword);

const PASTOR_SESSION_USER = {
  id: 'pastor-1',
  email: 'pastor@askhub.local',
  name: 'Rev. Morgan Hale',
  role: 'MAIN_ACCOUNT' as const,
  churchRole: 'PASTOR' as const,
  churchId: 'church-grace',
};

function seedPastorSession() {
  setPastorSession('pastor-token-123', PASTOR_SESSION_USER);
}

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  setToken(null);
  clearPastorSession();
  window.location.hash = '';
  vi.clearAllMocks();
  mockedApi.mockImplementation(async (path: string) => {
    if (path === '/api/admin/stats') {
      return {
        families: 3,
        groups: 5,
        kidsOnParentAccount: 2,
        standaloneTeens: 1,
        pastors: 1,
        churchStaff: 3,
        churches: 2,
        dashboardAdmins: 1,
        openReports: 1,
        activeUsers: {
          day: 1,
          week: 2,
          month: 4,
          threeMonths: 5,
          sixMonths: 6,
          year: 8,
        },
      };
    }
    if (path.startsWith('/api/admin/activity-trend')) {
      return { buckets: [{ start: '2026-10-12T00:00:00Z', count: 5 }] };
    }
    if (path.startsWith('/api/admin/people')) {
      return { users: [], children: [], families: [] };
    }
    if (path === '/api/admin/groups') {
      return [];
    }
    if (path === '/api/admin/scoring-rules') {
      return {
        TEEN_QUEST_OBJS: 5,
        VIDEO_WATCH: 10, PRAYER_DECLARATION: 1,
      };
    }
    return [];
  });
});

describe('Teen Bible Adventures Admin', () => {
  it('shows App Manager login when no token', () => {
    renderApp('/app/login');
    expect(screen.getByAltText('Teen Bible Adventures')).toBeTruthy();
    expect((screen.getByPlaceholderText('Email') as HTMLInputElement).value).toBe('manager@askhub.local');
    expect((screen.getByPlaceholderText('Password') as HTMLInputElement).value).toBe('password123');
    expect(screen.getByText('Editor, Super Editor, or Super Admin')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Forgot password' })).toBeTruthy();
  });

  it('shows dashboard stats after authenticated session', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    expect(await screen.findByText('Community snapshot')).toBeTruthy();
    expect(screen.getByText('Active accounts')).toBeTruthy();
    expect(screen.getByText('Bar Graph')).toBeTruthy();
    expect(screen.getByText('Line Graph')).toBeTruthy();
    expect(screen.getByText('Kids on parent account')).toBeTruthy();
    expect(screen.getAllByText('Groups').length).toBeGreaterThan(0);
    expect(screen.queryByText('Ministry Network & Operations')).toBeNull();
    expect(screen.queryByText(/^Families$/)).toBeNull();
    expect(screen.getAllByText('Churches').length).toBeGreaterThan(0);
  });

  it('renders quest point defaults only', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    expect(screen.getByText('Settings')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Quest points' }));
    expect(await screen.findByRole('spinbutton', { name: 'Quiz points' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'Puzzle points' })).toBeTruthy();
    expect(screen.getByText('Week quiz finished')).toBeTruthy();
    expect(screen.getByText('Week puzzle finished')).toBeTruthy();
    expect(screen.queryByText('TEEN QUEST OBJS')).toBeNull();
    expect(screen.queryByText('Quiz / puzzle')).toBeNull();
    expect(screen.queryByText('Objective quiz or puzzle complete')).toBeNull();
    expect(screen.queryByText('TEEN QUEST SCRAMBLE')).toBeNull();
    expect(screen.getByText('Video watch')).toBeTruthy();
    expect(screen.getByText('Each video finished')).toBeTruthy();
    expect(screen.queryByText('One week video finished')).toBeNull();
    expect(screen.getByText('Prayer declaration')).toBeTruthy();
    expect(screen.getByText('VIDEO WATCH')).toBeTruthy();
    expect(screen.getByText('PRAYER DECLARATION')).toBeTruthy();
    expect(screen.queryByText('PRAYER STEP')).toBeNull();
    expect(screen.queryByText('DEVOTIONAL')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save quest points' })).toBeTruthy();
    expect(screen.getByText('Completion ledger')).toBeTruthy();
    expect(screen.getByText('Award milestones')).toBeTruthy();
  });

  it('shows login error on failed manager login', async () => {
    mockedLogin.mockRejectedValueOnce(new Error('Dashboard access required'));
    renderApp('/app/login');
    await userEvent.clear(screen.getByPlaceholderText('Email'));
    await userEvent.type(screen.getByPlaceholderText('Email'), 'someone@church.com');
    await userEvent.clear(screen.getByPlaceholderText('Password'));
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Dashboard access required')).toBeTruthy();
  });

  it('sends a reset token from the forgot-password screen', async () => {
    mockedForgot.mockResolvedValueOnce({ message: 'If that account exists, we sent a reset link.' });
    renderApp('/app/login');
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password' }));
    await userEvent.type(screen.getByPlaceholderText('Email'), 'manager@askhub.local');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('If that account exists, we sent a reset link.')).toBeTruthy();
  });

  it('shows Teen Quest question builder', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'Quest' }));
    await userEvent.click(await screen.findByRole('button', { name: '+ New quest week' }));
    expect(await screen.findByRole('button', { name: 'Add multiple-choice question' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add scramble' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Auto-scramble' })).toBeNull();
    expect(screen.queryByPlaceholderText('objectiveQuiz JSON')).toBeNull();
  });

  it('does not expose legacy content publishing', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    expect(screen.queryByRole('button', { name: 'Content' })).toBeNull();
    expect(screen.queryByText('Bible in a Year week (YouTube for the Flutter app)')).toBeNull();
    expect(screen.queryByText('Life & Living Prayer')).toBeNull();
    expect(screen.queryByText('Scripture Marinade step')).toBeNull();
  });

  it('shows users directory for the App Manager', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'Users' }));
    expect(await screen.findByText('Users (0)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Staff \(0\)/ })).toBeNull();
    expect(screen.getByPlaceholderText('Search name, email, family…')).toBeTruthy();
  });

  it('shows pastors under Operate and staff under Settings', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    expect(screen.getByRole('button', { name: 'Pastors' })).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Staff' }));
    expect(await screen.findByText('Dashboard administrator accounts')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search name, email, family…')).toBeTruthy();
  });

  it('shows Groups from the Operate sidebar without create', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'Groups' }));
    expect(await screen.findByPlaceholderText('Search name, code, owner, church…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '+ Create Group' })).toBeNull();
  });

  it('shows Puzzle Studio from the sidebar', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'Puzzle Studio' }));
    expect(await screen.findByRole('button', { name: /\+ Add word/i })).toBeTruthy();
    expect(screen.getByText('Your crossword')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Library' })).toBeTruthy();
    expect(screen.getByLabelText('Puzzle title')).toBeTruthy();
  });

  it('renders public landing page at / with discipleship pillars, mission, and barcode onboarding pass', async () => {
    renderApp('/');

    // Check main headlines and value propositions
    expect(await screen.findByText(/Nurturing Christian Teens/i)).toBeTruthy();
    expect(screen.getAllByText(/Weekly Scripture Quests/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Christian Fellowship/i)).toBeTruthy();
    expect(screen.getAllByText(/Family Safeguarding/i).length).toBeGreaterThan(0);

    // Check Barcode pass card preview
    expect(screen.getByText(/Family & Group Study Pass/i)).toBeTruthy();
    expect(screen.getAllByText(/FAITH52/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /1D Barcode/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /2D QR Code/i })).toBeTruthy();

    // Primary landing CTAs
    expect(screen.getByRole('link', { name: /Explore Weekly Quests/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Our Christian Mission' })).toBeTruthy();
  });

  it('shows ministry gateway at /ministry and redirects /groups there', async () => {
    renderApp('/groups');
    expect(await screen.findByRole('heading', { name: /Ministry Sign In/i })).toBeTruthy();
    expect(screen.getByText(/Shepherd the Flock/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create a ministry account/i })).toBeTruthy();
  });

  it('renders pastor portal at /ministry after approval, allows pastoral sign in, and loads church operations', async () => {
    mockedPublicWrite.mockRejectedValueOnce(new Error('Not a ministry applicant'));
    mockedPastorLogin.mockImplementationOnce(async () => {
      setPastorSession('pastor-token-123', PASTOR_SESSION_USER);
      return { token: 'pastor-token-123', user: PASTOR_SESSION_USER };
    });

    mockedApi.mockImplementation(async (path: string) => {
      if (path === '/api/auth/me') {
        return {
          type: 'user',
          userId: 'pastor-1',
          churchId: 'church-grace',
          churchRole: 'PASTOR',
          name: 'Rev. Morgan Hale',
          email: 'pastor@askhub.local',
        };
      }
      if (path === '/api/churches/church-grace') {
        return {
          id: 'church-grace',
          name: 'Grace Demo Church',
          joinCode: 'GRACE01',
          jurisdiction: 'US',
          description: 'A vibrant family and youth ministry congregation.',
        };
      }
      if (path === '/api/churches/church-grace/people') {
        return [
          { id: 'pastor-1', name: 'Rev. Morgan Hale', email: 'pastor@askhub.local', roles: ['PASTOR'] },
          { id: 't-1', name: 'Teacher Bob', email: 'bob@church.com', roles: ['TEACHER'] },
        ];
      }
      if (path === '/api/churches/church-grace/families') {
        return [
          {
            id: 'fam-1',
            name: 'The Johnson Family',
            guardians: [{ id: 'g-1', name: 'Sarah Johnson', email: 'sarah@test.com' }],
            children: [{ id: 'ch-1', name: 'David J.' }],
          },
        ];
      }
      if (path === '/api/churches/church-grace/classes') {
        return [
          {
            id: 'class-1',
            name: 'Senior Teens Quest',
            kind: 'CHURCH',
            assignments: [{ teacher: { id: 't-1', name: 'Teacher Bob' } }],
          },
        ];
      }
      if (path === '/api/safeguarding/church/church-grace/reports') {
        return [
          {
            id: 'rep-abc-1234',
            category: 'PASTORAL_CARE',
            description: 'Parent requested confidential pastoral check-in for anxiety.',
            status: 'UNDER_REVIEW',
            reporterLabel: 'Mother',
            createdAt: '2026-03-01T12:00:00.000Z',
          },
        ];
      }
      if (path === '/api/churches/church-grace/nudge-templates') return [];
      return [];
    });

    renderApp('/ministry');

    expect(await screen.findByRole('heading', { name: /Ministry Sign In/i })).toBeTruthy();
    await userEvent.type(screen.getByPlaceholderText('leader@ministry.org'), 'pastor@askhub.local');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Enter ministry' }));

    // Authenticated ministry operations console
    expect(await screen.findByText('Grace Demo Church')).toBeTruthy();
    expect(screen.getAllByText('Rev. Morgan Hale').length).toBeGreaterThan(0);

    // Operational KPI overview cards
    expect(screen.getByText('Registered households')).toBeTruthy();

    // Families is the default tab
    expect(await screen.findByText('The Johnson Family')).toBeTruthy();

    // Groups via sidebar
    await userEvent.click(screen.getByRole('button', { name: /^Groups/i }));
    expect(await screen.findByText('Senior Teens Quest')).toBeTruthy();

    // Care via sidebar
    await userEvent.click(screen.getByRole('button', { name: /^Care/i }));
    expect(await screen.findByText(/Parent requested confidential pastoral check-in/i)).toBeTruthy();
    expect(screen.getByText('UNDER_REVIEW')).toBeTruthy();

    expect(screen.queryByRole('button', { name: /Barcode & Pass Generator/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Regenerate$/i })).toBeNull();

    // Sign out returns to the ministry gateway
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: /Ministry Sign In/i })).toBeTruthy();
  });

  it('allows church leaders to create custom groups, review rosters, view streaks, and send broadcasts', async () => {
    mockedPastorLogin.mockResolvedValueOnce({
      token: 'pastor-token-123',
      user: {
        id: 'pastor-1',
        email: 'pastor@askhub.local',
        name: 'Rev. Morgan Hale',
        role: 'MAIN_ACCOUNT',
        churchRole: 'PASTOR',
      },
    });

    let currentClasses = [
      {
        id: 'class-1',
        name: 'Senior Teens Quest',
        kind: 'CHURCH',
        joinCode: 'STQ123',
        assignments: [{ teacher: { id: 't-1', name: 'Teacher Bob' } }],
      },
    ];

    let currentEnrollments = [
      {
        id: 'en-1',
        classId: 'class-1',
        childId: 'ch-1',
        status: 'PENDING',
        child: { id: 'ch-1', name: 'David J.', streak: { current: 5, lastDay: '2026-03-01' } },
      },
    ];

    mockedApi.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === '/api/auth/me') {
        return {
          type: 'user',
          userId: 'pastor-1',
          churchId: 'church-grace',
          churchRole: 'PASTOR',
          name: 'Rev. Morgan Hale',
          email: 'pastor@askhub.local',
        };
      }
      if (path === '/api/churches/church-grace') {
        return {
          id: 'church-grace',
          name: 'Grace Demo Church',
          joinCode: 'GRACE01',
          jurisdiction: 'US',
        };
      }
      if (path === '/api/churches/church-grace/classes') {
        return currentClasses;
      }
      if (path === '/api/classes/church/church-grace' && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newClass = {
          id: 'class-2',
          name: body.name,
          kind: 'CHURCH',
          joinCode: 'KNG789',
          assignments: [],
        };
        currentClasses.push(newClass);
        return newClass;
      }
      if (path === '/api/classes/class-1/enrollments') {
        return currentEnrollments;
      }
      if (path === '/api/classes/enrollment/en-1' && options?.method === 'PATCH') {
        currentEnrollments[0].status = 'APPROVED';
        return currentEnrollments[0];
      }
      if (path === '/api/classes/class-1/activity') {
        return {
          enrollments: currentEnrollments,
          recentScores: [
            {
              id: 'sc-1',
              childId: 'ch-1',
              activityType: 'QUIZ',
              refKey: 'WEEK_1_QUIZ',
              points: 50,
              createdAt: '2026-03-01T11:00:00.000Z',
              child: { id: 'ch-1', name: 'David J.' },
            },
          ],
        };
      }
      if (path === '/api/churches/church-grace/people') return [];
      if (path === '/api/churches/church-grace/families') return [];
      if (path === '/api/safeguarding/church/church-grace/reports') return [];
      if (path === '/api/churches/church-grace/nudge-templates') return [];
      return [];
    });

    seedPastorSession();
    renderApp('/ministry/church-grace/groups');

    // Groups page
    expect(await screen.findByText('Senior Teens Quest')).toBeTruthy();

    // 1. Create a Custom Group
    await userEvent.click(screen.getByRole('button', { name: /\+ Create Custom Group/i }));
    const groupInput = screen.getByPlaceholderText(/e\.g\. Senior High Disciples/i);
    await userEvent.type(groupInput, 'Kingdom Explorers');
    await userEvent.click(screen.getByRole('button', { name: 'Create Group' }));
    expect(await screen.findByText('Kingdom Explorers')).toBeTruthy();

    // 2. Open Roster & Approve Enrollment
    const rosterButtons = screen.getAllByRole('button', { name: 'Roster' });
    await userEvent.click(rosterButtons[0]);
    expect(await screen.findByText('David J.')).toBeTruthy();
    expect(screen.getByText('PENDING')).toBeTruthy();

    // Click Approve
    await userEvent.click(screen.getByRole('button', { name: /Approve ✓/i }));
    expect(await screen.findByText('APPROVED')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    // 3. Open Streaks & Activity
    const streakButtons = screen.getAllByRole('button', { name: 'Streaks' });
    await userEvent.click(streakButtons[0]);
    expect(await screen.findByText(/🔥 5 Days/i)).toBeTruthy();
    expect(screen.getByText(/WEEK_1_QUIZ/i)).toBeTruthy();
    expect(screen.getByText('+50 pts')).toBeTruthy();
    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByText(/Discipleship Activity/)).toBeNull();

    // Church-wide freeform broadcasts removed — only approved student nudges remain.
    expect(screen.queryByRole('button', { name: /📢 Notify/i })).toBeNull();
  });

  it('allows church leadership to register teachers directly, update user roles, and restrict users', async () => {
    mockedPastorLogin.mockResolvedValueOnce({
      token: 'pastor-token-123',
      user: {
        id: 'pastor-1',
        email: 'pastor@askhub.local',
        name: 'Rev. Morgan Hale',
        role: 'MAIN_ACCOUNT',
        churchRole: 'PASTOR',
      },
    });

    let currentPeople = [
      {
        id: 'user-pastor',
        name: 'Rev. Morgan Hale',
        email: 'pastor@askhub.local',
        roles: ['PASTOR'],
        isActive: true,
      },
      {
        id: 'user-teacher-1',
        name: 'Brother James',
        email: 'james@askhub.local',
        roles: ['TEACHER'],
        isActive: true,
      },
    ];

    mockedApi.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === '/api/auth/me') {
        return {
          type: 'user',
          userId: 'pastor-1',
          churchId: 'church-grace',
          churchRole: 'PASTOR',
          name: 'Rev. Morgan Hale',
          email: 'pastor@askhub.local',
        };
      }
      if (path === '/api/churches/church-grace') {
        return {
          id: 'church-grace',
          name: 'Grace Demo Church',
          joinCode: 'GRACE01',
          jurisdiction: 'US',
          description: 'A vibrant church',
        };
      }
      if (path === '/api/churches/church-grace/people') {
        return currentPeople;
      }
      if (path === '/api/churches/church-grace/classes') {
        return [];
      }
      if (path === '/api/churches/church-grace/families') {
        return [];
      }
      if (path === '/api/safeguarding/church/church-grace/reports') {
        return [];
      }
      if (path === '/api/churches/church-grace/nudge-templates') return [];
      if (path === '/api/churches/church-grace/teachers' && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newTeacher = {
          id: 'user-new-teacher',
          name: body.name,
          email: body.email,
          roles: [body.role || 'TEACHER'],
          isActive: true,
        };
        currentPeople = [...currentPeople, newTeacher];
        return { user: newTeacher, role: body.role };
      }
      if (path === '/api/churches/church-grace/people/user-teacher-1/roles' && options?.method === 'PUT') {
        const body = JSON.parse(options.body as string);
        currentPeople = currentPeople.map((p) =>
          p.id === 'user-teacher-1' ? { ...p, roles: body.roles } : p,
        );
        return { success: true, userId: 'user-teacher-1', roles: body.roles };
      }
      if (path === '/api/churches/church-grace/people/user-teacher-1' && options?.method === 'PATCH') {
        const body = JSON.parse(options.body as string);
        currentPeople = currentPeople.map((p) =>
          p.id === 'user-teacher-1' ? { ...p, isActive: body.isActive } : p,
        );
        return currentPeople.find((p) => p.id === 'user-teacher-1');
      }
      return {};
    });

    seedPastorSession();
    renderApp('/ministry/church-grace/team');

    // Team page
      expect(await screen.findByText('Brother James')).toBeTruthy();
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0);

      // 1. Direct Teacher Registration by the Church
      await userEvent.click(screen.getByRole('button', { name: /\+ Register New Teacher/i }));
      expect(await screen.findByText('Register New Teacher / Ministry Leader')).toBeTruthy();

      await userEvent.type(screen.getByPlaceholderText(/e\.g\. Deborah Campbell/i), 'Sister Deborah');
      await userEvent.type(screen.getByPlaceholderText(/deborah@ministry\.org/i), 'deborah@church.org');
      await userEvent.type(screen.getByPlaceholderText(/Minimum 6 characters/i), 'secret123');
      await userEvent.type(screen.getByPlaceholderText(/e\.g\. 1988/i), '1988');

      await userEvent.click(screen.getByRole('button', { name: 'Register Teacher Account' }));
      expect(await screen.findByText('Sister Deborah')).toBeTruthy();
      expect(screen.getByText('deborah@church.org')).toBeTruthy();

      // 2. Update Roles for an existing teacher
      const updateRoleButtons = screen.getAllByRole('button', { name: /✎ Update Roles/i });
      await userEvent.click(updateRoleButtons[1]); // Brother James
      expect(await screen.findByText(/Update Ministry Roles: Brother James/i)).toBeTruthy();

      // Check Chaperone role as well
      const chaperoneCheckbox = screen.getByLabelText(/CHAPERONE — Teenager event helper & chaperone/i);
      await userEvent.click(chaperoneCheckbox);
      await userEvent.click(screen.getByRole('button', { name: 'Save Roles' }));

      // 3. Restrict and Reactivate user
      const restrictButtons = screen.getAllByRole('button', { name: 'Restrict' });
      await userEvent.click(restrictButtons[1]); // Restrict Brother James
      const restrictDialog = await screen.findByRole('dialog', { name: 'Restrict access' });
      await userEvent.click(within(restrictDialog).getByRole('button', { name: 'Restrict' }));
      expect(await screen.findByText('Restricted')).toBeTruthy();

      // Reactivate
      const reactivateBtn = screen.getByRole('button', { name: 'Reactivate' });
      await userEvent.click(reactivateBtn);
      const reactivateDialog = await screen.findByRole('dialog', { name: 'Reactivate' });
      await userEvent.click(within(reactivateDialog).getByRole('button', { name: 'Reactivate' }));
      expect(await screen.findByText(/Reactivated Brother James/i)).toBeTruthy();
      expect(screen.queryByText('Restricted')).toBeNull();
  });

  it('edits the explorer hero greeting, tagline, and Abi and Zach art', async () => {
    setToken('test-token');
    renderApp('/app/dashboard/content-mobile');
    const greeting = await screen.findByDisplayValue('Hey, Explorer!');
    expect(screen.getByDisplayValue("Ready for today's adventure in God's Word?")).toBeTruthy();
    expect(screen.getAllByAltText('Abi').length).toBeGreaterThan(0);
    expect(screen.getAllByAltText('Zach').length).toBeGreaterThan(0);
    await userEvent.clear(greeting);
    await userEvent.type(greeting, 'Hello, team!');
    // The field and the live preview.
    expect(screen.getAllByText('Hello, team!')).toHaveLength(2);
  });
});



