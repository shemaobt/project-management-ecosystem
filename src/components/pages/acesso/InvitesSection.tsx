import { CheckCircle2, MailWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LINK_STATUS_LABEL_KEYS,
  LINK_STATUS_TONES,
} from "../../../constants/linkStatus";
import {
  failureMessage,
  toApiFailure,
  type AccessAPI,
} from "../../../services/api";
import type { InvitePayload, OpenInvite, SentInvite } from "../../../types/access";
import type { ApiFailure } from "../../../types/session";
import { formatDate, utcDay } from "../../../utils/format";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { OneTimeLink } from "../../common/OneTimeLink";
import { Badge, Button } from "../../ui";
import { InviteForm } from "./InviteForm";
import { appLabel, regionLabel, roleLabel } from "./labels";
import { Panel } from "./Panel";
import { RefusalNote } from "./RefusalNote";

export interface SentInvitePanelProps {
  sent: SentInvite;
  onDismiss: () => void;
}

export function SentInvitePanel({ sent, onDismiss }: SentInvitePanelProps) {
  const { t } = useTranslation();

  return (
    <OneTimeLink
      url={sent.inviteUrl}
      heading={t("acesso_invite_ready", { email: sent.email })}
      note={t("acesso_invite_once")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-micro leading-[1.45] text-fg">
            {sent.emailSent ? (
              <CheckCircle2 size={14} strokeWidth={1.75} aria-hidden className="shrink-0" />
            ) : (
              <MailWarning size={14} strokeWidth={1.75} aria-hidden className="shrink-0" />
            )}
            {sent.emailSent
              ? t("acesso_invite_email_sent", { email: sent.email })
              : t("acesso_invite_email_not_sent")}
          </p>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            {t("btn_close")}
          </Button>
        </div>
      }
    />
  );
}

export interface InvitesListProps {
  invites: readonly OpenInvite[] | null;
  error: string | null;
  onRevoke: (invite: OpenInvite) => void;
  onRetry: () => void;
}

export function InvitesList({ invites, error, onRevoke, onRetry }: InvitesListProps) {
  const { t } = useTranslation();
  const locale = t("locale");

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-small text-fg-muted">{error}</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t("net_retry")}
        </Button>
      </div>
    );
  }
  if (invites === null) return <LoadingSpinner size="sm" label={t("loading")} />;
  if (invites.length === 0) {
    return <p className="text-small text-fg-muted">{t("acesso_invites_empty")}</p>;
  }

  const waiting = invites.filter((invite) => invite.status === "pending").length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-micro text-fg-muted">
        {t("acesso_invites_waiting", { count: waiting })}
      </p>
      <ul className="divide-y divide-line">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-small font-semibold wrap-anywhere text-fg">
                {invite.email}
              </span>
              <span className="text-micro text-fg-muted">
                {roleLabel(invite.roleKey, t)} · {appLabel(invite.appKey, t)}
                {invite.regionKeys.length > 0
                  ? ` · ${invite.regionKeys.map((key) => regionLabel(key, t)).join(", ")}`
                  : ""}
              </span>
              <span className="text-micro text-fg-subtle">
                {invite.status === "pending"
                  ? t("acesso_invite_expires", {
                      date: formatDate(utcDay(invite.expiresAt), locale),
                    })
                  : t("acesso_invite_created_on", {
                      date: formatDate(utcDay(invite.createdAt), locale),
                    })}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge tone={LINK_STATUS_TONES[invite.status]} uppercase>
                {t(LINK_STATUS_LABEL_KEYS[invite.status])}
              </Badge>
              {invite.status === "pending" ? (
                <Button size="sm" variant="ghost" onClick={() => onRevoke(invite)}>
                  {t("acesso_revoke")}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PendingInvitesProps {
  api: AccessAPI;
  onRevoke: (invite: OpenInvite) => void;
  onRetry: () => void;
}

function PendingInvites({ api, onRevoke, onRetry }: PendingInvitesProps) {
  const { t } = useTranslation();
  const [invites, setInvites] = useState<readonly OpenInvite[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .invites()
      .then((result) => {
        if (!cancelled) setInvites(result);
      })
      .catch((raw: unknown) => {
        if (!cancelled) setFailure(toApiFailure(raw));
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <InvitesList
      invites={invites}
      error={failure ? failureMessage(failure, t) : null}
      onRevoke={onRevoke}
      onRetry={onRetry}
    />
  );
}

export interface InvitePrefill {
  email: string;
  nonce: number;
}

export interface InvitesSectionProps {
  api: AccessAPI;
  prefill: InvitePrefill;
  revision: number;
}

export function InvitesSection({ api, prefill, revision }: InvitesSectionProps) {
  const { t } = useTranslation();
  const [sent, setSent] = useState<SentInvite | null>(null);
  const [sending, setSending] = useState(false);
  const [refusal, setRefusal] = useState<ApiFailure | null>(null);
  const [version, setVersion] = useState(0);
  const [revoking, setRevoking] = useState<OpenInvite | null>(null);
  const [revokeFailure, setRevokeFailure] = useState<ApiFailure | null>(null);

  const send = (payload: InvitePayload) => {
    setSending(true);
    setRefusal(null);
    setSent(null);
    api
      .invite(payload)
      .then((created) => {
        setSent(created);
        setVersion((current) => current + 1);
      })
      .catch((raw: unknown) => setRefusal(toApiFailure(raw)))
      .finally(() => setSending(false));
  };

  const revoke = (invite: OpenInvite) => {
    setRevokeFailure(null);
    api
      .revokeInvite(invite.id)
      .then(() => {
        setRevoking(null);
        setVersion((current) => current + 1);
      })
      .catch((raw: unknown) => {
        setRevoking(null);
        setRevokeFailure(toApiFailure(raw));
      });
  };

  return (
    <Panel id="convites" title={t("acesso_invites_title")} lead={t("acesso_invites_lead")}>
      <div className="flex flex-col gap-6">
        <InviteForm
          key={prefill.nonce}
          initialEmail={prefill.email}
          sending={sending}
          refusal={refusal}
          onSubmit={send}
        />
        {sent ? <SentInvitePanel sent={sent} onDismiss={() => setSent(null)} /> : null}
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <h3 className="text-small font-bold text-fg-strong">
            {t("acesso_invites_list_title")}
          </h3>
          {revokeFailure ? <RefusalNote failure={revokeFailure} /> : null}
          <PendingInvites
            key={`${revision}:${version}`}
            api={api}
            onRevoke={setRevoking}
            onRetry={() => setVersion((current) => current + 1)}
          />
        </div>
      </div>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
        tone="danger"
        title={t("acesso_invite_revoke_title", { email: revoking?.email ?? "" })}
        confirmLabel={t("acesso_revoke")}
        onConfirm={() => revoking && revoke(revoking)}
      >
        <p className="text-small leading-body text-fg">{t("acesso_invite_revoke_body")}</p>
      </ConfirmDialog>
    </Panel>
  );
}
