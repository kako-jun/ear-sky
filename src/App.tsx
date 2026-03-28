import { useState, useCallback, useEffect } from "react";
import { Post } from "@/types";
import { fetchPosts, fetchPost, createPost, ApiError } from "@/lib/api";
import PostEditor from "@/components/PostEditor";
import PostCard from "@/components/PostCard";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import PickupCorner from "@/components/PickupCorner";
import NightBackground from "@/components/NightBackground";
import { Share2, Heart, Sparkles, Award, PenLine } from "lucide-react";
import CloudEarIcon from "@/components/CloudEarIcon";

type Tab = "feed" | "fame" | "post";
type ToastState = { message: string; type: "success" | "error" } | null;

export default function App() {
  const [tab, setTab] = useState<Tab>("feed");
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [famePosts, setFamePosts] = useState<Post[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fameLoading, setFameLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const posts = await fetchPosts("new");
    setFeedPosts(posts);
    setLoading(false);
  }, []);

  const loadFame = useCallback(async () => {
    setFameLoading(true);
    const posts = await fetchPosts("likes");
    setFamePosts(posts);
    setFameLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadFeed();
      const hash = window.location.hash;
      if (hash.startsWith("#post-")) {
        const targetId = hash.slice(6);
        setHighlightId(targetId);
        // If post not in feed, fetch individually and prepend
        setTimeout(async () => {
          const el = document.getElementById(`post-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          } else {
            const post = await fetchPost(targetId);
            if (post) {
              setFeedPosts((prev) => [post, ...prev]);
              setTimeout(() => {
                document.getElementById(`post-${targetId}`)?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }
          }
        }, 300);
      }
    };
    init();
  }, [loadFeed]);

  useEffect(() => {
    if (tab === "fame") loadFame();
  }, [tab, loadFame]);

  const handlePublished = useCallback(
    async (data: Omit<Post, "id" | "likes" | "createdAt" | "reactions"> & { deleteKey?: string }) => {
      try {
        const id = await createPost(data);
        showToast("投稿しました");
        setTab("feed");
        await loadFeed();
        setHighlightId(id);
        setTimeout(() => {
          document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth" });
        }, 200);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "投稿に失敗しました";
        showToast(msg, "error");
      }
    },
    [loadFeed, showToast]
  );

  const handleShare = useCallback((postId: string) => {
    const url = `${window.location.origin}/share/${postId}`;
    if (navigator.share) {
      navigator.share({ title: "イヤスカ — 空耳投稿", url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        showToast("URLをコピーしました");
      });
    }
  }, [showToast]);

  return (
    <div className="bar-bg min-h-dvh">
      <NightBackground />
      <Header />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <nav className="sticky top-0 z-30 bg-night-deep/80 backdrop-blur-md border-b border-white/10" aria-label="メインナビゲーション">
        <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto flex" role="tablist">
          {(
            [
              ["feed", "新着", Sparkles],
              ["fame", "殿堂", Award],
              ["post", "投稿する", PenLine],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-1
                focus-visible:outline-2 focus-visible:outline-neon-blue focus-visible:outline-offset-[-2px]
                ${tab === key
                  ? "text-neon-pink border-b-2 border-neon-pink"
                  : "text-white/40 hover:text-white/60"
                }`}
            >
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 py-6 space-y-4" role="tabpanel">
        {tab === "feed" && (
          <>
            <PickupCorner />

            {loading ? (
              <p className="text-center text-white/40 py-8">読み込み中...</p>
            ) : feedPosts.length === 0 ? (
              <EmptyState onPost={() => setTab("post")} />
            ) : (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="text-xs text-white/25">新着投稿</span>
                  <div className="flex-1 border-t border-white/10" />
                </div>
                {feedPosts.map((post) => (
                  <div key={post.id} id={`post-${post.id}`}>
                    <PostCard post={post} showPlayer={highlightId === post.id} />
                    <ShareButton onShare={() => handleShare(post.id)} />
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === "fame" && (
          <>
            <h2 className="text-lg font-bold neon-text">殿堂入り</h2>
            {fameLoading ? (
              <p className="text-center text-white/40 py-8">読み込み中...</p>
            ) : (
              <RankingList posts={famePosts} handleShare={handleShare} highlightId={highlightId} />
            )}
          </>
        )}

        {tab === "post" && <PostEditor onPublished={handlePublished} />}
      </main>

      <footer className="text-center text-xs text-white/20 py-12 px-4 space-y-3">
        <div className="mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" aria-hidden="true" />
        <p className="text-white/25 font-bold tracking-wider">Ear in the Sky Diamond — イヤスカ</p>
        <p className="leading-relaxed">
          動画・音声は各プラットフォームの埋め込みを利用しています。<br />
          当サイトはコンテンツを一切ホスティングしていません。
        </p>
        <div className="flex items-center justify-center gap-4 text-white/10 pt-2">
          <span>
            {/* @ts-expect-error nostalgic-counter is a Web Component */}
            <nostalgic-counter id="ear-sky-eaae1797" type="total" format="text" />{" "}visits
          </span>
          <span>v{__BUILD_DATE__}</span>
        </div>
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
                   hover:brightness-110 transition-all
                   focus-visible:outline-2 focus-visible:outline-neon-blue focus-visible:outline-offset-2"
      >
        最初の空耳を投稿する
      </button>
    </div>
  );
}

function ShareButton({ onShare }: { onShare: () => void }) {
  return (
    <div className="flex justify-end mt-1">
      <button
        onClick={onShare}
        className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50
                   min-h-[44px] px-3
                   focus-visible:outline-2 focus-visible:outline-neon-blue"
      >
        <Share2 size={12} />シェア
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
    return <p className="text-center text-white/40 py-8">まだデータがありません</p>;
  }
  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <div key={post.id}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${i < 3 ? "neon-text" : "text-white/40"}`}>
              #{i + 1}
            </span>
            <span className="text-xs text-white/40 flex items-center gap-0.5">
              <Heart size={10} /> {post.likes}
            </span>
          </div>
          <PostCard post={post} showPlayer={highlightId === post.id} />
          <ShareButton onShare={() => handleShare(post.id)} />
        </div>
      ))}
    </div>
  );
}
