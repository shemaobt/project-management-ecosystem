import { useTranslation } from "react-i18next";
import { readsFreeText } from "../../../../../utils/recordAccess";
import { CoordinationOnlyNote } from "../../CoordinationOnlyNote";
import { EmptyHint, NotesPanel } from "../../fields";
import type { DraftHandle } from "../../useDraft";

export interface NotasViewProps {
  draft: DraftHandle;
}

export function NotasView({ draft }: NotasViewProps) {
  const { t } = useTranslation();
  const withheld = !readsFreeText(draft.place);
  const notes = withheld ? "" : (draft.values.notes ?? "");

  return (
    <div className="flex flex-col gap-3">
      {withheld ? (
        <CoordinationOnlyNote textKey="f_free_text_coordination_only" />
      ) : notes !== "" ? (
        <NotesPanel>{notes}</NotesPanel>
      ) : (
        <EmptyHint>{t("notes_empty")}</EmptyHint>
      )}
      <p className="text-micro text-fg-subtle">{t("notes_internal_hint")}</p>
    </div>
  );
}
