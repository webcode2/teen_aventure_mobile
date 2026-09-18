import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { api, setToken } from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
});

const mockedApi = vi.mocked(api);
const mockedLogin = vi.mocked((await import('./api')).login);
const mockedForgot = vi.mocked((await import('./api')).forgotPassword);

beforeEach(() => {
  cleanup();
  setToken(null);
  window.location.hash = '';
  vi.clearAllMocks();
  mockedApi.mockImplementation(async (path: string) => {
    if (path === '/api/admin/stats') {
      return {
        families: 3,
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
    if (path === '/api/admin/scoring-rules') {
      return {
        TEEN_QUEST_OBJS: 5, TEEN_QUEST_SCRAMBLE: 5,
        VIDEO_WATCH: 10, PRAYER_DECLARATION: 1,
      };
    }
    return [];
  });
});

describe('Teen Bible Adventures Admin', () => {
  it('shows App Manager login when no token', () => {
    render(<App />);
    expect(screen.getByAltText('Teen Bible Adventures')).toBeTruthy();
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByText('Editor, Super Editor, or Super Admin')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Forgot password' })).toBeTruthy();
  });

  it('shows dashboard stats after authenticated session', async () => {
    setToken('test-token');
    render(<App />);
    expect(await screen.findByText('Community snapshot')).toBeTruthy();
    expect(screen.getByText('Kids on parent account')).toBeTruthy();
    expect(screen.getAllByText('Families').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Churches').length).toBeGreaterThan(0);
  });

  it('renders quest point defaults only', async () => {
    setToken('test-token');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Quest points' }));
    expect(await screen.findByText('TEEN QUEST OBJS')).toBeTruthy();
    expect(screen.getByText('TEEN QUEST SCRAMBLE')).toBeTruthy();
    expect(screen.getByText('VIDEO WATCH')).toBeTruthy();
    expect(screen.getByText('PRAYER DECLARATION')).toBeTruthy();
    expect(screen.queryByText('PRAYER STEP')).toBeNull();
    expect(screen.queryByText('DEVOTIONAL')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save quest points' })).toBeTruthy();
  });

  it('shows login error on failed manager login', async () => {
    mockedLogin.mockRejectedValueOnce(new Error('Dashboard access required'));
    render(<App />);
    await userEvent.type(screen.getByPlaceholderText('Email'), 'someone@church.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Dashboard access required')).toBeTruthy();
  });

  it('sends a reset token from the forgot-password screen', async () => {
    mockedForgot.mockResolvedValueOnce({ message: 'If that account exists, we sent a reset link.' });
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password' }));
    await userEvent.type(screen.getByPlaceholderText('Email'), 'manager@askhub.local');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('If that account exists, we sent a reset link.')).toBeTruthy();
  });

  it('shows Teen Quest question and scramble builders', async () => {
    setToken('test-token');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Teen Quest' }));
    expect(await screen.findByText('Objective question builder')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add question' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add scramble' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Auto-scramble' })).toBeTruthy();
    expect(screen.queryByPlaceholderText('objectiveQuiz JSON')).toBeNull();
  });

  it('does not expose legacy content publishing', async () => {
    setToken('test-token');
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Content' })).toBeNull();
    expect(screen.queryByText('Bible in a Year week (YouTube for the Flutter app)')).toBeNull();
    expect(screen.queryByText('Life & Living Prayer')).toBeNull();
    expect(screen.queryByText('Scripture Marinade step')).toBeNull();
  });

  it('shows people directory for the App Manager', async () => {
    setToken('test-token');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'People' }));
    expect(await screen.findByText('Users (0)')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Staff \(0\)/ })).toBeTruthy();
    expect(screen.getByPlaceholderText('Search name, email, family…')).toBeTruthy();
  });
});
