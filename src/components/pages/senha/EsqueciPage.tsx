import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { failureMessage, type PasswordAPI } from "../../../services/api";
import type { ApiFailure } from "../../../types/session";
import { Button, Input, Label } from "../../ui";
import { IntakeShell } from "../intake/IntakeShell";
import { SenhaNotice } from "./SenhaNotice";

export interface EsqueciPageProps {
  api: PasswordAPI;
}

/**
 * "Esqueci a senha" (OBT-570). The confirmation replaces the form and is the same for a
 * known and an unknown address: the server never says which, and a form left on screen
 * would invite a second try with another e-mail, which is the enumeration that silence
 * exists to prevent. Only the network keeps the form, with the retry being the form itself.
 */
export function EsqueciPage({ api }: EsqueciPageProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [missing, setMissing] = useState(false);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (working) return;
    const address = email.trim();
    if (!address) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setWorking(true);
    setFailure(null);
    void api.forgot(address).then((outcome) => {
      setWorking(false);
      if (outcome.ok) setSent(true);
      else setFailure(outcome.failure);
    });
  };

  const refusal = missing
    ? t("entrar_needs_email")
    : failure
      ? failureMessage(failure, t)
      : null;

  return (
    <IntakeShell>
      {sent ? (
        <SenhaNotice
          titleKey="senha_sent_title"
          bodyKey="senha_sent_body"
          to="/"
          linkKey="senha_back_to_login"
        />
      ) : (
        <>
          <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
            {t("senha_forgot_title")}
          </h1>
          <p className="mt-2 mb-6 max-w-[46ch] text-small leading-normal text-fg-muted">
            {t("senha_forgot_lead")}
          </p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${fieldId}-email`}>{t("entrar_email")}</Label>
              <Input
                id={`${fieldId}-email`}
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                invalid={missing}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {refusal ? (
              <p role="alert" className="text-micro leading-[1.45] font-semibold text-telha">
                {refusal}
              </p>
            ) : null}
            <Button type="submit" size="lg" block disabled={working}>
              {t(working ? "senha_forgot_working" : "senha_forgot_submit")}
            </Button>
          </form>
          <p className="mt-6 border-t border-line pt-4 text-micro leading-[1.5] text-fg-subtle">
            <Link to="/" className="underline underline-offset-2 hover:text-fg">
              {t("senha_back_to_login")}
            </Link>
          </p>
        </>
      )}
    </IntakeShell>
  );
}
