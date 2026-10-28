import { describe, expect, it } from 'vitest';
import { cmsPageGroups } from './cms-sections';
import { PUBLIC_PAGE_COPY } from './public-page-copy';

describe('CMS page sections', () => {
  for (const section of ['contactPage', 'aboutPage'] as const) {
    it(`keeps every ${section} field in exactly one section`, () => {
      const keys = Object.keys(PUBLIC_PAGE_COPY[section]);
      const grouped = cmsPageGroups(section, keys).flatMap(group => group.keys);
      expect(grouped.sort()).toEqual(keys.sort());
      expect(new Set(grouped).size).toBe(grouped.length);
    });
  }
  it('puts contact addresses together and keeps new fields editable', () => {
    const groups = cmsPageGroups('contactPage', [...Object.keys(PUBLIC_PAGE_COPY.contactPage), 'newField']);
    expect(groups.find(group => group.label === 'Contact emails')?.keys).toHaveLength(4);
    expect(groups.flatMap(group => group.keys)).toContain('newField');
  });
});
