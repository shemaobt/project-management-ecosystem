import { useTranslation } from "react-i18next";
import type { IntercessorEntry } from "../../../types/prayer";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui";

export interface RemoveIntercessorDialogProps {
  removing: IntercessorEntry | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<unknown>;
}

export function RemoveIntercessorDialog({
  removing,
  onClose,
  onConfirm,
}: RemoveIntercessorDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={removing !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <DialogTitle>{t("int_remove")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-small leading-normal text-fg">
            {t("int_remove_confirm", { name: removing?.name ?? "" })}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t("btn_cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (removing) await onConfirm(removing.id);
              onClose();
            }}
          >
            {t("btn_delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
