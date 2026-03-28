import { useState, useCallback, useEffect, useMemo } from "react";
import { LANGUAGES, Post } from "@/types";
import { parseVideoUrl, formatTime, parseTime } from "@/lib/video";
import { saveDraft, getAllDrafts, deleteDraft } from "@/lib/storage";
import YouTubePlayer from "./YouTubePlayer";
import Subtitle from "./Subtitle";

type PostData = Omit<Post, "id" | "likes" | "createdAt" | "reactions">;

interface Props {
  onPublished: (data: PostData) => void;
  initialDraftId?: string;
}

export default function PostEditor({ onPublished, initialDraftId }: Props) {
  const [url, setUrl] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [misheardText, setMisheardText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ja");
  const [nickname, setNickname] = useState("");
  const [deleteKey, setDeleteKey] = useState("");
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [showPreview, setShowPreview] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const parsed = useMemo(() => parseVideoUrl(url), [url]);
  const startSec = useMemo(() => parseTime(startTime), [startTime]);
  const endSec = useMemo(() => parseTime(endTime), [endTime]);

  const canPreview =
    parsed !== null && startSec !== null && endSec !== null && endSec > startSec;
  const canSubmit = canPreview && misheardText.trim().length > 0;

  // Load draft on mount
  useEffect(() => {
    if (!initialDraftId) return;
    const drafts = getAllDrafts();
    const draft = drafts.find((d) => d.id === initialDraftId);
    if (!draft) return;
    const d = draft.data;
    setUrl(d.videoUrl);
    setStartTime(formatTime(d.startSec));
    setEndTime(formatTime(d.endSec));
    setMisheardText(d.misheardText);
    setOriginalText(d.originalText || "");
    setArtistName(d.artistName);
    setSongTitle(d.songTitle);
    setSourceLang(d.sourceLang);
    setTargetLang(d.targetLang);
    setNickname(d.nickname);
  }, [initialDraftId]);

  const buildData = useCallback(() => {
    if (!parsed || startSec === null || endSec === null) return null;
    return {
      videoUrl: url,
      platform: parsed.platform,
      videoId: parsed.videoId,
      startSec,
      endSec,
      misheardText: misheardText.trim(),
      originalText: originalText.trim() || undefined,
      artistName: artistName.trim(),
      songTitle: songTitle.trim(),
      sourceLang,
      targetLang,
      nickname: nickname.trim() || "名無し",
      deleteKey: deleteKey.trim() || undefined,
    };
  }, [
    url, parsed, startSec, endSec, misheardText, originalText,
    artistName, songTitle, sourceLang, targetLang, nickname,
  ]);

  const handleSaveDraft = useCallback(() => {
    const data = buildData();
    if (!data) return;
    const draft = saveDraft(data, draftId);
    setDraftId(draft.id);
    setSavedMsg("下書き保存しました");
    setTimeout(() => setSavedMsg(""), 2000);
  }, [buildData, draftId]);

  const handleSubmit = useCallback(() => {
    const data = buildData();
    if (!data) return;
    if (draftId) deleteDraft(draftId);
    onPublished(data);
  }, [buildData, draftId, onPublished]);

  const handleStateChange = useCallback((state: number) => {
    if (state === 1) {
      setTimeout(() => setShowSubtitle(true), 500);
    } else {
      setShowSubtitle(false);
    }
  }, []);

  const handleLoadDraft = useCallback((draft: ReturnType<typeof getAllDrafts>[number]) => {
    const d = draft.data;
    setUrl(d.videoUrl);
    setStartTime(formatTime(d.startSec));
    setEndTime(formatTime(d.endSec));
    setMisheardText(d.misheardText);
    setOriginalText(d.originalText || "");
    setArtistName(d.artistName);
    setSongTitle(d.songTitle);
    setSourceLang(d.sourceLang);
    setTargetLang(d.targetLang);
    setNickname(d.nickname);
    setDraftId(draft.id);
    setShowDrafts(false);
  }, []);

  return (
    <div className="space-y-5">
      {/* Drafts button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowDrafts(!showDrafts)}
          className="text-xs text-white/40 hover:text-white/60 underline"
        >
          下書き一覧
        </button>
      </div>

      {showDrafts && (
        <DraftsList
          onLoad={handleLoadDraft}
          onDelete={(id) => {
            deleteDraft(id);
            if (draftId === id) setDraftId(undefined);
          }}
        />
      )}

      {/* URL input */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">動画URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or nicovideo.jp/watch/sm..."
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
        {url && !parsed && (
          <p className="text-xs text-red-400">有効なURLを入力してください</p>
        )}
        {parsed && (
          <p className="text-xs text-neon-blue/60">
            {parsed.platform === "youtube"
              ? "YouTube"
              : parsed.platform === "niconico"
                ? "ニコニコ動画"
                : "外部サイト"}{" "}
            — {parsed.platform === "other" ? new URL(parsed.videoId).hostname : parsed.videoId}
          </p>
        )}
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm text-white/60">開始</label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="1:23 or 83"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm text-white/60">終了</label>
          <input
            type="text"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            placeholder="1:30 or 90"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          />
        </div>
      </div>

      {/* Language pair */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm text-white/60">オリジナル言語</label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm text-white/60">こう聴こえる</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Misheard text */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">こう聴こえる！（空耳テキスト）</label>
        <input
          type="text"
          value={misheardText}
          onChange={(e) => setMisheardText(e.target.value)}
          placeholder="コンドルが関取に見えたので"
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-lg
                     placeholder:text-white/20 focus:border-neon-pink/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Song info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm text-white/60">アーティスト</label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Queen"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm text-white/60">曲名</label>
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="Bohemian Rhapsody"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          />
        </div>
      </div>

      {/* Original text (optional) */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">
          元の歌詞（わかれば）
        </label>
        <input
          type="text"
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          placeholder=""
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Nickname */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">ニックネーム（任意）</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="名無し"
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Delete key */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">削除キー（任意・投稿を消したいとき用）</label>
        <input
          type="text"
          value={deleteKey}
          onChange={(e) => setDeleteKey(e.target.value)}
          placeholder=""
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Preview */}
      {canPreview && (
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-neon-blue hover:underline"
          >
            {showPreview ? "▼ プレビューを閉じる" : "▶ プレビューで確認"}
          </button>

          {showPreview && parsed?.platform === "youtube" && (
            <div className="mt-3 p-4 bg-black/30 rounded-xl border border-white/10">
              <YouTubePlayer
                videoId={parsed.videoId}
                startSec={startSec!}
                endSec={endSec!}
                onStateChange={handleStateChange}
              />
              <Subtitle text={misheardText} visible={showSubtitle} />
            </div>
          )}
          {showPreview && parsed?.platform !== "youtube" && (
            <p className="mt-3 text-sm text-white/40 text-center">
              プレビューはYouTube動画のみ対応しています
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSaveDraft}
          disabled={!parsed}
          className="flex-1 py-3 rounded-lg border border-white/20 text-white/60
                     hover:border-white/40 hover:text-white/80 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          下書き保存
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 py-3 rounded-lg bg-neon-pink text-white font-bold
                     hover:brightness-110 active:scale-[0.98] transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          投稿する
        </button>
      </div>

      {savedMsg && (
        <p className="text-center text-sm text-neon-blue animate-pulse">
          {savedMsg}
        </p>
      )}
    </div>
  );
}

// --- Drafts list sub-component ---

function DraftsList({
  onLoad,
  onDelete,
}: {
  onLoad: (draft: ReturnType<typeof getAllDrafts>[number]) => void;
  onDelete: (id: string) => void;
}) {
  const [drafts, setDrafts] = useState<ReturnType<typeof getAllDrafts>>([]);

  useEffect(() => {
    setDrafts(getAllDrafts());
  }, []);

  if (drafts.length === 0) {
    return (
      <p className="text-xs text-white/30 text-center py-3">
        下書きはありません
      </p>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-black/20 rounded-lg border border-white/10">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <button
            onClick={() => onLoad(draft)}
            className="text-white/60 hover:text-white truncate text-left flex-1"
          >
            {draft.data.misheardText || draft.data.videoUrl || "（無題）"}
            <span className="text-white/30 text-xs ml-2">
              {new Date(draft.updatedAt).toLocaleDateString("ja-JP")}
            </span>
          </button>
          <button
            onClick={() => {
              onDelete(draft.id);
              setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
            }}
            className="text-white/30 hover:text-red-400 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center
                       focus-visible:outline-2 focus-visible:outline-neon-blue"
            aria-label="削除"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
