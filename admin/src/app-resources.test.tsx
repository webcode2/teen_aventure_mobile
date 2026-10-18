import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api } from './api';
import { askConfirm } from './prompt-dialog';
import { LegalDocsPage } from './pages-legal';
import { AppResourceAlerts } from './app-resource-alerts';
vi.mock('./api', () => ({ api: vi.fn() }));
vi.mock('./prompt-dialog', () => ({ askConfirm: vi.fn(), askPrompt: vi.fn() }));
vi.mock('./rich-text-editor', () => ({ RichTextEditor: () => <div>Editor</div>, richTextHasContent: () => true }));
const page = { id: 'policy', title: 'Privacy Policy', slug: 'privacy-policy', html: '<p>Privacy text</p>', published: true, createdAt: '2026-10-01', updatedAt: '2026-10-01' };
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);
it('alerts admins about missing and unpublished app pages with a repair link', async () => {
  vi.mocked(api).mockResolvedValue([{ key: 'privacyUrl', label: 'App · Privacy Policy', url: '/p/privacy-policy', status: 'missing' }]);
  render(<MemoryRouter><AppResourceAlerts /></MemoryRouter>);
  expect(await screen.findByText('App links need attention')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'update its app link' }).getAttribute('href')).toBe('/app/dashboard/content-mobile');
});
it.each([false, true])('warns with resource names and requires explicit deletion confirmation (%s)', async confirmed => {
  vi.mocked(api).mockImplementation(async path => {
    if (path === '/api/admin/site-pages') return [page] as any;
    if (path.endsWith('/usage')) return [{ label: 'App · Privacy Policy (registration and account)' }] as any;
    return [] as any;
  });
  vi.mocked(askConfirm).mockResolvedValue(confirmed);
  render(<MemoryRouter><LegalDocsPage /></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(vi.mocked(askConfirm).mock.calls[0][0]).toContain('App · Privacy Policy (registration and account)');
  const deletes = vi.mocked(api).mock.calls.filter(call => call[1]?.method === 'DELETE');
  expect(deletes.length).toBe(confirmed ? 1 : 0);
  if (confirmed) expect(deletes[0][0]).toBe('/api/admin/site-pages/policy?confirmInUse=true');
});
