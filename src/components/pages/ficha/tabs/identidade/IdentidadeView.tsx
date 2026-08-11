import { useTranslation } from "react-i18next";
import { formatNumber } from "../../../../../utils/format";
import { hasPlottableCoords } from "../../../../../utils/identity";
import { Badge } from "../../../../ui";
import { DetailItem, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";

export interface IdentidadeViewProps {
  draft: DraftHandle;
}

export function IdentidadeView({ draft }: IdentidadeViewProps) {
  const { t } = useTranslation();
  const locale = t("locale");
  const values = draft.values;
  const speakers = Number(values.speakerCount);
  const coords = values.coords;

  return (
    <FieldGrid>
      <DetailItem label={t("d_target")}>
        {values.languageName || "—"}
        {values.languageCode && (
          <em className="ml-1.5 font-serif font-normal text-fg-muted">
            ({values.languageCode})
          </em>
        )}
      </DetailItem>

      <DetailItem label={t("d_bridge")} serif>
        {values.bridgeLanguage || "—"}
      </DetailItem>

      <DetailItem label={t("d_vitality")}>
        {values.vitalityStatus || "—"}
      </DetailItem>

      <DetailItem label={t("d_speakers")}>
        {values.speakerCount && Number.isFinite(speakers)
          ? formatNumber(speakers, locale)
          : "—"}
      </DetailItem>

      <DetailItem label={t("d_location")} full serif>
        {values.location || "—"}
        {values.location2 && ` · ${values.location2}`}
        {values.sensitiveCountry && (
          <Badge tone="accent" className="ml-2.5 align-middle not-italic">
            {t("d_sensitive_tag")}
          </Badge>
        )}
      </DetailItem>

      <DetailItem label={t("d_coords")} full>
        {hasPlottableCoords(coords)
          ? `${coords![0]}, ${coords![1]}`
          : t("d_coords_missing")}
      </DetailItem>
    </FieldGrid>
  );
}
