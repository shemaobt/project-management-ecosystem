import { useTranslation } from "react-i18next";
import { REQUIRED_LABEL_KEYS } from "../../../stores/recordStore";
import { footerRow } from "../../../styles";
import { Button } from "../../ui";
import type { RecordMode } from "./types";
import type { DraftHandle } from "./useDraft";

export interface RecordFooterProps {
  mode: RecordMode;
  draft: DraftHandle;
  onEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function RecordFooter({
  mode,
  draft,
  onEdit,
  onSave,
  onDiscard,
  onClose,
}: RecordFooterProps) {
  const { t } = useTranslation();

  if (mode === "ver") {
    return (
      <div className={footerRow}>
        <Button variant="ghost" onClick={onClose}>
          {t("btn_close")}
        </Button>
        <Button onClick={onEdit}>{t("modal_edit")}</Button>
      </div>
    );
  }

  const blocked = draft.missing.length > 0;

  return (
    <div className={footerRow}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {draft.hasChanges && (
          <span className="text-micro text-fg-subtle">
            {t("record_draft_kept")}
          </span>
        )}
        {blocked && (
          <span className="truncate text-micro font-semibold text-status-attention-fg">
            {t("record_missing_required", {
              fields: draft.missing
                .map((field) => t(REQUIRED_LABEL_KEYS[field]))
                .join(", "),
            })}
          </span>
        )}
      </div>
      {draft.hasChanges && (
        <Button variant="ghost" onClick={onDiscard}>
          {t("record_discard_draft")}
        </Button>
      )}
      <Button onClick={onSave} disabled={blocked}>
        {t("btn_save")}
      </Button>
    </div>
  );
}
