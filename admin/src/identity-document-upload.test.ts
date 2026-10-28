import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('./api', () => ({ applicantApi: vi.fn() }));
import { applicantApi } from './api';
import { uploadApplicantIdentityDocument } from './identity-document-upload';
const client = vi.mocked(applicantApi);
const file = new File(['example'], 'identity.pdf', { type: 'application/pdf' });
beforeEach(() => {
  client.mockReset();
  client.mockResolvedValueOnce({ ready: true, directUpload: true })
    .mockResolvedValueOnce({ uploadUrl: 'https://storage.test.invalid/signed', publicUrl: 'private-object-reference', headers: { 'Content-Type': file.type } });
});
afterEach(() => vi.unstubAllGlobals());
it('completes successful direct uploads without uploading another copy', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  client.mockResolvedValueOnce({ key: 'direct-key' });
  expect(await uploadApplicantIdentityDocument(file)).toEqual({ key: 'direct-key' });
  expect(client.mock.calls[2]).toEqual(['/api/church-applications/identity-doc/complete', { method: 'POST', body: JSON.stringify({ url: 'private-object-reference' }) }]);
});
it.each(['blocked-preflight', 'rejected-put'])('falls back to the authenticated multipart API after %s', async failure => {
  vi.stubGlobal('fetch', failure === 'blocked-preflight' ? vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) : vi.fn().mockResolvedValue({ ok: false }));
  client.mockResolvedValueOnce({ key: 'server-key' });
  expect(await uploadApplicantIdentityDocument(file)).toEqual({ key: 'server-key' });
  const [path, options] = client.mock.calls[2]!;
  expect(path).toBe('/api/church-applications/identity-doc');
  expect(options?.method).toBe('POST');
  expect((options?.body as FormData).get('file')).toEqual(file);
});
it('does not fall back when presign authorization fails', async () => {
  client.mockReset().mockResolvedValueOnce({ ready: true, directUpload: true }).mockRejectedValueOnce(new Error('Access denied'));
  vi.stubGlobal('fetch', vi.fn());
  await expect(uploadApplicantIdentityDocument(file)).rejects.toThrow('Access denied');
  expect(fetch).not.toHaveBeenCalled(); expect(client).toHaveBeenCalledTimes(2);
});
it('does not upload another copy when registration fails after a successful PUT', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  client.mockRejectedValueOnce(new Error('Registration failed'));
  await expect(uploadApplicantIdentityDocument(file)).rejects.toThrow('Registration failed');
  expect(client).toHaveBeenCalledTimes(3);
  expect(client.mock.calls[2]![0]).toContain('/complete');
});
