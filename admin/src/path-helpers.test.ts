import { describe, it, expect } from 'vitest';
import { isDashboardTab, safeStaffNext, legacyHashToPath } from './path-helpers';

describe('isDashboardTab', () => {
  it('accepts people and rejects dashboard and junk', () => {
    expect(isDashboardTab('people')).toBe(true);
    expect(isDashboardTab('dashboard')).toBe(false);
    expect(isDashboardTab('nope')).toBe(false);
  });
});

describe('safeStaffNext', () => {
  it('allows dashboard paths and rejects others', () => {
    expect(safeStaffNext('/app/dashboard')).toBe('/app/dashboard');
    expect(safeStaffNext('/app/dashboard/people')).toBe('/app/dashboard/people');
    expect(safeStaffNext('/app/dashboard/quests?week=3')).toBe('/app/dashboard/quests?week=3');
    expect(safeStaffNext('/groups')).toBe('/app/dashboard');
    expect(safeStaffNext('https://evil.example/')).toBe('/app/dashboard');
    expect(safeStaffNext(null)).toBe('/app/dashboard');
  });
});

describe('legacyHashToPath', () => {
  it('maps known hashes', () => {
    expect(legacyHashToPath('#/landing')).toBe('/');
    expect(legacyHashToPath('#/login')).toBe('/app/login');
    expect(legacyHashToPath('#/forgot')).toBe('/app/forgot');
    expect(legacyHashToPath('#/reset?token=abc')).toBe('/app/reset?token=abc');
    expect(legacyHashToPath('#/dashboard')).toBe('/app/dashboard');
    expect(legacyHashToPath('#/people')).toBe('/app/dashboard/people');
    expect(legacyHashToPath('#/pastor')).toBe('/groups');
    expect(legacyHashToPath('#/church/ch_1')).toBe('/groups/ch_1');
    expect(legacyHashToPath('')).toBe(null);
    expect(legacyHashToPath('#/unknown-tab')).toBe('/app/dashboard');
  });
});
