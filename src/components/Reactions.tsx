import { useState, useCallback } from "react";
import { REACTION_KEYS, ReactionKey } from "@/types";
import { hasReacted, markReacted } from "@/lib/storage";
import { likePost, reactToPost } from "@/lib/api";
import {
  Heart,
  Ear,
  Laugh,
  HandMetal,
  PartyPopper,
  Sparkles,
  Flame,
} from "lucide-react";

const REACTION_ICONS: Record<ReactionKey, { icon: typeof Heart; label: string }> = {
  ear: { icon: Ear, label: "聴こえた" },
  laugh: { icon: Laugh, label: "笑った" },
  clap: { icon: HandMetal, label: "すごい" },
  party: { icon: PartyPopper, label: "最高" },
  sparkle: { icon: Sparkles, label: "天才" },
  melt: { icon: Flame, label: "ヤバい" },
};

interface Props {
  postId: string;
  initialLikes: number;
  initialReactions: Record<string, number>;
}

export default function Reactions({
  postId,
  initialLikes,
  initialReactions,
}: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [reactions, setReactions] = useState<Record<string, number>>(
    initialReactions
  );
  const [liked, setLiked] = useState(() => hasReacted(postId, "like"));

  const handleLike = useCallback(async () => {
    if (liked) return;
    setLiked(true);
    markReacted(postId, "like");
    const newCount = await likePost(postId);
    setLikes(newCount);
  }, [postId, liked]);

  const handleReaction = useCallback(
    async (key: string) => {
      if (hasReacted(postId, key)) return;
      markReacted(postId, key);
      const newCount = await reactToPost(postId, key);
      setReactions((prev) => ({ ...prev, [key]: newCount }));
    },
    [postId]
  );

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      <button
        onClick={handleLike}
        disabled={liked}
        aria-label={`いいね ${likes}`}
        className={`
          flex items-center gap-1 px-3 py-1.5 rounded-full text-sm
          transition-all border
          ${
            liked
              ? "border-neon-pink/50 text-neon-pink bg-neon-pink/10"
              : "border-white/20 text-white/60 hover:border-neon-pink/50 hover:text-neon-pink"
          }
        `}
      >
        <Heart size={14} fill={liked ? "currentColor" : "none"} />
        <span>{likes}</span>
      </button>

      {REACTION_KEYS.map((key) => {
        const { icon: Icon, label } = REACTION_ICONS[key];
        const count = reactions[key] || 0;
        const reacted = hasReacted(postId, key);
        return (
          <button
            key={key}
            onClick={() => handleReaction(key)}
            disabled={reacted}
            aria-label={label}
            aria-pressed={reacted}
            title={label}
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm
              transition-all border
              ${
                reacted
                  ? "border-white/30 bg-white/10 text-white/70"
                  : "border-white/10 text-white/40 hover:border-white/30 hover:bg-white/5 hover:text-white/60"
              }
            `}
          >
            <Icon size={14} />
            {count > 0 && (
              <span className="text-white/50 text-xs">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
