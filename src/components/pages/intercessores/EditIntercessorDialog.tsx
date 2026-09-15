import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { listCountries } from "../../../utils/countries";
import type { EditField, IntercessorEditDraft } from "../../../utils/intercessors";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import {
  Button,
  CheckboxField,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui";

const HINT_KEYS: Record<EditField, string> = {
  name: "int_needs_name",
  country: "int_needs_country",
  contact: "int_needs_contact",
};

export interface EditIntercessorDialogProps {
  open: boolean;
  draft: IntercessorEditDraft | null;
  revealing: boolean;
  showing: readonly EditField[];
  onChange: (draft: IntercessorEditDraft) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function EditIntercessorDialog({
  open,
  draft,
  revealing,
  showing,
  onChange,
  onSubmit,
  onClose,
}: EditIntercessorDialogProps) {
  const { t } = useTranslation();
  const nameId = useId();
  const countryId = useId();
  const contactId = useId();

  const locale = t("locale");
  const countries = useMemo(() => listCountries(locale), [locale]);

  const invalid = (field: EditField) => showing.includes(field);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent closeLabel={t("btn_close")}>
        <DialogHeader>
          <DialogTitle>{t("int_edit")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {revealing || !draft ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" label={t("int_revealing")} />
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={nameId}>{t("int_name")}</Label>
                <Input
                  id={nameId}
                  value={draft.name}
                  invalid={invalid("name")}
                  onChange={(event) =>
                    onChange({ ...draft, name: event.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={countryId}>{t("int_country")}</Label>
                <Select
                  value={draft.country}
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

              <CheckboxField
                id={`${nameId}-sensitive`}
                label={t("f_sensitive")}
                checked={draft.sensitiveCountry}
                onCheckedChange={(next) =>
                  onChange({ ...draft, sensitiveCountry: next === true })
                }
              />

              {showing.length > 0 ? (
                <ul className="flex list-none flex-col gap-1">
                  {showing.map((field) => (
                    <li
                      key={field}
                      className="text-micro leading-[1.45] text-telha"
                    >
                      {t(HINT_KEYS[field])}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t("btn_cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={revealing || !draft}>
            {t("int_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
