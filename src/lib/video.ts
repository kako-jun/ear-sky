/**
 * Parse video URL to extract platform and video ID.
 */
export type Platform = "youtube" | "niconico" | "other";

export function parseVideoUrl(url: string): {
  platform: Platform;
  videoId: string;
} | null {
  // YouTube: various URL formats
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const m = url.match(pattern);
    if (m) return { platform: "youtube", videoId: m[1] };
  }

  // Niconico
  const nicoPattern = /nicovideo\.jp\/watch\/(sm\d+|nm\d+|\d+)/;
  const nm = url.match(nicoPattern);
  if (nm) return { platform: "niconico", videoId: nm[1] };

  // Any other valid URL — store full URL as videoId
  try {
    new URL(url);
    return { platform: "other", videoId: url };
  } catch {
    return null;
  }
}

/**
 * Format seconds to MM:SS display
 */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Parse MM:SS or seconds string to number
 */
export function parseTime(input: string): number | null {
  const trimmed = input.trim();

  // MM:SS format
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  }

  // Seconds only
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num >= 0) return num;

  return null;
}
