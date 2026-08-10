import { useTranslation } from "react-i18next";
import { ClearAll } from "./ClearAll";

export interface ResultCountProps {
  shown: number;
  total: number;
}

export function ResultCount({ shown, total }: ResultCountProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-2 px-1 pt-2">
      <span
        aria-live="polite"
        className="text-tag tracking-[0.01em] text-fg-muted"
      >
        {t("sb_results_count")}{" "}
        <strong className="font-bold text-fg-strong">{shown}</strong>{" "}
        {t("sb_results_of")}{" "}
        <strong className="font-bold text-fg-strong">{total}</strong>
      </span>
      <ClearAll />
    </div>
  );
}
