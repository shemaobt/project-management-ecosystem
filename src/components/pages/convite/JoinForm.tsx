import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Label } from "../../ui";
import { MIN_PASSWORD } from "./invitation";

export interface JoinFormProps {
  email: string;
  create: boolean;
  working: boolean;
  onSubmit: (password: string, displayName: string | null) => void;
}

export function JoinForm({ email, create, working, onSubmit }: JoinFormProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [short, setShort] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (working) return;
    if (password.length < MIN_PASSWORD) {
      setShort(true);
      return;
    }
    setShort(false);
    onSubmit(password, name.trim() || null);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-small leading-normal text-fg-muted">
        {t(create ? "convite_signup_lead" : "convite_signin_lead")}
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-email`}>{t("entrar_email")}</Label>
        <Input
          id={`${fieldId}-email`}
          type="email"
          autoComplete="username"
          value={email}
          readOnly
        />
      </div>
      {create ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-name`}>{t("convite_name")}</Label>
          <Input
            id={`${fieldId}-name`}
            autoComplete="name"
            aria-describedby={`${fieldId}-name-hint`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <p id={`${fieldId}-name-hint`} className="text-micro text-fg-muted">
            {t("convite_name_hint")}
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-password`}>{t("entrar_password")}</Label>
        <Input
          id={`${fieldId}-password`}
          type="password"
          autoComplete={create ? "new-password" : "current-password"}
          aria-describedby={`${fieldId}-password-hint`}
          invalid={short}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p
          id={`${fieldId}-password-hint`}
          className={
            short
              ? "text-micro font-semibold text-accent-press"
              : "text-micro text-fg-muted"
          }
        >
          {t("convite_password_hint", { min: MIN_PASSWORD })}
        </p>
      </div>
      <Button type="submit" size="lg" block disabled={working}>
        {working
          ? t("convite_working")
          : t(create ? "convite_signup_submit" : "convite_signin_submit")}
      </Button>
    </form>
  );
}
