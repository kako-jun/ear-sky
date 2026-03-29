/**
 * Fetch video title via oEmbed (no API key required).
 * Returns the title string, or null on failure.
 */
export async function fetchVideoTitle(
  platform: "youtube" | "niconico" | "soundcloud" | "other",
  videoId: string
): Promise<string | null> {
  try {
    if (platform === "youtube") {
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.title || null;
    }

    if (platform === "niconico") {
      const res = await fetch(
        `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`
      );
      if (!res.ok) return null;
      const text = await res.text();
      const match = text.match(/<title>(.*?)<\/title>/);
      return match?.[1] || null;
    }

    if (platform === "soundcloud") {
      const res = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(videoId)}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.title || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Try to split "Artist - Song Title" format.
 * Falls back to full string as song title if no separator found.
 */
export function splitArtistTitle(title: string): {
  artist: string;
  song: string;
} {
  // Common separators: " - ", " – ", " — ", " | "
  const separators = [" - ", " – ", " — ", " | "];
  for (const sep of separators) {
    const idx = title.indexOf(sep);
    if (idx > 0) {
      return {
        artist: title.slice(0, idx).trim(),
        song: title.slice(idx + sep.length).trim(),
      };
    }
  }
  return { artist: "", song: title.trim() };
}
