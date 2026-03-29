import { useState, useCallback, useEffect, useMemo } from "react";
import { LANGUAGES, Post, SubtitleCue } from "@/types";
import { parseVideoUrl, formatTime } from "@/lib/video";
import { saveDraft, getAllDrafts, deleteDraft } from "@/lib/storage";
import { fetchVideoTitle, splitArtistTitle } from "@/lib/oembed";
import { useI18n } from "@/i18n";
import DualRangeSlider from "./DualRangeSlider";
import PostCard from "./PostCard";
import { Save, Send, X, Plus, ExternalLink } from "lucide-react";

// Preview uses PostCard directly — all player/subtitle rendering is delegated.

type PostData = Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions" | "playCount"> & { deleteKey?: string };

interface CueInput {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  originalText: string;
}

interface Props {
  onPublished: (data: PostData) => void;
  initialDraftId?: string;
}

function OptionalLabel({ text }: { text: string }) {
  return <span className="text-neon-blue/40 text-xs ml-1.5">{text}</span>;
}

function ClearableInput({ value, onChange, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="relative">
      <input
        {...props}
        value={value}
        onChange={onChange}
        className={`${className} pr-10`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
          tabIndex={-1}
          aria-label="Clear"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function SectionHeader({ text }: { text: string }) {
  return (
    <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest border-b border-white/10 pb-1 mb-3">
      {text}
    </h3>
  );
}

export default function PostEditor({ onPublished, initialDraftId }: Props) {
  const t = useI18n();

  // Song info
  const [url, setUrl] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ja");
  const [era, setEra] = useState("");

  // Cues
  const [cues, setCues] = useState<CueInput[]>([
    { id: crypto.randomUUID(), startSec: 0, endSec: 10, text: "", originalText: "" },
  ]);

  // About you
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem("ear-sky-nickname") || ""; } catch { return ""; }
  });
  const [deleteKey, setDeleteKey] = useState(() => {
    try { return localStorage.getItem("ear-sky-delete-key") || ""; } catch { return ""; }
  });
  const [comment, setComment] = useState("");

  // UI state
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [showDrafts, setShowDrafts] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const videoDuration = 300; // Default max for slider; actual duration isn't available until playback

  const parsed = useMemo(() => parseVideoUrl(url), [url]);

  // Auto-fetch video title + apply URL start time
  useEffect(() => {
    if (!parsed || parsed.platform === "other") return;
    let cancelled = false;
    fetchVideoTitle(parsed.platform, parsed.videoId).then((title) => {
      if (cancelled || !title) return;
      const { artist, song } = splitArtistTitle(title);
      setArtistName((prev) => prev || artist);
      setSongTitle((prev) => prev || song);
    });
    // Apply start time from URL (e.g. ?t=30)
    if (parsed.startSec != null && parsed.startSec > 0) {
      setCues((prev) => {
        const first = prev[0];
        if (first.startSec === 0 && first.endSec === 10) {
          // Only apply if cue is still at default values
          return [{ ...first, startSec: parsed.startSec!, endSec: parsed.startSec! + 5 }, ...prev.slice(1)];
        }
        return prev;
      });
    }
    return () => { cancelled = true; };
  }, [parsed]);

  // Load draft
  useEffect(() => {
    if (!initialDraftId) return;
    const drafts = getAllDrafts();
    const draft = drafts.find((d) => d.id === initialDraftId);
    if (!draft) return;
    const d = draft.data;
    setUrl(d.videoUrl);
    setArtistName(d.artistName);
    setSongTitle(d.songTitle);
    setSourceLang(d.sourceLang);
    setTargetLang(d.targetLang);
    setEra(d.era || "");
    setNickname(d.nickname);
    setComment(d.comment || "");
    // Restore cues
    if (d.cues && d.cues.length > 0) {
      setCues(d.cues.map((c) => ({
        id: crypto.randomUUID(),
        startSec: c.showAt,
        endSec: c.showAt + c.duration,
        text: c.text,
        originalText: c.originalText || "",
      })));
    } else {
      setCues([{
        id: crypto.randomUUID(),
        startSec: d.startSec,
        endSec: d.endSec,
        text: d.misheardText,
        originalText: d.originalText || "",
      }]);
    }
  }, [initialDraftId]);

  // Pass raw cue boundaries — players add their own margins
  const playStartSec = cues[0].startSec;
  const playEndSec = cues[cues.length - 1].endSec;

  const canPreview = parsed !== null && cues[0].endSec > cues[0].startSec;
  const canSubmit = canPreview && cues.every((c) => c.text.trim().length > 0);

  // Build cues array for Subtitle component
  const subtitleCues: SubtitleCue[] = useMemo(
    () => cues.map((c) => ({
      text: c.text,
      originalText: c.originalText || undefined,
      showAt: c.startSec,
      duration: c.endSec - c.startSec,
    })),
    [cues]
  );

  // Live preview Post object for PostCard
  const previewPost: Post = useMemo(() => ({
    id: "preview",
    videoUrl: url,
    platform: parsed?.platform || "other",
    videoId: parsed?.videoId || "",
    startSec: playStartSec,
    endSec: playEndSec,
    misheardText: cues.map((c) => c.text.trim()).join("") || "...",
    originalText: cues.map((c) => c.originalText.trim()).filter(Boolean).join(" ") || undefined,
    artistName: artistName.trim() || "—",
    songTitle: songTitle.trim() || "—",
    sourceLang,
    targetLang,
    nickname: nickname.trim() || "Anonymous",
    likes: 0,
    createdAt: new Date().toISOString(),
    reactions: {},
    totalReactions: 0,
    playCount: 0,
    era: era.trim() || undefined,
    comment: comment.trim() || undefined,
    cues: subtitleCues,
  }), [url, parsed, playStartSec, playEndSec, cues, subtitleCues, artistName, songTitle, sourceLang, targetLang, nickname, era, comment]);

  const buildData = useCallback((): PostData | null => {
    if (!parsed) return null;
    const firstCue = cues[0];
    const lastCue = cues[cues.length - 1];
    return {
      videoUrl: url,
      platform: parsed.platform,
      videoId: parsed.videoId,
      startSec: firstCue.startSec,
      endSec: lastCue.endSec,
      misheardText: cues.map((c) => c.text.trim()).join(""),
      originalText: cues.map((c) => c.originalText.trim()).filter(Boolean).join(" ") || undefined,
      artistName: artistName.trim(),
      songTitle: songTitle.trim(),
      sourceLang,
      targetLang,
      nickname: nickname.trim() || "Anonymous",
      deleteKey: deleteKey.trim() || undefined,
      era: era.trim() || undefined,
      comment: comment.trim() || undefined,
      cues: subtitleCues,
    };
  }, [url, parsed, cues, subtitleCues, artistName, songTitle, sourceLang, targetLang, nickname, deleteKey, era, comment]);

  const handleSaveDraft = useCallback(() => {
    const data = buildData();
    if (!data) return;
    const draft = saveDraft(data, draftId);
    setDraftId(draft.id);
    setSavedMsg(t.editor.draftSaved);
    setTimeout(() => setSavedMsg(""), 2000);
  }, [buildData, draftId, t]);

  const handleSubmit = useCallback(async () => {
    const data = buildData();
    if (!data || submitting) return;
    setSubmitting(true);
    if (draftId) deleteDraft(draftId);
    try {
      localStorage.setItem("ear-sky-nickname", nickname.trim());
      if (deleteKey.trim()) localStorage.setItem("ear-sky-delete-key", deleteKey.trim());
    } catch { /* ignore */ }
    try {
      await onPublished(data);
    } catch {
      setSubmitting(false);
    }
  }, [buildData, draftId, onPublished, nickname, submitting]);

  // Cue management
  const updateCue = useCallback((index: number, patch: Partial<CueInput>) => {
    setCues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      // Chain: update subsequent cue starts
      for (let i = index + 1; i < next.length; i++) {
        next[i] = { ...next[i], startSec: next[i - 1].endSec };
        if (next[i].endSec <= next[i].startSec) {
          next[i] = { ...next[i], endSec: next[i].startSec + 3 };
        }
      }
      return next;
    });
  }, []);

  const MAX_CUES = 3;

  const addCue = useCallback(() => {
    setCues((prev) => {
      if (prev.length >= MAX_CUES) return prev;
      const last = prev[prev.length - 1];
      if (last.endSec >= videoDuration) return prev; // no room
      return [...prev, {
        id: crypto.randomUUID(),
        startSec: last.endSec,
        endSec: Math.min(last.endSec + 5, videoDuration),
        text: "",
        originalText: "",
      }];
    });
  }, [videoDuration]);

  const removeCue = useCallback((index: number) => {
    setCues((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      // Re-chain
      for (let i = 1; i < next.length; i++) {
        next[i] = { ...next[i], startSec: next[i - 1].endSec };
      }
      return next;
    });
  }, []);

  const handleLoadDraft = useCallback((draft: ReturnType<typeof getAllDrafts>[number]) => {
    const d = draft.data;
    setUrl(d.videoUrl);
    setArtistName(d.artistName);
    setSongTitle(d.songTitle);
    setSourceLang(d.sourceLang);
    setTargetLang(d.targetLang);
    setEra(d.era || "");
    setNickname(d.nickname);
    setComment(d.comment || "");
    if (d.cues && d.cues.length > 0) {
      setCues(d.cues.map((c) => ({
        id: crypto.randomUUID(),
        startSec: c.showAt,
        endSec: c.showAt + c.duration,
        text: c.text,
        originalText: c.originalText || "",
      })));
    } else {
      setCues([{
        id: crypto.randomUUID(),
        startSec: d.startSec,
        endSec: d.endSec,
        text: d.misheardText,
        originalText: d.originalText || "",
      }]);
    }
    setDraftId(draft.id);
    setShowDrafts(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Drafts */}
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

      {/* === 1. URL (first thing the user does) === */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">{t.editor.urlLabel}</label>
        <ClearableInput
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
        {!parsed && (
          <div className="flex items-center gap-6 text-[11px] text-white/25">
            <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer"
               className="hover:text-white/50 transition-colors inline-flex items-center gap-0.5">
              YouTube <ExternalLink size={9} />
            </a>
            <a href="https://www.nicovideo.jp" target="_blank" rel="noopener noreferrer"
               className="hover:text-white/50 transition-colors inline-flex items-center gap-0.5">
              niconico <ExternalLink size={9} />
            </a>
            <a href="https://soundcloud.com" target="_blank" rel="noopener noreferrer"
               className="hover:text-white/50 transition-colors inline-flex items-center gap-0.5">
              SoundCloud <ExternalLink size={9} />
            </a>
          </div>
        )}
      </div>

      {/* === 2. Live PostCard preview (appears immediately after valid URL) === */}
      {parsed && parsed.platform !== "other" && (
        <PostCard post={previewPost} showPlayer preview />
      )}

      {/* === 3. Song info (auto-filled from oEmbed, user corrects if needed) === */}
      {parsed && (
        <>
          <SectionHeader text={t.editor.sectionSong} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm text-white/60">{t.editor.artistLabel}</label>
              <ClearableInput
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
              <ClearableInput
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Bohemian Rhapsody"
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                           placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
              />
            </div>
          </div>

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
                  <option key={l.code} value={l.code}>{l.label}</option>
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
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-white/60">
              {t.editor.eraLabel}
              <OptionalLabel text={t.editor.optional} />
            </label>
            <ClearableInput
              type="text"
              value={era}
              onChange={(e) => setEra(e.target.value)}
              placeholder={t.editor.eraPlaceholder}
              maxLength={20}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                         placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
            />
          </div>
        </>
      )}

      {/* === 4. Subtitles (slider + text per cue) === */}
      {parsed && <SectionHeader text={t.editor.sectionSubtitle} />}
      {parsed && (
        <p className="text-xs text-white/30 -mt-2 mb-3">{t.editor.cueHint}</p>
      )}

      {cues.map((cue, i) => (
        <div key={cue.id} className="space-y-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
          {/* Cue header */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {t.editor.cueLabel} {cues.length > 1 ? i + 1 : ""}
            </span>
            {cues.length > 1 && (
              <button
                onClick={() => removeCue(i)}
                className="text-xs text-white/30 hover:text-red-400 flex items-center gap-0.5
                           min-w-[44px] min-h-[44px] justify-center
                           focus-visible:outline-2 focus-visible:outline-neon-blue"
                aria-label={t.editor.removeCue}
              >
                <X size={12} />
                {t.editor.removeCue}
              </button>
            )}
          </div>

          {/* Slider */}
          {i === 0 ? (
            // First cue: dual slider for start + end
            <DualRangeSlider
              min={0}
              max={videoDuration}
              startVal={cue.startSec}
              endVal={cue.endSec}
              onStartChange={(v) => updateCue(i, { startSec: v })}
              onEndChange={(v) => updateCue(i, { endSec: v })}
            />
          ) : (
            // Subsequent cues: start is locked to previous end, only end slider
            <div className="space-y-1">
              <p className="text-xs text-white/30">
                {formatTime(cue.startSec)} 〜
              </p>
              <DualRangeSlider
                min={cue.startSec}
                max={videoDuration}
                startVal={cue.startSec}
                endVal={cue.endSec}
                onStartChange={() => {}} // locked
                onEndChange={(v) => updateCue(i, { endSec: v })}
                />
            </div>
          )}

          {/* Misheard text */}
          <div className="space-y-1">
            <label className="block text-sm text-white/60">{t.editor.misheardLabel}</label>
            <ClearableInput
              type="text"
              value={cue.text}
              onChange={(e) => updateCue(i, { text: e.target.value })}
              placeholder={t.editor.misheardPlaceholder}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-lg
                         placeholder:text-white/20 focus:border-neon-pink/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
            />
          </div>

          {/* Original text */}
          <div className="space-y-1">
            <label className="block text-sm text-white/60">
              {t.editor.originalLabel}
              <OptionalLabel text={t.editor.optional} />
            </label>
            <ClearableInput
              type="text"
              value={cue.originalText}
              onChange={(e) => updateCue(i, { originalText: e.target.value })}
              placeholder=""
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                         placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
            />
          </div>
        </div>
      ))}

      {/* Add cue button (max 3) */}
      {cues.length < MAX_CUES && (
        <button
          onClick={addCue}
          className="w-full py-2.5 rounded-lg border border-dashed border-white/15 text-white/40
                     hover:border-white/30 hover:text-white/60 transition-all flex items-center justify-center gap-1.5
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Plus size={14} />
          {t.editor.addCue}
        </button>
      )}

      {/* === Section: About You === */}
      <SectionHeader text={t.editor.sectionAboutYou} />

      {/* Comment */}
      <div className="space-y-1">
        <label className="block text-sm text-white/60">
          {t.editor.commentLabel}
          <OptionalLabel text={t.editor.optional} />
        </label>
        <ClearableInput
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
        <label className="block text-sm text-white/60">
          {t.editor.nicknameLabel}
          <OptionalLabel text={t.editor.optional} />
        </label>
        <ClearableInput
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
        <label className="block text-sm text-white/60">
          {t.editor.deleteKeyLabel}
          <OptionalLabel text={t.editor.optional} />
        </label>
        <ClearableInput
          type="password"
          value={deleteKey}
          onChange={(e) => setDeleteKey(e.target.value)}
          placeholder=""
          autoComplete="off"
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/20 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

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
          disabled={!canSubmit || submitting}
          className="flex-1 py-3 rounded-lg bg-neon-pink text-white font-bold
                     hover:brightness-110 active:scale-[0.98] transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Send size={14} className="inline mr-1" />{submitting ? t.editor.submitting : t.editor.submit}
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
              {draft.updatedAt.slice(0, 10)}
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
