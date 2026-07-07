# Development Log

## Session Log

### Session 8 — 2026-07-07

**Goal**: Add Active Projects to the Research page, linked to specific domains.

**Implemented**:
- Added `projects` collection to `src/content.config.ts` with schema: title, domain, status, lead (single), researchers (array), conference, tags
- Created `src/content/projects/` with 2 markdown files:
  - **Quantum Simulation of Nuclear Reactions** (domain: quantum-computing, lead: Animesh Banik)
  - **Efficient QKD using Generalized State Discrimination** (domain: quantum-computing, lead: Animesh Banik, 4 researchers, ICP-2026 conference)
- Rewrote `src/pages/research.astro`:
  - Removed the old empty "Active Projects" section at the bottom
  - Each domain section now queries `projects` filtered by domain
  - Projects displayed as bordered cards beneath the domain description
  - Card shows: title, lead, researchers, body text, conference, tags
  - All 4 domain sections iterate cleanly; only Quantum Computing has projects currently

---

### Session 7 — 2026-07-07

**Goal**: Create an Affiliates page showcasing QRNLab's external collaborators.

**Implemented**:
- Copied 8 images from `temp/Affiliates/` to `public/images/affiliates/`
- Created `src/pages/affiliates.astro` — single page with 4 affiliate sections:
  - **Prof. Nakahiro Yasuda** (RINE, Univ. of Fukui) — Nizam's PhD supervisor. Photo shows him with QRNLab. 1 publication listed.
  - **Prof. Lembit Sihver** (TU Wien / UT Rio Grande Valley) — PHITS code developer. Individual profile photo. 1 publication listed.
  - **Prof. Mayeen Uddin Khandaker** (Sunway University) — Top 2% cited researcher. Individual profile photo. Ongoing collaboration noted.
  - **Md. Abdullah Al Zaman** (Northern University Bangladesh) — Space radiation researcher. Uses Avatar (no individual photo). 3 publications listed.
- Each section: profile image (photo or Avatar), 3 group photos as collage, about bio, QRNLab-affiliated publications
- Publications styled with blue left border accent (`border-l-2 border-blue-500/40`)
- Added "Affiliates" to the top navigation in `BaseLayout.astro`

---

### Session 6 — 2026-07-07

**Goal**: Add two real alumni (Iftekhar Ahmed, Md. Ashik Azad Khan Anik), add publications for all members, and make publications plain text in detail pages.

**Implemented**:
- Added `publications: z.array(z.string()).optional()` to content schema in `src/content.config.ts`
- Created **2 new alumni** markdown files:
  - `iftekhar-ahmed.md` — Ph.D. student at UTK (sPHENIX), M.Sc. from CU under Nizam. 3 publications (1 with Nizam, 2 sPHENIX collab.)
  - `md-ashik-azad-khan-anik.md` — Lecturer at Northern University Bangladesh, M.Sc. from CU under Nizam. 5 publications on environmental radiation/NORM
- Added **publications** to existing team member markdowns:
  - **PI**: 6 publications (heavy ion, radiation shielding, NORM mapping, quantum cryptography)
  - **Animesh Banik**: 2 publications (AVS Quantum Science, arXiv)
- Updated **all 3 detail page templates** to render publications from frontmatter:
  - PI page: removed `getCollection('publications')` try/catch wiring, uses `data.publications` instead
  - Member page: added "Publications" section
  - Alumni page: added "Publications" section
  - All render publications as plain `<li>` text — no links, no references to any `/publications` page

---

### Session 5b — 2026-07-07 (amend: link behavior)

**Changes**:
- All team member/alumni cards now link to **internal detail pages only** — no external links from the grid
- External links moved entirely into the detail pages
- Added `links` array field to schema — an array of `{label, url}` objects in frontmatter for **arbitrary links**
- Arbitrary links merge with structured links (website, scholar, linkedin, github) in the detail page link list
- Works for both members and alumni
- Added example arbitrary links to Animesh's profile (IBM Qiskit Advocate, ORCID)

**How to add arbitrary links to any team member**:
Add this to the markdown frontmatter:
```yaml
links:
  - label: ResearchGate
    url: https://researchgate.net/...
  - label: YouTube
    url: https://youtube.com/...
```
They'll appear alongside the structured links on the detail page.

