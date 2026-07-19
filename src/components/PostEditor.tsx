import { useCallback, useEffect, useMemo, useState } from "react";
import { parseVideoUrl } from "@/lib/video";
import { saveDraft, getAllDrafts, deleteDraft, getStorageValue, setStorageValue } from "@/lib/storage";
import { fetchVideoTitle, splitArtistTitle } from "@/lib/oembed";
import { useI18n, useI18nState } from "@/i18n";
import { useCueEditor } from "@/hooks/useCueEditor";
import { usePostPayload } from "@/hooks/usePostPayload";
import PostCard from "./PostCard";
import { AboutYouSection } from "./post-editor/AboutYouSection";
import { DraftsList } from "./post-editor/DraftsList";
import { EditorActions } from "./post-editor/EditorActions";
import { SongInfoSection } from "./post-editor/SongInfoSection";
import { SubtitleSection } from "./post-editor/SubtitleSection";
import { UrlSection } from "./post-editor/UrlSection";
import type { PostData } from "./post-editor/types";

interface Props {
  onPublished: (data: PostData) => void;
  initialDraftId?: string;
}

export default function PostEditor({ onPublished, initialDraftId }: Props) {
  const t = useI18n();
  const { locale } = useI18nState();

  const [url, setUrl] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ja");
  const [era, setEra] = useState("");
  const [nickname, setNickname] = useState(() => getStorageValue("nickname") || "");
  const [deleteKey, setDeleteKey] = useState(() => getStorageValue("deleteKey") || "");
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [showDrafts, setShowDrafts] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const videoDuration = 300;
  const parsed = useMemo(() => parseVideoUrl(url), [url]);
  const {
    cues,
    maxCues,
    subtitleCues,
    applyUrlStartSec,
    restoreCues,
    updateCue,
    addCue,
    removeCue,
  } = useCueEditor(videoDuration);

  const applyDraftData = useCallback((data: PostData) => {
    setUrl(data.videoUrl);
    setArtistName(data.artistName);
    setSongTitle(data.songTitle);
    setSourceLang(data.sourceLang);
    setTargetLang(data.targetLang);
    setEra(data.era || "");
    setNickname(data.nickname);
    setComment(data.comment || "");
    restoreCues(data);
  }, [restoreCues]);

  useEffect(() => {
    if (!parsed || parsed.platform === "other") return;
    let cancelled = false;
    const requestedUrl = url;
    fetchVideoTitle(parsed.platform, parsed.videoId).then((title) => {
      if (cancelled || !title) return;
      const { artist, song } = splitArtistTitle(title);
      setArtistName((previous) => (url === requestedUrl && previous === "" ? artist : previous));
      setSongTitle((previous) => (url === requestedUrl && previous === "" ? song : previous));
    });

    if (parsed.startSec != null && parsed.startSec > 0) {
      applyUrlStartSec(parsed.startSec);
    }

    return () => { cancelled = true; };
  }, [parsed, url, applyUrlStartSec]);

  useEffect(() => {
    if (!initialDraftId) return;
    const draft = getAllDrafts().find((item) => item.id === initialDraftId);
    if (draft) applyDraftData(draft.data);
  }, [initialDraftId, applyDraftData]);

  const { previewPost, buildData, canSubmit } = usePostPayload({
    url,
    parsed,
    cues,
    subtitleCues,
    artistName,
    songTitle,
    sourceLang,
    targetLang,
    nickname,
    deleteKey,
    era,
    comment,
    tags,
  });

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
    setStorageValue("nickname", nickname.trim());
    if (deleteKey.trim()) setStorageValue("deleteKey", deleteKey.trim());
    try {
      await onPublished(data);
    } finally {
      setSubmitting(false);
    }
  }, [buildData, draftId, onPublished, nickname, deleteKey, submitting]);

  const handleLoadDraft = useCallback((draft: ReturnType<typeof getAllDrafts>[number]) => {
    applyDraftData(draft.data);
    setDraftId(draft.id);
    setShowDrafts(false);
  }, [applyDraftData]);

  return (
    <div className="space-y-6">
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

      <UrlSection
        t={t}
        url={url}
        parsed={parsed}
        onUrlChange={setUrl}
      />

      {parsed && parsed.platform !== "other" && (
        <PostCard post={previewPost} preview />
      )}

      {parsed && (
        <SongInfoSection
          t={t}
          locale={locale}
          artistName={artistName}
          songTitle={songTitle}
          sourceLang={sourceLang}
          targetLang={targetLang}
          era={era}
          tags={tags}
          onArtistNameChange={setArtistName}
          onSongTitleChange={setSongTitle}
          onSourceLangChange={setSourceLang}
          onTargetLangChange={setTargetLang}
          onEraChange={setEra}
          onTagsChange={setTags}
        />
      )}

      {parsed && (
        <SubtitleSection
          t={t}
          cues={cues}
          maxCues={maxCues}
          videoDuration={videoDuration}
          onUpdateCue={updateCue}
          onAddCue={addCue}
          onRemoveCue={removeCue}
        />
      )}

      <AboutYouSection
        t={t}
        comment={comment}
        nickname={nickname}
        deleteKey={deleteKey}
        onCommentChange={setComment}
        onNicknameChange={setNickname}
        onDeleteKeyChange={setDeleteKey}
      />

      <EditorActions
        t={t}
        canSave={parsed !== null}
        canSubmit={canSubmit}
        submitting={submitting}
        savedMsg={savedMsg}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
