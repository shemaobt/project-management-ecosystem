import { HeartHandshake } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OverallHealth } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";

const COPY_KEY: Partial<Record<OverallHealth, string>> = {
  critica: "health_care_critical",
  atencao: "health_care_attention",
};

export interface CareNoteProps {
  /**
   * The **server's** reading of the team's health — `derived.health`, never recomputed
   * here. `"na"` is a team nobody has been heard from, which is not `boa` (§5.2); `null`
   * is a record with no derivation yet, which says nothing rather than guessing.
   */
  overall: OverallHealth | null;
}

export function CareNote({ overall }: CareNoteProps) {
  const { t } = useTranslation();

  if (overall === null) return null;

  if (overall === "na") {
    return (
      <p className="rounded-[12px] border border-line-strong bg-muted px-4 py-3 text-micro leading-[1.5] text-fg">
        {t("health_never_assessed")}
      </p>
    );
  }

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
