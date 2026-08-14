import { useTranslation } from "react-i18next";
import {
  MEETING_STATE_LABEL_KEYS,
  MEETING_STATE_SYMBOLS,
} from "../../../constants/meetings";
import { pillBase, RHYTHM_TONES, transitionColors } from "../../../styles";
import type { MeetingReadinessCount, MeetingStatus } from "../../../types/meeting";
import { formatDate } from "../../../utils/format";
import type { MeetingParticipant, RhythmScope } from "../../../utils/rhythm";
import { cn } from "../../../utils/cn";
import { Button } from "../../ui";

const ROW_TONES: Record<MeetingStatus["state"], string> = {
  done: "border-line bg-elevated",
  pending: "border-line bg-canvas",
  overdue: "border-rhythm-overdue-fg/40 bg-rhythm-overdue-bg/40",
  new: "border-line bg-canvas",
};

export interface MeetingRowProps {
  scope: RhythmScope;
  status: MeetingStatus;
  nextDue: string;
  periodLabel: string;
  readiness: MeetingReadinessCount | null;
  participants: readonly MeetingParticipant[];
  onLog: () => void;
  onUndo: () => void;
}

export function MeetingRow({
  scope,
  status,
  nextDue,
  periodLabel,
  readiness,
  participants,
  onLog,
  onUndo,
}: MeetingRowProps) {
  const { t } = useTranslation();
  const named = participants.filter((person) => person.fromOrgChart);

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3.5",
        transitionColors,
        ROW_TONES[status.state],
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] leading-tight font-bold tracking-[0.03em] uppercase text-fg-strong">
            {t(scope.labelKey)}
          </span>
          <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-bold text-fg-muted">
            {scope.count}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {readiness ? (
            <span
              className="text-tag font-semibold text-verde-claro-ink"
              title={t("ritmo_readiness")}
            >
              {readiness.ready}/{readiness.total} {t("ritmo_reported")}
            </span>
          ) : null}
          <span className="text-micro text-fg-muted">
            {t("ritmo_last")}:{" "}
            <strong className="font-bold text-fg-strong">
              {status.date ? formatDate(status.date) : "—"}
            </strong>
          </span>
          <span className={cn(pillBase, RHYTHM_TONES[status.state])}>
            <span aria-hidden className="font-black">
              {MEETING_STATE_SYMBOLS[status.state]}
            </span>
            {t(MEETING_STATE_LABEL_KEYS[status.state])}
          </span>
        </div>
      </div>

      {named.length > 0 ? (
        <p className="mt-2 text-micro leading-[1.45] text-fg-muted">
          <span className="font-bold">{t("ritmo_participants")}:</span>{" "}
          {named.map((person, index) => (
            <span key={person.key}>
              {index > 0 ? " · " : ""}
              {t(person.labelKey)}{" "}
              <span className="font-semibold text-fg">
                {person.holder ?? t("sb_no_coordinator")}
              </span>
            </span>
          ))}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center justify-end gap-3 border-t border-dashed border-line pt-2.5">
        {status.state === "done" ? (
          <>
            <span className="mr-auto font-serif text-micro leading-none italic text-fg-muted">
              {t("ritmo_done_this")} {periodLabel}
            </span>
            <Button variant="secondary" size="sm" onClick={onUndo}>
              {t("ritmo_undo")}
            </Button>
          </>
        ) : (
          <>
            <span className="mr-auto text-micro font-medium text-fg-muted">
              {t("ritmo_next")}: {nextDue}
            </span>
            <Button size="sm" onClick={onLog}>
              {t("ritmo_register")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
