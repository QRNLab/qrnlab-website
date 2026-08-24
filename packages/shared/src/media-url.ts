/**
 * Base URL for R2 media. Uploads are served from a custom domain attached to
 * the `qrnlab-media` bucket; content historically stored relative `/media/...`
 * URLs, so rendering must rewrite them to absolute.
 */
export const MEDIA_BASE_URL = 'https://media.qrnlab.org';

/**
 * Rewrite legacy relative media URLs (`/media/uploads/...`) to the absolute
 * custom-domain URL. Already-absolute URLs and non-media paths pass through
 * unchanged. Safe to apply repeatedly.
 */
export function rewriteMediaUrls(text: string): string {
  if (!text) return text;
  return text.replace(/\/media\/uploads\//g, `${MEDIA_BASE_URL}/uploads/`);
}
