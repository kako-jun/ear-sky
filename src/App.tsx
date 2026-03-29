import { useState, useCallback, useEffect } from "react";
import { Post } from "@/types";
import { fetchPosts, fetchPost, createPost, ApiError } from "@/lib/api";
import { useI18n, I18nContext, getMessages } from "@/i18n";
import PostEditor from "@/components/PostEditor";
import PostCard from "@/components/PostCard";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import PickupCorner from "@/components/PickupCorner";
import NightBackground from "@/components/NightBackground";
import { Share2, Sparkles, Award, PenLine, ChevronDown, Heart, ExternalLink } from "lucide-react";

type Tab = "feed" | "fame" | "post";
type ToastState = { message: string; type: "success" | "error" } | null;

export default function App() {
  return (
    <I18nContext.Provider value={getMessages()}>
      <AppInner />
    </I18nContext.Provider>
  );
}

function AppInner() {
  const t = useI18n();
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
    try {
      const posts = await fetchPosts("new");
      setFeedPosts(posts);
    } catch {
      setFeedPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFame = useCallback(async () => {
    setFameLoading(true);
    try {
      const posts = await fetchPosts("likes");
      setFamePosts(posts);
    } catch {
      setFamePosts([]);
    } finally {
      setFameLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadFeed();
      const hash = window.location.hash;
      if (hash.startsWith("#post-")) {
        const targetId = hash.slice(6);
        setHighlightId(targetId);
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
    async (data: Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions"> & { deleteKey?: string }) => {
      try {
        const id = await createPost(data);
        showToast(t.toast.posted);
        setTab("feed");
        await loadFeed();
        setHighlightId(id);
        setTimeout(() => {
          document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth" });
        }, 200);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : t.toast.postFailed;
        showToast(msg, "error");
      }
    },
    [loadFeed, showToast, t]
  );

  const handleShare = useCallback((postId: string) => {
    const url = `${window.location.origin}/share/${postId}`;
    if (navigator.share) {
      navigator.share({ title: "Ear in the Sky Diamond", url });
    } else {
      navigator.clipboard.writeText(url).then(
        () => showToast(t.toast.urlCopied),
        () => showToast(t.toast.urlCopied),
      );
    }
  }, [showToast, t]);

  const scrollToNewPosts = useCallback(() => {
    document.getElementById("new-posts")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="bar-bg min-h-dvh">
      <NightBackground />
      <Header />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <nav className="sticky top-0 z-30 bg-night-deep/80 backdrop-blur-md border-b border-white/10" aria-label="Main navigation">
        <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto flex" role="tablist">
          {(
            [
              ["feed", t.tab.feed, Sparkles],
              ["fame", t.tab.fame, Award],
              ["post", t.tab.post, PenLine],
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
            {/* Skip pickup — for returning users */}
            <div className="flex justify-end">
              <button
                onClick={scrollToNewPosts}
                className="flex items-center gap-1 text-[11px] text-white/25
                           hover:text-white/45 transition-colors
                           focus-visible:outline-2 focus-visible:outline-neon-blue"
              >
                {t.feed.jumpToNew}
                <ChevronDown size={11} />
              </button>
            </div>

            <PickupCorner />

            {/* Divider between pickup and new posts */}
            <div className="py-6">
              <div className="mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </div>

            {/* New Posts section header */}
            <div id="new-posts" className="text-center space-y-1">
              <h2 className="text-lg font-bold neon-text-blue flex items-center justify-center gap-2">
                <Sparkles size={18} aria-hidden="true" />
                {t.feed.newPosts}
              </h2>
            </div>

            {loading ? (
              <p className="text-center text-white/40 py-8">{t.feed.loading}</p>
            ) : feedPosts.length === 0 ? (
              <EmptyState onPost={() => setTab("post")} />
            ) : (
              <>
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
            <h2 className="text-lg font-bold neon-text">{t.fame.title}</h2>
            {fameLoading ? (
              <p className="text-center text-white/40 py-8">{t.feed.loading}</p>
            ) : (
              <RankingList posts={famePosts} handleShare={handleShare} highlightId={highlightId} />
            )}
          </>
        )}

        {tab === "post" && <PostEditor onPublished={handlePublished} />}
      </main>

      <Footer />
    </div>
  );
}

function EmptyState({ onPost }: { onPost: () => void }) {
  const t = useI18n();
  return (
    <div className="text-center py-16 space-y-4">
      <img src="/icon-192.png" alt="" width={64} height={64} className="mx-auto rounded-xl opacity-80" aria-hidden="true" />
      <p className="text-white/50">{t.feed.empty}</p>
      <button
        onClick={onPost}
        className="px-6 py-2 rounded-lg bg-neon-pink text-white font-bold
                   hover:brightness-110 transition-all
                   focus-visible:outline-2 focus-visible:outline-neon-blue focus-visible:outline-offset-2"
      >
        {t.feed.emptyAction}
      </button>
    </div>
  );
}

function ShareButton({ onShare }: { onShare: () => void }) {
  const t = useI18n();
  return (
    <div className="flex justify-end mt-1">
      <button
        onClick={onShare}
        className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50
                   min-h-[44px] px-3
                   focus-visible:outline-2 focus-visible:outline-neon-blue"
      >
        <Share2 size={12} />{t.share}
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
  const t = useI18n();

  if (posts.length === 0) {
    return <p className="text-center text-white/40 py-8">{t.fame.empty}</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => {
        // Top 3 emoji by count
        const topEmoji = Object.entries(post.reactions)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        return (
          <div key={post.id}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-black ${i < 3 ? "neon-text" : "text-white/30"}`}>
                #{i + 1}
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
            <PostCard post={post} showPlayer={highlightId === post.id} />
            <ShareButton onShare={() => handleShare(post.id)} />
          </div>
        );
      })}
    </div>
  );
}

function Footer() {
  const t = useI18n();

  return (
    <footer className="text-center text-xs text-white/20 py-12 px-4 space-y-4">
      {/* Neon pink divider */}
      <div className="mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent mb-6" aria-hidden="true" />

      <p className="text-white/25 font-bold tracking-wider">{t.footer.siteName}</p>

      <p className="leading-relaxed text-white/20">
        {t.footer.disclaimer}<br />
        {t.footer.noHosting}
      </p>

      {/* Author & links */}
      <div className="flex items-center justify-center gap-4 text-white/30 pt-2">
        <span>
          {t.footer.madeBy}{" "}
          <a
            href="https://llll-ll.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon-blue/60 hover:text-neon-blue transition-colors"
          >
            kako-jun
          </a>
        </span>
        <a
          href="https://github.com/kako-jun/ear-sky"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/50 transition-colors flex items-center gap-0.5"
        >
          GitHub <ExternalLink size={10} />
        </a>
      </div>

      {/* Sponsor */}
      <a
        href="https://github.com/sponsors/kako-jun"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                   border border-neon-pink/30 text-neon-pink/60
                   hover:border-neon-pink/50 hover:text-neon-pink hover:bg-neon-pink/5
                   transition-all text-xs"
      >
        <Heart size={12} />
        Sponsor
      </a>

      <div className="flex items-center justify-center gap-4 text-white/15 pt-2">
        <span>
          {/* @ts-expect-error nostalgic-counter is a Web Component */}
          <nostalgic-counter id="ear-sky-eaae1797" type="total" format="text" />{" "}{t.footer.visits}
        </span>
        <span>v{__BUILD_DATE__}</span>
      </div>
    </footer>
  );
}
