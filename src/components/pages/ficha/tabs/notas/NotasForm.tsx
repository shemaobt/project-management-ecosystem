import { useTranslation } from "react-i18next";
import { Textarea } from "../../../../ui";
import { Field, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";

export interface NotasFormProps {
  draft: DraftHandle;
}

export function NotasForm({ draft }: NotasFormProps) {
  const { t } = useTranslation();

  return (
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
            value={draft.values.notes ?? ""}
            onChange={(event) => draft.set("notes", event.target.value)}
          />
        )}
      </Field>
    </FieldGrid>
  );
}
