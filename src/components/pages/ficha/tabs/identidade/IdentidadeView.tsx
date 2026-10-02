import { useTranslation } from "react-i18next";
import { VITALITY_SCALE } from "../../../../../constants/project";
import { formatNumber } from "../../../../../utils/format";
import { hasPlottableCoords } from "../../../../../utils/identity";
import {
  getLanguageNameDisplay,
  getLocationDisplay,
} from "../../../../../utils/region";
import { Badge } from "../../../../ui";
import { CoordinationOnlyNote } from "../../CoordinationOnlyNote";
import { DetailItem, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";

export interface IdentidadeViewProps {
  draft: DraftHandle;
}

export function IdentidadeView({ draft }: IdentidadeViewProps) {
  const { t } = useTranslation();
  const locale = t("locale");
  const values = draft.values;
  const withheld = draft.place.withheld;
  const place = draft.saved ? getLocationDisplay(draft.saved) : null;
  const speakers = Number(values.speakerCount);
  const coords = values.coords;
  const step = VITALITY_SCALE.find(
    (entry) => entry.value === values.vitalityStatus,
  );
  const vitality = step
    ? t(step.labelKey)
    : values.vitalityStatus || t("vit_na");

  return (
    <FieldGrid>
      <DetailItem label={t("d_target")}>
        {getLanguageNameDisplay(
          {
            languageName: values.languageName ?? "",
            languageNameWithheld: values.languageNameWithheld,
          },
          t,
        ) || "—"}
        {values.languageCode && (
          <em className="ml-1.5 font-serif font-normal text-fg-muted">
            ({values.languageCode})
          </em>
        )}
      </DetailItem>

      {values.sensitiveCountry && !withheld && (
        <DetailItem label={t("f_public_name")}>
          {values.publicLanguageName || t("d_public_name_missing")}
        </DetailItem>
      )}

      <DetailItem label={t("d_bridge")} serif>
        {values.bridgeLanguage || "—"}
      </DetailItem>

      <DetailItem label={t("d_vitality")}>{vitality}</DetailItem>

      <DetailItem label={t("d_speakers")}>
        {values.speakerCount && Number.isFinite(speakers)
          ? formatNumber(speakers, locale)
          : "—"}
      </DetailItem>

      <DetailItem label={t("d_location")} full serif>
        {withheld && place?.withheld
          ? t(place.regionLabelKey)
          : values.location || "—"}
        {!withheld && values.location2 && ` · ${values.location2}`}
        {values.sensitiveCountry && (
          <Badge tone="accent" className="ml-2.5 align-middle not-italic">
            {t("d_sensitive_tag")}
          </Badge>
        )}
      </DetailItem>

      <DetailItem label={t("d_coords")} full>
        {withheld
          ? "—"
          : hasPlottableCoords(coords)
            ? `${coords![0]}, ${coords![1]}`
            : t("d_coords_missing")}
      </DetailItem>

      {withheld && (
        <div className="sm:col-span-2">
          <CoordinationOnlyNote />
        </div>
      )}
    </FieldGrid>
  );
}
