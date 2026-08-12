import { useTranslation } from "react-i18next";
import { DEFAULT_UNIT_TYPE } from "../../../../../constants/project";
import { materializeDraft } from "../../../../../stores/recordStore";
import type { StaleStatus } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import { getProgress } from "../../../../../utils/progress";
import { getDaysSinceUpdate, getStaleStatus } from "../../../../../utils/recency";
import { Progress } from "../../../../ui";
import { getUnitShare } from "../../../projetos/card";
import type { DraftHandle } from "../../useDraft";
import { ProgressoHistory } from "./ProgressoHistory";
import {
  STATUS_BANNER_DOTS,
  STATUS_BANNER_LABEL_KEYS,
  toBreakdownRow,
  type BreakdownRow,
} from "./sections";

export interface ProgressoViewProps {
  draft: DraftHandle;
}

type ProgressTone = "translated" | "community" | "approved";

function AggregateRow({
  label,
  value,
  max,
  detail,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  detail: string;
  tone: ProgressTone;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 font-semibold tracking-button">
        <span className="text-[11px] tracking-[0.1em] uppercase text-fg-muted">
          <span aria-hidden>● </span>
          {label}
        </span>
        <span className="text-body font-extrabold tabular-nums text-fg">
          {value}{" "}
          <small className="text-micro font-medium text-fg-muted">
            {detail}
          </small>
        </span>
      </div>
      <Progress value={value} max={max} label={label} size="lg" tone={tone} />
    </div>
  );
}

function StaleBanner({
  stale,
  days,
}: {
  stale: StaleStatus;
  days: number | null;
}) {
  const { t } = useTranslation();
  if (stale === "em-dia" || days === null) return null;
  const critical = stale === "critico";
  return (
    <div
      className={cn(
        "flex gap-3.5 rounded-md border-l-4 px-4.5 py-3.5 text-small leading-[1.45]",
        critical
          ? "border-telha bg-accent-soft text-telha"
          : "border-status-attention bg-status-attention-bg text-status-attention-fg",
      )}
    >
      <span aria-hidden className="text-h4 leading-none">
        ⚠
      </span>
      <div>
        <strong className="mb-0.5 block">
          {t(critical ? "stale_crit_title" : "stale_warn_title")}
        </strong>
        {t(critical ? "stale_crit_text" : "stale_warn_text")}{" "}
        <b>
          {days} {t("days")}
        </b>
        .
      </div>
    </div>
  );
}

function BreakdownTable({
  icon,
  title,
  rows,
}: {
  icon: string;
  title: string;
  rows: BreakdownRow[];
}) {
  const { t } = useTranslation();
  const grid =
    "grid grid-cols-[minmax(0,1.6fr)_1fr_1fr_1fr] items-center gap-2.5 px-3.5 py-2";

  return (
    <div className="overflow-hidden rounded-md border border-line bg-elevated">
      <div
        className={cn(
          grid,
          "border-b border-line bg-muted text-[10px] font-bold tracking-[0.1em] uppercase text-fg-muted",
        )}
      >
        <span>
          <span aria-hidden>{icon} </span>
          {title}
        </span>
        <span className="text-center">{t("col_translated")}</span>
        <span className="text-center">{t("col_checked")}</span>
        <span className="text-center">{t("col_approved")}</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className={cn(grid, "border-b border-line text-small last:border-b-0")}
        >
          <span className="font-semibold text-fg">
            {row.name}
            {row.chapters > 1 && (
              <em className="font-normal not-italic text-fg-muted">
                {" "}
                · {row.chapters} {t("unit_chapters_short")}
              </em>
            )}
          </span>
          {(
            [
              ["translated", row.translated, t("col_translated")],
              ["community", row.community, t("col_checked")],
              ["approved", row.approved, t("col_approved")],
            ] as const
          ).map(([tone, value, label]) => (
            <span
              key={tone}
              className="inline-flex items-center justify-center gap-1.5"
            >
              <Progress
                value={value}
                max={row.chapters}
                label={`${row.name} · ${label}`}
                size="sm"
                tone={tone}
                className="min-w-9"
              />
              <span className="min-w-7.5 text-center tabular-nums text-fg">
                {value}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProgressoView({ draft }: ProgressoViewProps) {
  const { t } = useTranslation();
  const project = materializeDraft(draft.values);

  const status = project.status;
  const stale = getStaleStatus(project);
  const days = getDaysSinceUpdate(project);
  const unitLabel = (project.totalUnitsType || DEFAULT_UNIT_TYPE).toLowerCase();
  const progress = Math.round(getProgress(project));
  const communityRate = Math.round(
    getUnitShare(project.communityCheckedUnits, project.translatedUnits) * 100,
  );
  const approvalRate = Math.round(
    getUnitShare(project.approvedUnits, project.translatedUnits) * 100,
  );

  const breakdowns = (
    [
      ["📖", t("d_bp_books"), project.bookProgress],
      ["📚", t("d_bp_stories"), project.storyProgress],
      ["🎬", t("progress_other_title"), project.otherProgress ?? []],
    ] as const
  ).filter(([, , rows]) => rows.length > 0);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5 rounded-md border border-line bg-elevated px-4 py-2.5">
        <span
          aria-hidden
          className={cn("size-3 rounded-pill", STATUS_BANNER_DOTS[status])}
        />
        <strong className="text-small font-semibold tracking-[0.02em] text-fg">
          {t(STATUS_BANNER_LABEL_KEYS[status])}
        </strong>
      </div>

      {stale && <StaleBanner stale={stale} days={days} />}

      <div className="flex flex-col gap-3.5 rounded-md bg-muted px-5 py-4.5">
        <AggregateRow
          label={t("d_p_translated")}
          value={project.translatedUnits}
          max={project.totalUnits}
          detail={`/ ${project.totalUnits} ${unitLabel} · ${progress}%`}
          tone="translated"
        />
        <AggregateRow
          label={t("d_p_community")}
          value={project.communityCheckedUnits}
          max={project.translatedUnits}
          detail={`/ ${project.translatedUnits} · ${communityRate}%`}
          tone="community"
        />
        <AggregateRow
          label={t("d_p_approved")}
          value={project.approvedUnits}
          max={project.translatedUnits}
          detail={`/ ${project.translatedUnits} · ${approvalRate}%`}
          tone="approved"
        />
      </div>

      {breakdowns.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {breakdowns.map(([icon, title, rows]) => (
            <BreakdownTable
              key={title}
              icon={icon}
              title={title}
              rows={rows.map(toBreakdownRow)}
            />
          ))}
        </div>
      )}

      <ProgressoHistory history={project.progressHistory} />
    </div>
  );
}
