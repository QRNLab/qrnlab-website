import { app } from './api/app';
import { env } from 'cloudflare:workers';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      return app.fetch(request);
    }

    // Try to serve a real static asset (JS/CSS/images). If nothing matches and
    // this is a navigation request, fall back to the SPA shell (index.html) so
    // client-side routes like /login and /blog/:id resolve on refresh.
    const res = await env.ASSETS.fetch(request);
    if (!res.ok && request.method === 'GET') {
      const accept = request.headers.get('Accept') ?? '';
      if (accept.includes('text/html')) {
        return env.ASSETS.fetch(new Request(`${url.origin}/`, request));
      }
    }
    return res;
  },
};
