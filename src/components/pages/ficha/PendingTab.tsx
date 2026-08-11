import { useTranslation } from "react-i18next";

export interface PendingTabProps {
  issue: string;
}

export function PendingTab({ issue }: PendingTabProps) {
  const { t } = useTranslation();

  return (
    <p className="rounded-[12px] border border-dashed border-line-strong bg-muted px-4 py-8 text-center font-serif text-micro leading-[1.5] italic text-fg-muted">
      {t("record_tab_pending", { issue })}
    </p>
  );
}
