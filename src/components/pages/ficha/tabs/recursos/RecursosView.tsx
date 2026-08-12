import { useTranslation } from "react-i18next";
import { Badge } from "../../../../ui";
import { DetailItem, FieldGrid, NotesPanel, TagRow } from "../../fields";
import type { DraftHandle } from "../../useDraft";

export interface RecursosViewProps {
  draft: DraftHandle;
}

export function RecursosView({ draft }: RecursosViewProps) {
  const { t } = useTranslation();
  const values = draft.values;
  const financialResources = values.financialResources ?? [];

  return (
    <FieldGrid>
      <DetailItem label={t("f_in_eten")}>
        {values.inETEN ? (
          <Badge tone="accent">
            <span aria-hidden>✓</span> {t("sim")}
          </Badge>
        ) : (
          <span className="text-fg-muted">{t("nao")}</span>
        )}
      </DetailItem>

      <DetailItem label={t("d_financial")} full>
        <TagRow values={financialResources} tone="green" />
      </DetailItem>

      {financialResources.includes("Outros") && values.financialOtherDetails && (
        <DetailItem label={t("d_financial_other")} full>
          {values.financialOtherDetails}
        </DetailItem>
      )}

      {values.financialNotes && (
        <DetailItem label={t("f_notes")} full>
          <NotesPanel>{values.financialNotes}</NotesPanel>
        </DetailItem>
      )}
    </FieldGrid>
  );
}
