import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicRoute, servePublic } from './worker.mjs';
const snapshot = { schemaVersion: 1, revision: 'one', platforms: { web: { title: 'Hello' }, mobile: {} }, pages: [{ slug: 'privacy', title: 'Privacy', html: '<p>Public</p>', published: true }] };
function env(value = snapshot) { return { PUBLIC_CONTENT_BUCKET: { get: async key => { assert.equal(key, 'published/site-content.json'); return value ? { json: async () => value } : null; } } }; }
test('only exact public content paths use snapshots', () => {
  for (const path of ['/api/content/web', '/api/v1/content/mobile', '/api/site-pages/privacy']) assert.ok(publicRoute(path));
  for (const path of ['/api/admin/content/web', '/api/auth/dashboard-session', '/api/site-pages/privacy/edit', '/api/content/files/a']) assert.equal(publicRoute(path), null);
});
test('serves both aliases and published page without an API binding', async () => {
  for (const prefix of ['/api', '/api/v1']) {
    const response = await servePublic(new Request(`https://example.com${prefix}/content/web`), env());
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { title: 'Hello' });
  }
  assert.equal((await servePublic(new Request('https://example.com/api/site-pages/missing'), env())).status, 404);
});
test('fails closed for missing and draft-contaminated snapshots', async () => {
  const request = new Request('https://example.com/api/site-pages');
  assert.equal((await servePublic(request, env(null))).status, 503);
  assert.equal((await servePublic(request, env({ ...snapshot, pages: [{ published: false }] }))).status, 503);
});

test('private API proxy preserves cookies and never caches responses', async () => {
  const { default: worker } = await import('./worker.mjs');
  const original = globalThis.fetch;
  globalThis.fetch = async (request, options) => {
    assert.equal(new URL(request.url).origin, 'https://api.example.com');
    assert.equal(request.headers.get('cookie'), '__Host-session=opaque');
    assert.equal(options.redirect, 'manual');
    return new Response('{}', { headers: { 'Set-Cookie': '__Host-session=new; Secure; HttpOnly; Path=/; SameSite=Strict' } });
  };
  try {
    const response = await worker.fetch(new Request('https://site.example.com/api/auth/dashboard-session', { headers: { cookie: '__Host-session=opaque' } }), { API_ORIGIN: 'https://api.example.com' });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(response.headers.get('set-cookie'), /Secure; HttpOnly/);
  } finally { globalThis.fetch = original; }
});

test('public CMS reads never contact the API, including when R2 is unavailable', async () => {
  const { default: worker } = await import('./worker.mjs');
  const original = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => { upstreamCalls++; throw new Error('API must not be contacted'); };
  try {
    for (const prefix of ['/api', '/api/v1']) {
      for (const path of ['/content/web', '/content/mobile', '/site-pages', '/site-pages/privacy']) {
        const response = await worker.fetch(new Request(`https://example.com${prefix}${path}`), { ...env(), API_ORIGIN: 'https://unreachable.invalid' });
        assert.equal(response.status, 200);
      }
    }
    const unavailable = await worker.fetch(new Request('https://example.com/api/content/web'), { ...env(null), API_ORIGIN: 'https://unreachable.invalid' });
    assert.equal(unavailable.status, 503);
    assert.equal(upstreamCalls, 0);
  } finally { globalThis.fetch = original; }
});

test('separates admin pages from the public and workers.dev hostnames', async () => {
  const { default: worker } = await import('./worker.mjs');
  const bindings = { ADMIN_HOSTNAME: 'admin.tba.elastrocloud.com', ASSETS: { fetch: async () => new Response('frontend') } };
  for (const hostname of ['tba.elastrocloud.com', 'teen-adventures-web.saviorisrael.workers.dev']) {
    for (const path of ['/app/login', '/app/forgot', '/app/reset', '/app/dashboard', '/app/dashboard/content-web']) {
      const response = await worker.fetch(new Request(`https://${hostname}${path}`), bindings);
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), `https://admin.tba.elastrocloud.com${path}`);
    }
    assert.equal((await worker.fetch(new Request(`https://${hostname}/`), bindings)).status, 200);
  }
  const root = await worker.fetch(new Request('https://admin.tba.elastrocloud.com/'), bindings);
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), 'https://admin.tba.elastrocloud.com/app/dashboard');
  assert.equal((await worker.fetch(new Request('https://admin.tba.elastrocloud.com/app/login'), bindings)).status, 200);
});

 test('old admin links retain the nested path and reset query when redirected', async () => {
  const { default: worker } = await import('./worker.mjs');
  const response = await worker.fetch(new Request('https://tba.elastrocloud.com/app/reset?token=non-secret-test'), { ADMIN_HOSTNAME: 'admin.tba.elastrocloud.com' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://admin.tba.elastrocloud.com/app/reset?token=non-secret-test');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
