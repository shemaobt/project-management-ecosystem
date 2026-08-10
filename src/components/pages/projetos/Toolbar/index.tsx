import { useTranslation } from "react-i18next";
import type { SortKey } from "../sorting";
import { MetaphorPill } from "./MetaphorPill";
import { SortControl } from "./SortControl";

export interface ToolbarProps {
  count: number;
  total: number;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
}

export function Toolbar({ count, total, sort, onSortChange }: ToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-3.5">
      <p className="font-serif text-[15px] italic text-fg-muted">
        <strong className="font-sans font-bold text-verde not-italic">
          {count}
        </strong>{" "}
        {count === 1 ? t("results_one") : t("results_many")}
        {count !== total && (
          <span>
            {" "}
            {t("results_of")} {total}
          </span>
        )}
      </p>
      <div className="flex items-center gap-3.5">
        <MetaphorPill />
        <SortControl value={sort} onChange={onSortChange} />
      </div>
    </div>
  );
}
