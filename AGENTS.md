## Development

Monorepo (pnpm workspaces):

- `apps/site/` — the public site (`@qrnlab/site`, Astro). **Pure static**: no database, no API, no Worker runtime bindings. Prerendered HTML rebuilt only when content changes (via the admin app's rebuild queue) or on push.
- `apps/admin/` — the management dashboard (`@qrnlab/admin`, app.qrnlab.org). One Cloudflare Worker serves the SolidJS v2 SPA (from `dist/client`) and the Hono API (`/api/*`). Owns D1 (`DB`) and R2 (`MEDIA_BUCKET`).
- `packages/shared/` — `@qrnlab/shared`: zod schemas, slugify, excerpt, youtube helpers, media-URL rewriting, RBAC model, `__build` payload contract. Both apps compile against it.

### Data flow (published content)

- **D1 is the source of truth** (owned by `apps/admin`). Publishing = a status flag (`approved` / `published`); drafts/pending are excluded.
- **Static site builds** run the content loader `apps/site/src/loaders/d1.ts`, which:
  1. reads the wrangler-local D1 SQLite directly (Node `node:sqlite`) during local dev — it looks in `apps/admin/.wrangler` first, then its own;
  2. otherwise POSTs to `https://app.qrnlab.org/api/__build` (auth: `x-build-token` / `BUILD_TOKEN`), with `BUILD_API_URL` + `BUILD_TOKEN` as build-time env.
- The loader rewrites legacy `/media/uploads/...` URLs to `https://media.qrnlab.org/uploads/...` via `rewriteMediaUrls` from `@qrnlab/shared`.
- Public pages never touch `env.DB` — they only read content collections.

### Rebuilds (queued, manual)

- Any admin-app mutation that changes what is publicly visible calls `enqueueRebuild()` (`apps/admin/worker/lib/rebuild.ts`) instead of rebuilding immediately. Rows land in the `pending_rebuilds` table.
- An admin triggers **one** rebuild for everything queued via `POST /api/rebuild` (permission `site.rebuild`) → a single Cloudflare Workers Builds Deploy Hook POST (`DEPLOY_HOOK_URL`). Status/queue is `GET /api/rebuild/status`. No-op when the hook is unset (local dev).

### RBAC

- Roles `user` / `editor` / `admin` on the user record; **cumulative** permission grants in `packages/shared/src/rbac.ts`. Team category (`pi` / `member` / `alumni`) is a public profile field only — it grants no access.
- Server enforces every route via `requirePermission` (`apps/admin/worker/lib/authorization.ts`); the SPA derives UI from `GET /api/me` (presentational only).

### Cloudflare workflow

Site (`apps/site`):
- `pnpm --filter @qrnlab/site build` — static build to `apps/site/dist/client` (emits a generated `dist/client/wrangler.json`; `wrangler deploy` uses it automatically).
- `pnpm --filter @qrnlab/site deploy` — build + `wrangler deploy` to the `qrnlab-site` Worker.
- Rebuilds arrive via the site's Workers Builds **Deploy Hook** (wired as `DEPLOY_HOOK_URL` on the admin worker), or a manual push.

Admin (`apps/admin`):
- `pnpm --filter @qrnlab/admin dev` — Vite dev server (SPA, port 3000). It proxies `/api/*` to `http://localhost:8788`, so run the API alongside it:
- `pnpm --filter @qrnlab/admin dev:api` — `wrangler dev --port 8788 --local` (API + local D1). Start this in a second terminal.
- `pnpm --filter @qrnlab/admin build` — Vite build of the Solid SPA → `apps/admin/dist/client`.
- `pnpm --filter @qrnlab/admin preview` — `wrangler dev --port 8788 --local` against the built SPA + API.
- `pnpm --filter @qrnlab/admin types` — regenerate `worker-configuration.d.ts`.
- `pnpm --filter @qrnlab/admin db:generate` — D1 migration into `apps/admin/drizzle`; `wrangler d1 migrations apply qrnlab --local|--remote` from `apps/admin`.
- `pnpm --filter @qrnlab/admin deploy:admin` — build SPA + `wrangler deploy` to the `qrnlab-app` Worker (bind `app.qrnlab.org`).

### DNS / domains

- `app.qrnlab.org` → the `qrnlab-app` Worker (SPA + API).
- `media.qrnlab.org` → R2 custom domain attached to the `qrnlab-media` bucket (serves `uploads/*`).
- `qrnlab.org` → the `qrnlab-site` Worker (static assets).

### Secrets (admin worker)

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAILS`, `BUILD_TOKEN` (shared with the site's build), `DEPLOY_HOOK_URL` (the site's Workers Builds deploy hook).

## Documentation

- Public site: https://docs.astro.build (routing, content collections, deploy to Cloudflare Workers, Cloudflare D1/R2).
- Dashboard: study the Solid 2 docs first — https://v2.solidjs.com (Solid Router data APIs: `query` / `revalidate` / `action`; the `@solidjs/web` JSX import source; `Loading`/`Errored`).
- Design language reference: `test-claude-qrnlab-site-design/index.html` in the workspace (tokens, typography, micro-details).
