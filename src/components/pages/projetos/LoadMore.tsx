import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import { transitionAll } from "../../../styles";

export interface LoadMoreProps {
  shown: number;
  total: number;
  step: number;
  onMore: () => void;
}

export function LoadMore({ shown, total, step, onMore }: LoadMoreProps) {
  const { t } = useTranslation();
  const next = Math.min(step, total - shown);

  return (
    <div className="mt-7 flex justify-center pt-2">
      <button
        type="button"
        onClick={onMore}
        className={cn(
          "group inline-flex items-center gap-3.5 rounded-pill border border-telha bg-elevated px-6 py-3",
          "text-micro font-bold tracking-[0.08em] uppercase text-telha",
          transitionAll,
          "hover:-translate-y-px hover:bg-telha hover:text-on-brand hover:shadow-md",
        )}
      >
        {t("load_more")}
        <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-tag font-extrabold tracking-button text-telha group-hover:bg-branco/20 group-hover:text-on-brand">
          +{next}
        </span>
        <span className="text-tag tracking-button text-fg-muted tabular-nums group-hover:text-on-brand/70">
          {shown}/{total}
        </span>
      </button>
    </div>
  );
}
