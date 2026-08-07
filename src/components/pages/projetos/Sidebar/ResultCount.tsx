import { useTranslation } from "react-i18next";
import {
  hasActiveFilters,
  useFiltersStore,
} from "../../../../stores/filtersStore";

export interface ResultCountProps {
  shown: number;
  total: number;
}

export function ResultCount({ shown, total }: ResultCountProps) {
  const { t } = useTranslation();
  const filters = useFiltersStore((state) => state.filters);
  const search = useFiltersStore((state) => state.search);
  const clearAll = useFiltersStore((state) => state.clearAll);
  const isFiltering = hasActiveFilters(filters) || search.trim() !== "";

  return (
    <div className="flex items-center justify-between gap-2 px-1 pt-2">
      <span
        aria-live="polite"
        className="text-tag tracking-[0.01em] text-fg-muted"
      >
        {t("sb_results_count")}{" "}
        <strong className="font-bold text-preto">{shown}</strong>{" "}
        {t("sb_results_of")}{" "}
        <strong className="font-bold text-preto">{total}</strong>
      </span>
      {isFiltering && (
        <button
          type="button"
          onClick={clearAll}
          className="rounded-xs px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase text-fg-muted transition-colors duration-fast ease-out hover:bg-accent-soft hover:text-telha"
        >
          {t("sb_clear_all")}
        </button>
      )}
    </div>
  );
}
