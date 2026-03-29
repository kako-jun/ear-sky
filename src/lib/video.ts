/**
 * Parse video URL to extract platform and video ID.
 */
export type Platform = "youtube" | "niconico" | "soundcloud" | "other";

export function parseVideoUrl(url: string): {
  platform: Platform;
  videoId: string;
  startSec?: number;
} | null {
  // YouTube: various URL formats
  const ytPatterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const m = url.match(pattern);
    if (m) {
      // Extract start time from ?t=, &t=, or ?start= parameters
      // Supports: ?t=90, ?t=1m30s, ?t=1h2m3s
      const tMatch = url.match(/[?&](?:t|start)=([0-9hms]+)/);
      let startSec: number | undefined;
      if (tMatch) {
        const raw = tMatch[1];
        const hms = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
        if (hms) {
          startSec = (parseInt(hms[1] || "0") * 3600) + (parseInt(hms[2] || "0") * 60) + parseInt(hms[3] || "0");
          if (startSec === 0) startSec = undefined;
        }
      }
      return { platform: "youtube", videoId: m[1], startSec };
    }
  }

  // Niconico — nicovideo.jp/watch/ and nico.ms/ short URLs, ?from= parameter
  const nicoPatterns = [
    /nicovideo\.jp\/watch\/(sm\d+|nm\d+|\d+)/,
    /nico\.ms\/(sm\d+|nm\d+|\d+)/,
  ];
  for (const nicoPattern of nicoPatterns) {
    const nm = url.match(nicoPattern);
    if (nm) {
      const fromMatch = url.match(/[?&]from=(\d+)/);
      const startSec = fromMatch ? parseInt(fromMatch[1]) : undefined;
      return { platform: "niconico", videoId: nm[1], startSec };
    }
  }

  // SoundCloud — soundcloud.com/artist/track
  // Strip query/hash before matching to avoid ?si= etc. leaking into the path
  const scClean = url.split(/[?#]/)[0];
  const scPattern = /soundcloud\.com\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/;
  const scExclude = /soundcloud\.com\/(discover|you|stream|search|upload|pages|settings|charts)\//;
  const scm = scClean.match(scPattern);
  if (scm && !scExclude.test(url)) {
    // Extract start time from #t=1:30 or #t=90
    let startSec: number | undefined;
    const hashT = url.match(/#t=(\d+):(\d+)/);
    if (hashT) {
      startSec = parseInt(hashT[1]) * 60 + parseInt(hashT[2]);
    } else {
      const hashSec = url.match(/#t=(\d+)/);
      if (hashSec) startSec = parseInt(hashSec[1]);
    }
    if (startSec === 0) startSec = undefined;
    return { platform: "soundcloud", videoId: `https://soundcloud.com/${scm[1]}`, startSec };
  }

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
