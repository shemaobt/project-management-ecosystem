import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useResourceForm } from "../../hooks/useResourceForm";
import { cn } from "../../utils/cn";

export interface ResourceCircleEntryProps {
  base: string;
  className: string;
}

export function ResourceCircleEntry({ base, className }: ResourceCircleEntryProps) {
  const { t } = useTranslation();
  const { open, opening } = useResourceForm(base);

  return (
    <button
      type="button"
      className={cn(className, "inline-flex items-center gap-1.5 disabled:cursor-wait")}
      title={t("rr_entry_hint")}
      disabled={opening}
      aria-busy={opening}
      onClick={() => void open(null)}
    >
      {t("ritmo_role_resourcecircle")}
      <ExternalLink size={13} strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{t("rr_opens_new_tab")}</span>
    </button>
  );
}
