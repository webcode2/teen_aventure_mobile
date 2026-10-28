import { normalizeContentNames } from '@askhub/puzzle-contracts';
const legacyEmails = {
  fellowshipEmail: ['fellowshipaskhuborg', 'fellowship@askhub.org'],
  supportEmail: ['supportaskhuborg', 'support@askhub.org'],
  safetyEmail: ['safetyaskhuborg', 'safety@askhub.org'],
  sponsorshipEmail: ['supportaskhuborg14', 'support@askhub.org'],
} as const;

/** Migrate old display-only fields into the addresses used for both display and copy. */
export function normalizeContactEmails(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const copy = { ...value } as Record<string, string>;
  for (const [canonical, [legacy, fallback]] of Object.entries(legacyEmails)) {
    const old = copy[legacy];
    if (typeof old === 'string' && old.trim() && (!copy[canonical] || (copy[canonical] === fallback && old !== fallback))) copy[canonical] = old;
    delete copy[legacy];
  }
  return copy;
}

export function normalizeContactDocument<T>(value: T): T {
  value = normalizeContentNames(value);
  if (!value || typeof value !== 'object' || !('contactPage' in value)) return value;
  return { ...value, contactPage: normalizeContactEmails(value.contactPage) };
}
