import { HeartHandshake } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AssessedProject } from "../../../../../constants/health";
import { getOverallHealth, isAssessed } from "../../../../../utils/health";
import { cn } from "../../../../../utils/cn";

const COPY_KEY: Record<string, string> = {
  critica: "health_care_critical",
  atencao: "health_care_attention",
};

export interface CareNoteProps {
  project: AssessedProject;
}

export function CareNote({ project }: CareNoteProps) {
  const { t } = useTranslation();

  if (!isAssessed(project)) {
    return (
      <p className="rounded-[12px] border border-line-strong bg-muted px-4 py-3 text-micro leading-[1.5] text-fg">
        {t("health_never_assessed")}
      </p>
    );
  }

  const overall = getOverallHealth(project);
  const key = COPY_KEY[overall];
  if (!key) return null;

  return (
    <p
      className={cn(
        "flex items-start gap-2.5 rounded-[12px] border px-4 py-3 text-micro leading-[1.5] text-fg",
        overall === "critica"
          ? "border-telha bg-accent-soft"
          : "border-status-attention-fg bg-status-attention-bg",
      )}
    >
      <HeartHandshake
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className={cn(
          "mt-px shrink-0",
          overall === "critica" ? "text-telha" : "text-status-attention-fg",
        )}
      />
      {t(key)}
    </p>
  );
}
