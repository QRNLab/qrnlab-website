import { cf } from './cf-env';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export function extForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'bin';
}

export function mediaUrl(key: string): string {
  return `/media/${key}`;
}

/**
 * Upload an image to R2 under a purpose-scoped, timestamped key. Returns the
 * R2 object key (immutable, so safe for long-lived CDN caching).
 */
export async function uploadImage(opts: {
  purpose: 'avatar' | 'blog' | 'page';
  filename: string;
  mime: string;
  bytes: ArrayBuffer;
}): Promise<string> {
  const ext = extForMime(opts.mime);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const baseName = opts.filename.replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]/gi, '-').slice(0, 40) || 'image';
  const key = `uploads/${opts.purpose}/${ts}-${rand}-${baseName}.${ext}`;
  await cf.MEDIA_BUCKET.put(key, opts.bytes, {
    httpMetadata: {
      contentType: opts.mime,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  return key;
}

export async function deleteImage(key: string): Promise<void> {
  await cf.MEDIA_BUCKET.delete(key);
}
