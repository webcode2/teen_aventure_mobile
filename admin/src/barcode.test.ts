import { describe, expect, it } from 'vitest';
import { churchJoinQrPayload, classJoinQrPayload, joinPassQrPayload } from './barcode';

describe('join pass QR payloads', () => {
  it('builds a tba-join church payload the mobile app can parse', () => {
    expect(churchJoinQrPayload('m10ghy')).toBe('tba-join:church:M10GHY');
  });

  it('builds a tba-join class payload for church groups', () => {
    expect(classJoinQrPayload('8gigjx')).toBe('tba-join:class:8GIGJX');
    expect(joinPassQrPayload('class', '8gigjx')).toBe('tba-join:class:8GIGJX');
  });
});
