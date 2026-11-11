import { describe, expect, it } from 'vitest';
import { churchJoinQrPayload, classJoinQrPayload, joinPassQrPayload } from './barcode';

describe('join pass QR payloads', () => {
  it('builds a church join link any phone camera can open', () => {
    expect(churchJoinQrPayload('m10ghy')).toBe('https://tba.elastrocloud.com/join/church/M10GHY');
  });

  it('builds a class join link for church groups', () => {
    expect(classJoinQrPayload('8gigjx')).toBe('https://tba.elastrocloud.com/join/class/8GIGJX');
    expect(joinPassQrPayload('class', '8gigjx')).toBe('https://tba.elastrocloud.com/join/class/8GIGJX');
  });
});
