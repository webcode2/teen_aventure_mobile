import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './auth-pages';
import { GroupJoinPassImages, JoinPassCard } from './barcode';
import { api } from './api';
import { LegalDocsPage } from './pages-legal';
import { MinistryProfileAside, type PastorApplicantHome } from './pages-pastor';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return { ...actual, api: vi.fn() };
});

const page = {
  id: 'page-1',
  slug: 'privacy-policy',
  title: 'Privacy Policy',
  html: '<p>Hello</p>',
  published: false,
  createdAt: '2026-10-14T00:00:00.000Z',
  updatedAt: '2026-10-14T00:00:00.000Z',
};

const home: PastorApplicantHome = {
  name: 'Ada Pastor',
  email: 'ada@ministry.test',
  title: 'Pastor',
  titleValue: 'PASTOR',
  phone: '555',
  onApply: () => {},
  onSignOut: () => {},
  onProfileSave: async () => {},
  application: null,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('staff login demo fill', () => {
  it('fills the editor demo account', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Editor' }));
    expect((screen.getByPlaceholderText('Email') as HTMLInputElement).value).toBe('editor@askhub.local');
    expect((screen.getByPlaceholderText('Password') as HTMLInputElement).value).toBe('password123');
  });
});

describe('join pass', () => {
  it('copies the join code and toggles 1D barcode and 2D QR', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<JoinPassCard joinCode="grace01" name="Grace" compact />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('GRACE01');
    await userEvent.click(screen.getByRole('button', { name: '1D' }));
    expect(document.querySelector('svg text')?.textContent).toBe('GRACE01');
    await userEvent.click(screen.getByRole('button', { name: '2D' }));
    expect(document.querySelector('svg text')).toBeNull();
    expect(document.querySelector('svg')).toBeTruthy();
  });

  it('shares, copies, and prints only the QR', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const written: string[] = [];
    Object.assign(navigator, { clipboard: { writeText } });
    vi.stubGlobal('open', () => ({
      document: {
        write: (html: string) => written.push(html),
        close: () => {},
      },
    }));
    render(<GroupJoinPassImages joinCode="ab12" groupName="Youth" />);
    await userEvent.click(screen.getByRole('button', { name: 'Print' }));
    await vi.waitFor(() => expect(written.length).toBe(1));
    expect(written[0]).toContain('<img ');
    expect(written[0]).not.toContain('Youth');
    expect(written[0]).not.toContain('>AB12<');
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(writeText).toHaveBeenCalledWith('tba-join:class:AB12');
    await userEvent.click(screen.getByRole('button', { name: /Copied|Copy link/ }));
    expect(writeText).toHaveBeenCalledWith('tba-join:class:AB12');
  });
});

describe('site page publish', () => {
  it('hides the public link on a draft and copies /p/{slug} once published', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path === '/api/admin/site-pages') return [page];
      return page;
    });
    render(<LegalDocsPage />);
    expect(await screen.findAllByText('Draft')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Published' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/p/privacy-policy`);
  });
});

describe('ministry profile', () => {
  it('shows email as text while name, title, and phone can be edited', async () => {
    render(<MinistryProfileAside open onClose={() => {}} home={home} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByText('ada@ministry.test')).toBeTruthy();
    expect(screen.queryByDisplayValue('ada@ministry.test')).toBeNull();
    expect(screen.getByDisplayValue('Ada Pastor')).toBeTruthy();
    expect(screen.getByDisplayValue('555')).toBeTruthy();
  });
});
