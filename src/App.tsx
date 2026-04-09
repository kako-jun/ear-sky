import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Post, VALID_TAGS, PAGE_SIZE } from "@/types";
import { fetchPosts, fetchPost, createPost, ApiError } from "@/lib/api";
import { getStorageValue, setStorageValue } from "@/lib/storage";
import { useI18n, useI18nState, I18nContext, useI18nProvider } from "@/i18n";
import PostEditor from "@/components/PostEditor";
import PostCard from "@/components/PostCard";
import EmptyState from "@/components/EmptyState";
import ShareButton from "@/components/ShareButton";
import Paginator from "@/components/Paginator";
import Footer from "@/components/Footer";
import RankingList from "@/components/RankingList";
import Header, { useShrunk } from "@/components/Header";
import Toast from "@/components/Toast";
import PickupCorner from "@/components/PickupCorner";
import NightBackground from "@/components/NightBackground";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { Sparkles, Award, PenLine, ChevronDown, Search, X } from "lucide-react";

type Tab = "feed" | "fame" | "search" | "post";
type ToastState = { message: string; type: "success" | "error" } | null;

export default function App() {
  const i18n = useI18nProvider();

  // Sync <html lang> with locale changes
  useEffect(() => {
    document.documentElement.lang = i18n.locale;
  }, [i18n.locale]);

  return (
    <I18nContext.Provider value={i18n}>
      <AppInner />
    </I18nContext.Provider>
  );
}

type LangFilter = "to" | "from" | "all";

function AppInner() {
  const t = useI18n();
  const { locale } = useI18nState();
  const shrunk = useShrunk();
  const headerRef = useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = useState(0);

  // Measure expanded header height once on mount for the spacer
  useLayoutEffect(() => {
    if (headerRef.current && spacerHeight === 0) {
      setSpacerHeight(headerRef.current.offsetHeight);
    }
  }, [spacerHeight]);
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
    const saved = getStorageValue("langFilter");
    return (saved === "to" || saved === "from" || saved === "all") ? saved : "all";
  });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const setLangFilter = useCallback((f: LangFilter) => {
    setLangFilterState(f);
    setStorageValue("langFilter", f);
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

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
      showToast(t.toast.loadFailed, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  const loadFame = useCallback(async (page = 0) => {
    setFameLoading(true);
    try {
      const { posts, total } = await fetchPosts({ sort: "likes", limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setFamePosts(posts);
      setFameTotal(total);
      setFamePage(page);
    } catch {
      setFamePosts([]); setFameTotal(0);
      showToast(t.toast.loadFailed, "error");
    } finally {
      setFameLoading(false);
    }
  }, [showToast, t]);

  const loadSearch = useCallback(async (query: string, filter: LangFilter, tags: string[], page = 0) => {
    setSearchLoading(true);
    try {
      const { posts, total } = await fetchPosts({ sort: "new", q: query || undefined, ...filterParams(filter, tags), limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setSearchPosts(posts);
      setSearchTotal(total);
      setSearchPage(page);
    } catch {
      setSearchPosts([]); setSearchTotal(0);
      showToast(t.toast.loadFailed, "error");
    } finally {
      setSearchLoading(false);
    }
  }, [filterParams, showToast, t]);

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
      <div ref={headerRef} className={`fixed-header top-0 left-0 right-0 z-40 transition-colors duration-300
        ${shrunk ? "bg-night-deep/90 backdrop-blur-md shadow-lg shadow-black/30" : ""}`}
      >
        <Header shrunk={shrunk} />

        <nav className="border-b border-white/10" aria-label="Main navigation">
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
                  : "text-white/50 hover:text-white/70"
                }`}
            >
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </nav>
      </div>

      {/* Spacer: reserves space for the fixed header (measured once at expanded height) */}
      {spacerHeight > 0 && <div style={{ height: spacerHeight }} />}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismissToast} />
      )}

      <main className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 py-6 space-y-4" role="tabpanel">

        {tab === "feed" && (
          <>
            <div className="flex justify-end">
              <button
                onClick={scrollToNewPosts}
                className="flex items-center gap-1 text-[11px] text-white/40
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

            <div id="new-posts" className="text-center space-y-1 scroll-mt-24">
              <h2 className="text-lg font-bold neon-text-blue flex items-center justify-center gap-2">
                <Sparkles size={18} aria-hidden="true" />
                {t.feed.newPosts}
              </h2>
              {feedTotal > 0 && (
                <p className="text-xs text-white/40">
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
                <Paginator page={feedPage} total={feedTotal} onPage={(p) => { loadFeed(p); document.getElementById("new-posts")?.scrollIntoView({ behavior: "smooth" }); }} />
                {feedPosts.map((post) => (
                  <div key={post.id} id={`post-${post.id}`}>
                    <PostCard
                      post={post}
                      showPlayer={highlightId === post.id}
                      onDeleted={() => loadFeed(feedPage)}
                    />
                    <ShareButton onShare={() => handleShare(post.id)} />
                  </div>
                ))}
                <Paginator page={feedPage} total={feedTotal} onPage={(p) => { loadFeed(p); document.getElementById("new-posts")?.scrollIntoView({ behavior: "smooth" }); }} />
              </>
            )}
          </>
        )}

        {tab === "fame" && (
          <>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold neon-text">{t.fame.title}</h2>
              {fameTotal > 0 && (
                <p className="text-xs text-white/40">
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
                <RankingList posts={famePosts} handleShare={handleShare} highlightId={highlightId} startRank={famePage * PAGE_SIZE} onDeleted={() => loadFame(famePage)} />
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
                           text-sm text-white placeholder:text-white/40
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
                        : "text-white/45 hover:text-white/65 hover:bg-white/5"
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
                        : "text-white/40 border border-white/15 hover:text-white/60 hover:border-white/25"
                      }`}
                  >
                    {locale === "ja" ? tag.labelJa : tag.labelEn}
                  </button>
                );
              })}
            </div>

            {/* Search results */}
            {searchTotal > 0 && (
              <p className="text-xs text-white/40 text-center">
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
                    <PostCard post={post} onDeleted={() => loadSearch(activeQuery, langFilter, filterTags, searchPage)} />
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
      <PwaInstallPrompt />
    </div>
  );
}
