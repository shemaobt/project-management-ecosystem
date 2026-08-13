import { useTranslation } from "react-i18next";
import { EmptyHint, NotesPanel } from "../../fields";
import type { DraftHandle } from "../../useDraft";

export interface NotasViewProps {
  draft: DraftHandle;
}

export function NotasView({ draft }: NotasViewProps) {
  const { t } = useTranslation();
  const notes = draft.values.notes ?? "";

  return (
    <div className="flex flex-col gap-3">
      {notes !== "" ? (
        <NotesPanel>{notes}</NotesPanel>
      ) : (
        <EmptyHint>{t("notes_empty")}</EmptyHint>
      )}
      <p className="text-micro text-fg-subtle">{t("notes_internal_hint")}</p>
    </div>
  );
}
