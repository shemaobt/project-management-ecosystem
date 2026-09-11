import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  isPrayerVisibility,
  PRAYER_VISIBILITY_HINT_KEYS,
  PRAYER_VISIBILITY_LABEL_KEYS,
} from "../../../constants/prayer";
import type { IntakeField } from "../../../types/forms";
import type { BookProgressItem } from "../../../types/project";
import { BookTable } from "../ficha/tabs/progresso/BookTable";
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

export function IntakeFieldInput({
  field,
  value,
  onChange,
  errorKey,
}: IntakeFieldInputProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const invalid = Boolean(errorKey);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>
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
        <BookTable rows={asRows(value)} onChange={onChange} />
      ) : null}

      {field.type === "choice" ? (
        <RadioGroup
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
              <span className="min-w-0">
                <span className="block text-small font-semibold text-fg">
                  {isPrayerVisibility(option)
                    ? t(PRAYER_VISIBILITY_LABEL_KEYS[option])
                    : option}
                </span>
                {isPrayerVisibility(option) ? (
                  <span className="block text-tag text-fg-subtle">
                    {t(PRAYER_VISIBILITY_HINT_KEYS[option])}
                  </span>
                ) : null}
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
