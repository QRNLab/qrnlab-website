/**
 * Extract the YouTube video ID from common URL shapes:
 *   https://www.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 * Returns null when the URL isn't a valid YouTube link.
 */
export function extractYoutubeId(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host !== 'youtube.com' && host !== 'youtu.be') return null;
    if (host === 'youtu.be') {
      return parsed.pathname.split('/')[1] || null;
    }
    if (parsed.pathname === '/watch') {
      return parsed.searchParams.get('v');
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments[0] === 'embed' || segments[0] === 'shorts') {
      return segments[1] || null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Privacy-enhanced embed URL for a video ID. */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}
