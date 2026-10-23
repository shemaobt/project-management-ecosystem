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
      {/* The spoken count is one text node. With the two numbers in their own <strong>s, a
          change reached Orca as two mutations and it also said "127" on its own, even with
          aria-atomic (OBT-621); the drawn sentence stays as the prototype has it. */}
      <span className="text-tag tracking-[0.01em] text-fg-muted">
        <span aria-hidden>
          {t("sb_results_count")}{" "}
          <strong className="font-bold text-fg-strong">{shown}</strong>{" "}
          {t("sb_results_of")}{" "}
          <strong className="font-bold text-fg-strong">{total}</strong>
        </span>
        <span aria-live="polite" aria-atomic="true" className="sr-only">
          {`${t("sb_results_count")} ${shown} ${t("sb_results_of")} ${total}`}
        </span>
      </span>
      <ClearAll />
    </div>
  );
}
