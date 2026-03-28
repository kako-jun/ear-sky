import { useState, useCallback, useEffect } from "react";
import { Post } from "@/types";
import { getAllPosts, getMonthlyRanking, getHallOfFame } from "@/lib/storage";
import PostEditor from "@/components/PostEditor";
import PostCard from "@/components/PostCard";
import Header from "@/components/Header";
import { Link as LinkIcon, Heart } from "lucide-react";
import CloudEarIcon from "@/components/CloudEarIcon";

type Tab = "feed" | "ranking" | "fame" | "post";

export default function App() {
  const [tab, setTab] = useState<Tab>("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const refreshPosts = useCallback(() => {
    setPosts(getAllPosts());
  }, []);

  useEffect(() => {
    refreshPosts();

    // Handle hash-based deep link (#post-xxxx)
    const hash = window.location.hash;
    if (hash.startsWith("#post-")) {
      const id = hash.slice(6);
      setHighlightId(id);
      setTimeout(() => {
        document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [refreshPosts]);

  const handlePublished = useCallback(
    (post: Post) => {
      setTab("feed");
      refreshPosts();
      setHighlightId(post.id);
      setTimeout(() => {
        document.getElementById(`post-${post.id}`)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    [refreshPosts]
  );

  const handleShare = useCallback((postId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    if (navigator.share) {
      navigator.share({ title: "イヤスカ — 空耳投稿", url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }, []);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <div className="bar-bg min-h-dvh">
      <Header />

      {/* Tab navigation */}
      <nav className="sticky top-0 z-30 bg-night-deep/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-lg mx-auto flex">
          {(
            [
              ["feed", "新着"],
              ["ranking", "ランキング"],
              ["fame", "殿堂"],
              ["post", "投稿する"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                tab === key
                  ? "text-neon-pink border-b-2 border-neon-pink"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {tab === "feed" && (
          <>
            {posts.length === 0 ? (
              <EmptyState onPost={() => setTab("post")} />
            ) : (
              posts.map((post) => (
                <div key={post.id} id={`post-${post.id}`}>
                  <PostCard
                    post={post}
                    showPlayer={highlightId === post.id}
                  />
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={() => handleShare(post.id)}
                      className="text-xs text-white/30 hover:text-white/50"
                    >
                      <LinkIcon size={12} className="inline mr-1" />シェア
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "ranking" && (
          <>
            <h2 className="text-lg font-bold neon-text-blue">
              {currentYear}年{currentMonth}月のランキング
            </h2>
            <RankingList
              posts={getMonthlyRanking(currentYear, currentMonth)}
              handleShare={handleShare}
              highlightId={highlightId}
            />
          </>
        )}

        {tab === "fame" && (
          <>
            <h2 className="text-lg font-bold neon-text">殿堂入り</h2>
            <RankingList
              posts={getHallOfFame()}
              handleShare={handleShare}
              highlightId={highlightId}
            />
          </>
        )}

        {tab === "post" && <PostEditor onPublished={handlePublished} />}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-white/20 py-8 px-4">
        <p>Ear in the Sky Diamond — イヤスカ</p>
        <p className="mt-1">
          動画・音声は各プラットフォームの埋め込みを利用しています。
          当サイトはコンテンツを一切ホスティングしていません。
        </p>
      </footer>
    </div>
  );
}

function EmptyState({ onPost }: { onPost: () => void }) {
  return (
    <div className="text-center py-16 space-y-4">
      <CloudEarIcon size={64} className="mx-auto" />
      <p className="text-white/50">まだ投稿がありません</p>
      <button
        onClick={onPost}
        className="px-6 py-2 rounded-lg bg-neon-pink text-white font-bold
                   hover:brightness-110 transition-all"
      >
        最初の空耳を投稿する
      </button>
    </div>
  );
}

function RankingList({
  posts,
  handleShare,
  highlightId,
}: {
  posts: Post[];
  handleShare: (id: string) => void;
  highlightId: string | null;
}) {
  if (posts.length === 0) {
    return <p className="text-center text-white/30 py-8">まだデータがありません</p>;
  }
  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <div key={post.id}>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-sm font-bold ${
                i < 3 ? "neon-text" : "text-white/40"
              }`}
            >
              #{i + 1}
            </span>
            <span className="text-xs text-white/30 flex items-center gap-0.5"><Heart size={10} /> {post.likes}</span>
          </div>
          <PostCard post={post} showPlayer={highlightId === post.id} />
          <div className="flex justify-end mt-1">
            <button
              onClick={() => handleShare(post.id)}
              className="text-xs text-white/30 hover:text-white/50"
            >
              🔗 シェア
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
