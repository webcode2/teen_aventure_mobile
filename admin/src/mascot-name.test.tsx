import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { AboutPage } from './pages-about';
vi.mock('./public-shell', () => ({ PublicLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
afterEach(cleanup);
it('renders Zach even when the saved CMS copy uses the old keys and spelling', () => {
  render(<MemoryRouter><AboutPage content={{ zack: 'Zack', guidedByAbiZack: 'Guided by Abi & Zack', energeticInquisitiveAndTechsavvyZackLovesTaking: 'Zack loves scripture challenges.' }} /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Zach' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Guided by Abi & Zach' })).toBeTruthy();
  expect(screen.getByText('Zach loves scripture challenges.')).toBeTruthy();
  expect(screen.getByAltText('Zach').getAttribute('src')).toBe('/zach.png');
});
