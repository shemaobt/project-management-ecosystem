import { useTranslation } from "react-i18next";
import type { Project } from "../../../types/project";
import { cn } from "../../../utils/cn";
import { getProgress } from "../../../utils/progress";
import { getUnitShare } from "./card";

const RINGS = [
  { radius: 38, stroke: "stroke-telha" },
  { radius: 30, stroke: "stroke-azul" },
  { radius: 22, stroke: "stroke-verde-claro" },
] as const;

export interface ProgressRingsProps {
  project: Project;
  className?: string;
}

export function ProgressRings({ project, className }: ProgressRingsProps) {
  const { t } = useTranslation();
  const progress = getProgress(project);
  const shares = [
    getUnitShare(project.translatedUnits, project.totalUnits),
    getUnitShare(project.communityCheckedUnits, project.totalUnits),
    getUnitShare(project.approvedUnits, project.totalUnits),
  ];

  return (
    <div className={cn("relative size-[86px] shrink-0", className)}>
      <svg viewBox="0 0 86 86" aria-hidden className="block size-full -rotate-90">
        {RINGS.map((ring) => (
          <circle
            key={`track-${ring.radius}`}
            cx="43"
            cy="43"
            r={ring.radius}
            fill="none"
            strokeWidth="4"
            className="stroke-verde/10"
          />
        ))}
        {RINGS.map((ring, index) => {
          const circumference = 2 * Math.PI * ring.radius;
          return (
            <circle
              key={ring.radius}
              cx="43"
              cy="43"
              r={ring.radius}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${circumference * shares[index]} ${circumference}`}
              className={ring.stroke}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[22px] leading-none font-black tracking-[-0.02em] text-fg">
        {Math.round(progress)}%
        <small className="mt-0.5 text-[9px] font-semibold tracking-[0.12em] uppercase text-fg-muted">
          {t("d_p_translated_short")}
        </small>
      </div>
    </div>
  );
}
