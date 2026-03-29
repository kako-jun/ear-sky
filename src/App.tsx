import { useState, useCallback, useEffect, useRef } from "react";
import { Post, VALID_TAGS } from "@/types";
import { fetchPosts, fetchPost, createPost, ApiError } from "@/lib/api";
import { useI18n, useI18nState, I18nContext, useI18nProvider } from "@/i18n";
import PostEditor from "@/components/PostEditor";
import PostCard from "@/components/PostCard";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import PickupCorner from "@/components/PickupCorner";
import NightBackground from "@/components/NightBackground";
import { Share2, Sparkles, Award, PenLine, ChevronDown, Heart, ExternalLink, Search, X } from "lucide-react";

type Tab = "feed" | "fame" | "post";
type ToastState = { message: string; type: "success" | "error" } | null;
const PAGE_SIZE = 20;

export default function App() {
  const i18n = useI18nProvider();
  return (
    <I18nContext.Provider value={i18n}>
      <AppInner />
    </I18nContext.Provider>
  );
}

type LangFilter = "to" | "from" | "all";
const LANG_FILTER_KEY = "ear-sky-lang-filter";

function AppInner() {
  const t = useI18n();
  const { locale } = useI18nState();
  const [tab, setTab] = useState<Tab>("feed");
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [famePosts, setFamePosts] = useState<Post[]>([]);
  const [fameTotal, setFameTotal] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fameLoading, setFameLoading] = useState(false);
  const [fameLoadingMore, setFameLoadingMore] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [langFilter, setLangFilterState] = useState<LangFilter>(() => {
    const saved = localStorage.getItem(LANG_FILTER_KEY);
    return (saved === "to" || saved === "from" || saved === "all") ? saved : "to";
  });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const setLangFilter = useCallback((f: LangFilter) => {
    setLangFilterState(f);
    localStorage.setItem(LANG_FILTER_KEY, f);
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  const filterParams = useCallback((filter: LangFilter, tags: string[]) => {
    const params: { targetLang?: string; sourceLang?: string; tags?: string[] } = {};
    if (filter === "to") params.targetLang = locale;
    else if (filter === "from") params.sourceLang = locale;
    if (tags.length > 0) params.tags = tags;
    return params;
  }, [locale]);

  const loadFeed = useCallback(async (query = "", filter: LangFilter = "to", tags: string[] = [], append = false, offset = 0) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const { posts, total } = await fetchPosts({ sort: "new", q: query || undefined, ...filterParams(filter, tags), limit: PAGE_SIZE, offset });
      setFeedPosts((prev) => append ? [...prev, ...posts] : posts);
      setFeedTotal(total);
    } catch {
      if (!append) { setFeedPosts([]); setFeedTotal(0); }
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [filterParams]);

  const loadFame = useCallback(async (query = "", filter: LangFilter = "to", tags: string[] = [], append = false, offset = 0) => {
    if (append) setFameLoadingMore(true); else setFameLoading(true);
    try {
      const { posts, total } = await fetchPosts({ sort: "likes", q: query || undefined, ...filterParams(filter, tags), limit: PAGE_SIZE, offset });
      setFamePosts((prev) => append ? [...prev, ...posts] : posts);
      setFameTotal(total);
    } catch {
      if (!append) { setFamePosts([]); setFameTotal(0); }
    } finally {
      if (append) setFameLoadingMore(false); else setFameLoading(false);
    }
  }, [filterParams]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setActiveQuery(value.trim());
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setActiveQuery("");
    setFilterTags([]);
    setSearchOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
      return !prev;
    });
  }, []);

  // Reload when active query, lang filter, or tab changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (tab === "feed") loadFeed(activeQuery, langFilter, filterTags);
    if (tab === "fame") loadFame(activeQuery, langFilter, filterTags);
  }, [activeQuery, langFilter, filterTags, tab, loadFeed, loadFame]);

  useEffect(() => {
    const init = async () => {
      await loadFeed("", langFilter, filterTags);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublished = useCallback(
    async (data: Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions" | "playCount"> & { deleteKey?: string }) => {
      try {
        const id = await createPost(data);
        showToast(t.toast.posted);
        setTab("feed");
        clearSearch();
        await loadFeed("", langFilter, filterTags);
        setHighlightId(id);
        setTimeout(() => {
          document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth" });
        }, 200);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : t.toast.postFailed;
        showToast(msg, "error");
      }
    },
    [loadFeed, clearSearch, showToast, t, langFilter, filterTags]
  );

  const handleShare = useCallback((postId: string) => {
    const url = `${window.location.origin}/share/${postId}`;
    if (navigator.share) {
      navigator.share({ title: "Ear in the Sky Diamond", url }).catch(() => {});
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
          {/* Search toggle — hidden on post tab */}
          {tab !== "post" && (
            <button
              onClick={toggleSearch}
              className={`px-3 py-3 transition-colors
                focus-visible:outline-2 focus-visible:outline-neon-blue focus-visible:outline-offset-[-2px]
                ${searchOpen || activeQuery ? "text-neon-blue" : "text-white/40 hover:text-white/60"}`}
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          )}
        </div>

        {/* Search bar slide-in */}
        {searchOpen && tab !== "post" && (
          <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 py-2 border-t border-white/5 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t.search.placeholder}
                className="w-full pl-9 pr-9 py-2 rounded-lg bg-white/5 border border-white/10
                           text-sm text-white placeholder:text-white/25
                           focus:outline-none focus:border-neon-blue/50 focus:bg-white/8
                           transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={t.search.clear}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Language filter chips */}
            <div className="flex items-center gap-2">
              {(["to", "from", "all"] as const).map((f) => {
                const label = f === "to"
                  ? t.search.filterTo.replace("{lang}", locale.toUpperCase())
                  : f === "from"
                    ? t.search.filterFrom.replace("{lang}", locale.toUpperCase())
                    : t.search.filterAll;
                return (
                  <button
                    key={f}
                    onClick={() => setLangFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                      ${langFilter === f
                        ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                        : "text-white/35 border border-white/10 hover:text-white/55 hover:border-white/20"
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {/* Tag filter chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {VALID_TAGS.map((tag) => {
                const selected = filterTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => setFilterTags((prev) =>
                      selected ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                    )}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors
                      ${selected
                        ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/40"
                        : "text-white/30 border border-white/10 hover:text-white/50 hover:border-white/20"
                      }`}
                  >
                    {locale === "ja" ? tag.labelJa : tag.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 py-6 space-y-4" role="tabpanel">

        {tab === "feed" && (
          <>
            {/* Skip pickup — for returning users (hide when searching) */}
            {!activeQuery && (
              <>
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
              </>
            )}

            {/* New Posts section header */}
            <div id="new-posts" className="text-center space-y-1">
              <h2 className="text-lg font-bold neon-text-blue flex items-center justify-center gap-2">
                <Sparkles size={18} aria-hidden="true" />
                {t.feed.newPosts}
              </h2>
              {feedTotal > 0 && (
                <p className="text-xs text-white/25">
                  {t.feed.showingOf.replace("{count}", String(feedPosts.length)).replace("{total}", String(feedTotal))}
                </p>
              )}
            </div>

            {loading ? (
              <p className="text-center text-white/40 py-8">{t.feed.loading}</p>
            ) : feedPosts.length === 0 ? (
              activeQuery ? (
                <p className="text-center text-white/40 py-8">{t.feed.noResults}</p>
              ) : (
                <EmptyState onPost={() => setTab("post")} />
              )
            ) : (
              <>
                {feedPosts.map((post) => (
                  <div key={post.id} id={`post-${post.id}`}>
                    <PostCard
                      post={post}
                      showPlayer={highlightId === post.id}
                      onDeleted={(id) => {
                        setFeedPosts((prev) => prev.filter((p) => p.id !== id));
                        setFeedTotal((prev) => prev - 1);
                      }}
                    />
                    <ShareButton onShare={() => handleShare(post.id)} />
                  </div>
                ))}
                <LoadMoreButton
                  shown={feedPosts.length}
                  total={feedTotal}
                  loading={loadingMore}
                  onLoad={() => loadFeed(activeQuery, langFilter, filterTags, true, feedPosts.length)}
                />
              </>
            )}
          </>
        )}

        {tab === "fame" && (
          <>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold neon-text">{t.fame.title}</h2>
              {fameTotal > 0 && (
                <p className="text-xs text-white/25">
                  {t.feed.showingOf.replace("{count}", String(famePosts.length)).replace("{total}", String(fameTotal))}
                </p>
              )}
            </div>
            {fameLoading ? (
              <p className="text-center text-white/40 py-8">{t.feed.loading}</p>
            ) : famePosts.length === 0 ? (
              activeQuery ? (
                <p className="text-center text-white/40 py-8">{t.feed.noResults}</p>
              ) : (
                <p className="text-center text-white/40 py-8">{t.fame.empty}</p>
              )
            ) : (
              <>
                <RankingList posts={famePosts} handleShare={handleShare} highlightId={highlightId} startRank={0} onDeleted={(id) => {
                  setFamePosts((prev) => prev.filter((p) => p.id !== id));
                  setFameTotal((prev) => prev - 1);
                }} />
                <LoadMoreButton
                  shown={famePosts.length}
                  total={fameTotal}
                  loading={fameLoadingMore}
                  onLoad={() => loadFame(activeQuery, langFilter, filterTags, true, famePosts.length)}
                />
              </>
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

function LoadMoreButton({ shown, total, loading, onLoad }: {
  shown: number; total: number; loading: boolean; onLoad: () => void;
}) {
  const t = useI18n();
  if (shown >= total) return null;
  return (
    <div className="text-center py-4">
      <button
        onClick={onLoad}
        disabled={loading}
        className="px-6 py-2.5 rounded-lg border border-white/15 text-sm text-white/50
                   hover:text-white/70 hover:border-white/25 hover:bg-white/5
                   disabled:opacity-40 disabled:cursor-default
                   transition-all
                   focus-visible:outline-2 focus-visible:outline-neon-blue focus-visible:outline-offset-2"
      >
        {loading ? t.feed.loadingMore : t.feed.loadMore}
      </button>
    </div>
  );
}

function RankingList({
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
        // Top 3 emoji by count
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

function Footer() {
  const t = useI18n();

  return (
    <footer className="text-center text-xs text-white/20 py-12 px-4 space-y-4">
      {/* Neon pink divider */}
      <div className="mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent mb-6" aria-hidden="true" />

      <p className="text-white/25 font-bold tracking-wider">{t.footer.siteName}</p>
      {t.footer.siteAlias && (
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-px bg-gradient-to-l from-white/20 to-transparent" aria-hidden="true" />
          <p className="text-xs text-white/30 tracking-widest">{t.footer.siteAlias}</p>
          <div className="w-10 h-px bg-gradient-to-r from-white/20 to-transparent" aria-hidden="true" />
        </div>
      )}

      <p className="leading-relaxed text-white/20">
        {t.footer.disclaimer}<br />
        {t.footer.noHosting}
      </p>

      {/* QR code */}
      <div className="pt-2">
        <img
          src="/qr.webp"
          alt="QR code"
          width={96}
          height={96}
          className="mx-auto opacity-40 invert sepia saturate-[5] hue-rotate-[170deg]"
        />
      </div>

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
