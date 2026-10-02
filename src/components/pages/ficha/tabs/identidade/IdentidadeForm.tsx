import { useState } from "react";
import { useTranslation } from "react-i18next";
import { VITALITY_SCALE } from "../../../../../constants/project";
import type { Coordinates } from "../../../../../types/project";
import {
  hasPlottableCoords,
  isIsoShape,
  parseCoordinate,
} from "../../../../../utils/identity";
import { mayWrite } from "../../../../../utils/recordAccess";
import {
  getLanguageNameDisplay,
  getLocationDisplay,
} from "../../../../../utils/region";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../ui";
import { CoordinationOnlyNote } from "../../CoordinationOnlyNote";
import { Field, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { SensitiveFlag } from "./SensitiveFlag";

const NOT_ASSESSED = "na";

const asText = (coords: Coordinates): [string, string] =>
  hasPlottableCoords(coords)
    ? [String(coords[0]), String(coords[1])]
    : ["", ""];

export interface IdentidadeFormProps {
  draft: DraftHandle;
}

export function IdentidadeForm({ draft }: IdentidadeFormProps) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const values = draft.values;
  const stored: Coordinates = values.coords ?? [0, 0];

  const [typed, setTyped] = useState<[string, string]>(() => asText(stored));
  const [seen, setSeen] = useState<Coordinates>(stored);
  const [lng, lat] = stored;

  if (seen[0] !== lng || seen[1] !== lat) {
    setSeen([lng, lat]);
    if (
      (parseCoordinate(typed[0]) ?? 0) !== lng ||
      (parseCoordinate(typed[1]) ?? 0) !== lat
    ) {
      setTyped(asText([lng, lat]));
    }
  }

  const requiredError = (field: "languageName" | "bridgeLanguage") =>
    touched[field] && !values[field]?.trim() ? t("f_required") : undefined;

  const touch = (field: string) =>
    setTouched((current) => ({ ...current, [field]: true }));

  const code = values.languageCode ?? "";
  const locked = !draft.place.placeWritable;
  // The others read a sensitive project's language by its public name (OBT-560), so the
  // real one is not theirs to type over — the base's rule, *não dá para editar o que não se vê*.
  const nameLocked = !mayWrite(draft.place, "languageName");
  const place = draft.saved ? getLocationDisplay(draft.saved) : null;
  const withheld = draft.place.withheld && place?.withheld === true;
  const shownLocation = withheld && place?.withheld
    ? t(place.regionLabelKey)
    : (values.location ?? "");
  const shownCoords: [string, string] = withheld ? ["", ""] : typed;

  const setCoordinate = (index: 0 | 1, raw: string) => {
    const next: [string, string] = [typed[0], typed[1]];
    next[index] = raw;
    setTyped(next);
    draft.set("coords", [
      parseCoordinate(next[0]) ?? 0,
      parseCoordinate(next[1]) ?? 0,
    ]);
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
          {(control) => (
            <Input
              {...control}
              value={
                nameLocked
                  ? getLanguageNameDisplay(
                      {
                        languageName: values.languageName ?? "",
                        languageNameWithheld: values.languageNameWithheld,
                      },
                      t,
                    )
                  : (values.languageName ?? "")
              }
              disabled={nameLocked}
              placeholder={t("placeholder_lang")}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-invalid={Boolean(requiredError("languageName"))}
              onBlur={() => touch("languageName")}
              onChange={(event) => draft.set("languageName", event.target.value)}
            />
          )}
        </Field>

        <Field
          id="ficha-lang-code"
          label={t("f_lang_code")}
          hint={code && !isIsoShape(code) ? t("f_iso_hint") : undefined}
        >
          {(control) => (
            <Input
              {...control}
              value={code}
              placeholder={t("placeholder_iso")}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              maxLength={20}
              onChange={(event) => draft.set("languageCode", event.target.value)}
            />
          )}
        </Field>

        <Field
          id="ficha-bridge"
          label={t("f_bridge")}
          required
          error={requiredError("bridgeLanguage")}
        >
          {(control) => (
            <Input
              {...control}
              value={values.bridgeLanguage ?? ""}
              placeholder={t("placeholder_bridge")}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={Boolean(requiredError("bridgeLanguage"))}
              onBlur={() => touch("bridgeLanguage")}
              onChange={(event) =>
                draft.set("bridgeLanguage", event.target.value)
              }
            />
          )}
        </Field>

        <Field id="ficha-vitality" label={t("f_vitality")}>
          {(control) => (
            <Select
              value={values.vitalityStatus || NOT_ASSESSED}
              onValueChange={(next) =>
                draft.set("vitalityStatus", next === NOT_ASSESSED ? "" : next)
              }
            >
              <SelectTrigger {...control}>
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
          )}
        </Field>

        <Field id="ficha-location" label={t("f_location")} full>
          {(control) => (
            <Input
              {...control}
              value={shownLocation}
              disabled={locked}
              placeholder={t("placeholder_location")}
              onChange={(event) => draft.set("location", event.target.value)}
            />
          )}
        </Field>

        <Field id="ficha-location2" label={t("f_location2")} full>
          {(control) => (
            <Input
              {...control}
              value={withheld ? "" : (values.location2 ?? "")}
              disabled={locked}
              placeholder={t("placeholder_location2")}
              onChange={(event) => draft.set("location2", event.target.value)}
            />
          )}
        </Field>

        <Field id="ficha-speakers" label={t("f_speakers")}>
          {(control) => (
            <Input
              {...control}
              type="number"
              min={0}
              inputMode="numeric"
              value={values.speakerCount ?? ""}
              placeholder={t("placeholder_speakers")}
              onChange={(event) => draft.set("speakerCount", event.target.value)}
            />
          )}
        </Field>

        <Field id="ficha-lng" label={t("f_coords")} hint={t("f_coords_hint")}>
          {(control) => (
            <div className="flex gap-2">
              <Input
                {...control}
                inputMode="decimal"
                aria-label={t("f_longitude")}
                placeholder={t("f_longitude")}
                value={shownCoords[0]}
                disabled={locked}
                onChange={(event) => setCoordinate(0, event.target.value)}
              />
              <Input
                {...control}
                id={`${control.id}-lat`}
                inputMode="decimal"
                aria-label={t("f_latitude")}
                placeholder={t("f_latitude")}
                value={shownCoords[1]}
                disabled={locked}
                onChange={(event) => setCoordinate(1, event.target.value)}
              />
            </div>
          )}
        </Field>
      </FieldGrid>

      {locked && <CoordinationOnlyNote />}

      <SensitiveFlag
        checked={Boolean(values.sensitiveCountry)}
        disabled={locked}
        onChange={(next) => draft.set("sensitiveCountry", next)}
      />

      {values.sensitiveCountry && !locked && (
        <Field
          id="ficha-public-name"
          label={t("f_public_name")}
          hint={t("f_public_name_hint")}
        >
          {(control) => (
            <Input
              {...control}
              value={values.publicLanguageName ?? ""}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) =>
                draft.set("publicLanguageName", event.target.value)
              }
            />
          )}
        </Field>
      )}
    </div>
  );
}
