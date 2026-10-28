import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { ContentCmsPage } from './pages-content-cms';
import { DEFAULT_LANDING_CONTENT, mergeLandingContent } from './pages-landing';
import { mergeCms, setCmsField, validateCms } from './cms-fields';

vi.mock('./api', () => ({ api: vi.fn(), apiUpload: vi.fn(), publicApi: vi.fn().mockResolvedValue({}) }));
vi.mock('./app-resource-alerts', () => ({ AppResourceAlerts: () => null }));
vi.mock('./prompt-dialog', () => ({ askConfirm: vi.fn().mockResolvedValue(true) }));
vi.mock('./pages-landing', async () => {
  const actual = await vi.importActual<typeof import('./pages-landing')>('./pages-landing');
  return { ...actual, LandingPageSections: ({ content }: { content: unknown }) => <pre data-testid="preview">{JSON.stringify(content)}</pre> };
});
vi.mock('./public-shell', () => ({ PublicLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, GooglePlayButton: () => null, AppStoreButton: () => null }));

beforeEach(() => { localStorage.clear(); vi.mocked(api).mockReset(); });
afterEach(cleanup);
const open = () => render(<MemoryRouter><ContentCmsPage platform="web" /></MemoryRouter>);
const select = (name: string) => userEvent.click(within(screen.getByRole('navigation', { name: 'Content sections' })).getByRole('button', { name: new RegExp(name) }));

describe('content studio', () => {
  it('splits Contact into sections and preserves hidden fields when saving emails', async () => {
    vi.mocked(api).mockResolvedValueOnce({ contactPage: { wereHereToHelp: 'Contact heading' } }).mockResolvedValueOnce({});
    open();
    await screen.findByDisplayValue(DEFAULT_LANDING_CONTENT.hero.title);
    await select('Contact page');
    expect(screen.getByDisplayValue('Contact heading')).toBeTruthy();
    expect(screen.queryByDisplayValue('fellowship@askhub.org')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Contact emails/ }));
    const email = screen.getByDisplayValue('fellowship@askhub.org');
    await userEvent.clear(email); await userEvent.type(email, 'team@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Saved to the live platform.');
    const saved = JSON.parse(vi.mocked(api).mock.calls.find(call => call[1]?.method === 'PUT')![1]!.body as string);
    expect(saved.contactPage.fellowshipEmail).toBe('team@example.com');
    expect(saved.contactPage.wereHereToHelp).toBe('Contact heading');
    await userEvent.type(screen.getByRole('textbox', { name: 'Search sections and text' }), 'Contact heading');
    expect(screen.getAllByDisplayValue('Contact heading').some(element => element.tagName === 'TEXTAREA')).toBe(true);
  });

  it('switches responsive preview sizes and expands without losing edits', async () => {
    vi.mocked(api).mockResolvedValue({ hero: { title: 'Preview draft' } });
    open();
    await screen.findByDisplayValue('Preview draft');
    expect(screen.getByTitle('Desktop website preview').style.width).toBe('1280px');
    const frame = screen.getByTitle('Desktop website preview') as HTMLIFrameElement;
    await waitFor(() => expect(within(frame.contentDocument!.body).getByTestId('preview').textContent).toContain('Preview draft'));
    await userEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(screen.getByTitle('Mobile website preview').style.width).toBe('390px');
    await userEvent.click(screen.getByRole('button', { name: 'Expand preview' }));
    expect(screen.queryByRole('navigation', { name: 'Content sections' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Back to editor' }));
    expect(screen.getByDisplayValue('Preview draft')).toBeTruthy();
    expect(vi.mocked(api).mock.calls.every(call => !call[1]?.method)).toBe(true);
  });
  it('merges older nested content without losing sibling defaults', async () => {
    vi.mocked(api).mockResolvedValue({ hero: { title: 'Live heading' }, pillars: { seek: { title: 'Saved pillar' } } });
    open();
    await screen.findByDisplayValue('Live heading');
    await select('Pillars');
    expect(screen.getByDisplayValue('Saved pillar')).toBeTruthy();
    expect(screen.getByDisplayValue(DEFAULT_LANDING_CONTENT.pillars.connect.description)).toBeTruthy();
  });
  it('publishes changed content and removes the browser draft only on success', async () => {
    vi.mocked(api).mockResolvedValueOnce({ hero: { title: 'Before' } }).mockResolvedValueOnce({ hero: { title: 'After' } });
    open();
    const title = await screen.findByDisplayValue('Before');
    await userEvent.clear(title); await userEvent.type(title, 'After');
    expect(localStorage.getItem('askhub_cms_draft_web')).toContain('After');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Saved to the live platform.');
    const put = vi.mocked(api).mock.calls.find(call => call[1]?.method === 'PUT');
    expect(JSON.parse(put![1]!.body as string).hero.title).toBe('After');
    expect(localStorage.getItem('askhub_cms_draft_web')).toBeNull();
  });
  it('reports a failed publication as an error and retains the draft', async () => {
    vi.mocked(api).mockResolvedValueOnce({ hero: { title: 'Before' } }).mockRejectedValueOnce(new Error('Offline'));
    open(); const title = await screen.findByDisplayValue('Before');
    await userEvent.type(title, ' edited');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('Not published');
    expect(screen.queryByText('Saved to the live platform.')).toBeNull();
    expect(localStorage.getItem('askhub_cms_draft_web')).toContain('edited');
  });
  it('restores an unpublished draft after loading the current server baseline', async () => {
    localStorage.setItem('askhub_cms_draft_web', JSON.stringify({ hero: { title: 'Recovered draft' } }));
    vi.mocked(api).mockResolvedValue({ hero: { title: 'Live title' } });
    open(); await screen.findByDisplayValue('Recovered draft');
    expect(screen.getByText('Unpublished changes')).toBeTruthy();
  });
  it('lets editors reorder and add onboarding steps without touching other sections', async () => {
    vi.mocked(api).mockResolvedValue({});open();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    await select('Onboarding steps');
    await userEvent.click(screen.getByRole('button', { name: 'Move item 2 up' }));
    const draft = JSON.parse(localStorage.getItem('askhub_cms_draft_web')!);
    expect(draft.onboarding.steps[0].title).toBe('Download Mobile App');
    expect(draft.hero).toEqual(DEFAULT_LANDING_CONTENT.hero);
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByDisplayValue('New item')).toBeTruthy();
  });
  it('does not publish defaults when the initial server read fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Offline'));open();
    await screen.findByRole('alert');
    expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Saving…')).toBeNull();
  });
  it('searches newly editable hardcoded sections', async () => {
    vi.mocked(api).mockResolvedValue({});open();
    await userEvent.type(screen.getByRole('textbox', { name: 'Search sections and text' }), 'Uncompromising');
    await screen.findByDisplayValue(DEFAULT_LANDING_CONTENT.safeguarding.title);
    expect(screen.getAllByRole('heading', { name: 'Safeguarding' }).length).toBeGreaterThan(0);
  });
});

