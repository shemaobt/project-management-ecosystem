import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { failureMessage } from "../../../services/api/errors";
import type { DirectoryListing } from "../../../stores/prayerStore";
import {
  EMPTY_DIRECTORY_GRANT,
  missingDirectoryGrantFields,
  type DirectoryGrantDraft,
  type DirectoryGrantField,
} from "../../../utils/intercessors";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "../../ui";

const HINT_KEYS: Record<DirectoryGrantField, string> = {
  contact: "int_needs_contact",
  basis: "int_needs_consent_basis",
};

/** The answers the dialog says itself; a listing closes it and is said by the page. */
export type ListWithheldRefusal = Extract<
  DirectoryListing,
  { kind: "notFound" | "ambiguous" | "failed" }
>;

export interface ListWithheldDialogBodyProps {
  draft: DirectoryGrantDraft;
  showing: readonly DirectoryGrantField[];
  refusal: ListWithheldRefusal | null;
  sending: boolean;
  onChange: (draft: DirectoryGrantDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ListWithheldDialogBody({
  draft,
  showing,
  refusal,
  sending,
  onChange,
  onSubmit,
  onCancel,
}: ListWithheldDialogBodyProps) {
  const { t } = useTranslation();
  const contactId = useId();
  const basisId = useId();
  const invalid = (field: DirectoryGrantField) => showing.includes(field);

  return (
    <>
      <DialogBody>
        <div className="flex flex-col gap-3.5">
          <p className="text-small leading-normal text-fg">
            {t("int_list_withheld_lead")}
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={contactId}>{t("int_contact")}</Label>
            <Input
              id={contactId}
              value={draft.contact}
              invalid={invalid("contact")}
              autoComplete="off"
              placeholder={t("int_contact_ph")}
              onChange={(event) =>
                onChange({ ...draft, contact: event.target.value })
              }
            />
            <p className="text-micro leading-[1.45] text-fg-subtle">
              {t("int_list_withheld_contact_hint")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={basisId}>{t("int_list_withheld_basis")}</Label>
            <Textarea
              id={basisId}
              value={draft.basis}
              invalid={invalid("basis")}
              placeholder={t("int_consent_basis_ph")}
              onChange={(event) =>
                onChange({ ...draft, basis: event.target.value })
              }
            />
            <p className="text-micro leading-[1.45] text-fg-subtle">
              {t("int_list_withheld_basis_hint")}
            </p>
          </div>

          {showing.length > 0 ? (
            <ul className="flex list-none flex-col gap-1">
              {showing.map((field) => (
                <li key={field} className="text-micro leading-[1.45] text-telha">
                  {t(HINT_KEYS[field])}
                </li>
              ))}
            </ul>
          ) : null}

          {refusal ? (
            <p
              role="alert"
              className="rounded-md border border-line-strong bg-muted px-4 py-3 text-small leading-normal text-fg"
            >
              {refusal.kind === "notFound"
                ? t("int_list_withheld_none")
                : refusal.kind === "ambiguous"
                  ? t("int_list_withheld_ambiguous")
                  : failureMessage(refusal.failure, t)}
            </p>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>
          {t("btn_cancel")}
        </Button>
        <Button onClick={onSubmit} disabled={sending}>
          {sending ? t("int_list_withheld_saving") : t("int_list_withheld_submit")}
        </Button>
      </DialogFooter>
    </>
  );
}

interface ListWithheldFormProps {
  onClose: () => void;
  onSubmit: (draft: DirectoryGrantDraft) => Promise<DirectoryListing>;
}

/** Inside the content, so closing the dialog unmounts it and the typed contact goes with it. */
function ListWithheldForm({ onClose, onSubmit }: ListWithheldFormProps) {
  const [draft, setDraft] = useState<DirectoryGrantDraft>(EMPTY_DIRECTORY_GRANT);
  const [showing, setShowing] = useState<readonly DirectoryGrantField[]>([]);
  const [refusal, setRefusal] = useState<ListWithheldRefusal | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const missing = missingDirectoryGrantFields(draft);
    setShowing(missing);
    if (missing.length > 0) return;
    setRefusal(null);
    setSending(true);
    const outcome = await onSubmit(draft);
    setSending(false);
    if (outcome.kind === "listed" || outcome.kind === "already") {
      onClose();
    } else if (outcome.kind !== "invalid") {
      setRefusal(outcome);
    }
  };

  return (
    <ListWithheldDialogBody
      draft={draft}
      showing={showing}
      refusal={refusal}
      sending={sending}
      onChange={setDraft}
      onSubmit={() => void submit()}
      onCancel={onClose}
    />
  );
}

export interface ListWithheldDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: DirectoryGrantDraft) => Promise<DirectoryListing>;
}

export function ListWithheldDialog({ open, onClose, onSubmit }: ListWithheldDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent closeLabel={t("btn_close")}>
        <DialogHeader>
          <DialogTitle>{t("int_list_withheld_title")}</DialogTitle>
        </DialogHeader>
        <ListWithheldForm onClose={onClose} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
