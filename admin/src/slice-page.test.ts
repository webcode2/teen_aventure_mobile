import { describe, expect, it } from 'vitest';
import { slicePage } from './ui';

describe('slicePage', () => {
  const items = Array.from({ length: 41 }, (_, i) => i + 1);

  it('returns the first 40 and clamps a page past the end', () => {
    expect(slicePage(items, 1).rows).toEqual(items.slice(0, 40));
    expect(slicePage(items, 2).rows).toEqual([41]);
    expect(slicePage(items, 9).page).toBe(2);
    expect(slicePage([], 3)).toMatchObject({ page: 1, rows: [], total: 0 });
  });
});