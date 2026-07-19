import { describe, expect, it } from "vitest";
import { getNiconicoEmbedUrl, getNiconicoWatchUrl } from "../src/lib/niconico";

describe("Niconico URL helpers", () => {
  it("builds jsapi embed URLs with a stable player id and pre-roll timestamp", () => {
    expect(getNiconicoEmbedUrl("sm9", "nico-test", 37.9)).toBe(
      "https://embed.nicovideo.jp/watch/sm9?jsapi=1&playerId=nico-test&from=37",
    );
  });

  it("builds fallback watch URLs with the same timestamp", () => {
    expect(getNiconicoWatchUrl("sm9", 37.9)).toBe(
      "https://www.nicovideo.jp/watch/sm9?from=37",
    );
  });

  it("never emits negative timestamps", () => {
    expect(getNiconicoWatchUrl("sm9", -10)).toBe(
      "https://www.nicovideo.jp/watch/sm9?from=0",
    );
  });
});
