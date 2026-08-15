import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui";

export interface YearSelectorProps {
  years: readonly number[];
  value: number;
  onChange: (year: number) => void;
}

export function YearSelector({ years, value, onChange }: YearSelectorProps) {
  const { t } = useTranslation();
  const fieldId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{t("eten_report_year")}</Label>
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger id={fieldId} className="min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
