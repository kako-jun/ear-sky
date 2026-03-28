import { useState, useCallback } from "react";
import { Post } from "@/types";
import { formatTime } from "@/lib/video";
import YouTubePlayer from "./YouTubePlayer";
import NiconicoPlayer from "./NiconicoPlayer";
import Subtitle from "./Subtitle";
import Reactions from "./Reactions";
import { Play } from "lucide-react";

interface Props {
  post: Post;
  showPlayer?: boolean;
}

export default function PostCard({ post, showPlayer = false }: Props) {
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [expanded, setExpanded] = useState(showPlayer);

  const handleYTStateChange = useCallback((state: number) => {
    // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
    if (state === 1) {
      setTimeout(() => setShowSubtitle(true), 500);
    } else if (state === 0 || state === 2) {
      setShowSubtitle(false);
    }
  }, []);

  const handleNicoStateChange = useCallback((state: "playing" | "paused" | "ended") => {
    if (state === "playing") {
      setTimeout(() => setShowSubtitle(true), 500);
    } else {
      setShowSubtitle(false);
    }
  }, []);

  const langLabel = `${post.sourceLang} → ${post.targetLang}`;

  return (
    <article className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white truncate">
            {post.misheardText}
          </h3>
          <p className="text-sm text-white/50 truncate">
            {post.artistName} — {post.songTitle}
          </p>
        </div>
        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-neon-blue/40 text-neon-blue">
          {langLabel}
        </span>
      </div>

      {/* Player area */}
      {expanded ? (
        <div className="mb-3">
          {post.platform === "youtube" && (
            <YouTubePlayer
              videoId={post.videoId}
              startSec={post.startSec}
              endSec={post.endSec}
              onStateChange={handleYTStateChange}
            />
          )}
          {post.platform === "niconico" && (
            <NiconicoPlayer
              videoId={post.videoId}
              startSec={post.startSec}
              endSec={post.endSec}
              onStateChange={handleNicoStateChange}
            />
          )}
          {post.platform === "other" && (() => {
            let safeHref: string | null = null;
            try {
              const u = new URL(post.videoId);
              if (u.protocol === "https:" || u.protocol === "http:") safeHref = u.href;
            } catch { /* invalid */ }
            return (
              <div className="py-6 bg-black/30 rounded-lg flex items-center justify-center text-white/40 text-sm">
                {safeHref ? (
                  <a href={safeHref} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                    {formatTime(post.startSec)}〜{formatTime(post.endSec)} を聴いてみて →
                  </a>
                ) : (
                  <span>{formatTime(post.startSec)}〜{formatTime(post.endSec)}</span>
                )}
              </div>
            );
          })()}
          <Subtitle text={post.misheardText} visible={showSubtitle} />
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          aria-label={`${post.misheardText} を再生`}
          className="w-full mb-3 py-8 rounded-lg bg-black/30 border border-white/10
                     text-white/40 hover:text-white/60 hover:border-white/20 transition-all
                     flex flex-col items-center gap-1
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Play size={28} />
          <span className="text-xs">
            {formatTime(post.startSec)} 〜 {formatTime(post.endSec)}
          </span>
        </button>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-white/30 mb-2">
        <span>{post.nickname || "名無し"}</span>
        <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString("ja-JP")}</time>
      </div>

      {/* Reactions */}
      <Reactions
        postId={post.id}
        initialLikes={post.likes}
        initialReactions={post.reactions}
      />
    </article>
  );
}
