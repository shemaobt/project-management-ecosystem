import { useId } from "react";
import { useTranslation } from "react-i18next";
import { surfaceOutlined } from "../../../styles";
import type { PrayerVisibility } from "../../../types/project";
import { cn } from "../../../utils/cn";
import { Label, Textarea } from "../../ui";
import { CoordinationOnlyNote } from "../ficha/CoordinationOnlyNote";
import { PrayerConsent } from "../ficha/tabs/saude/PrayerConsent";

export interface PrayerRequestStepProps {
  request: string;
  visibility: PrayerVisibility;
  onRequest: (request: string) => void;
  onVisibility: (visibility: PrayerVisibility) => void;
  locked?: boolean;
}

export function PrayerRequestStep({
  request,
  visibility,
  onRequest,
  onVisibility,
  locked = false,
}: PrayerRequestStepProps) {
  const { t } = useTranslation();
  const fieldId = useId();

  return (
    <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
      <h2 className="text-h4 leading-tight font-black tracking-tight text-fg-strong">
        {t("hw_prayer_title")}
      </h2>

      <div className="mt-3.5 flex flex-col gap-2">
        <Label htmlFor={fieldId}>{t("hw_prayer_title")}</Label>
        <Textarea
          id={fieldId}
          rows={4}
          value={locked ? "" : request}
          disabled={locked}
          placeholder={locked ? undefined : t("hw_prayer_placeholder")}
          onChange={(event) => onRequest(event.target.value)}
        />
        {locked ? (
          <CoordinationOnlyNote textKey="f_free_text_coordination_only" />
        ) : (
          <p className="text-micro leading-normal text-fg-subtle">
            {t("hw_prayer_optional")}
          </p>
        )}
      </div>

      {locked || request.trim() === "" ? null : (
        <div className="mt-4">
          <PrayerConsent value={visibility} onChange={onVisibility} />
        </div>
      )}
    </section>
  );
}
