import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui";
import type { HeaderDialogProps } from "./ExportDialog";

export function ReceiveUpdateDialogBody() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-small leading-body text-fg">{t("receive_desc")}</p>
      <p className="text-small leading-body text-fg-muted">
        {t("receive_pending")}
      </p>
      <p className="text-micro leading-[1.45] text-fg-subtle">
        {t("forms_format_pending")}
      </p>
    </div>
  );
}

export function ReceiveUpdateDialog({ open, onOpenChange }: HeaderDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openForms = () => {
    onOpenChange(false);
    navigate("/formularios");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{t("btn_field")}</DialogTitle>
            <DialogDescription>{t("forms_pulse_title")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <ReceiveUpdateDialogBody />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            {t("btn_close")}
          </Button>
          <Button size="sm" onClick={openForms}>
            {t("receive_go_forms")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
