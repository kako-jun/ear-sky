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
import { Share2, Sparkles, Award, PenLine, ChevronDown, ChevronLeft, ChevronRight, Heart, ExternalLink, Search, X } from "lucide-react";

type Tab = "feed" | "fame" | "search" | "post";
type ToastState = { message: string; type: "success" | "error" } | null;
const PAGE_SIZE = 10;

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
  const [feedPage, setFeedPage] = useState(0);
  const [famePosts, setFamePosts] = useState<Post[]>([]);
  const [fameTotal, setFameTotal] = useState(0);
  const [famePage, setFamePage] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fameLoading, setFameLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchPosts, setSearchPosts] = useState<Post[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [langFilter, setLangFilterState] = useState<LangFilter>(() => {
    const saved = localStorage.getItem(LANG_FILTER_KEY);
    return (saved === "to" || saved === "from" || saved === "all") ? saved : "all";
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

  const loadFeed = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const { posts, total } = await fetchPosts({ sort: "new", limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setFeedPosts(posts);
      setFeedTotal(total);
      setFeedPage(page);
    } catch {
      setFeedPosts([]); setFeedTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFame = useCallback(async (page = 0) => {
    setFameLoading(true);
    try {
      const { posts, total } = await fetchPosts({ sort: "likes", limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setFamePosts(posts);
      setFameTotal(total);
      setFamePage(page);
    } catch {
      setFamePosts([]); setFameTotal(0);
    } finally {
      setFameLoading(false);
    }
  }, []);

  const loadSearch = useCallback(async (query: string, filter: LangFilter, tags: string[], page = 0) => {
    setSearchLoading(true);
    try {
      const { posts, total } = await fetchPosts({ sort: "new", q: query || undefined, ...filterParams(filter, tags), limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setSearchPosts(posts);
      setSearchTotal(total);
      setSearchPage(page);
    } catch {
      setSearchPosts([]); setSearchTotal(0);
    } finally {
      setSearchLoading(false);
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
    setSearchPosts([]);
    setSearchTotal(0);
  }, []);

  // Reload search when query/filter changes (reset to page 0)
  useEffect(() => {
    if (tab === "search") { setSearchPage(0); loadSearch(activeQuery, langFilter, filterTags, 0); }
  }, [activeQuery, langFilter, filterTags, tab, loadSearch]);

  // Reload feed/fame when tab changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (tab === "feed") loadFeed();
    if (tab === "fame") loadFame();
  }, [tab, loadFeed, loadFame]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublished = useCallback(
    async (data: Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions" | "playCount"> & { deleteKey?: string }) => {
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
              ["search", t.tab.search, Search],
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

            <div className="py-6">
              <div className="mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </div>

            <div id="new-posts" className="text-center space-y-1">
              <h2 className="text-lg font-bold neon-text-blue flex items-center justify-center gap-2">
                <Sparkles size={18} aria-hidden="true" />
                {t.feed.newPosts}
              </h2>
              {feedTotal > 0 && (
                <p className="text-xs text-white/25">
                  {t.feed.showingOf.replace("{count}", String(feedPage * PAGE_SIZE + 1) + "-" + String(Math.min((feedPage + 1) * PAGE_SIZE, feedTotal))).replace("{total}", String(feedTotal))}
                </p>
              )}
            </div>

            {loading ? (
              <p className="text-center text-white/40 py-8">{t.feed.loading}</p>
            ) : feedPosts.length === 0 ? (
              <EmptyState onPost={() => setTab("post")} />
            ) : (
              <>
                <Paginator page={feedPage} total={feedTotal} onPage={(p) => { loadFeed(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
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
                <Paginator page={feedPage} total={feedTotal} onPage={(p) => { loadFeed(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
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
                  {t.feed.showingOf.replace("{count}", String(famePage * PAGE_SIZE + 1) + "-" + String(Math.min((famePage + 1) * PAGE_SIZE, fameTotal))).replace("{total}", String(fameTotal))}
                </p>
              )}
            </div>
            {fameLoading ? (
              <p className="text-center text-white/40 py-8">{t.feed.loading}</p>
            ) : famePosts.length === 0 ? (
              <p className="text-center text-white/40 py-8">{t.fame.empty}</p>
            ) : (
              <>
                <Paginator page={famePage} total={fameTotal} onPage={(p) => { loadFame(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                <RankingList posts={famePosts} handleShare={handleShare} highlightId={highlightId} startRank={famePage * PAGE_SIZE} onDeleted={(id) => {
                  setFamePosts((prev) => prev.filter((p) => p.id !== id));
                  setFameTotal((prev) => prev - 1);
                }} />
                <Paginator page={famePage} total={fameTotal} onPage={(p) => { loadFame(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </>
            )}
          </>
        )}

        {tab === "search" && (
          <>
            {/* Search bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t.search.placeholder}
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white/5 border border-white/10
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
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Language filter toggle */}
            <div className="inline-flex rounded-md border border-white/10 overflow-hidden">
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
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-white/10 last:border-r-0
                      ${langFilter === f
                        ? "bg-neon-blue/20 text-neon-blue"
                        : "text-white/35 hover:text-white/55 hover:bg-white/5"
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

            {/* Search results */}
            {searchTotal > 0 && (
              <p className="text-xs text-white/25 text-center">
                {t.feed.showingOf.replace("{count}", String(searchPage * PAGE_SIZE + 1) + "-" + String(Math.min((searchPage + 1) * PAGE_SIZE, searchTotal))).replace("{total}", String(searchTotal))}
              </p>
            )}

            {searchLoading ? (
              <p className="text-center text-white/40 py-8">{t.feed.loading}</p>
            ) : searchPosts.length === 0 ? (
              <p className="text-center text-white/40 py-8">
                {(activeQuery || filterTags.length > 0 || langFilter !== "all") ? t.feed.noResults : t.search.placeholder}
              </p>
            ) : (
              <>
                <Paginator page={searchPage} total={searchTotal} onPage={(p) => { loadSearch(activeQuery, langFilter, filterTags, p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                {searchPosts.map((post) => (
                  <div key={post.id}>
                    <PostCard post={post} onDeleted={(id) => {
                      setSearchPosts((prev) => prev.filter((p) => p.id !== id));
                      setSearchTotal((prev) => prev - 1);
                    }} />
                    <ShareButton onShare={() => handleShare(post.id)} />
                  </div>
                ))}
                <Paginator page={searchPage} total={searchTotal} onPage={(p) => { loadSearch(activeQuery, langFilter, filterTags, p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
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

function Paginator({ page, total, onPage }: {
  page: number; total: number; onPage: (page: number) => void;
}) {
  const t = useI18n();
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  // Show current page ± 2, plus first and last
  const pages: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 py-3 flex-wrap">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="p-1.5 rounded text-white/40 hover:text-white/70 disabled:opacity-20 disabled:cursor-default transition-colors"
        aria-label={t.feed.prevPage}
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) => {
        // Insert ellipsis if gap
        const prev = i > 0 ? pages[i - 1] : p;
        const rangeStart = p * PAGE_SIZE + 1;
        return (
          <span key={p} className="contents">
            {p - prev > 1 && <span className="text-white/20 text-xs px-1">…</span>}
            <button
              onClick={() => onPage(p)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors min-w-[36px]
                ${page === p
                  ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
                }`}
            >
              {rangeStart}-
            </button>
          </span>
        );
      })}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages - 1}
        className="p-1.5 rounded text-white/40 hover:text-white/70 disabled:opacity-20 disabled:cursor-default transition-colors"
        aria-label={t.feed.nextPage}
      >
        <ChevronRight size={16} />
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
