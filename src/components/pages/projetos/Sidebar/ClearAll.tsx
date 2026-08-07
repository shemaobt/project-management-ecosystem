import { useTranslation } from "react-i18next";
import {
  hasActiveFilters,
  useFiltersStore,
} from "../../../../stores/filtersStore";

export function ClearAll() {
  const { t } = useTranslation();
  const filters = useFiltersStore((state) => state.filters);
  const search = useFiltersStore((state) => state.search);
  const clearAll = useFiltersStore((state) => state.clearAll);

  if (!hasActiveFilters(filters) && search.trim() === "") return null;

  return (
    <button
      type="button"
      onClick={clearAll}
      className="rounded-xs px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase text-fg-muted transition-colors duration-fast ease-out hover:bg-accent-soft hover:text-telha"
    >
      {t("sb_clear_all")}
    </button>
  );
}
