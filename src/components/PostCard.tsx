import { useState, useCallback } from "react";
import { Post, VALID_TAGS } from "@/types";
import { parseVideoUrl } from "@/lib/video";
import { recordPlay, deletePost } from "@/lib/api";
import { useI18n, useI18nState } from "@/i18n";
import VideoSegment from "./VideoSegment";
import Reactions from "./Reactions";
import PlatformIcon from "./PlatformIcon";
import { Eye, Copy, Check, ExternalLink, Headphones, Trash2 } from "lucide-react";

interface Props {
  post: Post;
  showPlayer?: boolean;
  /** Preview mode: show skeleton for ID/date, hide reactions */
  preview?: boolean;
  onDeleted?: (id: string) => void;
}

export default function PostCard({ post, showPlayer = false, preview = false, onDeleted }: Props) {
  const t = useI18n();
  const { locale } = useI18nState();
  const [revealed, setRevealed] = useState(preview);
  const [idCopied, setIdCopied] = useState(false);
  const [showDeleteInput, setShowDeleteInput] = useState(false);
  const [deleteKeyInput, setDeleteKeyInput] = useState(() => {
    try { return localStorage.getItem("ear-sky-delete-key") || ""; } catch { return ""; }
  });
  const [deleteError, setDeleteError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

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
        onPlay={() => { if (!preview) recordPlay(post.id); }}
      />

      {/* Reveal — only after playback reaches cue region */}
      {!revealed ? (
        <div className="w-full py-3 rounded-lg border border-white/10 text-white/25 text-sm
                        flex items-center justify-center gap-2">
          <Eye size={16} />
          {t.postCard.revealHint}
        </div>
      ) : (
        <div className={`space-y-3${preview ? "" : " animate-fade-in"}`}>
          <div className="neon-border rounded-lg p-3 space-y-2 text-center">
            {post.cues.length > 1 ? (
              post.cues.map((cue, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-lg font-bold text-white/90">
                    &ldquo;{cue.text}&rdquo;
                  </p>
                  {cue.originalText && (
                    <p className="text-xs text-white/40">{cue.originalText}</p>
                  )}
                </div>
              ))
            ) : (
              <>
                <p className="text-lg font-bold text-white/90">
                  &ldquo;{post.misheardText}&rdquo;
                </p>
                {post.originalText && (
                  <p className="text-xs text-white/40">{post.originalText}</p>
                )}
              </>
            )}
          </div>

          {post.comment && (
            <p className="text-sm text-white/35 italic text-center">
              &ldquo;{post.comment}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {post.tags.map((tagId) => {
            const tag = VALID_TAGS.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span key={tagId} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/35 border border-white/10">
                {locale === "ja" ? tag.labelJa : tag.labelEn}
              </span>
            );
          })}
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
        {!preview && post.playCount > 0 && (
          <span className="ml-auto flex items-center gap-0.5">
            <Headphones size={10} />
            {post.playCount}
          </span>
        )}
      </div>

      {/* Delete */}
      {!preview && deleted && (
        <p className="text-xs text-white/30 text-center py-2">{t.postCard.deleted}</p>
      )}
      {!preview && !deleted && (
        showDeleteInput ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!deleteKeyInput.trim() || deleting) return;
              setDeleting(true);
              setDeleteError(false);
              try {
                await deletePost(post.id, deleteKeyInput.trim());
                if (onDeleted) {
                  onDeleted(post.id);
                } else {
                  setDeleted(true);
                }
              } catch {
                setDeleteError(true);
                setDeleting(false);
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="password"
              value={deleteKeyInput}
              onChange={(e) => { setDeleteKeyInput(e.target.value); setDeleteError(false); }}
              placeholder={t.postCard.deleteKeyPlaceholder}
              autoComplete="off"
              className={`flex-1 bg-black/30 border rounded px-2 py-1 text-xs text-white
                placeholder:text-white/20 focus:outline-none focus:border-neon-blue/50
                ${deleteError ? "border-red-400" : "border-white/20"}`}
              autoFocus
            />
            {deleteError && (
              <span className="text-[10px] text-red-400">{t.postCard.deleteKeyWrong}</span>
            )}
            <button
              type="submit"
              disabled={!deleteKeyInput.trim() || deleting}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-30
                         min-h-[32px] px-2 focus-visible:outline-2 focus-visible:outline-neon-blue"
            >
              {deleting ? "..." : t.postCard.deleteConfirm}
            </button>
            <button
              type="button"
              onClick={() => { setShowDeleteInput(false); setDeleteError(false); }}
              className="text-xs text-white/30 hover:text-white/50 min-h-[32px] px-1"
            >
              ✕
            </button>
          </form>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setShowDeleteInput(true)}
              className="text-white/15 hover:text-red-400/60 transition-colors p-1"
              title={t.postCard.deleteTitle}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )
      )}

      {!preview && <Reactions postId={post.id} initialReactions={post.reactions} />}
    </article>
  );
}
