export const NICO_EMBED_ORIGIN = "https://embed.nicovideo.jp";
export const NICO_WATCH_ORIGIN = "https://www.nicovideo.jp";

export function getNiconicoEmbedUrl(videoId: string, playerId: string, fromSec: number) {
  const params = new URLSearchParams({
    jsapi: "1",
    playerId,
    from: String(Math.max(0, Math.floor(fromSec))),
  });
  return `${NICO_EMBED_ORIGIN}/watch/${videoId}?${params.toString()}`;
}

export function getNiconicoWatchUrl(videoId: string, fromSec: number) {
  const params = new URLSearchParams({
    from: String(Math.max(0, Math.floor(fromSec))),
  });
  return `${NICO_WATCH_ORIGIN}/watch/${videoId}?${params.toString()}`;
}
