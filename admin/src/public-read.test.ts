import { afterEach, expect, it, vi } from 'vitest';
import { publicApi } from './api';
afterEach(() => vi.unstubAllGlobals());
it('deduplicates simultaneous public reads and omits cookies', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ title: 'Public' }) });
  vi.stubGlobal('fetch', fetcher);
  const [first, second] = await Promise.all([publicApi('/api/content/web'), publicApi('/api/content/web')]);
  expect(first).toEqual(second);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ credentials: 'omit' }));
  await publicApi('/api/content/web');
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('retries a failed read rather than retaining a rejected promise', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetcher);
  await expect(publicApi('/api/content/web')).rejects.toThrow('offline');
  await publicApi('/api/content/web');
  expect(fetcher).toHaveBeenCalledTimes(2);
});
