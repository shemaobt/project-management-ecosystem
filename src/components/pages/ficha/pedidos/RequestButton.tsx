import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RequestAction } from "../../../../utils/requests";
import { LoadingSpinner } from "../../../common/LoadingSpinner";
import { Button } from "../../../ui";

export interface RequestButtonProps {
  action: RequestAction | null;
  formAvailable: boolean;
  opening: boolean;
  onOpen: () => void;
  onRetry: () => void;
}

export function RequestButton({
  action,
  formAvailable,
  opening,
  onOpen,
  onRetry,
}: RequestButtonProps) {
  const { t } = useTranslation();

  if (action === null || action.kind === "none") return null;

  if (action.kind === "checking") {
    return <LoadingSpinner size="sm" label={t("rr_membership_checking")} />;
  }

  if (action.kind === "unread") {
    return (
      <div className="flex max-w-[44ch] flex-wrap items-center gap-2">
        <p role="alert" className="text-micro font-semibold text-accent-press">
          {t("rr_membership_unread")}
        </p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t("net_retry")}
        </Button>
      </div>
    );
  }

  if (action.kind === "inProgress") {
    return (
      <p className="text-micro font-semibold text-fg-muted">
        {action.by ? t("rr_in_progress_by", { name: action.by }) : t("rr_in_progress_other")}
      </p>
    );
  }

  if (!formAvailable) {
    return (
      <p className="max-w-[40ch] text-micro font-semibold text-status-attention-fg">
        {t("rr_form_unavailable", { admin: t("role_admin") })}
      </p>
    );
  }

  return (
    <Button size="sm" disabled={opening} aria-busy={opening} onClick={onOpen}>
      {opening ? t("rr_opening") : action.kind === "start" ? t("rr_start") : t("rr_continue")}
      <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{t("rr_opens_new_tab")}</span>
    </Button>
  );
}
