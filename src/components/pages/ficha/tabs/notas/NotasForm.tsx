import { useTranslation } from "react-i18next";
import { mayWrite } from "../../../../../utils/recordAccess";
import { Textarea } from "../../../../ui";
import { CoordinationOnlyNote } from "../../CoordinationOnlyNote";
import { Field, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";

export interface NotasFormProps {
  draft: DraftHandle;
}

export function NotasForm({ draft }: NotasFormProps) {
  const { t } = useTranslation();
  const locked = !mayWrite(draft.place, "notes");

  return (
    <div className="flex flex-col gap-5">
      <FieldGrid>
        <Field
          id="ficha-notas"
          label={t("f_notes")}
          hint={t("notes_internal_hint")}
          full
        >
          {(control) => (
            <Textarea
              {...control}
              rows={5}
              value={locked ? "" : (draft.values.notes ?? "")}
              disabled={locked}
              onChange={(event) => draft.set("notes", event.target.value)}
            />
          )}
        </Field>
      </FieldGrid>
      {locked && (
        <CoordinationOnlyNote textKey="f_free_text_coordination_only" />
      )}
    </div>
  );
}
