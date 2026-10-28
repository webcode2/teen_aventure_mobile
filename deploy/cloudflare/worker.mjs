const KEY = 'published/site-content.json';
export function publicRoute(path) {
  return path.replace(/^\/api\/v1\//, '/api/').match(/^\/api\/(content\/(web|mobile)|site-pages(?:\/([^/]+))?)$/);
}
export async function servePublic(request, env) {
  const route = publicRoute(new URL(request.url).pathname);
  if (!route) return null;
  try {
    const object = await env.PUBLIC_CONTENT_BUCKET.get(KEY);
    if (!object) throw new Error('Missing publication');
    const snapshot = await object.json();
    if (snapshot.schemaVersion !== 1 || !snapshot.platforms || !Array.isArray(snapshot.pages) || snapshot.pages.some(page => page.published !== true)) throw new Error('Invalid publication');
    let body;
    if (route[2]) body = snapshot.platforms[route[2]];
    else if (route[3]) body = snapshot.pages.find(page => page.slug === decodeURIComponent(route[3]));
    else body = snapshot.pages.map(({ slug, title, createdAt, updatedAt }) => ({ slug, title, createdAt, updatedAt }));
    if (!body) return Response.json({ message: 'Page not found' }, { status: 404 });
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, must-revalidate', ETag: `"${snapshot.revision}"`, 'X-Content-Source': 'r2' } });
  } catch {
    return Response.json({ message: 'Published content is temporarily unavailable.' }, { status: 503 });
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Keep old cached frontend builds working after the mascot asset rename.
    if (url.pathname === '/zack.png') return Response.redirect(new URL('/zach.png', url), 301);
    if (env.ADMIN_HOSTNAME) {
      const adminHost = url.hostname === env.ADMIN_HOSTNAME;
      if (adminHost && url.pathname === '/') return Response.redirect(new URL('/app/dashboard', url), 302);
      if (!adminHost && /^\/app\/(?:login|forgot|reset|dashboard)(?:\/|$)/.test(url.pathname)) {
        const destination = new URL(request.url);
        destination.hostname = env.ADMIN_HOSTNAME;
        destination.protocol = 'https:';
        return new Response(null, { status: 302, headers: { Location: destination.href, 'Cache-Control': 'no-store' } });
      }
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      const response = await servePublic(request, env);
      if (response) return response;
    }
    if (url.pathname.startsWith('/api/')) {
      const upstream = new URL(env.API_ORIGIN);
      if (upstream.protocol !== 'https:') return new Response('Invalid upstream', { status: 503 });
      upstream.pathname = url.pathname;
      upstream.search = url.search;
      const response = await fetch(new Request(upstream, request), { redirect: 'manual' });
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'private, no-store');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return env.ASSETS.fetch(request);
  },
};
