import { useTranslation } from "react-i18next";
import { NotesPanel } from "../../fields";
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
        <p className="rounded-md bg-muted px-4 py-3.5 font-serif text-small italic text-fg-muted">
          {t("notes_empty")}
        </p>
      )}
      <p className="text-micro text-fg-subtle">{t("notes_internal_hint")}</p>
    </div>
  );
}
