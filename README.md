# QRNLab Website

Research laboratory website for QRNLab. Astro 7 + TailwindCSS v4 + TypeScript, deployed to Netlify, with a self-service member system (register → submit profile → admin approves → published to the site via an auto-merged git PR).

## Architecture

- **Site**: Astro 7 (static pages; on-demand pages marked `prerender = false`), `@astrojs/netlify` adapter.
- **Content**: Markdown content collections (`src/content/{team,blog,publications,projects}`). Math rendered with KaTeX at build time (`$...$` / `$$...$$`).
- **API**: Hono, mounted in `src/pages/api/[...path].ts`, runs in the Netlify function.
- **Auth**: Better Auth (email + password, email verification) with sessions in Neon.
- **Database**: Neon serverless Postgres via Drizzle (`src/lib/server/schema.ts`).
- **Publishing**: Approve/Publish → Hono calls the GitHub API to write markdown to a branch → opens a PR → auto-merges → Netlify rebuilds. No one ever touches git.
- **Roles**: `member` / `editor` / `admin`, stored on `users.role`, admin-assignable.

## Project structure

```
src/
  api/                 # Hono app (auth, members, content, admin)
  lib/server/          # db, schema, auth, mail, github, content
  lib/client/          # browser fetch helper
  lib/shared/          # zod form schemas
  pages/               # public pages + /join /login /account /admin /api
  layouts/  components/  styles/
  content/             # markdown collections
  content.config.ts
  middleware.ts        # session + role gating
drizzle.config.ts
astro.config.mjs
```

## Getting started

1. Install dependencies: `pnpm install`
2. Create `.env` from `.env.example` and fill in the values (see below).
3. Push the database schema: `pnpm db:push` (Neon only — PGlite applies `drizzle/` migrations automatically)
4. Run the dev server: `pnpm dev`

> The static site builds without env vars. Only the on-demand pages and API need them at runtime.

### Local testing without external services

The repo ships with dev-mode switches so you can exercise the entire flow (register → verify → submit profile → admin approves → content lands in the site) before touching Neon/GitHub. `.env` already enables them:

| Switch | Purpose |
|---|---|
| `DATABASE_DRIVER=pglite` | Embedded Postgres (PGlite) persisted to `pglite-data/` instead of Neon. First run auto-applies the migrations in `drizzle/`. |
| `DEV_AUTO_VERIFY=true` | Marks new users' emails as verified on sign-up (skip the email round-trip). |
| `PUBLISH_MODE=local` | Writes published content straight into `src/content/...` instead of opening a GitHub PR. Dev server hot-reloads it. |
| `ADMIN_EMAILS=...` | Emails auto-promoted to `admin` on sign-up. |

**End-to-end test:**

```sh
pnpm dev
# 1. Register:  POST /api/auth/sign-up/email   { name, email, password }   (use an ADMIN_EMAILS address for the admin)
# 2. Login:     POST /api/auth/sign-in/email   { email, password }  → keep the session cookie
# 3. Profile:   POST /api/members              (profile fields)    → status "pending"
# 4. Approve:   POST /api/admin/members/:userId/approve            → writes src/content/team/<name>.md
#    (userId comes from GET /api/admin/members)
# 5. See it live at /team. Or use the UI: /join, /login, /account, /admin.
```

The same flow works in the browser UIs (`/join`, `/account`, `/admin`, `/admin/blog`, `/admin/publications`). To switch back to real services later, set `DATABASE_DRIVER` unset + `NEON_DATABASE_URL`, `PUBLISH_MODE=github` (or remove the key) + `GITHUB_*` values.

### Required environment variables

| Variable | Purpose |
|---|---|
| `NEON_DATABASE_URL` | Neon (serverless Postgres) connection string |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Site URL (e.g. `http://localhost:4321` in dev) |
| `RESEND_API_KEY` | Transactional email for verification / password reset |
| `MAIL_FROM` | Verified sender, e.g. `QRNLab <onboarding@example.com>` |
| `ADMIN_EMAILS` | Comma-separated emails auto-promoted to `admin` on sign-up (first-admin bootstrap) |
| `GITHUB_TOKEN` | Fine-grained PAT scoped to the site repo: Contents read/write + Pull requests read/write |
| `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` | The site's GitHub repo |

### Scripts

| Command | Action |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm check` | Type-check (`astro check`) |
| `pnpm db:push` | Apply Drizzle schema to the database |
| `pnpm db:generate` | Generate a migration from the schema |

## Workflows

**Member joins the lab**
1. `/join` — register (email verification required).
2. `/account` — submit profile (name, role, focus, bio, links…); status becomes `pending`.
3. Admin approves in `/admin` → the system generates `src/content/team/<name>.md` and publishes it via PR.

**Editor publishes a blog post**
1. `/admin/blog` — write Markdown (+ KaTeX math), preview, save draft.
2. Publish → markdown is committed to `src/content/blog/<slug>.md` via auto-merged PR → site rebuilds.

**Admin manages roles**
- `/admin` → Users & roles table; change `member`/`editor`/`admin`.

## Adding publications

There are **two separate publication lists** (they are not linked):

**1. Lab publications** — the site-wide `/publications` page.
- Editors/admins add these at `/admin/publications`.
- Fields: Title, Authors (comma-separated, in order of appearance), Venue (journal/conference + volume/pages if known), Year, Type (journal / conference / preprint), optional URL (full `https://` link).
- Example: `Title: "Monte Carlo calculations of target fragments from helium and carbon ion interactions with water"` · `Authors: Q. M. R. Nizam, A. Ahmed, I. Ahmed, L. Sihver` · `Venue: Zeitschrift für Medizinische Physik, 36(1), 26–35` · `Year: 2026` · `Type: journal`
- Publishing writes the entry to `src/content/publications/` via an auto-merged PR → site rebuilds.

**2. Member profile publications** — shown only on a member's profile page.
- Added by the member at `/account/edit` → Publications.
- Free text, **one per line**, suggested format `Author(s). Title. Venue, Year.` (a full citation string). Not linked to the lab publication list.

## Deployment (Netlify)

1. Push the repo to GitHub.
2. New site → connect the repo. Build command `pnpm build`, output `dist`.
3. Add all env vars above in Site settings → Environment variables.
4. First deploy: create the admin account in production (the email must be in `ADMIN_EMAILS`).

The publish pipeline commits with the `GITHUB_TOKEN`, so pushes to `main` (including the auto-merged PRs) trigger rebuilds automatically.

## Known deferred items

- **Images** (private Backblaze B2): resolution pending. Candidates: Cloudflare Worker in front of a private bucket, or commit images to the repo. See the decision log.
- **Typst** full documents: equations in posts work via KaTeX today; Typst build step can be added later.
