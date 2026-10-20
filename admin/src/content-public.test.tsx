import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { LandingPageSections } from './pages-landing';
import { PublicLayout } from './public-shell';
import { AboutPage } from './pages-about';

vi.mock('./api', () => ({ publicApi: vi.fn().mockResolvedValue({}) }));
afterEach(cleanup);

it('renders CMS mission, onboarding, and safeguarding instead of hardcoded copy', () => {
  render(<MemoryRouter><LandingPageSections interactive={false} content={{
    mission: { title: 'A new mission', actionLabel: 'Join the journey', benefits: ['A custom benefit'] },
    onboarding: { steps: [{ title: 'Begin here', description: 'A custom first step' }] },
    safeguarding: { title: 'Care comes first', description: 'A reviewed safety statement', actionLabel: 'Read our policy' },
  }} /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'A new mission' })).toBeTruthy();
  expect(screen.getByText('A custom benefit')).toBeTruthy();
  expect(screen.getByText('Begin here')).toBeTruthy();
  expect(screen.getByText('A reviewed safety statement')).toBeTruthy();
  expect(screen.queryByText('Get Your Study Pass')).toBeNull();
});
it('honours section visibility without deleting its text', () => {
  const { container } = render(<MemoryRouter><LandingPageSections content={{ layout: { hero: true, pillars: true, mission: false, onboarding: true, safeguarding: true } }} /></MemoryRouter>);
  expect((container.querySelector('#discipleship') as HTMLElement).hidden).toBe(true);
});
it('uses CMS header and footer copy in the real public shell', () => {
  render(<MemoryRouter><PublicLayout content={{ header: { signInLabel: 'Open ministry' }, footer: { tagline: 'Our footer', supportEmail: 'team@example.org', copyright: 'Our copyright' } }}>Body</PublicLayout></MemoryRouter>);
  expect(screen.getByText('Open ministry')).toBeTruthy();
  expect(screen.queryByText('Faith-Rooted Christian Discipleship for Teenagers & Families • 100% Ad-Free')).toBeNull();
  expect(screen.getByText('Our footer')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'team@example.org' }).getAttribute('href')).toBe('mailto:team@example.org');
});
it('uses editable About page text with safe defaults for remaining paragraphs', () => {
  render(<MemoryRouter><AboutPage content={{ ourMissionStory: 'Our shared story' }} /></MemoryRouter>);
  expect(screen.getByText('Our shared story')).toBeTruthy();
});
