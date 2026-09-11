import { useTranslation } from "react-i18next";
import type { ApiFailure } from "../../../types/session";
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
import { CredentialsForm } from "./CredentialsForm";

export interface SessionExpiredProps {
  open: boolean;
  onSubmit: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  failure: ApiFailure | null;
}

export function SessionExpired({
  open,
  onSubmit,
  onSignOut,
  failure,
}: SessionExpiredProps) {
  const { t } = useTranslation();
  const leave = () => {
    void onSignOut();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => next || leave()}>
      <DialogContent
        size="narrow"
        closeLabel={t("entrar_signout")}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("entrar_expired_title")}</DialogTitle>
          <DialogDescription>{t("entrar_expired_desc")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <CredentialsForm onSubmit={onSubmit} failure={failure} />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={leave}>
            {t("entrar_signout")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
