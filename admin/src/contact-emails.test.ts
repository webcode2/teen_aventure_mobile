import { expect, it } from 'vitest';
import { normalizeContactEmails } from './contact-emails';
import { cmsFields, validateCms } from './cms-fields';
import { PUBLIC_PAGE_COPY } from './public-page-copy';
it('exposes four distinct editable and validated contact addresses', () => {
  const fields = cmsFields(PUBLIC_PAGE_COPY.contactPage, ['contactPage']);
  expect(fields.filter(field => /Email$/.test(field.path.at(-1)!)).map(field => field.path.at(-1))).toEqual(['fellowshipEmail', 'supportEmail', 'safetyEmail', 'sponsorshipEmail']);
  expect(validateCms({ contactPage: { sponsorshipEmail: 'invalid' } })).toHaveLength(1);
});
it('preserves older customized card addresses while removing duplicate fields', () => {
  expect(normalizeContactEmails({ supportEmail: 'support@askhub.org', supportaskhuborg: 'tech@example.com', supportaskhuborg14: 'partners@example.com', title: 'Contact' })).toEqual({ supportEmail: 'tech@example.com', sponsorshipEmail: 'partners@example.com', title: 'Contact' });
});
it('keeps the canonical editor address when already customized', () => {
  expect(normalizeContactEmails({ supportEmail: 'new@example.com', supportaskhuborg: 'old@example.com' }).supportEmail).toBe('new@example.com');
});
