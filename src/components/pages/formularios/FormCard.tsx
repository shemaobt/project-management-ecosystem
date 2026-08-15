import { FileUp, MonitorSmartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FORM_FILLER_LABEL_KEYS,
  FORM_MECHANISM_LABEL_KEYS,
  REPORTING_LABEL_KEYS,
} from "../../../constants/forms";
import { MEETING_CADENCE_LABEL_KEYS } from "../../../constants/meetings";
import { REPORTING_TONES, surfaceOutlined } from "../../../styles";
import type { FormDefinition, ProjectReporting } from "../../../types/forms";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";

const MECHANISM_ICONS = {
  file: FileUp,
  inApp: MonitorSmartphone,
};

export interface FormCardProps {
  form: FormDefinition;
  reporting: ProjectReporting;
}

export function FormCard({ form, reporting }: FormCardProps) {
  const { t } = useTranslation();
  const Icon = MECHANISM_ICONS[form.mechanism];

  return (
    <section
      className={cn(
        "flex flex-col rounded-lg p-6 shadow-card",
        surfaceOutlined,
      )}
    >
      <p className="mb-3 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
        {t(MEETING_CADENCE_LABEL_KEYS[form.cadence])} ·{" "}
        {t(FORM_FILLER_LABEL_KEYS[form.filledBy])}
      </p>

      <h2 className="text-h3 leading-tight font-black tracking-tight text-fg-strong">
        {t(form.titleKey)}
      </h2>
      <p className="mt-1.5 font-serif text-lead leading-snug italic text-fg-muted">
        {t(form.voiceKey)}
      </p>

      <p className="mt-3.5 text-small leading-normal text-fg">
        {t(form.descriptionKey)}
      </p>

      <div className="mt-4 flex items-start gap-2.5 rounded-md bg-muted px-3.5 py-3">
        <Icon
          size={17}
          strokeWidth={1.75}
          aria-hidden
          className="mt-0.5 shrink-0 text-fg-muted"
        />
        <div className="min-w-0">
          <p className="text-micro font-bold tracking-button uppercase text-fg-muted">
            {t(FORM_MECHANISM_LABEL_KEYS[form.mechanism])}
          </p>
          <p className="mt-1 text-small leading-normal text-fg">
            {t(form.mechanismKey)}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pt-4">
        <span
          className={cn(
            "text-small font-semibold",
            REPORTING_TONES[reporting.state],
          )}
        >
          {t(REPORTING_LABEL_KEYS[reporting.state])}
        </span>
        <span className="text-tag text-fg-subtle">
          {reporting.lastDate
            ? t("forms_last_report", { date: formatDate(reporting.lastDate) })
            : t("forms_never_reported")}
        </span>
      </div>
      <p className="mt-1 text-tag text-fg-subtle">
        {t("forms_period_ends", { date: formatDate(reporting.periodEnd) })}
      </p>
    </section>
  );
}
