import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PublicLayout } from './public-shell';
import { MinistryGateway } from './ministry-gateway';
import { DEFAULT_MINISTRY_COPY } from './ministry-copy';

vi.mock('./api', () => ({ publicApi: vi.fn().mockResolvedValue({}) }));
afterEach(cleanup);

it('uses default ministry content for older CMS documents', () => {
  render(<MemoryRouter><PublicLayout content={{}}><MinistryGateway preview /></PublicLayout></MemoryRouter>);
  expect(screen.getByRole('heading', { name: DEFAULT_MINISTRY_COPY.title })).toBeTruthy();
  expect(screen.getByLabelText('Ministry email')).toBeTruthy();
});

it('syncs ministry draft updates through the same component as the live page', () => {
  const content = { ministryPage: { ...DEFAULT_MINISTRY_COPY, title: 'Care for your community', submitLabel: 'Open our ministry', features: [{ title: 'A custom feature', description: 'Our feature details' }] } };
  const view = render(<MemoryRouter><PublicLayout content={content}><MinistryGateway preview /></PublicLayout></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Care for your community' })).toBeTruthy();
  expect(screen.getByText('A custom feature')).toBeTruthy();
  expect(screen.queryByText('🛡️ Safeguarding Console')).toBeNull();
  expect(screen.getByRole('button', { name: 'Open our ministry' })).toBeTruthy();
  view.rerender(<MemoryRouter><PublicLayout content={{ ministryPage: { ...content.ministryPage, title: 'An updated draft', features: [] } }}><MinistryGateway preview /></PublicLayout></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'An updated draft' })).toBeTruthy();
  expect(screen.queryByText('A custom feature')).toBeNull();
});

it('preserves login handlers with customized labels', () => {
  const onEmail = vi.fn(); const onPassword = vi.fn();
  const handleLogin = vi.fn(event => event.preventDefault());
  render(<MemoryRouter><PublicLayout content={{ ministryPage: { ...DEFAULT_MINISTRY_COPY, emailLabel: 'Your ministry email', passwordLabel: 'Your password' } }}>
    <MinistryGateway onEmail={onEmail} onPassword={onPassword} handleLogin={handleLogin} />
  </PublicLayout></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Your ministry email'), { target: { value: 'test@example.org' } });
  fireEvent.change(screen.getByLabelText('Your password'), { target: { value: 'example-password' } });
  expect(onEmail).toHaveBeenCalledWith('test@example.org');
  expect(onPassword).toHaveBeenCalledWith('example-password');
  fireEvent.submit(screen.getByRole('button', { name: 'Enter ministry' }).closest('form')!);
  expect(handleLogin).toHaveBeenCalledOnce();
});
