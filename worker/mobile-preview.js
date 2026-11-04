// The mobile preview shares this host with the original app at /.
export function createMobilePreview(assets) {
  return function mobilePreview(request) {
    const path = new URL(request.url).pathname;
    if (path !== '/app' && !path.startsWith('/app/')) return null;
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    let route;
    try { route = decodeURIComponent(path.slice(4)) || '/'; }
    catch { return new Response('Invalid path', { status: 400 }); }
    const isPage = !route.startsWith('/assets/') && !route.startsWith('/_expo/') && !route.split('/').pop().includes('.');
    const file = assets[route === '/' ? '/index.html' : route] || (isPage ? assets['/index.html'] : null);
    if (!file) return new Response('Not found', { status: 404 });
    // Compress the embedded payload to keep the Worker small, then let the
    // platform negotiate the browser's transport compression normally.
    const body = request.method === 'HEAD' ? null : new Blob([
      Uint8Array.from(atob(file.body), char => char.charCodeAt(0)),
    ]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(body, { headers: {
      'Content-Type': file.type,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    } });
  };
}
