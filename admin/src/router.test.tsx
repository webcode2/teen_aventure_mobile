import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from './router';
import { clearPastorSession, setToken } from './api';
import { LegacyHashRedirect } from './guards';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: vi.fn(async (path: string) => {
      if (path === '/api/admin/stats') {
        return {
          families: 0,
          groups: 0,
          kidsOnParentAccount: 0,
          standaloneTeens: 0,
          pastors: 0,
          churchStaff: 0,
          churches: 0,
          dashboardAdmins: 0,
          openReports: 0,
        };
      }
      if (path === '/api/admin/people') {
        return { users: [], children: [], families: [] };
      }
      if (path === '/api/admin/groups') return [];
      if (path === '/api/admin/scoring-rules') return {};
      return [];
    }),
    publicApi: vi.fn(async (path: string) => {
      if (path === '/api/site-pages/privacy-policy') {
        return {
          id: '1',
          slug: 'privacy-policy',
          title: 'Privacy Policy',
          html: '<h2>Audience &amp; Age Eligibility</h2><p>Teen Bible Adventures privacy policy for Nigeria.</p>',
          published: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        };
      }
      if (path === '/api/site-pages/terms-of-service') {
        return {
          id: '2',
          slug: 'terms-of-service',
          title: 'Terms of Service',
          html: '<h2>Agreement</h2><p>Terms for Nigeria.</p>',
          published: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        };
      }
      throw new Error(`Unexpected publicApi path: ${path}`);
    }),
    login: vi.fn(),
    pastorLogin: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
});

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{`${loc.pathname}${loc.search}`}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  setToken(null);
  clearPastorSession();
  window.location.hash = '';
});

describe('AppRoutes', () => {
  it('renders landing at /', async () => {
    renderAt('/');
    expect(await screen.findByText(/Nurturing Christian Teens/i)).toBeTruthy();
  });

  it('redirects unauthed /app/dashboard to login with next', async () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <LocationProbe />
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(await screen.findByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByTestId('loc').textContent).toBe(
      '/app/login?next=%2Fapp%2Fdashboard',
    );
  });

  it('renders People inside Shell when authed at /app/dashboard/people', async () => {
    setToken('test-token');
    renderAt('/app/dashboard/people');
    expect(await screen.findByText('Users (0)')).toBeTruthy();
  });

  it('maps legacy #/people hash to people tab when authed', async () => {
    setToken('test-token');
    window.location.hash = '#/people';
    render(
      <MemoryRouter initialEntries={['/']}>
        <LegacyHashRedirect />
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Users (0)')).toBeTruthy();
  });

  it('redirects invalid tab to overview', async () => {
    setToken('test-token');
    renderAt('/app/dashboard/not-a-tab');
    expect(await screen.findByText('Community snapshot')).toBeTruthy();
  });

  it('renders ministry entry at /ministry', async () => {
    renderAt('/ministry');
    expect(await screen.findByRole('heading', { name: /Ministry Sign In/i })).toBeTruthy();
  });

  it('redirects /groups to /ministry', async () => {
    renderAt('/groups');
    expect(await screen.findByRole('heading', { name: /Ministry Sign In/i })).toBeTruthy();
  });

  it('renders about page at /about', async () => {
    renderAt('/about');
    expect(await screen.findByRole('heading', { name: /Discipleship Built for the Next Generation/i })).toBeTruthy();
    expect(screen.getByText('Zack')).toBeTruthy();
    expect(screen.getByText('Abi')).toBeTruthy();
    expect(screen.getByText(/The Four Discipleship Pillars/i)).toBeTruthy();
  });

  it('renders privacy policy at /privacy', async () => {
    renderAt('/privacy');
    expect(await screen.findByRole('heading', { name: 'Privacy Policy' })).toBeTruthy();
    expect(await screen.findByText(/Audience & Age Eligibility/i)).toBeTruthy();
    expect(screen.getByText(/Teen Bible Adventures privacy policy for Nigeria/i)).toBeTruthy();
  });

  it('renders terms of service at /terms', async () => {
    renderAt('/terms');
    expect(await screen.findByRole('heading', { name: 'Terms of Service' })).toBeTruthy();
    expect(await screen.findByText(/Terms for Nigeria/i)).toBeTruthy();
  });

  it('renders contact page at /contact', async () => {
    renderAt('/contact');
    expect(await screen.findByRole('heading', { name: /We’re Here to Help/i })).toBeTruthy();
    expect(screen.getByText(/Youth Circles & Study Groups/i)).toBeTruthy();
    expect(screen.getByText('fellowship@askhub.org')).toBeTruthy();
    expect(screen.getByText('Send Us a Message')).toBeTruthy();
  });
});
