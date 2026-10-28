import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_PRAYER_VISIBILITY,
  isPrayerVisibility,
} from "../../../constants/prayer";
import type { IntakeField } from "../../../types/forms";
import type { BookProgressItem } from "../../../types/project";
import { BookTable } from "../ficha/tabs/progresso/BookTable";
import { PrayerConsent } from "../ficha/tabs/saude/PrayerConsent";
import { cn } from "../../../utils/cn";
import { answerLength, tooLongKey, type IntakeImageUpload } from "../../../utils/intake";
import { CheckboxField, Input, Label, Radio, RadioGroup, Textarea } from "../../ui";
import { IntakeImageField } from "./IntakeImageField";

export interface IntakeFieldInputProps {
  field: IntakeField;
  value: unknown;
  onChange: (value: unknown) => void;
  errorKey?: string;
  /** How an `image` field sends its bytes — the page's, because only it knows the link. */
  uploadImage?: IntakeImageUpload;
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
  uploadImage,
}: IntakeFieldInputProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const errorId = `${fieldId}-erro`;
  const tooLong = tooLongKey(field, value);
  const shownError = errorKey ?? tooLong;
  const invalid = Boolean(shownError);
  const describedBy = shownError ? errorId : undefined;
  const prayerVisibilityField = isPrayerVisibilityField(field);

  const hasOwnControlId =
    field.type === "text" ||
    field.type === "longText" ||
    field.type === "period" ||
    field.type === "image";

  // The box is its own label (the question is the box's text), so no Label above it.
  if (field.type === "checkbox") {
    return (
      <fieldset className="rounded-[12px] border border-line-strong bg-muted p-4">
        <CheckboxField
          id={fieldId}
          label={t(field.labelKey)}
          checked={value === true}
          onCheckedChange={(next) => onChange(next === true)}
        />
        <p className="mt-1.5 pl-7.5 text-tag text-fg-muted">{t("intake_authorization_hint")}</p>
        {errorKey ? (
          <p role="alert" className="mt-1.5 text-tag font-semibold text-telha">
            {t(errorKey)}
          </p>
        ) : null}
      </fieldset>
    );
  }
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
          value={asString(value)}
          invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "longText" ? (
        <>
          <Textarea
            id={fieldId}
            rows={4}
            value={asString(value)}
            invalid={invalid}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value)}
          />
          {field.maxLength ? (
            <p
              className={cn(
                "text-right text-tag",
                tooLong ? "font-semibold text-telha" : "text-fg-subtle",
              )}
            >
              {answerLength(asString(value))}/{field.maxLength}
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
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "image" && uploadImage ? (
        <IntakeImageField
          id={fieldId}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
          upload={uploadImage}
          invalid={invalid}
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
              <Radio value={option} label={option} className="mt-0.5" />
              <span className="block min-w-0 text-small font-semibold text-fg">
                {option}
              </span>
            </label>
          ))}
        </RadioGroup>
      ) : null}

      {shownError ? (
        <p id={errorId} role="alert" className="text-tag font-semibold text-telha">
          {t(shownError)}
        </p>
      ) : null}
    </div>
  );
}
