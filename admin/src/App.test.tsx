import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from './App';
import { api, setToken, clearPastorSession } from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: vi.fn(),
    login: vi.fn(),
    pastorLogin: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
});

const mockedApi = vi.mocked(api);
const mockedLogin = vi.mocked((await import('./api')).login);
const mockedPastorLogin = vi.mocked((await import('./api')).pastorLogin);
const mockedForgot = vi.mocked((await import('./api')).forgotPassword);

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
      };
    }
    if (path === '/api/admin/people') {
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
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByText('Editor, Super Editor, or Super Admin')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Forgot password' })).toBeTruthy();
  });

  it('shows dashboard stats after authenticated session', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    expect(await screen.findByText('Community snapshot')).toBeTruthy();
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
    expect(await screen.findByText('TEEN QUEST OBJS')).toBeTruthy();
    expect(screen.queryByText('TEEN QUEST SCRAMBLE')).toBeNull();
    expect(screen.getByText('VIDEO WATCH')).toBeTruthy();
    expect(screen.getByText('PRAYER DECLARATION')).toBeTruthy();
    expect(screen.queryByText('PRAYER STEP')).toBeNull();
    expect(screen.queryByText('DEVOTIONAL')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save quest points' })).toBeTruthy();
  });

  it('shows login error on failed manager login', async () => {
    mockedLogin.mockRejectedValueOnce(new Error('Dashboard access required'));
    renderApp('/app/login');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'someone@church.com');
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
    expect(await screen.findByText('Objective question builder')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add question' })).toBeTruthy();
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

  it('shows people directory for the App Manager', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'People' }));
    expect(await screen.findByText('Users (0)')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Staff \(0\)/ })).toBeTruthy();
    expect(screen.getByPlaceholderText('Search name, email, family…')).toBeTruthy();
  });

  it('shows Groups from the Operate sidebar', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'Groups' }));
    expect(await screen.findByText('Church class groups and family groups across the platform.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search name, code, owner, church…')).toBeTruthy();
  });

  it('shows Puzzle Studio from the sidebar', async () => {
    setToken('test-token');
    renderApp('/app/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'Puzzle Studio' }));
    expect(await screen.findByRole('button', { name: /\+ Add word/i })).toBeTruthy();
    expect(screen.getByText('Checklist')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Drafts & published/i })).toBeTruthy();
    expect(screen.getByText(/Link each puzzle to a Teen Quest week/i)).toBeTruthy();
    expect(screen.getByLabelText('Week number')).toBeTruthy();
  });

  it('shows published weeks list with pagination and search', async () => {
    const mockWeeks = Array.from({ length: 12 }, (_, i) => ({
      id: `week-${i + 1}`,
      weekNumber: i + 1,
      title: `Lesson for Week ${i + 1}`,
      scripture: `Proverbs ${i + 1}:1-5`,
      content: `Reflecting on week ${i + 1} teachings and core discipleship lessons.`,
      createdAt: '2026-01-01T00:00:00.000Z',
    }));

    mockedApi.mockImplementation(async (path: string) => {
      if (path === '/api/teen-quest/weeks') {
        return mockWeeks;
      }
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
        };
      }
      if (path === '/api/admin/people') {
        return { users: [], children: [], families: [] };
      }
      return [];
    });

    setToken('test-token');
    renderApp('/app/dashboard');

    // Click 'Published weeks' in the sidebar
    await userEvent.click(screen.getByRole('button', { name: 'Published weeks' }));

    // Page header & summary cards
    expect(await screen.findByRole('heading', { level: 1, name: 'Published weeks' })).toBeTruthy();
    expect(screen.getByText('Active curriculum lessons')).toBeTruthy();

    // Showing 1 to 10 of 12 published weeks
    expect(screen.getByText(/Showing/)).toBeTruthy();
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
    expect(screen.getByText('W1')).toBeTruthy();
    expect(screen.getByText('W10')).toBeTruthy();
    expect(screen.queryByText('W11')).toBeNull();

    // Next page button navigation
    const nextBtn = screen.getByRole('button', { name: 'Next →' });
    expect(nextBtn).toBeTruthy();
    await userEvent.click(nextBtn);

    // Page 2 should display W11 and W12
    expect(screen.getByText('W11')).toBeTruthy();
    expect(screen.getAllByText('W12').length).toBeGreaterThan(0);
    expect(screen.queryByText('W1')).toBeNull();

    // Search filter
    const searchInput = screen.getByPlaceholderText(/Search by week/i);
    await userEvent.type(searchInput, 'Week 12');
    expect(screen.getAllByText('W12').length).toBeGreaterThan(0);
    expect(screen.queryByText('W11')).toBeNull();
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

    // Contact Us action button
    expect(screen.getAllByRole('button', { name: /Contact Us/i }).length).toBeGreaterThan(0);
  });

  it('renders pastor portal at /groups, allows pastoral sign in, and loads church operations with one-pastor-one-church scope', async () => {
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

    mockedApi.mockImplementation(async (path: string) => {
      if (path === '/api/auth/login') {
        return {
          token: 'pastor-token-123',
          user: {
            id: 'pastor-1',
            email: 'pastor@askhub.local',
            name: 'Rev. Morgan Hale',
            role: 'MAIN_ACCOUNT',
            churchRole: 'PASTOR',
          },
        };
      }
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
      return [];
    });

    renderApp('/groups');

    // Unauthenticated Church Gateway view
    expect(await screen.findByRole('heading', { name: /Church Sign In/i })).toBeTruthy();
    expect(screen.getByText(/Shepherd the Flock/i)).toBeTruthy();

    // Click quick-fill demo pastor button
    await userEvent.click(screen.getByRole('button', { name: 'Grace Demo Church' }));

    // Click Sign In
    await userEvent.click(screen.getByRole('button', { name: 'Enter Church Operations Console' }));

    // Authenticated Church Operations Console view
    expect(await screen.findByText('Grace Demo Church')).toBeTruthy();
    expect(screen.getByText('GRACE01')).toBeTruthy();
    expect(screen.getByText('Rev. Morgan Hale')).toBeTruthy();

    // Operational KPI overview cards
    expect(screen.getByText('Registered households')).toBeTruthy();

    // Safeguarding confidential case (default active tab)
    expect(screen.getByText(/Parent requested confidential pastoral check-in/i)).toBeTruthy();
    expect(screen.getByText('UNDER_REVIEW')).toBeTruthy();

    // Classes tab
    await userEvent.click(screen.getByRole('button', { name: /Classes & Groups/i }));
    expect(await screen.findByText('Senior Teens Quest')).toBeTruthy();

    // Families tab
    await userEvent.click(screen.getByRole('button', { name: /Families/i }));
    expect(await screen.findByText('The Johnson Family')).toBeTruthy();

    // Barcode & Pass tab
    await userEvent.click(screen.getByRole('button', { name: /Barcode & Pass Generator/i }));
    expect(await screen.findByText(/Family & Group Study Pass/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Regenerate Church Join Code/i })).toBeTruthy();

    // Sign out button
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: /Church Sign In/i })).toBeTruthy();
  });
});


