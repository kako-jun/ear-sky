import { useState, useCallback } from "react";
import { Post } from "@/types";
import { useI18n, getLocale } from "@/i18n";
import VideoSegment from "./VideoSegment";
import Reactions from "./Reactions";
import { Eye, Copy, Check } from "lucide-react";

interface Props {
  post: Post;
  showPlayer?: boolean;
}

export default function PostCard({ post, showPlayer = false }: Props) {
  const t = useI18n();
  const [revealed, setRevealed] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(post.id).then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1500);
    }).catch(() => {});
  }, [post.id]);

  return (
    <article className="space-y-3">
      {/* Song title / Artist / Era */}
      <div>
        <p className="text-sm text-white/70 font-medium truncate">{post.songTitle}</p>
        <p className="text-xs text-white/40 truncate">
          {post.artistName}
          {post.era && (
            <span className="ml-1.5 text-white/25">({post.era})</span>
          )}
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

      {/* Reveal */}
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full py-3 rounded-lg border border-neon-blue/30 text-neon-blue text-sm font-bold
                     hover:bg-neon-blue/10 active:scale-[0.98] transition-all
                     flex items-center justify-center gap-2
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Eye size={16} />
          {t.postCard.reveal}
        </button>
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
        <button
          onClick={copyId}
          className="flex items-center gap-0.5 hover:text-white/40 transition-colors"
          title={post.id}
        >
          {idCopied ? <Check size={9} /> : <Copy size={9} />}
          {post.id.slice(0, 8)}
        </button>
        <span className="text-white/10">|</span>
        <span className="font-sans">{post.nickname || "Anonymous"}</span>
        <span className="text-white/10">|</span>
        <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString(getLocale())}</time>
        <span className="text-white/10">|</span>
        <span>{post.sourceLang}→{post.targetLang}</span>
      </div>

      <Reactions postId={post.id} initialReactions={post.reactions} />
    </article>
  );
}
