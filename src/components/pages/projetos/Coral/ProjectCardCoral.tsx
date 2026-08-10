import { useTranslation } from "react-i18next";
import { STALE_LABEL_KEYS } from "../../../../constants/status";
import type {
  OverallHealth,
  Project,
  ProjectPriority,
} from "../../../../types/project";
import { cn } from "../../../../utils/cn";
import { getPriority } from "../../../../utils/health";
import { getProgress } from "../../../../utils/progress";
import { getDeadlineInfo, getStaleStatus } from "../../../../utils/recency";
import { getLocationDisplay } from "../../../../utils/region";
import { PriorityPin, StatusDot } from "../../../common/StatusBadge";
import { getUnitShare, openableCardProps } from "../card";

const ARC_TONES: Record<ProjectPriority, string> = {
  critical: "bg-telha opacity-[0.08]",
  warning: "bg-verde-claro opacity-[0.06]",
  completed: "bg-verde-claro opacity-[0.15]",
  planned: "bg-verde-claro opacity-[0.06]",
  paused: "bg-verde-claro opacity-[0.06]",
  canceled: "bg-verde-claro opacity-[0.06]",
  unknown: "bg-verde-claro opacity-[0.06]",
  default: "bg-verde-claro opacity-[0.06]",
};

const RING_RADII = [38, 30, 22] as const;

const statLabel = "mt-1 text-[9px] font-semibold tracking-[0.1em] uppercase";

export interface ProjectCardCoralProps {
  project: Project;
  onOpen: () => void;
}

export function ProjectCardCoral({ project, onOpen }: ProjectCardCoralProps) {
  const { t } = useTranslation();
  const priority = getPriority(project);
  const progress = getProgress(project);
  const stale = getStaleStatus(project);
  const deadline = getDeadlineInfo(project.deadline);
  const location = getLocationDisplay(project);
  const rings = [
    {
      radius: RING_RADII[0],
      stroke: "stroke-telha",
      share: getUnitShare(project.translatedUnits, project.totalUnits),
    },
    {
      radius: RING_RADII[1],
      stroke: "stroke-azul",
      share: getUnitShare(project.communityCheckedUnits, project.totalUnits),
    },
    {
      radius: RING_RADII[2],
      stroke: "stroke-verde-claro",
      share: getUnitShare(project.approvedUnits, project.totalUnits),
    },
  ];
  const healthDots: { state: OverallHealth; label: string }[] = [
    { state: project.healthEmotional || "na", label: t("d_emotional") },
    { state: project.healthRelational || "na", label: t("d_relational") },
    { state: project.healthSpiritual || "na", label: t("d_spiritual") },
  ];

  return (
    <article
      {...openableCardProps(
        t("card_open", { language: project.languageName }),
        onOpen,
      )}
      className={cn(
        "relative flex w-full cursor-pointer flex-col gap-3.5 overflow-hidden rounded-lg bg-elevated p-5.5 shadow-card",
        "transition-all duration-(--duration) ease-out hover:-translate-y-[3px] hover:shadow-md",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-[50px] -bottom-[50px] size-[200px] rounded-pill",
          ARC_TONES[priority],
        )}
      />
      <PriorityPin priority={priority} className="absolute top-3.5 right-3.5" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[22px] leading-[1.05] font-extrabold tracking-[-0.015em] text-verde">
            {project.languageName}
          </div>
          <div className="mt-1.5 font-serif text-tag leading-[1.4] italic text-fg-muted">
            <strong className="font-sans text-[10px] font-bold tracking-[0.06em] uppercase not-italic text-telha">
              {project.languageCode || "—"}
            </strong>{" "}
            ·{" "}
            {location.withheld
              ? t(location.regionLabelKey)
              : location.location || "—"}
            <br />
            {project.team || "—"}
          </div>
        </div>
        <div className="relative size-[86px] shrink-0">
          <svg viewBox="0 0 86 86" className="block size-full -rotate-90">
            {rings.map((ring) => (
              <circle
                key={ring.radius}
                cx="43"
                cy="43"
                r={ring.radius}
                fill="none"
                strokeWidth="4"
                className="stroke-verde/10"
              />
            ))}
            {rings.map((ring) => {
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
                  strokeDasharray={`${circumference * ring.share} ${circumference}`}
                  className={ring.stroke}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[22px] leading-none font-black tracking-[-0.02em] text-verde">
            {Math.round(progress)}%
            <small className="mt-0.5 text-[9px] font-semibold tracking-[0.12em] uppercase text-fg-muted">
              {t("d_p_translated_short")}
            </small>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 rounded-md bg-muted px-2 py-3">
        <div className="border-r border-line px-1 text-center">
          <div className="text-[18px] leading-none font-extrabold text-verde tabular-nums">
            {project.translatedUnits}
            <small className="text-[10px] font-medium text-fg-muted">
              /{project.totalUnits}
            </small>
          </div>
          <div className={cn(statLabel, "text-telha")}>
            ● {t("d_p_translated_short")}
          </div>
        </div>
        <div className="border-r border-line px-1 text-center">
          <div className="text-[18px] leading-none font-extrabold text-verde tabular-nums">
            {project.communityCheckedUnits}
          </div>
          <div className={cn(statLabel, "text-coral-community")}>
            ● {t("d_p_community_short")}
          </div>
        </div>
        <div className="px-1 text-center">
          <div className="text-[18px] leading-none font-extrabold text-verde tabular-nums">
            {project.approvedUnits}
          </div>
          <div className={cn(statLabel, "text-verde-claro")}>
            ● {t("d_p_approved_short")}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5 text-micro">
        <div className="flex items-center gap-2 text-fg-muted">
          {healthDots.map((dot) => (
            <StatusDot key={dot.label} state={dot.state} label={dot.label} />
          ))}
          {stale && stale !== "em-dia" && (
            <span className="rounded-pill bg-accent-soft px-2.25 py-0.75 text-[10px] font-bold tracking-button text-telha">
              {t(STALE_LABEL_KEYS[stale])}
            </span>
          )}
        </div>
        {deadline.days !== null && (
          <div
            className={cn(
              "shrink-0 text-[13px] font-bold text-verde tabular-nums",
              deadline.cls === "overdue" && "text-telha",
              deadline.cls === "soon" && "text-deadline-soon",
            )}
          >
            {deadline.days < 0
              ? `${Math.abs(deadline.days)}${t("days_overdue")}`
              : `${deadline.days}${t("days_remaining")}`}
          </div>
        )}
      </div>
    </article>
  );
}
