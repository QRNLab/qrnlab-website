## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

The dev server runs in Cloudflare's `workerd` runtime (via `@astrojs/cloudflare`). Bindings are defined in `wrangler.jsonc` (D1 `DB`, R2 `MEDIA_BUCKET`, Images `IMAGES`); local secrets go in `.dev.vars`.

### Architecture: D1-backed static site

- **D1 is the source of truth.** Team, blog, publications, updates all live in D1; public pages are prerendered static HTML.
- **Content loaders** (`src/loaders/d1.ts`) run in Node during `astro build`'s content-sync phase, where Cloudflare bindings are unavailable. They fetch published content from the live Worker's `POST /api/__build` (auth: `x-build-token` header, `BUILD_TOKEN`). `BUILD_API_URL` points at the dev server locally and the deployed site in Workers Builds.
- **Publishing = a status flag** in D1 (`approved` / `published`). Approved/published rows are exposed via `__build`; drafts/pending are not. No GitHub involvement in content.
- **Rebuilds** are triggered by `triggerRebuild()` (`src/lib/server/rebuild.ts`), which POSTs to the Cloudflare Workers Builds Deploy Hook URL (`DEPLOY_HOOK_URL`). It fires only when public visibility changes (approve/publish/delete) — not on drafts, rejections, or logins. No-op when the hook URL is unset (local dev).
- Public pages must never touch `env.DB` directly — they only read content collections (which the loader populates from `__build`).
- To rebuild locally, the dev server must be running (loaders hit `BUILD_API_URL=http://localhost:4321`), then `pnpm build`.

### Cloudflare workflow

- `pnpm types` — regenerate `worker-configuration.d.ts` from `wrangler.jsonc`
- `pnpm db:generate` — regenerate SQLite D1 migrations into `drizzle/`
- `wrangler d1 migrations apply qrnlab --local|--remote` — apply D1 migrations
- `pnpm build` — build; emits `dist/` (client assets + server Worker)
- `pnpm preview` — local `workerd` preview of the built Worker (background-managed like `dev`)
- `wrangler deploy` — deploy to the `qrnlab-site` Worker
- `wrangler secret put <NAME>` — set a production secret (needs the Worker to exist)

Run `pnpm types` after changing `wrangler.jsonc`; run `wrangler deploy` after `pnpm build`. When `wrangler.jsonc` changes, regenerate types and re-apply D1 migrations.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
- [Deploying to Cloudflare Workers](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
