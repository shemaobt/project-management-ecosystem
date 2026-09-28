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
import { fiscalYearEnd, fiscalYearSpan } from "../../../utils/etenCredits";
import { formatDate } from "../../../utils/format";

export interface YearSelectorProps {
  years: readonly number[];
  value: number;
  onChange: (year: number) => void;
  /** The fiscal year still open, whose label says it closes rather than that it closed. */
  openYear: number;
}

/**
 * ETEN's year is fiscal (GATE-01, 25/set/2026), so each option names both calendar years it
 * spans and the day it closes: a bare `2026` would read as January to December.
 */
export function YearSelector({ years, value, onChange, openYear }: YearSelectorProps) {
  const { t } = useTranslation();
  const label = (year: number) =>
    t(year >= openYear ? "eten_fiscal_label_open" : "eten_fiscal_label", {
      span: fiscalYearSpan(year),
      end: formatDate(fiscalYearEnd(year)),
    });
  const fieldId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{t("eten_report_year")}</Label>
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger id={fieldId} className="min-w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {label(year)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
