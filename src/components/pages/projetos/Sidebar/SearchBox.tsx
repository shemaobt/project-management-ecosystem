import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFiltersStore } from "../../../../stores/filtersStore";
import { Input } from "../../../ui/Input";

export function SearchBox() {
  const { t } = useTranslation();
  const search = useFiltersStore((state) => state.search);
  const setSearch = useFiltersStore((state) => state.setSearch);

  return (
    <div className="relative mb-2.5">
      <Search
        size={14}
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
      />
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("search_placeholder")}
        className="rounded-pill py-[11px] pr-9 pl-9 text-[13px]"
      />
      {search !== "" && (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label={t("search_clear")}
          className="absolute top-1/2 right-2 flex size-[22px] -translate-y-1/2 items-center justify-center rounded-pill bg-muted text-fg-muted transition-colors duration-fast ease-out hover:bg-telha hover:text-on-brand"
        >
          <X size={11} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
