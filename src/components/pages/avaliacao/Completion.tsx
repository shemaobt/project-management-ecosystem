import { useId } from "react";
import { useTranslation } from "react-i18next";
import { HEALTH_DIMENSIONS } from "../../../constants/health";
import { HEALTH_LABEL_KEYS } from "../../../constants/status";
import { surfaceOutlined } from "../../../styles";
import type { AssessmentDraft, PastoralAnswer, PastoralWhen } from "../../../types/assessment";
import { cn } from "../../../utils/cn";
import { overallOf, pastoralSuggestion } from "../../../utils/assessment";
import { Input, Label, RadioButton, RadioGroup, Textarea } from "../../ui";
import { StatusBadge } from "../../common/StatusBadge";

const PASTORAL_CHOICES: {
  value: string;
  answer: PastoralAnswer;
  when: PastoralWhen;
  labelKey: string;
}[] = [
  { value: "sim-now", answer: "sim", when: "now", labelKey: "hw_pastoral_now" },
  { value: "sim-30d", answer: "sim", when: "30d", labelKey: "hw_pastoral_30d" },
  { value: "nao", answer: "nao", when: "now", labelKey: "hw_pastoral_no" },
];

function pastoralValue(answer: PastoralAnswer, when: PastoralWhen): string {
  return answer === "nao" ? "nao" : `sim-${when}`;
}

export interface CompletionProps {
  draft: AssessmentDraft;
  onChange: (patch: Partial<AssessmentDraft>) => void;
}

export function Completion({ draft, onChange }: CompletionProps) {
  const { t } = useTranslation();
  const assessorId = useId();
  const dateId = useId();
  const noteId = useId();
  const whoId = useId();

  const overall = overallOf(draft);
  const suggestion = pastoralSuggestion(draft);

  return (
    <div className="flex flex-col gap-4">
      <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h4 leading-tight font-black tracking-tight text-fg-strong">
            {t("hw_summary_title")}
          </h2>
          <span className="flex items-center gap-2">
            <span className="text-micro font-bold tracking-button uppercase text-fg-muted">
              {t("hw_overall")}
            </span>
            <StatusBadge
              kind="health"
              state={overall}
              label={t(HEALTH_LABEL_KEYS[overall])}
            />
          </span>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {HEALTH_DIMENSIONS.map((dimension) => {
            const rating = draft.ratings[dimension.key];
            const note = draft.notes[dimension.key].trim();
            return (
              <li
                key={dimension.key}
                className="border-b border-line pb-2.5 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-small font-semibold text-fg-strong">
                    {t(dimension.labelKey)}
                  </span>
                  <span className="text-tag font-semibold text-fg-muted">
                    {rating === ""
                      ? t("hw_skipped")
                      : t(HEALTH_LABEL_KEYS[rating])}
                  </span>
                </div>
                {note === "" ? null : (
                  <p className="mt-1 text-small leading-normal wrap-anywhere text-fg">
                    {note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
        <h2 className="text-h4 leading-tight font-black tracking-tight text-fg-strong">
          {t("hw_pastoral_q")}
        </h2>

        {suggestion.suggested ? (
          <div className="mt-3 rounded-md border border-status-attention-line bg-status-attention-bg px-4 py-3">
            <p className="text-small font-semibold text-status-attention-fg">
              {t("hw_pastoral_suggested")}
            </p>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {suggestion.reasons.map((reason) => (
                <li
                  key={reason.dimension}
                  className="text-small leading-normal text-fg"
                >
                  {t("hw_pastoral_reason", {
                    dimension: t(
                      HEALTH_DIMENSIONS.find(
                        (entry) => entry.key === reason.dimension,
                      )?.labelKey ?? "",
                    ),
                    rating: t(HEALTH_LABEL_KEYS[reason.rating || "na"]),
                  })}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-small leading-normal text-fg-muted">
            {t("hw_pastoral_quiet")}
          </p>
        )}

        <RadioGroup
          aria-label={t("hw_pastoral_q")}
          value={pastoralValue(draft.pastoral, draft.pastoralWhen)}
          onValueChange={(next) => {
            const choice = PASTORAL_CHOICES.find(
              (entry) => entry.value === next,
            );
            if (choice) {
              onChange({ pastoral: choice.answer, pastoralWhen: choice.when });
            }
          }}
          className="mt-3.5 flex-wrap gap-2"
        >
          {PASTORAL_CHOICES.map((choice) => (
            <RadioButton
              key={choice.value}
              value={choice.value}
              className={cn(
                "rounded-pill border border-line bg-elevated px-4 py-2 text-micro font-bold tracking-button uppercase text-fg-muted",
                "data-[state=unchecked]:hover:border-fg-muted",
                "data-[state=checked]:border-telha data-[state=checked]:bg-accent-soft data-[state=checked]:text-accent-press",
              )}
            >
              {t(choice.labelKey)}
            </RadioButton>
          ))}
        </RadioGroup>

        <p className="mt-3 max-w-[80ch] text-micro leading-normal text-fg-subtle">
          {t("hw_pastoral_not_applied")}
        </p>

        {draft.pastoral === "sim" ? (
          <div className="mt-3.5 flex flex-col gap-2">
            <Label htmlFor={whoId}>{t("hw_pastoral_who")}</Label>
            <Input
              id={whoId}
              value={draft.pastoralWho}
              placeholder={t("hw_pastoral_who_placeholder")}
              onChange={(event) => onChange({ pastoralWho: event.target.value })}
            />
          </div>
        ) : null}
      </section>

      <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={assessorId}>{t("hw_assessor")}</Label>
            <Input
              id={assessorId}
              value={draft.assessor}
              placeholder={t("hw_assessor_placeholder")}
              onChange={(event) => onChange({ assessor: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={dateId}>{t("hw_date")}</Label>
            <Input
              id={dateId}
              type="date"
              value={draft.date}
              onChange={(event) => onChange({ date: event.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor={noteId}>{t("hw_overall_note")}</Label>
          <Textarea
            id={noteId}
            rows={3}
            value={draft.overallNote}
            placeholder={t("hw_overall_note_placeholder")}
            onChange={(event) => onChange({ overallNote: event.target.value })}
          />
        </div>
      </section>
    </div>
  );
}
