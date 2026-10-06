import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { failureMessage, type PasswordAPI } from "../../../services/api";
import type { ApiFailure } from "../../../types/session";
import { Button, Input, Label } from "../../ui";
import { IntakeShell } from "../intake/IntakeShell";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  mismatched,
  outOfBounds,
  ready,
  readToken,
  resetRefusal,
} from "./newPassword";
import { SenhaNotice } from "./SenhaNotice";

export interface RedefinirPageProps {
  api: PasswordAPI;
}

type Phase = "form" | "missing" | "refused" | "done";

/**
 * "Redefinir senha" (OBT-570), reached from the e-mail's `/reset-password?token=…`. With no
 * token there is no form — asking for a password and then refusing it is the worse of the
 * two — and a refused token lands on the same kind of notice, because the token is in the
 * address and retyping a password cannot change it. The way out of both is a new link.
 */
export function RedefinirPage({ api }: RedefinirPageProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [params] = useSearchParams();
  const token = readToken(params.get("token"));

  const [phase, setPhase] = useState<Phase>(token ? "form" : "missing");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (working || !token || !ready(password, confirmation)) return;
    setWorking(true);
    setFailure(null);
    void api.reset(token, password).then((outcome) => {
      setWorking(false);
      if (outcome.ok) {
        setPhase("done");
        return;
      }
      if (resetRefusal(outcome.failure.kind) === "refused") setPhase("refused");
      else setFailure(outcome.failure);
    });
  };

  if (phase === "missing" || phase === "refused") {
    return (
      <IntakeShell>
        <SenhaNotice
          titleKey={phase === "missing" ? "senha_missing_title" : "senha_refused_title"}
          bodyKey={phase === "missing" ? "senha_missing_body" : "senha_refused_body"}
          to="/forgot-password"
          linkKey="senha_ask_again"
        />
      </IntakeShell>
    );
  }

  if (phase === "done") {
    return (
      <IntakeShell>
        <SenhaNotice
          titleKey="senha_done_title"
          bodyKey="senha_done_body"
          to="/"
          linkKey="senha_back_to_login"
        />
      </IntakeShell>
    );
  }

  const bounds = outOfBounds(password);
  const mismatch = mismatched(password, confirmation);

  return (
    <IntakeShell>
      <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
        {t("senha_reset_title")}
      </h1>
      <p className="mt-2 mb-6 max-w-[46ch] text-small leading-normal text-fg-muted">
        {t("senha_reset_lead")}
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-password`}>{t("senha_new_password")}</Label>
          <Input
            id={`${fieldId}-password`}
            type="password"
            autoComplete="new-password"
            aria-describedby={`${fieldId}-password-hint`}
            invalid={bounds}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p
            id={`${fieldId}-password-hint`}
            className={
              bounds ? "text-micro font-semibold text-accent-press" : "text-micro text-fg-muted"
            }
          >
            {t("senha_bounds", { min: PASSWORD_MIN, max: PASSWORD_MAX })}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-confirm`}>{t("senha_confirm_password")}</Label>
          <Input
            id={`${fieldId}-confirm`}
            type="password"
            autoComplete="new-password"
            aria-describedby={mismatch ? `${fieldId}-confirm-error` : undefined}
            invalid={mismatch}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          {mismatch ? (
            <p
              id={`${fieldId}-confirm-error`}
              className="text-micro font-semibold text-accent-press"
            >
              {t("senha_mismatch")}
            </p>
          ) : null}
        </div>
        {failure ? (
          <p role="alert" className="text-micro leading-[1.45] font-semibold text-telha">
            {failureMessage(failure, t)}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          block
          disabled={working || !ready(password, confirmation)}
        >
          {t(working ? "senha_reset_working" : "senha_reset_submit")}
        </Button>
      </form>
    </IntakeShell>
  );
}
