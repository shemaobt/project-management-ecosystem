import { useTranslation } from "react-i18next";
import {
  PULSE_LOOP,
  PULSE_QUESTIONS,
  STEP_ACTOR_LABEL_KEYS,
} from "../../../constants/forms";
import { surfaceOutlined } from "../../../styles";
import type { ProjectReporting } from "../../../types/forms";
import { cn } from "../../../utils/cn";

export interface StepByStepProps {
  projectName: string;
  reporting: ProjectReporting;
}

export function StepByStep({ projectName, reporting }: StepByStepProps) {
  const { t } = useTranslation();
  const loopOpen = reporting.state !== "reported";

  return (
    <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
      <h2 className="text-h4 leading-tight font-black tracking-tight text-fg-strong">
        {t("forms_steps_title")}
      </h2>
      <p className="mt-1.5 text-small leading-normal text-fg-muted">
        {loopOpen
          ? t("forms_loop_open", { project: projectName })
          : t("forms_loop_closed", { project: projectName })}
      </p>

      <ol className="mt-4.5 flex flex-col gap-2.5">
        {PULSE_LOOP.map((step, index) => {
          const current = loopOpen && index === 0;
          return (
            <li
              key={step.key}
              className={cn(
                "flex items-start gap-3.5 rounded-md px-3.5 py-3",
                current ? "bg-accent-soft" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-pill text-tag font-black tabular-nums",
                  current
                    ? "bg-telha text-on-brand"
                    : "bg-elevated text-fg-muted",
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-small leading-normal text-fg">
                  <span className="font-semibold text-fg-strong">
                    {t(step.labelKey)}
                  </span>{" "}
                  {t(step.detailKey)}
                </p>
                <p className="mt-0.5 text-tag font-semibold tracking-button uppercase text-fg-subtle">
                  {t(STEP_ACTOR_LABEL_KEYS[step.actor])}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <h3 className="mt-6 text-micro font-bold tracking-button uppercase text-fg-muted">
        {t("forms_questions_title")}
      </h3>
      <ol className="mt-2.5 flex flex-col gap-1.5">
        {PULSE_QUESTIONS.map((questionKey, index) => (
          <li
            key={questionKey}
            className="flex gap-2.5 text-small leading-normal text-fg-muted"
          >
            <span className="shrink-0 font-black tabular-nums text-fg-subtle">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">{t(questionKey)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
