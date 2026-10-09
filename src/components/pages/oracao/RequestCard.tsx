import { useTranslation } from "react-i18next";
import { PRAYER_SOURCE_LABEL_KEYS } from "../../../constants/prayer";
import type { PrayerRequest } from "../../../types/prayer";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { getLanguageNameDisplay, getRegionLabelKey } from "../../../utils/region";
import {
  REQUEST_CARD,
  REQUEST_CARD_HEAD,
  REQUEST_CARD_LANGUAGE,
  REQUEST_CARD_TAG,
} from "./surface";

export interface RequestCardProps {
  request: PrayerRequest;
}

export function RequestCard({ request }: RequestCardProps) {
  const { t } = useTranslation();
  const regionLabel = t(getRegionLabelKey(request.region));
  const place =
    request.base || (request.locationWithheld ? regionLabel : request.country);

  return (
    <article
      className={cn(
        REQUEST_CARD,
        request.answered && "border-answered-line bg-answered-bg",
      )}
    >
      <div className={REQUEST_CARD_HEAD}>
        <span className={REQUEST_CARD_LANGUAGE}>
          {getLanguageNameDisplay(
            { languageName: request.language, languageNameWithheld: request.languageNameWithheld },
            t,
          )}
        </span>
        <span className={REQUEST_CARD_TAG}>
          {regionLabel}
        </span>
      </div>
      <div className="mb-3.5 flex-1">
        {request.text && (
          <p className="font-serif text-[15px] leading-[1.5] text-fg">
            {request.text}
          </p>
        )}
        {request.audioUrl && (
          <audio
            controls
            preload="metadata"
            src={request.audioUrl}
            aria-label={t("oracao_audio")}
            className={cn("w-full", request.text && "mt-2.5")}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-dashed border-line pt-3">
        <span className="text-[12px] leading-none font-semibold text-fg-muted">
          {place}
        </span>
        <span
          className={cn(
            "text-[11px] leading-none font-medium text-fg-subtle",
            request.answered && "font-bold text-answered-fg",
          )}
        >
          {request.answered ? (
            <>
              <span aria-hidden>✓ </span>
              {t("oracao_answered_tag")}
            </>
          ) : (
            t(PRAYER_SOURCE_LABEL_KEYS[request.source])
          )}
          {" · "}
          {formatDate(request.date, t("locale"))}
        </span>
      </div>
    </article>
  );
}
