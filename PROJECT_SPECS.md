# Project Specs

## Overview

Website for **QRNLab**, a research laboratory. The name "QRNLab" derives from the professor's initials (QRN) who leads the lab.

The site serves as an informational hub covering research domains, team members, publications, education/outreach, and lab news.

## Tech Stack

| Layer       | Choice                          |
|-------------|---------------------------------|
| Framework   | Astro 7                         |
| Styling     | TailwindCSS v4                  |
| Language    | TypeScript (strict)             |
| Package Mgr | pnpm                            |
| Content     | Astro Content Collections (TBD) |
| JS          | Minimal; zero JS preferred      |

## Design Principles

- **Fast loading first** — Astro's island architecture with minimal JS. Pages should ship near-zero client JS.
- **Modern clean** — Sans-serif throughout. Generous whitespace. Clean lines. Not ultramodern.
- **Informative & readable** — Content-first layout. Good typography hierarchy. Not flashy.
- **Simplistic but not plain** — Purposeful restraint. Every element has a reason.
- **Not AI-generated-looking** — Avoid generic templates, superfluous icons, stock gradients. Feels hand-crafted.
- **Accessible** — Semantic HTML, adequate contrast, keyboard navigable.

## Page Structure (Planned)

1. **Home** — Lab branding, tagline, highlight areas
2. **About / History** — Lab story, mission
3. **Research Domains** — Areas of research with descriptions
4. **Team Members & Alumni** — Profiles of current members and alumni
5. **Publications & Conferences** — Papers, talks, proceedings
6. **Education & Outreach** — Teaching, mentoring, public engagement
7. **Blog** — Lab news, updates, thoughts

## Navigation

- Top horizontal navigation bar
- Visible on all pages
- Menus start as singleton (single-level) items
- Architecture must allow future multi-level dropdown menus (hover-to-open)
- Active page highlighting

## Development Conventions

- **Package management**: Use `pnpm add` / `pnpm remove` exclusively. Never edit `package.json` manually.
- **Scripts**: Run via `pnpm <script>`, e.g. `pnpm dev`, `pnpm build`.
- **Linting / typechecking**: Use Astro's built-in checks. Follow the strict tsconfig.
- **Content**: Prefer Astro Content Collections for structured content (team, publications, blog posts).
- **Components**: Astro `.astro` components for UI. Use framework components (React, etc.) only if unavoidable.
- **Styling**: Tailwind utility classes everywhere. No separate CSS files unless absolutely necessary.
- **Commits**: Only when explicitly instructed by the human.
- **Session workflow**: Each session logs what was done and next steps in `DEVELOPMENT_LOG.md`. Decisions are recorded in the decision log section.

## Priorities

1. **Performance** — Lighthouse scores, bundle size, JS payload
2. **Content clarity** — Easy to scan, well-structured information
3. **Maintainability** — Clean code, consistent patterns, documented decisions
4. **Visual polish** — Refined but not over-designed
