import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { HealthDimension } from "../../../constants/health";
import { GUIDING_QUESTIONS } from "../../../constants/healthQuestions";
import { surfaceOutlined } from "../../../styles";
import type { HealthRating } from "../../../types/project";
import { cn } from "../../../utils/cn";
import { Button, Label, Textarea } from "../../ui";
import { RatingChoice } from "../ficha/tabs/saude/RatingChoice";

export interface DimensionStepProps {
  dimension: HealthDimension;
  index: number;
  total: number;
  rating: HealthRating;
  note: string;
  onRating: (rating: HealthRating) => void;
  onNote: (note: string) => void;
  onSkip: () => void;
}

export function DimensionStep({
  dimension,
  index,
  total,
  rating,
  note,
  onRating,
  onNote,
  onSkip,
}: DimensionStepProps) {
  const { t } = useTranslation();
  const noteId = useId();

  return (
    <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
      <p className="text-eyebrow font-bold tracking-eyebrow uppercase text-accent-press">
        {t("hw_step", { current: index + 1, total })} · {t(dimension.labelKey)}
      </p>

      <h2 className="mt-2.5 text-h3 leading-tight font-black tracking-tight text-balance text-fg-strong">
        {t(dimension.questionKey)}
      </h2>

      <div className="mt-5 rounded-md bg-muted px-4 py-3.5">
        <p className="text-micro font-bold tracking-button uppercase text-fg-muted">
          {t("hw_ask")}
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {GUIDING_QUESTIONS[dimension.key].map((questionKey) => (
            <li
              key={questionKey}
              className="text-lead leading-snug text-pretty text-fg"
            >
              {t(questionKey)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-micro leading-normal text-fg-subtle">
          {t("hw_questions_source")}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Label>{t("hw_rating_label")}</Label>
        <RatingChoice
          name={`${t("hw_rating_label")} — ${t(dimension.labelKey)}`}
          value={rating}
          onChange={onRating}
        />
        {rating === "" ? (
          <p className="text-small font-semibold text-fg-muted">
            {t("hw_skipped")}
          </p>
        ) : null}
        <p className="text-micro leading-normal text-fg-subtle">
          {t("hw_skip_note")}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Label htmlFor={noteId}>{t("hw_note_label")}</Label>
        <Textarea
          id={noteId}
          rows={5}
          value={note}
          placeholder={t("hw_note_placeholder")}
          onChange={(event) => onNote(event.target.value)}
        />
        <p className="text-micro leading-normal text-fg-subtle">
          {t("hw_note_matters")}
        </p>
      </div>

      {rating === "" ? null : (
        <Button variant="ghost" className="mt-4" onClick={onSkip}>
          {t("hw_skip")}
        </Button>
      )}
    </section>
  );
}
