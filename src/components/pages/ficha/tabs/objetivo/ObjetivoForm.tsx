import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  OBJECTIVES,
  TRANSLATION_TYPES,
} from "../../../../../constants/project";
import { Input, Textarea } from "../../../../ui";
import { CheckboxGroup, Field, FieldGrid, FieldGroup } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { PhasesEditor } from "./PhasesEditor";

export interface ObjetivoFormProps {
  draft: DraftHandle;
}

export function ObjetivoForm({ draft }: ObjetivoFormProps) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const values = draft.values;
  const objective = values.objective ?? [];
  const scopeError =
    touched && objective.length === 0 ? t("f_required") : undefined;

  return (
    <FieldGrid>
      <FieldGroup
        id="ficha-objetivo"
        label={t("f_obj")}
        required
        error={scopeError}
        full
      >
        <CheckboxGroup
          idPrefix="ficha-objetivo"
          options={OBJECTIVES}
          selected={objective}
          onChange={(next) => {
            setTouched(true);
            draft.set("objective", next);
          }}
        />
      </FieldGroup>

      <FieldGroup id="ficha-tipo" label={t("f_translation_type")} full>
        <CheckboxGroup
          idPrefix="ficha-tipo"
          options={TRANSLATION_TYPES}
          selected={values.translationType ?? []}
          onChange={(next) => draft.set("translationType", next)}
        />
      </FieldGroup>

      <Field id="ficha-inicio" label={t("f_start")}>
        {(control) => (
          <Input
            {...control}
            type="date"
            value={values.startDate ?? ""}
            onChange={(event) => draft.set("startDate", event.target.value)}
          />
        )}
      </Field>

      <Field id="ficha-prazo" label={t("f_deadline")}>
        {(control) => (
          <Input
            {...control}
            type="date"
            value={values.deadline ?? ""}
            onChange={(event) => draft.set("deadline", event.target.value)}
          />
        )}
      </Field>

      <FieldGroup id="ficha-etapas" label={t("f_phases")} full>
        <p className="mb-2 text-micro text-fg-subtle">{t("f_phases_hint")}</p>
        <PhasesEditor
          phases={values.phases ?? []}
          onChange={(next) => draft.set("phases", next)}
        />
      </FieldGroup>

      <Field id="ficha-objetivo-notas" label={t("f_notes")} full>
        {(control) => (
          <Textarea
            {...control}
            value={values.objectiveNotes ?? ""}
            placeholder={t("placeholder_objective_notes")}
            onChange={(event) =>
              draft.set("objectiveNotes", event.target.value)
            }
          />
        )}
      </Field>
    </FieldGrid>
  );
}
