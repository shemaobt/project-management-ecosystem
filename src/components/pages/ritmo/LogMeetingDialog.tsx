import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { MeetingNote } from "../../../stores/rhythmStore";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "../../ui";

export interface LogMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingTitle: string;
  scopeLabel: string;
  draft: MeetingNote;
  onDraftChange: (draft: MeetingNote) => void;
  onSave: () => void;
}

export function LogMeetingDialog({
  open,
  onOpenChange,
  meetingTitle,
  scopeLabel,
  draft,
  onDraftChange,
  onSave,
}: LogMeetingDialogProps) {
  const { t } = useTranslation();
  const dateId = useId();
  const notesId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{t("ritmo_register")}</DialogTitle>
            <DialogDescription>
              {meetingTitle} · {scopeLabel}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={dateId}>{t("ritmo_date")}</Label>
            <Input
              id={dateId}
              type="date"
              value={draft.date}
              onChange={(event) =>
                onDraftChange({ ...draft, date: event.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={notesId}>{t("ritmo_notes")}</Label>
            <Input
              id={notesId}
              value={draft.notes}
              placeholder={t("ritmo_notes_ph")}
              onChange={(event) =>
                onDraftChange({ ...draft, notes: event.target.value })
              }
            />
          </div>

          <p className="text-micro leading-[1.45] text-fg-subtle">
            {t("ritmo_notes_kept")}
          </p>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("btn_cancel")}
          </Button>
          <Button size="sm" disabled={!draft.date} onClick={onSave}>
            {t("ritmo_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
