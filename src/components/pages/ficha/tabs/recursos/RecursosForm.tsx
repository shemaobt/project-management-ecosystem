import { useTranslation } from "react-i18next";
import { FINANCIAL_RESOURCES } from "../../../../../constants/project";
import { optionsBox } from "../../../../../styles";
import { cn } from "../../../../../utils/cn";
import { Input, RadioField, RadioGroup, Textarea } from "../../../../ui";
import { CheckboxGroup, Field, FieldGrid, FieldGroup } from "../../fields";
import type { DraftHandle } from "../../useDraft";

const IN_ETEN = "sim";
const NOT_IN_ETEN = "nao";

export interface RecursosFormProps {
  draft: DraftHandle;
}

export function RecursosForm({ draft }: RecursosFormProps) {
  const { t } = useTranslation();
  const values = draft.values;
  const financialResources = values.financialResources ?? [];
  const showOtherDetails = financialResources.includes("Outros");

  return (
    <FieldGrid>
      <FieldGroup id="ficha-eten" label={t("f_in_eten")} full>
        <RadioGroup
          value={values.inETEN ? IN_ETEN : NOT_IN_ETEN}
          onValueChange={(next) => draft.set("inETEN", next === IN_ETEN)}
          className={cn(optionsBox, "gap-4.5")}
        >
          <RadioField id="ficha-eten-sim" value={IN_ETEN} label={t("sim")} />
          <RadioField id="ficha-eten-nao" value={NOT_IN_ETEN} label={t("nao")} />
        </RadioGroup>
      </FieldGroup>

      <FieldGroup id="ficha-recursos" label={t("f_financial")} full>
        <CheckboxGroup
          idPrefix="ficha-recursos"
          options={FINANCIAL_RESOURCES}
          selected={financialResources}
          onChange={(next) => draft.set("financialResources", next)}
        />
      </FieldGroup>

      {showOtherDetails && (
        <Field id="ficha-recursos-outros" label={t("f_financial_other")} full>
          {(control) => (
            <Input
              {...control}
              value={values.financialOtherDetails ?? ""}
              placeholder={t("placeholder_financial_other")}
              onChange={(event) =>
                draft.set("financialOtherDetails", event.target.value)
              }
            />
          )}
        </Field>
      )}

      <Field id="ficha-recursos-notas" label={t("f_notes")} full>
        {(control) => (
          <Textarea
            {...control}
            value={values.financialNotes ?? ""}
            placeholder={t("placeholder_financial_notes")}
            onChange={(event) =>
              draft.set("financialNotes", event.target.value)
            }
          />
        )}
      </Field>
    </FieldGrid>
  );
}
