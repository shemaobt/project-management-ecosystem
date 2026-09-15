import { useTranslation } from "react-i18next";
import { PENDING_WRITE } from "../../../constants/recordFields";
import type { RecordTabId } from "../../../constants/recordTabs";

export interface PendingWriteNoteProps {
  tab: RecordTabId;
}

/**
 * The half of a tab the record write does not carry yet, said **before** anything is
 * typed rather than after a save has quietly dropped it.
 *
 * `PATCH /shema/projects/{id}` is narrower than the ten tabs: the health projection has
 * one writer and it is the assessment, the need items have their own endpoint, and
 * media and materials have no serving path for their bytes. The input still works and
 * still survives — it lives in the draft this browser persists — and that is exactly
 * what the note says, because a control that promises storage nothing delivers is worse
 * than one that admits where it stops.
 */
export function PendingWriteNote({ tab }: PendingWriteNoteProps) {
  const { t } = useTranslation();
  const pending = PENDING_WRITE[tab];
  if (!pending) return null;

  return (
    <div className="rounded-[12px] border border-line-strong bg-muted px-4 py-3 text-micro leading-[1.5] text-fg">
      <strong className="mb-0.5 block text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
        {t("record_pending_title")}
      </strong>
      {t(pending.noteKey)}
    </div>
  );
}
