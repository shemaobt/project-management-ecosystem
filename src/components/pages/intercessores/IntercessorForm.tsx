import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui";
import { listCountries } from "../../../utils/countries";
import type {
  IntercessorDraft,
  IntercessorField,
} from "../../../utils/intercessors";

const HINT_KEYS: Record<IntercessorField, string> = {
  name: "int_needs_name",
  country: "int_needs_country",
  contact: "int_needs_contact",
};

export interface IntercessorFormProps {
  draft: IntercessorDraft;
  onChange: (draft: IntercessorDraft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  showing: readonly IntercessorField[];
  editing: boolean;
}

export function IntercessorForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  showing,
  editing,
}: IntercessorFormProps) {
  const { t } = useTranslation();
  const nameId = useId();
  const countryId = useId();
  const contactId = useId();

  const locale = t("locale");
  const countries = useMemo(() => listCountries(locale), [locale]);

  const invalid = (field: IntercessorField) => showing.includes(field);

  return (
    <section className="mb-5.5 rounded-lg border border-line bg-elevated px-6 py-5.5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1.2fr_1fr_1.4fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameId}>{t("int_name")}</Label>
          <Input
            id={nameId}
            value={draft.name}
            invalid={invalid("name")}
            placeholder={t("int_name_ph")}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value })
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={countryId}>{t("int_country")}</Label>
          <Select
            value={draft.country || undefined}
            onValueChange={(country) => onChange({ ...draft, country })}
          >
            <SelectTrigger
              id={countryId}
              aria-invalid={invalid("country") || undefined}
            >
              <SelectValue placeholder={t("int_country_select")} />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={contactId}>{t("int_contact")}</Label>
          <Input
            id={contactId}
            value={draft.contact}
            invalid={invalid("contact")}
            placeholder={t("int_contact_ph")}
            onChange={(event) =>
              onChange({ ...draft, contact: event.target.value })
            }
          />
        </div>
      </div>

      {showing.length > 0 ? (
        <ul className="mt-3 flex list-none flex-col gap-1">
          {showing.map((field) => (
            <li key={field} className="text-micro leading-[1.45] text-telha">
              {t(HINT_KEYS[field])}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <Button onClick={onSubmit}>
          {editing ? t("int_save") : t("int_add")}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            {t("btn_cancel")}
          </Button>
        ) : null}
      </div>

      <p className="mt-3.5 text-micro leading-[1.45] text-fg-subtle">
        {t("int_privacy_note")}
      </p>
    </section>
  );
}