---

### Session 5 — 2026-07-07

**Goal**: Implement team member pages with content collections, auto-generated avatars, detail pages, and "show more" on the /team page.

**Implemented**:
- Created `src/content.config.ts` with `team` collection (Astro 7 new API using `glob()` loader + Zod schema with discriminated fields for pi/member/alumni)
- Created **19 markdown files** in `src/content/team/`:
  - **PI**: Dr. Quazi Muhammad Rashed Nizam — full bio from ORCID, email, LinkedIn, Google Scholar
  - **Current member**: Animesh Banik — real profile from his portfolio (role, focus, email, website, Scholar, LinkedIn, GitHub, full bio)
  - **8 dummy current members** (Mariem Absar, Fahim Shahriar, Nusrat Jahan, Tanvir Ahmed, Sadia Islam, Arafat Hossain, Sumaiya Akhter, Rakibul Hasan)
  - **9 dummy alumni** (Md. Shihab Khan → Tokyo Tech, Shahrin Ishraq → UTokyo, Rifat Hossain → JAEA, Nowrin Tabassum → CU Lecturer, Abdullah Al Mamun → Osaka, Tasnim Rahman → Analytica, Farhana Hoque → CUET, Imran Hossain → REVE Systems, Sadman Sakib → UniMelb)
- Created **`src/components/Avatar.astro`** — generates inline SVG with initials on a hue-derived colored background (zero dependencies, no external requests)
- Created **`src/components/MemberCard.astro`** — card with avatar, name, role, focus, email; links to external website if set, else internal `/team/member/{id}`
- Created **`src/components/AlumniCard.astro`** — card with avatar, name, current position + institution (amber highlight), graduation year; links to external institution page if set, else internal `/team/alumni/{id}`
- Updated **`/team`** (`src/pages/team.astro`):
  - PI section: avatar + name + title as a single full-width card
  - Current members: 4-column grid (sm: 2-col, lg: 4-col), first 8 visible, rest hidden behind "Show more" button
  - Alumni: same grid + "Show more" pattern
  - "Show more" uses inline JS (~8 lines): reveals hidden cards with `fadeInUp` animation + staggered delay (80ms per card), removes button
- Created **detail pages**:
  - `/team/pi/[slug]` — avatar, name, title, email, external links (Scholar/LinkedIn), bio (markdown body), publications section wired to future `publications` collection (shows placeholder when empty)
  - `/team/member/[slug]` — avatar, name, role, focus, email, external links list, bio
  - `/team/alumni/[slug]` — avatar, name, position + institution prominently in amber, graduation year, institution page link, optional bio
- Updated `src/styles/global.css` with `@keyframes fadeInUp`

**Link logic**:
| Type | Has external? | Card link | Detail page |
|------|-------------|-----------|-------------|
| PI | always internal → `/team/pi/{id}` | All links listed |
| Member | website set → external site | All links listed |
| Member | no website → `/team/member/{id}` | — |
| Alumni | institutionPage → external page | Link listed |
| Alumni | no institutionPage → `/team/alumni/{id}` | — |

