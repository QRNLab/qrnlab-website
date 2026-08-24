/**
 * Contract between the app worker (source of truth) and the static site build.
 *
 * The app's `POST /api/__build` returns this payload; the site's content
 * loader (`apps/site/src/loaders/d1.ts`) consumes it. Both sides compile
 * against these types so the contract cannot drift.
 */

export interface BuildEntry {
  id: string;
  data: Record<string, unknown>;
  body?: string;
}

export interface BuildPayload {
  team: BuildEntry[];
  blog: BuildEntry[];
  publications: BuildEntry[];
  updates: BuildEntry[];
  education: BuildEntry[];
}
