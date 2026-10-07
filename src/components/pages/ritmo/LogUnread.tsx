import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROLE_DEFINITIONS } from "../../../constants/roles";
import { Button } from "../../ui";

export type LogReading = "forbidden" | "loading" | "failed";

export interface LogUnreadProps {
  reading: LogReading;
  onRetry: () => void;
}

/**
 * What the meeting cards say while the log has not been read — in place of their rows.
 *
 * **An unread log is not an empty one**, the same rule FE-49 gave the Pulse (PR #62 review):
 * with no log every row would read *nova*, which says *never held* when the truth is *we do not
 * know*. So no row is drawn. The Resource Circle's 403 is not a failure to retry: the server
 * keeps the log to the health audience (BE-10, `_meeting_log.py`), and the note names whose it
 * is by the owners of those labels rather than a bare "coordenação".
 */
export function LogUnread({ reading, onRetry }: LogUnreadProps) {
  const { t } = useTranslation();

  if (reading === "forbidden") {
    return (
      <p className="mb-4.5 flex items-start gap-2.5 rounded-[12px] border border-line-strong bg-muted px-4 py-3 text-micro leading-[1.45] text-fg">
        <Lock
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="mt-px shrink-0 text-fg-muted"
        />
        {t("ritmo_log_forbidden", {
          coordinator: t(ROLE_DEFINITIONS.coordinator.labelKey),
          obtLab: t(ROLE_DEFINITIONS.obtLab.labelKey),
        })}
      </p>
    );
  }

  return (
    <div className="mb-4.5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line-strong bg-muted px-4 py-3 text-micro leading-[1.45] text-fg">
      <p>{t(reading === "loading" ? "ritmo_log_loading" : "ritmo_log_unread")}</p>
      {reading === "failed" ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("net_retry")}
        </Button>
      ) : null}
    </div>
  );
}