**Verified**: `pnpm build` passes — 25 pages in 1.14s. All routes: /team, /team/pi/*, /team/member/* (×8), /team/alumni/* (×9), plus all existing pages.

**Next**:
- Add real publications to populate the PI's publications section
- Add education resources (lecture PDFs, slide links)
- Add blog posts / YouTube embeds
- Multi-level nav dropdowns if needed

---

### Session 4 — 2026-07-07

**Goal**: Implement dark mode toggle across the entire site.

**Implemented**:
- Added `@custom-variant dark (&:where(.dark, .dark *));` to `global.css` — enables class-based dark mode in TailwindCSS v4
- Updated `BaseLayout.astro`:
  - **Flash prevention**: Inline `<script is:inline>` in `<head>` reads `localStorage.theme` (fallback to `prefers-color-scheme`) and adds `.dark` class to `<html>` before paint — zero flash
  - **Toggle button**: Moon/sun SVG icons in the header nav bar, uses `dark:hidden` / `hidden dark:inline` to swap icons via CSS (no JS-driven DOM changes)
  - **Toggle function**: Inline `<script is:inline>` at end of `<body>` with `toggleDarkMode()` — toggles `.dark` class and persists preference to localStorage
  - **Color transitions**: `transition-colors duration-200` on `<body>` for smooth dark/light switching
  - **Dark color scheme**:
    - bg: `white` → `neutral-900`
    - text: `neutral-900` → `neutral-100`
    - secondary text: `neutral-600/500` → `neutral-400`
    - body text: `neutral-700` → `neutral-300`
    - borders: `neutral-200` → `neutral-700`
    - accent: `blue-700` → `blue-400`
    - card hover: `blue-50/30` → `blue-950/30`, `blue-300` → `blue-600`
- Added `dark:` variants to all color/border classes across all 7 pages (index, about, research, team, publications, education, blog)

**JS footprint**: ~550 bytes total (two inline scripts, no external files, no framework)

**Verified**: `pnpm build` passes — 7 pages, 403ms. Both inline scripts correctly rendered in output (IIFE in head, toggle function in body).

**Outcome**: Dark mode toggle is fully functional. User preference persists across sessions. System preference respected as default. Zero flash on page load.

**Next**:
- Add real team member data (headshots, bios, links)
- Add real publications
- Add education resources (lecture PDFs, slide links)
- Add blog posts / YouTube embeds
- Consider multi-level nav dropdowns

---

### Session 3 — 2026-07-07

**Goal**: Populate all pages with content from `temp/*.md` drafts and refine styling.

**Implemented**:
- Updated `src/styles/global.css` with base-layer typography defaults (line-height 1.7, smooth scroll, selection color)
- Populated **Home** (`index.astro`): lab name, motto tagline, about paragraph, 4 section cards (Research, Team, Publications, Education) linking to their pages, "Latest Updates" placeholder
- Populated **About** (`about.astro`): full overview text, motivation list, location (Department of Physics, University of Chittagong), latest updates placeholder
- Populated **Research** (`research.astro`): all 4 domains with full descriptions — Nuclear Interactions, Radiation Shielding, Quantum Physics, Quantum Computing. Active Projects placeholder section
- Populated **Team** (`team.astro`): PI section (Dr. Quazi Muhammad Rashed Nizam), Current Members placeholder, Alumni placeholder
- Populated **Publications** (`publications.astro`): Journal Papers section, Conference Attendings section — both placeholders
- Populated **Education** (`education.astro`): Lecture Notes, Presentation Slides, Workshops sections — all placeholders
- Populated **Blog** (`blog.astro`): YouTube Videos, LinkedIn Posts, Articles sections — all placeholders
- Refined heading hierarchy: h1 (text-3xl/4xl), h2 (text-2xl with bottom border), consistent spacing (mt-8/12), border separation between sections
- Consistent `max-w-3xl` constraint on body text for readability
- Section cards on home page use subtle border + hover state (no glassmorphism, no gradients — avoids AI-generated look)

**Verified**: `pnpm build` passes — 7 pages in 408ms, zero JS in output

**Outcome**: All pages have real content structure matching the `temp/*.md` drafts. Placeholder text marks sections awaiting real data. The site is content-complete for the first pass.

**Next**:
- Add real team member data when available (headshots, bios, links)
- Add real publications when available
- Add education resources (lecture notes PDFs, slides)
- Add blog posts / YouTube embeds
- Consider multi-level nav dropdowns if page count grows
- Consider a dark mode toggle if desired

---

### Session 2 — 2026-07-07

**Goal**: Set up TailwindCSS v4, create base layout with navigation, and scaffold all pages.

**Implemented**:
- Installed `@tailwindcss/vite` and `tailwindcss` (v4.3.2) via pnpm
- Configured `astro.config.mjs` with the Tailwind Vite plugin
- Created `src/styles/global.css` with `@import "tailwindcss"` entry point
- Created `src/layouts/BaseLayout.astro`:
  - DOCTYPE with meta tags and responsive viewport
  - System sans-serif font stack via `font-sans`
  - White background, neutral text colors
  - Header with "QRNLab" site title and horizontal top navigation
  - All 7 nav items: Home, About, Research, Team, Publications, Education, Blog
  - Active page highlighting with blue accent color
  - Footer with copyright
  - Max-width 5xl container for readability
  - Blue-700 accent for active nav state
- Created 7 pages under `src/pages/`:
  - `index.astro` (Home)
  - `about.astro`
  - `research.astro`
  - `team.astro`
  - `publications.astro`
  - `education.astro`
  - `blog.astro`
- Verified: `pnpm build` succeeds — all 7 routes generated, no errors

**Outcome**: Site scaffold is complete. All pages render with consistent layout and navigation.

**Next**:
- Populate pages with actual content from `temp/*.md` drafts
- Add any missing pages (e.g., individual team member profiles, publication detail pages)
- Refine styling: consider line-height, heading hierarchy, spacing
- Consider nav hover-to-open multi-level support if needed

---

### Session 1 — 2026-07-07

**Goal**: Initialize project documentation and establish conventions for AI-assisted development.

**Implemented**:
- Created `PROJECT_SPECS.md` with full project description: tech stack, design principles, page structure, navigation plan, and development conventions.
- Created `DEVELOPMENT_LOG.md` with session log and decision log sections.

**Design decisions made this session** are recorded in the Decision Log below.

**Outcome**: Project foundation documentation is in place. Ready for the next session to begin actual implementation.

**Next**:
- Install TailwindCSS v4 (`pnpm add @tailwindcss/vite tailwindcss`)
- Configure `astro.config.mjs` with the Tailwind Vite plugin
- Create a base `Layout.astro` component with top navigation bar
- Create initial page scaffolding: Home, About, Research, Team, Publications, Education, Blog
- Apply Tailwind styling following the modern clean direction (sans-serif, good whitespace, clean typography)

---

## Decision Log

### 2026-07-07 — Session 5

| Decision | Rationale |
|----------|-----------|
| Single `team` collection with `category` discriminator | One config, one loader, one folder. Simpler than 3 separate collections with identical setups. Query by `category` filter in `getCollection()`. |
| `src/content.config.ts` (not `src/content/config.ts`) | Required by Astro 7's new content collections API. Uses `glob()` loader instead of legacy `type: 'content'`. |
| `entry.id` not `entry.slug` | New API uses `id` (filename without extension) for the entry identifier. `slug` no longer exists. |
| Avatar as inline SVG with hash-derived hue | Zero dependencies, zero network requests. Colors are deterministic per name. Meets "auto-generated colored initials" requirement. |
| Card links external when website/institutionPage exists | Follows user spec: if alumni have an external profile, link there instead of duplicating on our site. |
| First 8 visible, rest hidden (SHOW_INITIAL = 8) | Fits 4-col grid × 2 rows = 8 cards without scrolling. Show more reveals the rest. |
| `fadeInUp` with 80ms stagger | Subtle sequential entry animation. 80ms per card is fast enough to feel responsive, slow enough to create visible stagger. |
| PI publications wired to future collection | Uses try/catch around `getCollection('publications')`. When the collection is created later, PI's page auto-populates. No code changes needed. |

### 2026-07-07 — Session 4 (follow-up)

| Decision | Rationale |
|----------|-----------|
| `bg-[#353ba0]` for nav | Deep blue nav bg requested by user. Provides strong visual separation from page content. |
| Nav text: `white` / `white/80` | High contrast on dark blue. `white/80` for inactive items, solid white on hover — subtle hierarchy. |
| Active menu: `text-amber-400` | Warm gold on deep blue is a classic academic color combination. Highly visible, not trendy, not AI-looking. Stands out clearly without needing background shapes. |
| No dark variants on nav | Colored bg stays the same regardless of page theme. Consistent brand presence. |

### 2026-07-07 — Session 4

| Decision | Rationale |
|----------|-----------|
| `@custom-variant dark (&:where(.dark, .dark *))` | TailwindCSS v4 syntax for class-based dark mode. Using `:where()` has zero specificity, so `dark:` classes can be overridden normally. |
| Flash-prevention IIFE in `<head>` | Must block paint until preference is read — synchronous script before any CSS/body rendering. Prevents white flash on dark-mode users. |
| Two `<script is:inline>` blocks instead of one | Flash script must be in `<head>` and synchronous. Toggle function can be deferred to end of `<body>`. Astro `is:inline` prevents bundling/moving. |
| CSS icon swap (`dark:hidden` / `hidden dark:inline`) | No JS needed for icon toggling — pure CSS based on parent `.dark` class. Keeps toggle function minimal (just class + localStorage). |
| SVG icons (feather-style) | Small inline SVGs (~300 bytes each, gzipped less). No icon library dependency. Match the clean sans-serif design. |
| `neutral-900` dark background | Soft dark (not pure black `#000`). Reduces eye strain. Matches Tailwind's recommended dark palette. |
| `blue-400` as dark accent | AA-compliant contrast on `neutral-900`. Brighter than light-mode `blue-700` to compensate for darker background. |
| `transition-colors duration-200` | 200ms is fast enough to feel responsive, slow enough to prevent jarring instant switches. Only transitions color/border properties. |

### 2026-07-07 — Session 3

| Decision | Rationale |
|----------|-----------|
| h2 with bottom border (`border-b border-neutral-200`) | Creates clear visual section breaks without decorative flourishes. Academic-document feel, not blog-like. |
| Section cards on home as bordered `<a>` blocks | Clean, functional, no JS. Hover uses subtle blue border + background tint — minimal but responsive. |
| `line-height: 1.7` on body text | Research-article-level readability. Dense technical content needs generous leading. |
| Consistent `max-w-3xl` on prose content | Prevents overly wide text lines. Academic reading comfort. |
| Placeholder italic text ("No X listed yet") | Communicates that sections are intentional but not yet populated. Avoids empty-page confusion. |
| No `<section>` wrappers around nav items for multi-level yet | Kept flat intentionally. Multi-level dropdown code can be added later without touching page templates — only `BaseLayout.astro` needs updating. |

### 2026-07-07 — Session 2

| Decision | Rationale |
|----------|-----------|
| System font stack (`font-sans`) | Zero extra network requests. Clean sans-serif rendering across platforms. Meets "modern clean" without depending on a Google Font or custom typeface. |
| Blue-700 as accent color | Professional, academic but not sterile. High contrast for active nav states. Not trendy (no pink/purple/cyan gradients). |
| `max-w-5xl` container | Comfortable reading width (~64rem). Wide enough for content but not sprawling. |
| White bg + neutral-900 text | Maximum readability. No dark mode complexity for now. |
| Nav: simple `<ul>` with links | No JS needed. Singleton items for now. Structure can wrap items in `<li>` groups when multi-level support is added. |
| All pages use one shared layout, pages directory for routing | Follows Astro conventions. Clean, predictable URL structure (`/about`, `/research`, etc.). |

### 2026-07-07 — Session 1

| Decision | Rationale |
|----------|-----------|
| Use Astro 7 | Performance-first; minimal JS by default. Aligns with the priority of fast page loads. |
| Use TailwindCSS v4 | Utility-first CSS keeps styles consistent, reduces CSS bloat, and pairs well with Astro's zero-JS approach. |
| Zero JS preference | Research lab site content is mostly static. JS should only be added if interactivity is truly needed. |
| Sans-serif throughout | Modern clean look. Serif fonts can feel dated or academic-heavy. |
| Not ultramodern / not AI-looking | Avoid trendy design patterns (glassmorphism, heavy gradients, excessive animations). The site should feel hand-crafted and content-focused. |
| Page structure from `temp/*.md` | Existing content drafts (research_domains, about_history, blog, education_outreach, publications_conferences, team_members_alumni) define the natural information architecture. |
| Top nav, singleton → multi-level later | Start simple. Build the nav as a flat list. Structure the code so nested dropdowns can be added without refactoring the whole nav. |
| pnpm-only, no manual package.json | Ensures consistent dependency resolution. Avoids merge conflicts and stale lockfiles. |
| Document specs + decisions in separate files | `PROJECT_SPECS.md` is the source of truth for what we're building. `DEVELOPMENT_LOG.md` tracks what happened when and why. Both are essential for maintaining context across AI coding sessions. |
