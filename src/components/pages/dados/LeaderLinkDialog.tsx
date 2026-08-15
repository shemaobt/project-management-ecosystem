import { useTranslation } from "react-i18next";
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

export function LeaderLinkDialogBody() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-small leading-body text-fg">{t("intake_desc")}</p>
      <p className="text-small leading-body text-fg">{t("intake_scope")}</p>
      <p className="text-small leading-body text-fg">{t("intake_expiry")}</p>
      <p className="text-micro leading-[1.45] text-fg-subtle">
        {t("intake_pending")}
      </p>
    </div>
  );
}

export function LeaderLinkDialog({ open, onOpenChange }: HeaderDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{t("btn_intake")}</DialogTitle>
            <DialogDescription>{t("intake_sub")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <LeaderLinkDialogBody />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            {t("btn_close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
