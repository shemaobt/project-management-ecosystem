import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type {
  AccessAppKey,
  InviteDescription,
} from "../../../types/access";
import type { SessionRole } from "../../../types/session";
import { Button } from "../../ui";
import { appLabel, regionLabel, roleLabel } from "../acesso/labels";
import {
  createsAccount,
  type ClosedReason,
  type JoinFailure,
} from "./invitation";
import { JoinForm } from "./JoinForm";
import { joinMessage } from "./message";

const CLOSED_COPY: Record<ClosedReason, { title: string; body: string }> = {
  missing: { title: "convite_missing_title", body: "convite_missing_body" },
  notFound: { title: "convite_not_found_title", body: "convite_not_found_body" },
  expired: { title: "convite_expired_title", body: "convite_expired_body" },
  used: { title: "convite_used_title", body: "convite_used_body" },
  revoked: { title: "convite_revoked_title", body: "convite_revoked_body" },
  unknownRole: {
    title: "convite_unknown_role_title",
    body: "convite_unknown_role_body",
  },
};

export function InvitationClosed({ reason }: { reason: ClosedReason }) {
  const { t } = useTranslation();
  const copy = CLOSED_COPY[reason];

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
        {t(copy.title)}
      </h1>
      <p className="text-small leading-normal text-fg-muted">{t(copy.body)}</p>
      {reason === "used" ? (
        <div>
          <Button asChild size="sm" variant="secondary">
            <Link to="/">{t("convite_go_console")}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export interface InvitationUnreachableProps {
  message: string;
  onRetry: () => void;
}

export function InvitationUnreachable({ message, onRetry }: InvitationUnreachableProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
        {t("convite_network_title")}
      </h1>
      <p className="max-w-[46ch] text-small leading-normal text-fg-muted">{message}</p>
      <div>
        <Button onClick={onRetry}>{t("net_retry")}</Button>
      </div>
    </div>
  );
}

export interface InvitationOpenProps {
  invite: InviteDescription;
  role: SessionRole;
  app: AccessAppKey;
  working: boolean;
  failure: JoinFailure | null;
  onSubmit: (password: string, displayName: string | null) => void;
}

export function InvitationOpen({
  invite,
  role,
  app,
  working,
  failure,
  onSubmit,
}: InvitationOpenProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-bold tracking-[0.18em] text-telha uppercase">
          {t("convite_for_email", { email: invite.email })}
        </p>
        <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
          {t("convite_title")}
        </h1>
        <p className="text-small leading-normal text-fg">
          {t("convite_gives", { role: roleLabel(role, t), app: appLabel(app, t) })}
        </p>
        {invite.regionKeys.length > 0 ? (
          <p className="text-small leading-normal text-fg">
            {t("convite_regions", {
              regions: invite.regionKeys.map((key) => regionLabel(key, t)).join(", "),
            })}
          </p>
        ) : null}
      </div>

      {failure ? (
        <div
          role="alert"
          className="flex flex-col gap-1.5 text-micro leading-[1.45] font-semibold text-accent-press"
        >
          <p className="flex items-start gap-1.5">
            <AlertTriangle size={14} strokeWidth={1.75} aria-hidden className="mt-px shrink-0" />
            {joinMessage(failure, t)}
          </p>
          {failure.accountCreated ? <p>{t("convite_account_created")}</p> : null}
        </div>
      ) : null}

      <JoinForm
        key={createsAccount(invite, failure) ? "create" : "enter"}
        email={invite.email}
        create={createsAccount(invite, failure)}
        working={working}
        onSubmit={onSubmit}
      />
    </div>
  );
}
