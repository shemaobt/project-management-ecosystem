import { useTranslation } from "react-i18next";
import { failureMessage } from "../../services/api";
import type { ApiFailure } from "../../types/session";
import { Button } from "../ui";

export interface ProjectsUnreadProps {
  failure: ApiFailure;
  onRetry: () => void;
}

/**
 * Said where a screen waits on the project list and the read failed (OBT-557). Against the
 * server that list is a network call, and a failed one leaves the store unhydrated: without
 * this the screen would spin forever, which says *still coming* about something that is not.
 */
export function ProjectsUnread({ failure, onRetry }: ProjectsUnreadProps) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-muted px-4 py-3 text-small leading-normal text-fg"
    >
      <p>{failureMessage(failure, t)}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        {t("net_retry")}
      </Button>
    </div>
  );
}
