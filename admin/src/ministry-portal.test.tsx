import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ChurchApplyPage } from './pages-church-apply';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    publicWrite: vi.fn(),
    applicantApi: vi.fn(),
    pastorLogin: vi.fn(),
    api: vi.fn(),
  };
});

import { applicantApi, publicWrite, setApplicantToken } from './api';

const mine = {
  name: 'Portal Ada',
  email: 'ada@ministry.test',
  title: 'PASTOR',
  phone: '',
  createdAt: '2026-10-14T00:00:00.000Z',
  application: null,
};

describe('ministry portal before approval', () => {
  it('signs up, asks for the 5-letter code, then shows welcome, apply, and the profile drawer', async () => {
    const user = userEvent.setup();
    setApplicantToken(null);
    vi.mocked(publicWrite).mockImplementation(async (path: string) => {
      if (path.endsWith('/account')) return { message: 'Check your email' };
      if (path.endsWith('/verify-email')) return { token: 'applicant-token', user: { email: mine.email } };
      return {};
    });
    vi.mocked(applicantApi).mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/church-applications/mine' && init?.method === 'PATCH') {
        return { ...mine, name: 'Portal Ada', title: 'YOUTH_WORKER', phone: '5550100' };
      }
      return mine;
    });

    render(
      <MemoryRouter initialEntries={['/ministry']}>
        <ChurchApplyPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Create a ministry account/ }));
    await user.type(screen.getByLabelText('Your name'), 'Portal Ada');
    await user.type(screen.getByLabelText('Ministry email'), 'ada@ministry.test');
    await user.type(screen.getByLabelText(/^Password/), 'password123');
    await user.type(screen.getByLabelText(/^Confirm password/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Verify email' })).toBeTruthy();
    expect(screen.getAllByText(/5-letter code/).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Verification code'), 'abcde');
    await user.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByText('Welcome, Portal Ada')).toBeTruthy();
    expect(screen.getByText(/no activities yet/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Apply for a ministry' }));
    expect(await screen.findByRole('heading', { name: 'Apply for a ministry' })).toBeTruthy();
    expect(screen.getByLabelText('Ministry name')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /country/i })).toBeTruthy();
    expect(screen.getByLabelText(/Who will use it and about how many families/i)).toBeTruthy();
    expect(screen.getByLabelText(/Document upload/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await user.click(screen.getByRole('button', { name: 'Open your profile' }));
    expect(screen.getAllByText('ada@ministry.test').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/^Email$/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getAllByText('ada@ministry.test').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/^Email$/)).toBeNull();
  });

  it('puts the identity file on R2 with the signed URL, then sends the public URL', async () => {
    const user = userEvent.setup();
    setApplicantToken('applicant-token');
    const publicUrl = 'https://cdn.example/identity-docs/user/card.png';
    const order: string[] = [];
    vi.mocked(applicantApi).mockImplementation(async (path: string, init?: RequestInit) => {
      order.push(`${init?.method ?? 'GET'} ${path}`);
      if (path.endsWith('/storage')) return { storage: 'r2', directUpload: true, ready: true };
      if (path.endsWith('/presign')) {
        return {
          key: 'identity-docs/user/card.png',
          uploadUrl: 'https://r2.example/upload',
          publicUrl,
          headers: { 'Content-Type': 'image/png' },
        };
      }
      if (path.endsWith('/complete')) {
        expect(JSON.parse(String(init?.body))).toEqual({ url: publicUrl });
        return { key: 'identity-docs/user/card.png', url: publicUrl };
      }
      return mine;
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, _init) => {
      if (String(input) === 'https://r2.example/upload') {
        order.push('PUT r2');
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.reject(new Error(`unexpected fetch ${String(input)}`));
    });

    render(
      <MemoryRouter initialEntries={['/ministry']}>
        <ChurchApplyPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Apply for a ministry' }));
    const file = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], 'card.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/Document upload/i), file);

    expect(await screen.findByRole('img', { name: 'Identity document preview' })).toBeTruthy();
    expect(screen.getByText('Uploaded: card.png')).toBeTruthy();
    expect(order).toEqual([
      'GET /api/church-applications/mine',
      'GET /api/church-applications/identity-doc/storage',
      'POST /api/church-applications/identity-doc/presign',
      'PUT r2',
      'POST /api/church-applications/identity-doc/complete',
    ]);
    fetchSpy.mockRestore();
    setApplicantToken(null);
  });
});
