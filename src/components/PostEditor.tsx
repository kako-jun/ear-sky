import { useState, useCallback, useEffect, useMemo } from "react";
import { LANGUAGES, Post } from "@/types";
import { parseVideoUrl, formatTime, parseTime } from "@/lib/video";
import { saveDraft, getAllDrafts, deleteDraft } from "@/lib/storage";
import { fetchVideoTitle, splitArtistTitle } from "@/lib/oembed";
import { useI18n } from "@/i18n";
import YouTubePlayer from "./YouTubePlayer";
import Subtitle from "./Subtitle";
import { Save, Send, Eye, EyeOff } from "lucide-react";

type PostData = Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions">;

interface Props {
  onPublished: (data: PostData) => void;
  initialDraftId?: string;
}

export default function PostEditor({ onPublished, initialDraftId }: Props) {
  const t = useI18n();
  const [url, setUrl] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [misheardText, setMisheardText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ja");
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem("ear-sky-nickname") || ""; } catch { return ""; }
  });
  const [deleteKey, setDeleteKey] = useState("");
  const [era, setEra] = useState("");
  const [comment, setComment] = useState("");
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

  // Auto-fetch video title when URL changes
  useEffect(() => {
    if (!parsed || parsed.platform === "other") return;
    if (artistName || songTitle) return;
    let cancelled = false;
    fetchVideoTitle(parsed.platform, parsed.videoId).then((title) => {
      if (cancelled || !title) return;
      const { artist, song } = splitArtistTitle(title);
      if (!artistName) setArtistName(artist);
      if (!songTitle) setSongTitle(song);
    });
    return () => { cancelled = true; };
  }, [parsed]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setEra(d.era || "");
    setComment(d.comment || "");
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
      nickname: nickname.trim() || "Anonymous",
      deleteKey: deleteKey.trim() || undefined,
      era: era.trim() || undefined,
      comment: comment.trim() || undefined,
    };
  }, [
    url, parsed, startSec, endSec, misheardText, originalText,
    artistName, songTitle, sourceLang, targetLang, nickname, deleteKey,
    era, comment,
  ]);

  const handleSaveDraft = useCallback(() => {
    const data = buildData();
    if (!data) return;
    const draft = saveDraft(data, draftId);
    setDraftId(draft.id);
    setSavedMsg(t.editor.draftSaved);
    setTimeout(() => setSavedMsg(""), 2000);
  }, [buildData, draftId, t]);

  const handleSubmit = useCallback(() => {
    const data = buildData();
    if (!data) return;
    if (draftId) deleteDraft(draftId);
    try { localStorage.setItem("ear-sky-nickname", nickname.trim()); } catch { /* ignore */ }
    onPublished(data);
  }, [buildData, draftId, onPublished, nickname]);

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
    setEra(d.era || "");
    setComment(d.comment || "");
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
          {t.editor.drafts}
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
        <label className="block text-sm text-white/60">{t.editor.urlLabel}</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.editor.urlPlaceholder}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
        {url && !parsed && (
          <p className="text-xs text-red-400">{t.editor.urlInvalid}</p>
        )}
        {parsed && (
          <p className="text-xs text-neon-blue/60">
            {parsed.platform === "youtube"
              ? t.platform.youtube
              : parsed.platform === "niconico"
                ? t.platform.niconico
                : t.platform.other}{" "}
            — {parsed.platform === "other" ? new URL(parsed.videoId).hostname : parsed.videoId}
          </p>
        )}
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm text-white/60">{t.editor.startLabel}</label>
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
          <label className="block text-sm text-white/60">{t.editor.endLabel}</label>
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
          <label className="block text-sm text-white/60">{t.editor.sourceLangLabel}</label>
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
          <label className="block text-sm text-white/60">{t.editor.targetLangLabel}</label>
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
        <label className="block text-sm text-white/60">{t.editor.misheardLabel}</label>
        <input
          type="text"
          value={misheardText}
          onChange={(e) => setMisheardText(e.target.value)}
          placeholder={t.editor.misheardPlaceholder}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-lg
                     placeholder:text-white/20 focus:border-neon-pink/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Song info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm text-white/60">{t.editor.artistLabel}</label>
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
          <label className="block text-sm text-white/60">{t.editor.songLabel}</label>
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
        <label className="block text-sm text-white/60">{t.editor.originalLabel}</label>
        <input
          type="text"
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          placeholder=""
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Era (optional) */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">{t.editor.eraLabel}</label>
        <input
          type="text"
          value={era}
          onChange={(e) => setEra(e.target.value)}
          placeholder={t.editor.eraPlaceholder}
          maxLength={20}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Comment (optional) */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">{t.editor.commentLabel}</label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.editor.commentPlaceholder}
          maxLength={200}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Nickname */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">{t.editor.nicknameLabel}</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t.editor.nicknamePlaceholder}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      {/* Delete key */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">{t.editor.deleteKeyLabel}</label>
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
            {showPreview ? <><EyeOff size={14} className="inline mr-1" />{t.editor.previewClose}</> : <><Eye size={14} className="inline mr-1" />{t.editor.previewOpen}</>}
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
              {t.editor.previewUnsupported}
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
          <Save size={14} className="inline mr-1" />{t.editor.saveDraft}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 py-3 rounded-lg bg-neon-pink text-white font-bold
                     hover:brightness-110 active:scale-[0.98] transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Send size={14} className="inline mr-1" />{t.editor.submit}
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
  const t = useI18n();
  const [drafts, setDrafts] = useState<ReturnType<typeof getAllDrafts>>([]);

  useEffect(() => {
    setDrafts(getAllDrafts());
  }, []);

  if (drafts.length === 0) {
    return (
      <p className="text-xs text-white/30 text-center py-3">
        {t.editor.noDrafts}
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
            {draft.data.misheardText || draft.data.videoUrl || "(untitled)"}
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
            aria-label={t.editor.delete}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
