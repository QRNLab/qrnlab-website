/**
 * Typed fetch wrapper for the Hono worker API (same origin, base path `/api`).
 *
 * `api<T>(path)` resolves `/api` + `path`, sends JSON by default, and throws
 * `ApiError` (carrying the server's `{ message, error }` payload) on any
 * non-2xx response. FormData bodies are sent without a `Content-Type` header
 * so the browser sets the multipart boundary automatically.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type ErrorPayload = {
  message?: unknown;
  error?: unknown;
};

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: isForm
      ? { ...(options.headers ?? {}) }
      : { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  const data = (await res.json().catch(() => null)) as (T & ErrorPayload) | null;

  if (!res.ok) {
    const payload = data as ErrorPayload | null;
    const message =
      (typeof payload?.message === 'string' && payload.message) ||
      (typeof payload?.error === 'string' && payload.error) ||
      `Request failed (${res.status})`;
    const code = typeof payload?.error === 'string' ? payload.error : null;
    throw new ApiError(message, res.status, code);
  }

  return data as T;
}

/** Base URL for R2 media (custom domain attached to the `qrnlab-media` bucket). */
export const MEDIA_BASE = 'https://media.qrnlab.org';

/**
 * Normalize a stored media key to an absolute URL. Keys may be relative
 * (`uploads/...`), legacy (`/media/uploads/...`), or already absolute —
 * all resolve to `https://media.qrnlab.org/<key>`.
 */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  const path = key.replace(/^\/+/, '').replace(/^media\//, '');
  return `${MEDIA_BASE}/${path}`;
}
