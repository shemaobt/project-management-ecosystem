import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ApiFailure } from "../../../types/session";
import { Button, Input, Label } from "../../ui";
import { signInMessage } from "./message";

export interface CredentialsFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  failure: ApiFailure | null;
  submitKey?: string;
}

export function CredentialsForm({
  onSubmit,
  failure,
  submitKey = "entrar_submit",
}: CredentialsFormProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [missing, setMissing] = useState<"email" | "password" | null>(null);
  const [working, setWorking] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (working) return;
    if (!email.trim()) {
      setMissing("email");
      return;
    }
    if (!password) {
      setMissing("password");
      return;
    }
    setMissing(null);
    setWorking(true);
    void onSubmit(email.trim(), password).finally(() => {
      setWorking(false);
    });
  };

  const refusal = missing
    ? t(missing === "email" ? "entrar_needs_email" : "entrar_needs_password")
    : failure
      ? signInMessage(failure, t)
      : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-email`}>{t("entrar_email")}</Label>
        <Input
          id={`${fieldId}-email`}
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          invalid={missing === "email"}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-password`}>{t("entrar_password")}</Label>
        <Input
          id={`${fieldId}-password`}
          type="password"
          autoComplete="current-password"
          value={password}
          invalid={missing === "password"}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {refusal ? (
        <p
          role="alert"
          className="text-micro leading-[1.45] font-semibold text-telha"
        >
          {refusal}
        </p>
      ) : null}

      <Button type="submit" size="lg" block disabled={working}>
        {t(working ? "entrar_working" : submitKey)}
      </Button>
    </form>
  );
}
