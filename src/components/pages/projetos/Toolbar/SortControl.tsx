import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/Select";
import { SORT_KEYS, SORT_LABEL_KEYS, type SortKey } from "../sorting";

const isSortKey = (value: string): value is SortKey =>
  SORT_KEYS.some((key) => key === value);

export interface SortControlProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

export function SortControl({ value, onChange }: SortControlProps) {
  const { t } = useTranslation();

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isSortKey(next)) onChange(next);
      }}
    >
      <SelectTrigger
        aria-label={t("sort_by")}
        className="w-auto rounded-pill py-2 pr-3 pl-3.5 text-micro font-medium"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_KEYS.map((key) => (
          <SelectItem key={key} value={key}>
            {t(SORT_LABEL_KEYS[key])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
