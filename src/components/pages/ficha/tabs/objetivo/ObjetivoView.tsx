import { useTranslation } from "react-i18next";
import { formatDate } from "../../../../../utils/format";
import { getDeadlineInfo } from "../../../../../utils/recency";
import { Badge } from "../../../../ui";
import { DetailItem, FieldGrid, NotesPanel, TagRow } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { phaseTitle } from "./phases";

export interface ObjetivoViewProps {
  draft: DraftHandle;
}

export function ObjetivoView({ draft }: ObjetivoViewProps) {
  const { t } = useTranslation();
  const locale = t("locale");
  const values = draft.values;
  const phases = values.phases ?? [];
  const deadline = getDeadlineInfo(values.deadline ?? "");

  return (
    <FieldGrid>
      <DetailItem label={t("d_objective")} full>
        <TagRow values={values.objective ?? []} />
      </DetailItem>

      <DetailItem label={t("d_type")} full>
        <TagRow values={values.translationType ?? []} />
      </DetailItem>

      <DetailItem label={t("d_start")}>
        {formatDate(values.startDate ?? "", locale)}
      </DetailItem>

      <DetailItem label={t("d_deadline")}>
        {formatDate(values.deadline ?? "", locale)}
        {deadline.days !== null && (
          <Badge
            tone={deadline.cls === "overdue" ? "accent" : "green"}
            className="ml-2 align-middle"
          >
            {deadline.days < 0
              ? `${Math.abs(deadline.days)}${t("days_overdue")}`
              : `${deadline.days}${t("days_remaining")}`}
          </Badge>
        )}
      </DetailItem>

      {values.objectiveNotes && (
        <DetailItem label={t("f_notes")} full>
          <NotesPanel>{values.objectiveNotes}</NotesPanel>
        </DetailItem>
      )}

      {phases.length > 0 && (
        <DetailItem label={t("d_phases")} full>
          <div className="mt-1.5 flex flex-col gap-2">
            {phases.map((phase, index) => (
              <div
                key={index}
                className="flex items-baseline gap-3 rounded-md bg-muted px-3.5 py-2"
              >
                <span className="flex-none text-[13px] font-bold text-telha">
                  {phaseTitle(phase, index, t("f_phase_n"))}
                </span>
                <span className="flex-1 font-serif text-small font-normal not-italic">
                  {phase.scope || "—"}
                </span>
                <span className="flex-none text-[13px] font-normal text-fg-muted">
                  {phase.date ? formatDate(phase.date, locale) : "—"}
                </span>
              </div>
            ))}
          </div>
        </DetailItem>
      )}
    </FieldGrid>
  );
}
