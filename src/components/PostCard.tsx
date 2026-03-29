import { useState, useCallback } from "react";
import { Post } from "@/types";
import { parseVideoUrl } from "@/lib/video";
import { useI18n } from "@/i18n";
import VideoSegment from "./VideoSegment";
import Reactions from "./Reactions";
import PlatformIcon from "./PlatformIcon";
import { Eye, Copy, Check, ExternalLink } from "lucide-react";

interface Props {
  post: Post;
  showPlayer?: boolean;
  /** Preview mode: show skeleton for ID/date, hide reactions */
  preview?: boolean;
}

export default function PostCard({ post, showPlayer = false, preview = false }: Props) {
  const t = useI18n();
  const [revealed, setRevealed] = useState(preview);
  const [idCopied, setIdCopied] = useState(false);

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(post.id).then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1500);
    }).catch(() => {});
  }, [post.id]);

  return (
    <article className="space-y-3">
      {/* Song title / Artist / Era / Lang */}
      <div>
        {(() => {
          const parsed = parseVideoUrl(post.videoUrl);
          const href = parsed?.platform === "youtube"
            ? `https://www.youtube.com/watch?v=${parsed.videoId}`
            : parsed?.platform === "niconico"
            ? `https://www.nicovideo.jp/watch/${parsed.videoId}`
            : parsed?.platform === "soundcloud"
            ? parsed.videoId
            : null;
          return href ? (
            <a href={href} target="_blank" rel="noopener noreferrer"
               className="text-sm text-white/70 font-medium truncate hover:text-white/90 transition-colors flex items-center gap-1.5">
              <PlatformIcon platform={parsed!.platform} size={14} className="shrink-0 text-white/40" />
              {post.songTitle}
              <ExternalLink size={11} className="shrink-0 text-white/25" />
            </a>
          ) : (
            <p className="text-sm text-white/70 font-medium truncate">{post.songTitle}</p>
          );
        })()}
        <p className="text-xs text-white/40 truncate">
          {post.artistName}
          {post.era && (
            <span className="ml-1.5 text-white/25">({post.era})</span>
          )}
          <span className="ml-1.5 text-white/20">{post.sourceLang}→{post.targetLang}</span>
        </p>
      </div>

      {/* Video player */}
      <VideoSegment
        videoUrl={post.videoUrl}
        startSec={post.startSec}
        endSec={post.endSec}
        cues={post.cues}
        autoExpand={showPlayer}
        onCueReached={() => setRevealed(true)}
      />

      {/* Reveal — only after playback reaches cue region */}
      {!revealed ? (
        <div className="w-full py-3 rounded-lg border border-white/10 text-white/25 text-sm
                        flex items-center justify-center gap-2">
          <Eye size={16} />
          {t.postCard.revealHint}
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <div className="neon-border rounded-lg p-3 space-y-1 text-center">
            <p className="text-lg font-bold text-white/90">
              &ldquo;{post.misheardText}&rdquo;
            </p>
            {post.originalText && (
              <p className="text-xs text-white/40">{post.originalText}</p>
            )}
          </div>

          {post.comment && (
            <p className="text-sm text-white/35 italic text-center">
              &ldquo;{post.comment}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Meta line — all secondary info in one row */}
      <div className="flex items-center gap-2 text-[10px] text-white/20 font-mono">
        {preview ? (
          <span className="inline-block w-16 h-3 bg-white/10 rounded animate-pulse" />
        ) : (
          <button
            onClick={copyId}
            className="flex items-center gap-0.5 hover:text-white/40 transition-colors"
            title={post.id}
          >
            {idCopied ? <Check size={9} /> : <Copy size={9} />}
            {post.id.slice(0, 8)}
          </button>
        )}
        <span className="text-white/10">|</span>
        {preview ? (
          <span className="inline-block w-20 h-3 bg-white/10 rounded animate-pulse" />
        ) : (
          <time dateTime={post.createdAt}>{post.createdAt.slice(0, 10)}</time>
        )}
        <span className="text-white/10">|</span>
        <span className="font-sans">{post.nickname || "Anonymous"}</span>
      </div>

      {!preview && <Reactions postId={post.id} initialReactions={post.reactions} />}
    </article>
  );
}
