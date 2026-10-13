import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../../contexts/AuthContext";
import { failureMessage, projectRecordAPI, toApiFailure } from "../../../../../services/api";
import { useProjectRecordStore } from "../../../../../stores/projectRecordStore";
import { canWithdrawMediaAuthorization } from "../../../../../utils/access";
import { ConfirmDialog } from "../../../../common/ConfirmDialog";
import { Button, toast } from "../../../../ui";

export interface WithdrawPhotoAuthorizationProps {
  projectId: string;
  itemId: string;
}

/**
 * The coordination takes a photo's authorization back by its id (OBT-578's route, OBT-582):
 * refused from here on, erased from the Pulse that brought it, and nothing already sent is
 * recalled. The record is read again afterwards and the Mídia tab reads a server photo's
 * decision off that saved record, not off the draft (`asServerHoldsIt`) — so the decision on
 * screen is the server's, and the picture, no longer shared, stops being asked for.
 */
export function WithdrawPhotoAuthorization({ projectId, itemId }: WithdrawPhotoAuthorizationProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const reload = useProjectRecordStore((state) => state.reload);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!canWithdrawMediaAuthorization(user.roles)) return null;

  const withdraw = async () => {
    setBusy(true);
    try {
      await projectRecordAPI.withdrawMediaAuthorization(projectId, itemId);
      toast.success(t("media_withdraw_done"));
      setOpen(false);
      await reload();
    } catch (raw) {
      toast.error(failureMessage(toApiFailure(raw), t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {t("media_withdraw")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("media_withdraw_title")}
        description={t("media_withdraw_body")}
        confirmLabel={t("media_withdraw_confirm")}
        tone="danger"
        busy={busy}
        onConfirm={() => void withdraw()}
      />
    </>
  );
}
