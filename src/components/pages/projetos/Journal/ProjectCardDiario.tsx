import { useTranslation } from "react-i18next";
import type {
  OverallHealth,
  Project,
  ProjectPriority,
} from "../../../../types/project";
import { cn } from "../../../../utils/cn";
import { formatDate } from "../../../../utils/format";
import { getPriority } from "../../../../utils/health";
import { getLastProgressUpdate } from "../../../../utils/recency";
import { getLocationDisplay } from "../../../../utils/region";
import { BrandMark } from "../../../common/BrandMark";
import { PriorityPin, StatusDot } from "../../../common/StatusBadge";
import { ProgressRings } from "../ProgressRings";
import {
  getCardDateLabel,
  getCardQuote,
  getIdentityLabel,
  getSpeakerLabel,
  openableCardProps,
} from "../card";

const TAPE_TONES: Record<ProjectPriority, string> = {
  critical: "bg-telha",
  warning: "bg-status-attention",
  completed: "bg-verde-claro",
  default: "bg-azul",
  planned: "bg-telha",
  paused: "bg-telha",
  canceled: "bg-telha",
  unknown: "bg-telha",
};

const TILT = [
  "-rotate-[0.5deg]",
  "rotate-[0.3deg]",
  "rotate-[0.7deg]",
] as const;

const line = "flex items-baseline justify-between py-[3px] text-[13px] text-fg";
const lineLabel = "font-serif text-micro italic text-fg-muted";
const lineValue = "max-w-[60%] truncate text-right font-semibold";

export interface ProjectCardDiarioProps {
  project: Project;
  index: number;
  onOpen: () => void;
}

export function ProjectCardDiario({
  project,
  index,
  onOpen,
}: ProjectCardDiarioProps) {
  const { t } = useTranslation();
  const locale = t("locale");
  const priority = getPriority(project);
  const quote = getCardQuote(project);
  const dateLabel = getCardDateLabel(project, locale);
  const lastUpdate = getLastProgressUpdate(project);
  const location = getLocationDisplay(project);
  const identity = getIdentityLabel(project);
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
        "relative flex cursor-pointer flex-col gap-3 rounded-[2px] border-t border-l border-verde/4",
        "bg-paper px-5.5 pt-6 pb-5.5 shadow-paper",
        "transition-[transform,box-shadow] duration-(--duration) ease-out",
        "hover:-translate-y-1 hover:rotate-0 hover:shadow-paper-hover",
        TILT[index % TILT.length],
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute -top-2.5 left-1/2 h-5.5 w-[110px] -translate-x-1/2 -rotate-2 opacity-85 shadow-card",
          "[mask-image:linear-gradient(to_right,transparent_0,transparent_3%,black_5%,black_95%,transparent_97%)]",
          TAPE_TONES[priority],
        )}
      />
      <PriorityPin priority={priority} className="absolute top-3.5 right-3.5" />

      <div className="mt-3 flex items-start justify-between gap-2.5 border-b border-dashed border-verde/18 pb-3">
        <div className="min-w-0">
          <div className="truncate font-serif text-[24px] leading-[1.1] font-bold tracking-[-0.01em] text-fg">
            {project.languageName}
          </div>
          <div className="mt-1 text-[10px] font-bold tracking-[0.16em] uppercase text-telha">
            {identity}
          </div>
        </div>
        <div className="flex w-[50px] shrink-0 flex-col items-center">
          <BrandMark className="text-fg" />
          <div
            title={
              lastUpdate
                ? `${t("d_last_update")}: ${formatDate(lastUpdate, locale)}`
                : undefined
            }
            className="mt-1 text-center font-serif text-[10px] italic text-fg-muted"
          >
            {dateLabel ?? "—"}
          </div>
        </div>
      </div>

      <div className={line}>
        <span className={lineLabel}>{t("d_facilitators")}</span>
        <span className={lineValue}>{project.team || "—"}</span>
      </div>
      <div className={line}>
        <span className={lineLabel}>{t("d_mentor")}</span>
        <span className={lineValue}>{project.mentor || "—"}</span>
      </div>
      <div className={line}>
        <span className={lineLabel}>{t("d_location")}</span>
        <span className={lineValue}>
          {location.withheld
            ? t(location.regionLabelKey)
            : location.location || "—"}
        </span>
      </div>
      <div className={line}>
        <span className={lineLabel}>{t("d_speakers")}</span>
        <span className={lineValue}>{getSpeakerLabel(project, locale)}</span>
      </div>

      {quote && (
        <p className="mt-2 border-t border-dashed border-verde/18 pt-2.5 font-serif text-[13px] leading-[1.5] italic text-fg">
          <span aria-hidden className="text-[18px] text-telha">
            “
          </span>
          {quote}
          <span aria-hidden className="text-[18px] text-telha">
            ”
          </span>
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-verde/12 pt-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[10px] font-semibold tracking-[0.06em] uppercase text-fg-muted">
            {project.objective[0] ?? "—"}
          </span>
          <div className="text-[13px] font-semibold text-fg tabular-nums">
            <span aria-hidden className="mr-1 text-telha">
              ●
            </span>
            {project.translatedUnits}/{project.totalUnits}{" "}
            <span className="font-medium text-fg-muted">
              {t("d_p_translated_short").toLowerCase()}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-2 text-[10px] text-fg-subtle tabular-nums">
            <span>
              <span aria-hidden className="mr-1 text-azul-ink">
                ●
              </span>
              {project.communityCheckedUnits}{" "}
              {t("d_p_community_short").toLowerCase()}
            </span>
            <span>
              <span aria-hidden className="mr-1 text-verde-claro">
                ●
              </span>
              {project.approvedUnits} {t("d_p_approved_short").toLowerCase()}
            </span>
          </div>
          <div className="mt-0.5 flex gap-[3px]">
            {healthDots.map((dot) => (
              <StatusDot key={dot.label} state={dot.state} label={dot.label} />
            ))}
          </div>
        </div>
        <ProgressRings project={project} />
      </div>
    </article>
  );
}
