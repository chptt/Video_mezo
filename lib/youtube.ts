/**
 * lib/youtube.ts
 *
 * YouTube URL parsing and embed URL generation.
 *
 * Security note:
 *   Raw watch URLs are NEVER sent to the frontend.
 *   Only embed URLs are returned after server-side access verification.
 */

/**
 * Extracts the YouTube video ID from various URL formats:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://youtube.com/shorts/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // bare video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * Converts any YouTube URL to a safe embed URL.
 * Returns null if the URL is not a valid YouTube URL.
 *
 * @param url  Raw YouTube URL (watch, youtu.be, embed, shorts)
 * @returns    Embed URL or null
 */
export function toEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  // Privacy-enhanced mode + no related videos from other channels
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Validates that a URL is a supported YouTube URL.
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Returns a thumbnail URL for a YouTube video.
 * Uses maxresdefault, falls back to hqdefault.
 */
export function getThumbnailUrl(
  videoId: string,
  quality: "maxres" | "hq" | "mq" | "sd" = "hq"
): string {
  const qualityMap = {
    maxres: "maxresdefault",
    hq:     "hqdefault",
    mq:     "mqdefault",
    sd:     "sddefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
