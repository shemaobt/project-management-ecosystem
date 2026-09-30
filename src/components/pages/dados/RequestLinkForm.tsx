import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { PROJECT_HINT_MAX } from "../../../constants/requests";
import type { RequestLinkPayload } from "../../../types/request";
import { Button, Input, Label } from "../../ui";

export interface RequestLinkFormProps {
  issuing: boolean;
  refusal: string | null;
  onIssue: (payload: RequestLinkPayload) => void;
}

export function RequestLinkForm({ issuing, refusal, onIssue }: RequestLinkFormProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [hint, setHint] = useState("");
  const ready = email.trim() !== "" && !issuing;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    onIssue({ email: email.trim(), project_hint: hint.trim() });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-email`}>{t("rr_link_email")}</Label>
        <Input
          id={`${fieldId}-email`}
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-hint`}>{t("rr_link_hint")}</Label>
        <Input
          id={`${fieldId}-hint`}
          maxLength={PROJECT_HINT_MAX}
          aria-describedby={`${fieldId}-hint-help`}
          value={hint}
          onChange={(event) => setHint(event.target.value)}
        />
        <p id={`${fieldId}-hint-help`} className="text-micro text-fg-subtle">
          {t("rr_link_hint_help")}
        </p>
      </div>
      {refusal ? (
        <p role="alert" className="text-small font-semibold text-accent-press">
          {refusal}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={!ready}>
          {issuing ? t("rr_link_issuing") : t("rr_link_issue")}
        </Button>
      </div>
    </form>
  );
}
