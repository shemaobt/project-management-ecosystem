import { useTranslation } from "react-i18next";
import { HEALTH_DIMENSIONS } from "../../../../../constants/health";
import type { HealthRating, PrayerVisibility } from "../../../../../types/project";
import { assessmentHistory, dimensionRating } from "../../../../../utils/health";
import { getPrayerVisibility } from "../../../../../utils/prayer";
import { CheckboxField, Input, Textarea } from "../../../../ui";
import { Field, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { AssessmentHistory } from "./AssessmentHistory";
import { PrayerConsent } from "./PrayerConsent";
import { RatingChoice } from "./RatingChoice";

export interface SaudeFormProps {
  draft: DraftHandle;
}

export function SaudeForm({ draft }: SaudeFormProps) {
  const { t } = useTranslation();
  const values = draft.values;
  const pastoral = values.needsPastoralIntervention === "sim";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-micro leading-[1.5] text-fg-subtle">
        {t("health_lead")}
      </p>

      <div className="flex flex-col gap-4">
        {HEALTH_DIMENSIONS.map((dimension, index) => (
          <section
            key={dimension.key}
            className="rounded-[12px] border border-line bg-elevated px-4 py-3.5"
          >
            <div className="flex items-baseline gap-2.5">
              <span className="text-[10px] font-bold tracking-[0.14em] text-fg-subtle tabular-nums">
                {String(index + 1).padStart(2, "0")} / 04
              </span>
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
                {t(dimension.labelKey)}
              </span>
            </div>
            <h3
              id={`saude-${dimension.key}-q`}
              className="mt-1.5 font-serif text-[15px] leading-[1.35] text-fg"
            >
              {t(dimension.questionKey)}
            </h3>
            <div className="mt-3">
              <RatingChoice
                name={t(dimension.labelKey)}
                describedBy={`saude-${dimension.key}-q`}
                value={dimensionRating(values, dimension)}
                onChange={(next: HealthRating) =>
                  draft.set(dimension.field, next)
                }
              />
            </div>
          </section>
        ))}
      </div>

      <FieldGrid>
        <Field id="saude-date" label={t("f_assessment_date")}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.healthAssessmentDate ?? ""}
              onChange={(event) =>
                draft.set("healthAssessmentDate", event.target.value)
              }
            />
          )}
        </Field>

        <Field id="saude-assessor" label={t("f_assessor")}>
          {(control) => (
            <Input
              {...control}
              value={values.healthAssessor ?? ""}
              autoComplete="off"
              onChange={(event) =>
                draft.set("healthAssessor", event.target.value)
              }
            />
          )}
        </Field>

        <Field id="saude-notes" label={t("f_health_notes")} full>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              value={values.healthNotes ?? ""}
              onChange={(event) => draft.set("healthNotes", event.target.value)}
            />
          )}
        </Field>

        <Field id="saude-prayer" label={t("f_prayer")} full>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              value={values.prayerRequests ?? ""}
              onChange={(event) =>
                draft.set("prayerRequests", event.target.value)
              }
            />
          )}
        </Field>
      </FieldGrid>

      <PrayerConsent
        value={getPrayerVisibility(values)}
        onChange={(next: PrayerVisibility) =>
          draft.set("prayerVisibility", next)
        }
      />

      <div className="rounded-[12px] border border-line-strong bg-muted p-4">
        <CheckboxField
          id="saude-pastoral"
          label={t("f_pastoral")}
          checked={pastoral}
          onCheckedChange={(next) =>
            draft.set("needsPastoralIntervention", next === true ? "sim" : "nao")
          }
        />
        {pastoral && (
          <div className="mt-3">
            <Field id="saude-pastoral-who" label={t("f_pastoral_who")}>
              {(control) => (
                <Input
                  {...control}
                  value={values.pastoralInterventionName ?? ""}
                  autoComplete="off"
                  onChange={(event) =>
                    draft.set("pastoralInterventionName", event.target.value)
                  }
                />
              )}
            </Field>
          </div>
        )}
      </div>

      <AssessmentHistory entries={assessmentHistory(values)} />
    </div>
  );
}
