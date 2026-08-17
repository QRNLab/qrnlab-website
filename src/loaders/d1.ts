import type { Loader } from 'astro/loaders';

interface BuildEntry {
  id: string;
  data: Record<string, unknown>;
  body?: string;
}

interface BuildPayload {
  team: BuildEntry[];
  blog: BuildEntry[];
  publications: BuildEntry[];
  updates: BuildEntry[];
}

const cacheKey = Symbol.for('qrnlab-build-payload');

/**
 * Loader for content collections backed by Cloudflare D1. The loader runs in
 * Node during the `astro build` content-sync phase (where Cloudflare bindings
 * are unavailable), so it fetches published content from the live Worker's
 * `POST /api/__build` endpoint instead.
 *
 * Unset/absent credentials or an unreachable endpoint → the collection loads
 * empty (with a warning) so builds still pass without secrets.
 */
export function d1Loader(collection: 'team' | 'blog' | 'publications' | 'updates'): Loader {
  return {
    name: `d1-${collection}`,
    load: async ({ store, logger, renderMarkdown, parseData }) => {
      const baseUrl = process.env.BUILD_API_URL;
      const token = process.env.BUILD_TOKEN;
      if (!baseUrl || !token) {
        logger.warn(`[d1:${collection}] BUILD_API_URL/BUILD_TOKEN not set — loading empty collection.`);
        return;
      }

      const global = globalThis as Record<symbol, unknown>;
      let payload: BuildPayload | undefined = global[cacheKey] as BuildPayload | undefined;
      if (!payload) {
        try {
          const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/__build`, {
            method: 'POST',
            headers: {
              'x-build-token': token,
              Origin: baseUrl,
            },
          });
          if (!res.ok) {
            logger.warn(`[d1:${collection}] /api/__build returned ${res.status} — loading empty collection.`);
            return;
          }
          payload = (await res.json()) as BuildPayload;
          global[cacheKey] = payload;
        } catch (err) {
          logger.warn(`[d1:${collection}] could not reach ${baseUrl} — loading empty collection. (${(err as Error).message})`);
          return;
        }
      }

      const entries = payload[collection] ?? [];
      store.clear();
      for (const entry of entries) {
        const data = await parseData({ id: entry.id, data: entry.data });
        let rendered;
        if (collection === 'blog' && entry.body) {
          const r = await renderMarkdown(entry.body);
          rendered = { html: r.html, metadata: r.metadata };
        }
        store.set({
          id: entry.id,
          data,
          body: entry.body,
          rendered,
        });
      }
    },
  };
}
