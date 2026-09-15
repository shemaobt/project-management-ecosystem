import { useId } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_PRAYER_VISIBILITY, isPrayerVisibility } from "../../../constants/prayer";
import type { IntakeField } from "../../../types/forms";
import type { BookProgressItem } from "../../../types/project";
import { BookTable } from "../ficha/tabs/progresso/BookTable";
import { PrayerConsent } from "../ficha/tabs/saude/PrayerConsent";
import { Input, Label, Radio, RadioGroup, Textarea } from "../../ui";

export interface IntakeFieldInputProps {
  field: IntakeField;
  value: unknown;
  onChange: (value: unknown) => void;
  errorKey?: string;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRows(value: unknown): BookProgressItem[] {
  return Array.isArray(value) ? (value as BookProgressItem[]) : [];
}

/** The one choice field the server sends today — §5.3/§6.2's consent question. */
function isPrayerVisibilityField(field: IntakeField): boolean {
  return field.type === "choice" && field.options.every(isPrayerVisibility);
}

export function IntakeFieldInput({
  field,
  value,
  onChange,
  errorKey,
}: IntakeFieldInputProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const invalid = Boolean(errorKey);
  const prayerVisibilityField = isPrayerVisibilityField(field);

  const hasOwnControlId =
    field.type === "text" || field.type === "longText" || field.type === "period";
  const labelId = hasOwnControlId ? undefined : fieldId;
  const rawChoice = asString(value);
  const currentPrayerVisibility = isPrayerVisibility(rawChoice)
    ? rawChoice
    : DEFAULT_PRAYER_VISIBILITY;

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={labelId} htmlFor={hasOwnControlId ? fieldId : undefined}>
        {t(field.labelKey)}
        {field.required ? null : ` ${t("intake_optional")}`}
      </Label>

      {field.type === "text" ? (
        <Input
          id={fieldId}
          type="text"
          maxLength={field.maxLength ?? undefined}
          value={asString(value)}
          invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "longText" ? (
        <>
          <Textarea
            id={fieldId}
            rows={4}
            maxLength={field.maxLength ?? undefined}
            value={asString(value)}
            invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
          />
          {field.maxLength ? (
            <p className="text-right text-tag text-fg-subtle">
              {asString(value).length}/{field.maxLength}
            </p>
          ) : null}
        </>
      ) : null}

      {field.type === "period" ? (
        <Input
          id={fieldId}
          type="month"
          value={asString(value)}
          invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "progressRows" ? (
        <div role="group" aria-labelledby={fieldId}>
          <BookTable rows={asRows(value)} onChange={onChange} />
        </div>
      ) : null}

      {field.type === "choice" && prayerVisibilityField ? (
        <PrayerConsent value={currentPrayerVisibility} onChange={onChange} />
      ) : null}

      {field.type === "choice" && !prayerVisibilityField ? (
        <RadioGroup
          aria-labelledby={fieldId}
          className="flex-col gap-2.5"
          value={asString(value)}
          onValueChange={onChange}
        >
          {field.options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-3"
            >
              <Radio value={option} className="mt-0.5" />
              <span className="block min-w-0 text-small font-semibold text-fg">
                {option}
              </span>
            </label>
          ))}
        </RadioGroup>
      ) : null}

      {errorKey ? (
        <p className="text-tag font-semibold text-telha">{t(errorKey)}</p>
      ) : null}
    </div>
  );
}
