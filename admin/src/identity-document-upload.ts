import { applicantApi } from './api';

/** Prefer direct storage upload, with the authenticated API as a CORS/network fallback. */
export async function uploadApplicantIdentityDocument(file: File): Promise<{ key: string }> {
  const storage = await applicantApi<{ directUpload: boolean; ready: boolean; message?: string }>(
    '/api/church-applications/identity-doc/storage',
  );
  if (!storage.ready) throw new Error(storage.message || 'Identity document storage is not ready.');

  if (storage.directUpload) {
    const signed = await applicantApi<{ uploadUrl: string; publicUrl: string; headers: Record<string, string> }>(
      '/api/church-applications/identity-doc/presign',
      { method: 'POST', body: JSON.stringify({ filename: file.name || 'identity.bin', contentType: file.type }) },
    );
    let uploaded = false;
    try {
      const response = await fetch(signed.uploadUrl, { method: 'PUT', headers: signed.headers, body: file });
      uploaded = response.ok;
    } catch {
      // Browsers reject blocked CORS preflights and network failures before a response exists.
    }
    if (uploaded) {
      // Registration errors must remain errors rather than uploading a second document.
      return applicantApi<{ key: string }>('/api/church-applications/identity-doc/complete', {
        method: 'POST', body: JSON.stringify({ url: signed.publicUrl }),
      });
    }
  }

  const body = new FormData();
  body.append('file', file);
  return applicantApi<{ key: string }>('/api/church-applications/identity-doc', { method: 'POST', body });
}
