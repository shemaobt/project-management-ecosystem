import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ACCESS_APPS, APP_LABEL_KEYS, SHEMA_APP } from "../../../constants/access";
import { SESSION_ROLE_LABEL_KEYS } from "../../../contexts/AuthContext";
import type { AccessAppKey, InvitePayload } from "../../../types/access";
import type { RegionKey } from "../../../types/region";
import type { ApiFailure, SessionRole } from "../../../types/session";
import { canSubmitRegions, invitableRoles, isRegionalRole } from "../../../utils/access";
import { Button, ChipRadio, Input, Label, RadioField, RadioGroup } from "../../ui";
import { RefusalNote } from "./RefusalNote";
import { RegionPicker } from "./RegionPicker";

export interface InviteFormProps {
  initialEmail: string;
  sending: boolean;
  refusal: ApiFailure | null;
  onSubmit: (payload: InvitePayload) => void;
}

export function InviteForm({
  initialEmail,
  sending,
  refusal,
  onSubmit,
}: InviteFormProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [email, setEmail] = useState(initialEmail);
  const [app, setApp] = useState<AccessAppKey>(SHEMA_APP);
  const [role, setRole] = useState<SessionRole>(invitableRoles(SHEMA_APP)[0]);
  const [regions, setRegions] = useState<RegionKey[]>([]);

  const offered = invitableRoles(app);
  const ready = email.trim() !== "" && canSubmitRegions(role, regions);

  const pickApp = (next: string) => {
    const chosen = ACCESS_APPS.find((key) => key === next);
    if (!chosen) return;
    setApp(chosen);
    setRole(invitableRoles(chosen)[0]);
    setRegions([]);
  };

  const pickRole = (next: string) => {
    const chosen = offered.find((key) => key === next);
    if (!chosen) return;
    setRole(chosen);
    if (!isRegionalRole(chosen)) setRegions([]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || sending) return;
    onSubmit({ email: email.trim(), appKey: app, roleKey: role, regionKeys: regions });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-email`}>{t("acesso_invite_email")}</Label>
        <Input
          id={`${fieldId}-email`}
          type="email"
          inputMode="email"
          autoComplete="off"
          autoFocus={initialEmail !== ""}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={`${fieldId}-app`} className="text-tag font-bold tracking-button uppercase text-fg-muted">
          {t("acesso_invite_app")}
        </span>
        <RadioGroup
          aria-labelledby={`${fieldId}-app`}
          value={app}
          onValueChange={pickApp}
          className="gap-2"
        >
          {ACCESS_APPS.map((key) => (
            <ChipRadio key={key} value={key} label={t(APP_LABEL_KEYS[key])} />
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={`${fieldId}-role`} className="text-tag font-bold tracking-button uppercase text-fg-muted">
          {t("acesso_invite_role")}
        </span>
        <RadioGroup
          aria-labelledby={`${fieldId}-role`}
          value={role}
          onValueChange={pickRole}
          className="flex-col gap-2"
        >
          {offered.map((key) => (
            <RadioField
              key={key}
              id={`${fieldId}-role-${key}`}
              value={key}
              label={t(SESSION_ROLE_LABEL_KEYS[key])}
            />
          ))}
        </RadioGroup>
        <p className="text-micro leading-[1.45] text-fg-muted">
          {t("acesso_invite_no_admin")}
        </p>
      </div>

      {isRegionalRole(role) ? (
        <RegionPicker
          legend={t("acesso_regions_legend", { role: t(SESSION_ROLE_LABEL_KEYS[role]) })}
          selected={regions}
          onChange={setRegions}
          disabled={sending}
        />
      ) : null}

      {refusal ? <RefusalNote failure={refusal} /> : null}

      <div>
        <Button type="submit" disabled={!ready || sending}>
          {sending ? t("acesso_invite_sending") : t("acesso_invite_submit")}
        </Button>
      </div>
    </form>
  );
}