describe('CMS document helpers', () => {
  it('keeps blank values and false visibility, with safe nested updates', () => {
    const value = mergeCms(DEFAULT_LANDING_CONTENT, { hero: { badge: '' }, layout: { mission: false } });
    expect(value.hero.badge).toBe('');expect(value.layout.mission).toBe(false);
    const next = setCmsField(value, ['hero', 'title'], 'Changed');
    expect(value.hero.title).not.toBe('Changed');expect(next.hero.title).toBe('Changed');
    expect(mergeLandingContent(value).layout.mission).toBe(false);
  });
  it('validates email and image protocols and ignores prototype keys', () => {
    expect(validateCms({ footer: { supportEmail: 'bad' }, hero: { abiUrl: 'javascript:alert(1)' } })).toHaveLength(2);
    expect(mergeCms({}, JSON.parse('{"__proto__":{"polluted":true}}'))).toEqual({});
    expect(({} as any).polluted).toBeUndefined();
  });
});

it('lets admins switch welcome onboarding off without losing its saved text', async () => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  vi.mocked(api).mockResolvedValueOnce({ welcome: { enabled: true, title: 'Keep this welcome title' } }).mockResolvedValueOnce({});
  render(<MemoryRouter><ContentCmsPage platform="mobile" /></MemoryRouter>);
  await screen.findByText('Up to date');
  await select('Welcome & onboarding');
  const enabled = screen.getByRole('checkbox');
  expect((enabled as HTMLInputElement).checked).toBe(true);
  await userEvent.click(enabled);
  expect(screen.getByText('Welcome & onboarding is off. Explorers go straight to the home screen.')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Saved to the live platform.');
  const put = vi.mocked(api).mock.calls.find(call => call[1]?.method === 'PUT');
  expect(JSON.parse(put![1]!.body as string).welcome).toMatchObject({ enabled: false, title: 'Keep this welcome title' });
  await userEvent.click(screen.getByRole('checkbox'));
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  expect(screen.queryByText('Welcome & onboarding is off. Explorers go straight to the home screen.')).toBeNull();
});
