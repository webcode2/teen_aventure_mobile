import { beforeEach, expect, it, vi } from 'vitest';
beforeEach(() => { vi.resetModules(); localStorage.clear(); });
it('removes legacy portal credentials and never persists new ones', async () => {
  localStorage.setItem('askhub_pastor_token', 'old');
  localStorage.setItem('askhub_church_applicant_token', 'old');
  const api = await import('./api');
  expect(localStorage.getItem('askhub_pastor_token')).toBeNull();
  expect(localStorage.getItem('askhub_church_applicant_token')).toBeNull();
  api.setPastorSession('new', { name: 'Test' });
  api.setApplicantToken('new-applicant');
  expect(api.getPastorToken()).toBe('new');
  expect(api.getApplicantToken()).toBe('new-applicant');
  expect(localStorage.length).toBe(0);
  vi.resetModules();
  const reloaded = await import('./api');
  expect(reloaded.getPastorToken()).toBeNull();
  expect(reloaded.getApplicantToken()).toBeNull();
});
