import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
vi.mock('./api', () => ({ login: vi.fn(), forgotPassword: vi.fn(), resetPassword: vi.fn() }));
import { LoginPage } from './auth-pages';
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
it('leaves production credentials empty and removes developer login shortcuts', () => {
  vi.stubEnv('DEV', false);
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  expect((screen.getByPlaceholderText('Email') as HTMLInputElement).value).toBe('');
  expect((screen.getByPlaceholderText('Password') as HTMLInputElement).value).toBe('');
  expect(screen.queryByRole('button', { name: 'App Manager' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Super Admin' })).toBeNull();
});
