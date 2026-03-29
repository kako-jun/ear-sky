import { Post } from "@/types";
import { useI18n } from "@/i18n";
import PostCard from "./PostCard";
import ShareButton from "./ShareButton";

export default function RankingList({
  posts,
  handleShare,
  highlightId,
  startRank,
  onDeleted,
}: {
  posts: Post[];
  handleShare: (id: string) => void;
  highlightId: string | null;
  startRank: number;
  onDeleted?: (id: string) => void;
}) {
  const t = useI18n();

  if (posts.length === 0) {
    return <p className="text-center text-white/40 py-8">{t.fame.empty}</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => {
        const rank = startRank + i;
        const topEmoji = Object.entries(post.reactions)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        return (
          <div key={post.id}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-black ${rank < 3 ? "neon-text" : "text-white/30"}`}>
                #{rank + 1}
              </span>
              {topEmoji.length > 0 ? (
                <span className="text-xs text-white/50 flex items-center gap-1.5">
                  {topEmoji.map(([emoji, count]) => (
                    <span key={emoji} className="flex items-center gap-0.5">
                      <span>{emoji}</span>
                      <span className="text-white/35">{count}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-xs text-white/30">0 {t.fame.reactions}</span>
              )}
            </div>
            <PostCard post={post} showPlayer={highlightId === post.id} onDeleted={onDeleted} />
            <ShareButton onShare={() => handleShare(post.id)} />
          </div>
        );
      })}
    </div>
  );
}
