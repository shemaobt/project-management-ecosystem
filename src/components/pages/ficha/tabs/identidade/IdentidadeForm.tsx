import { useState } from "react";
import { useTranslation } from "react-i18next";
import { VITALITY_SCALE } from "../../../../../constants/project";
import type { Coordinates } from "../../../../../types/project";
import { isIsoShape, parseCoordinate } from "../../../../../utils/identity";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../ui";
import { Field, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { SensitiveFlag } from "./SensitiveFlag";

const NOT_ASSESSED = "na";

export interface IdentidadeFormProps {
  draft: DraftHandle;
}

export function IdentidadeForm({ draft }: IdentidadeFormProps) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const values = draft.values;

  const requiredError = (field: "languageName" | "bridgeLanguage") =>
    touched[field] && !values[field]?.trim() ? t("f_required") : undefined;

  const touch = (field: string) =>
    setTouched((current) => ({ ...current, [field]: true }));

  const code = values.languageCode ?? "";
  const coords: Coordinates = values.coords ?? [0, 0];

  const setCoordinate = (index: 0 | 1, raw: string) => {
    const parsed = parseCoordinate(raw);
    const next: Coordinates = [coords[0], coords[1]];
    next[index] = parsed ?? 0;
    draft.set("coords", next);
  };

  return (
    <div className="flex flex-col gap-5">
      <FieldGrid>
        <Field
          id="ficha-lang-name"
          label={t("f_lang_name")}
          required
          error={requiredError("languageName")}
        >
          <Input
            id="ficha-lang-name"
            value={values.languageName ?? ""}
            placeholder={t("placeholder_lang")}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={Boolean(requiredError("languageName"))}
            onBlur={() => touch("languageName")}
            onChange={(event) => draft.set("languageName", event.target.value)}
          />
        </Field>

        <Field
          id="ficha-lang-code"
          label={t("f_lang_code")}
          hint={code && !isIsoShape(code) ? t("f_iso_hint") : undefined}
        >
          <Input
            id="ficha-lang-code"
            value={code}
            placeholder={t("placeholder_iso")}
            spellCheck={false}
            autoComplete="off"
            maxLength={20}
            onChange={(event) => draft.set("languageCode", event.target.value)}
          />
        </Field>

        <Field
          id="ficha-bridge"
          label={t("f_bridge")}
          required
          error={requiredError("bridgeLanguage")}
        >
          <Input
            id="ficha-bridge"
            value={values.bridgeLanguage ?? ""}
            placeholder={t("placeholder_bridge")}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={Boolean(requiredError("bridgeLanguage"))}
            onBlur={() => touch("bridgeLanguage")}
            onChange={(event) => draft.set("bridgeLanguage", event.target.value)}
          />
        </Field>

        <Field id="ficha-vitality" label={t("f_vitality")}>
          <Select
            value={values.vitalityStatus || NOT_ASSESSED}
            onValueChange={(next) =>
              draft.set("vitalityStatus", next === NOT_ASSESSED ? "" : next)
            }
          >
            <SelectTrigger id="ficha-vitality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NOT_ASSESSED}>{t("vit_na")}</SelectItem>
              {VITALITY_SCALE.map((step) => (
                <SelectItem key={step.value} value={step.value}>
                  {t(step.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="ficha-location" label={t("f_location")} full>
          <Input
            id="ficha-location"
            value={values.location ?? ""}
            placeholder={t("placeholder_location")}
            onChange={(event) => draft.set("location", event.target.value)}
          />
        </Field>

        <Field id="ficha-location2" label={t("f_location2")} full>
          <Input
            id="ficha-location2"
            value={values.location2 ?? ""}
            placeholder={t("placeholder_location2")}
            onChange={(event) => draft.set("location2", event.target.value)}
          />
        </Field>

        <Field id="ficha-speakers" label={t("f_speakers")}>
          <Input
            id="ficha-speakers"
            type="number"
            min={0}
            inputMode="numeric"
            value={values.speakerCount ?? ""}
            placeholder={t("placeholder_speakers")}
            onChange={(event) => draft.set("speakerCount", event.target.value)}
          />
        </Field>

        <Field id="ficha-lng" label={t("f_coords")} hint={t("f_coords_hint")}>
          <div className="flex gap-2">
            <Input
              id="ficha-lng"
              type="number"
              step="any"
              aria-label={t("f_longitude")}
              placeholder={t("f_longitude")}
              value={coords[0] === 0 ? "" : coords[0]}
              onChange={(event) => setCoordinate(0, event.target.value)}
            />
            <Input
              id="ficha-lat"
              type="number"
              step="any"
              aria-label={t("f_latitude")}
              placeholder={t("f_latitude")}
              value={coords[1] === 0 ? "" : coords[1]}
              onChange={(event) => setCoordinate(1, event.target.value)}
            />
          </div>
        </Field>
      </FieldGrid>

      <SensitiveFlag
        checked={Boolean(values.sensitiveCountry)}
        onChange={(next) => draft.set("sensitiveCountry", next)}
      />
    </div>
  );
}
