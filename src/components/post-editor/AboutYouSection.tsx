import type { useI18n } from "@/i18n";
import { ClearableInput, OptionalLabel, SectionHeader, fieldId } from "./FormPrimitives";

interface AboutYouSectionProps {
  t: ReturnType<typeof useI18n>;
  comment: string;
  nickname: string;
  deleteKey: string;
  onCommentChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onDeleteKeyChange: (value: string) => void;
}

export function AboutYouSection({
  t,
  comment,
  nickname,
  deleteKey,
  onCommentChange,
  onNicknameChange,
  onDeleteKeyChange,
}: AboutYouSectionProps) {
  return (
    <>
      <SectionHeader text={t.editor.sectionAboutYou} />

      <div className="space-y-1">
        <label htmlFor={fieldId("comment")} className="block text-sm text-white/60">
          {t.editor.commentLabel}
          <OptionalLabel text={t.editor.optional} />
        </label>
        <ClearableInput
          id={fieldId("comment")}
          type="text"
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          placeholder={t.editor.commentPlaceholder}
          maxLength={200}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/30 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={fieldId("nickname")} className="block text-sm text-white/60">
          {t.editor.nicknameLabel}
          <OptionalLabel text={t.editor.optional} />
        </label>
        <ClearableInput
          id={fieldId("nickname")}
          type="text"
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder={t.editor.nicknamePlaceholder}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/30 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={fieldId("delete-key")} className="block text-sm text-white/60">
          {t.editor.deleteKeyLabel}
          <OptionalLabel text={t.editor.optional} />
        </label>
        <ClearableInput
          id={fieldId("delete-key")}
          type="password"
          value={deleteKey}
          onChange={(event) => onDeleteKeyChange(event.target.value)}
          placeholder=""
          autoComplete="off"
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/30 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>
    </>
  );
}
