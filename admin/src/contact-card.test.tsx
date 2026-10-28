import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ContactPage } from './pages-contact';
vi.mock('./public-shell', () => ({ PublicLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('displays and copies each CMS email independently', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const content = { fellowshipEmail: 'groups@example.com', supportEmail: 'tech@example.com', safetyEmail: 'safety@example.com', sponsorshipEmail: 'partners@example.com' };
  render(<MemoryRouter><ContactPage content={content} /></MemoryRouter>);
  for (const email of Object.values(content)) {
    const container = screen.getByText(email).parentElement!;
    fireEvent.click(within(container).getByRole('button', { name: 'Click to copy email' }));
    expect(writeText).toHaveBeenLastCalledWith(email);
  }
});
