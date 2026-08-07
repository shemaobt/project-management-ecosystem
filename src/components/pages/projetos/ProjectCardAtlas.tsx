import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { STALE_LABEL_KEYS } from "../../../constants/status";
import type {
  OverallHealth,
  Project,
  ProjectPriority,
} from "../../../types/project";
import { cn } from "../../../utils/cn";
import { getPriority } from "../../../utils/health";
import { getProgress } from "../../../utils/progress";
import { getDeadlineInfo, getStaleStatus } from "../../../utils/recency";
import { getLocationDisplay } from "../../../utils/region";
import { StatusDot } from "../../common/StatusBadge";

const STAMP_TONES: Record<ProjectPriority, string> = {
  default: "bg-verde text-branco",
  critical: "bg-telha text-branco",
  warning: "bg-stamp-warning text-branco",
  completed: "bg-verde-claro text-branco",
  canceled: "bg-areia text-verde",
  paused: "bg-fg-subtle text-branco",
  planned: "bg-azul text-branco",
  unknown: "bg-tone-unknown text-branco",
};

const CARD_TONES: Partial<Record<ProjectPriority, string>> = {
  canceled: "opacity-[0.68]",
  unknown: "opacity-[0.86]",
};

const metaDot = "size-[3px] shrink-0 rounded-pill bg-fg-subtle";

const tagPill =
  "rounded-pill px-[7px] py-0.5 text-[10px] font-semibold tracking-button";

export interface ProjectCardAtlasProps {
  project: Project;
  onClick?: () => void;
}

export function ProjectCardAtlas({ project, onClick }: ProjectCardAtlasProps) {
  const { t } = useTranslation();
  const progress = getProgress(project);
  const priority = getPriority(project);
  const deadline = getDeadlineInfo(project.deadline);
  const stale = getStaleStatus(project);
  const location = getLocationDisplay(project);
  const locationText = location.withheld
    ? t(location.regionLabelKey)
    : project.location.split("—")[0].trim();
  const types = project.translationType.slice(0, 2);
  const healthDots: { state: OverallHealth; label: string }[] = [
    { state: project.healthEmotional || "na", label: t("d_emotional") },
    { state: project.healthRelational || "na", label: t("d_relational") },
    { state: project.healthSpiritual || "na", label: t("d_spiritual") },
  ];

  return (
    <article
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "grid grid-cols-[84px_minmax(0,1fr)_200px_140px_80px] items-center gap-5 rounded-md border border-line bg-elevated px-5.5 py-4.5",
        "transition-all duration-[180ms] ease-out hover:-translate-y-px hover:border-telha hover:shadow-card",
        "max-lg:grid-cols-[70px_1fr] max-lg:gap-3.5",
        onClick && "cursor-pointer",
        CARD_TONES[priority],
      )}
    >
      <div
        className={cn(
          "relative flex h-[78px] flex-col items-center justify-center rounded-sm px-1.5 py-2.5 text-center",
          STAMP_TONES[priority],
        )}
      >
        <div
          className={cn(
            "font-sans text-[24px] leading-none font-black tracking-button uppercase",
            priority === "canceled" && "line-through opacity-70",
          )}
        >
          {project.languageCode || "—"}
        </div>
        <div className="mt-[5px] text-[9px] font-semibold tracking-[0.18em] uppercase opacity-75">
          ISO
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <div className="truncate font-sans text-lead leading-[1.1] font-bold tracking-[-0.01em] text-verde">
          {project.languageName}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-micro text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <Users size={11} strokeWidth={1.75} aria-hidden />
            {project.team || "—"}
          </span>
          {locationText && (
            <>
              <span className={metaDot} />
              <span
                title={location.withheld ? locationText : project.location}
              >
                {locationText}
              </span>
            </>
          )}
          {project.bridgeLanguage && (
            <>
              <span className={metaDot} />
              <span className="font-serif italic">
                {project.bridgeLanguage} → {project.languageName}
              </span>
            </>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {types.map((type) => (
            <span key={type} className={cn(tagPill, "bg-accent-soft text-telha")}>
              {type}
            </span>
          ))}
          {project.objective.slice(0, 1).map((objective) => (
            <span
              key={objective}
              className={cn(tagPill, "bg-verde-claro/18 text-verde-claro")}
            >
              {objective}
            </span>
          ))}
          {project.portion && (
            <span
              className={cn(
                tagPill,
                "border border-line bg-muted font-serif font-normal tracking-normal italic text-verde",
              )}
            >
              📖 {project.portion}
            </span>
          )}
          {stale && stale !== "em-dia" && (
            <span className="mt-0.5 rounded-pill bg-accent-soft px-[7px] py-0.5 text-[10px] font-bold tracking-button uppercase text-telha">
              {t(STALE_LABEL_KEYS[stale])}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[5px] max-lg:col-span-full">
        <div className="flex justify-between text-tag font-semibold tracking-button uppercase text-fg-muted">
          <span>{t("d_p_translated")}</span>
          <strong className="text-[13px] font-bold text-verde tabular-nums">
            {project.translatedUnits || 0}/{project.totalUnits || 0}{" "}
            <span className="text-tag font-medium text-fg-muted">
              · {Math.round(progress)}%
            </span>
          </strong>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-pill bg-muted">
          <div
            className="h-full rounded-pill bg-linear-to-r from-verde-claro to-telha transition-[width] duration-slow ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-[10px] text-fg-subtle tabular-nums">
          <span>
            {project.communityCheckedUnits || 0}{" "}
            {t("d_p_community").toLowerCase()}
          </span>
          <span>
            {project.approvedUnits || 0} {t("d_p_approved").toLowerCase()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 max-lg:col-span-full">
        {healthDots.map((dot) => (
          <StatusDot key={dot.label} state={dot.state} label={dot.label} />
        ))}
      </div>

      <div className="flex flex-col items-end gap-[3px] text-right max-lg:col-span-full max-lg:items-start">
        <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-fg-muted">
          {t("d_deadline")}
        </div>
        <div
          className={cn(
            "font-sans text-[13px] font-bold text-verde tabular-nums",
            deadline.cls === "overdue" && "text-telha",
            deadline.cls === "soon" && "text-deadline-soon",
          )}
        >
          {deadline.days !== null
            ? deadline.days < 0
              ? `${Math.abs(deadline.days)}${t("days_overdue")}`
              : `${deadline.days}${t("days_remaining")}`
            : "—"}
        </div>
      </div>
    </article>
  );
}
