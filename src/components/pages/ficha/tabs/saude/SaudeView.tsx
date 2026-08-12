import { Church, HandHeart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HEALTH_DIMENSIONS } from "../../../../../constants/health";
import { PRAYER_VISIBILITY_LABEL_KEYS } from "../../../../../constants/prayer";
import { HEALTH_LABEL_KEYS } from "../../../../../constants/status";
import { formatDate } from "../../../../../utils/format";
import {
  assessmentHistory,
  dimensionRating,
  isAssessed,
} from "../../../../../utils/health";
import { getPrayerVisibility } from "../../../../../utils/prayer";
import { StatusDot } from "../../../../common/StatusBadge";
import { Badge } from "../../../../ui";
import { DetailItem, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { AssessmentHistory } from "./AssessmentHistory";
import { CareNote } from "./CareNote";

export interface SaudeViewProps {
  draft: DraftHandle;
}

export function SaudeView({ draft }: SaudeViewProps) {
  const { t } = useTranslation();
  const locale = t("locale");
  const values = draft.values;
  const visibility = getPrayerVisibility(values);

  return (
    <div className="flex flex-col gap-5">
      <CareNote project={values} />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {HEALTH_DIMENSIONS.map((dimension) => {
          const rating = dimensionRating(values, dimension);
          return (
            <div
              key={dimension.key}
              className="flex flex-col items-start gap-1.5 rounded-[12px] border border-line bg-elevated px-3.5 py-3"
            >
              <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-fg-muted">
                {t(dimension.labelKey)}
              </span>
              <span className="flex items-center gap-2">
                <StatusDot
                  state={rating || "na"}
                  label={t(dimension.labelKey)}
                />
                <span className="text-[13px] font-semibold text-fg">
                  {rating
                    ? t(HEALTH_LABEL_KEYS[rating])
                    : t("health_not_assessed")}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {isAssessed(values) && (
        <FieldGrid>
          <DetailItem label={t("d_last_assessment")}>
            {values.healthAssessmentDate
              ? formatDate(values.healthAssessmentDate, locale)
              : "—"}
          </DetailItem>
          <DetailItem label={t("d_assessor")}>
            {values.healthAssessor || "—"}
          </DetailItem>
        </FieldGrid>
      )}

      {values.needsPastoralIntervention === "sim" && (
        <p className="flex items-start gap-2.5 rounded-[12px] border border-telha bg-accent-soft px-4 py-3 text-micro leading-[1.45] text-fg">
          <Church
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className="mt-px shrink-0 text-telha"
          />
          <span>
            <span className="font-bold">{t("d_pastoral")}</span>
            {" · "}
            {values.pastoralInterventionName || t("sim")}
          </span>
        </p>
      )}

      {values.healthNotes && (
        <DetailItem label={t("d_notes")} full>
          {values.healthNotes}
        </DetailItem>
      )}

      {values.prayerRequests && (
        <section className="rounded-[12px] border border-line bg-muted px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
              <HandHeart size={14} strokeWidth={1.75} aria-hidden />
              {t("d_prayer")}
            </span>
            <Badge tone={visibility === "rede" ? "green" : "neutral"}>
              {t(PRAYER_VISIBILITY_LABEL_KEYS[visibility])}
            </Badge>
          </div>
          <p className="mt-2.5 font-serif text-[15px] leading-[1.5] text-fg">
            {values.prayerRequests}
          </p>
        </section>
      )}

      <AssessmentHistory entries={assessmentHistory(values)} />
    </div>
  );
}
