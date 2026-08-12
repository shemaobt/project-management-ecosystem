import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProgressHistoryEntry } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import { formatDate } from "../../../../../utils/format";
import { historyDeltas } from "../../../../../utils/progress";

function Delta({ value }: { value: number }) {
  if (value === 0) return null;
  return (
    <span
      className={cn("font-bold", value < 0 ? "text-telha" : "text-verde-claro")}
    >
      {" "}
      ({value > 0 ? "+" : ""}
      {value})
    </span>
  );
}

function HistoryItem({ entry }: { entry: ProgressHistoryEntry }) {
  const { t } = useTranslation();
  const locale = t("locale");
  const deltas = historyDeltas(entry);

  return (
    <div className="relative pl-4.5">
      <span
        aria-hidden
        className="absolute top-1.5 -left-0.5 size-2.5 rounded-pill bg-telha ring-3 ring-muted"
      />
      <div className="mb-1 text-[11px] font-bold tracking-[0.1em] uppercase text-telha">
        {formatDate(entry.date, locale)}
        {entry.initial && ` ${t("d_history_initial")}`}
      </div>
      <div className="text-small leading-[1.6] text-fg">
        {t("d_history_translated")} <strong>{entry.translatedUnits}</strong>
        <Delta value={deltas.translated} />
        <br />
        {t("d_history_community")} <strong>{entry.communityCheckedUnits}</strong>
        <Delta value={deltas.community} />
        <br />
        {t("d_history_approved")} <strong>{entry.approvedUnits}</strong>
        <Delta value={deltas.approved} />
      </div>
    </div>
  );
}

export function ProgressoHistory({
  history,
}: {
  history: readonly ProgressHistoryEntry[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-1 flex w-full items-center justify-between rounded-md border border-line bg-elevated px-3.5 py-2.5 text-micro font-semibold tracking-[0.06em] uppercase text-fg transition-colors duration-fast ease-out hover:border-telha"
      >
        <span>
          {t("d_history_toggle")} ({history.length}{" "}
          {history.length === 1 ? t("d_history_record") : t("d_history_records")}
          )
        </span>
        <span aria-hidden>{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3.5 rounded-md border-l-[3px] border-verde-claro bg-muted py-4.5 pr-4.5 pl-8">
          {[...history].reverse().map((entry, index) => (
            <HistoryItem key={index} entry={entry} />
          ))}
        </div>
      )}
    </>
  );
}
