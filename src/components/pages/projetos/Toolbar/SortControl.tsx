import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/Select";
import {
  SORT_KEYS,
  SORT_LABEL_KEYS,
  isSortKey,
} from "../../../../constants/sorting";
import { usePrefsStore } from "../../../../stores/prefsStore";

export function SortControl() {
  const { t } = useTranslation();
  const value = usePrefsStore((state) => state.sort);
  const setSort = usePrefsStore((state) => state.setSort);

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isSortKey(next)) setSort(next);
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
