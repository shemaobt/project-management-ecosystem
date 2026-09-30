import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  failureMessage,
  toApiFailure,
  type ResourceRequestsAPI,
} from "../../../services/api";
import type {
  IssuedRequestLink,
  RequestLink,
  RequestLinkPayload,
} from "../../../types/request";
import type { ApiFailure } from "../../../types/session";
import { formatDate, utcDay } from "../../../utils/format";
import { requestLinkUrl } from "../../../utils/requests";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { OneTimeLink } from "../../common/OneTimeLink";
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
import { RequestLinkForm } from "./RequestLinkForm";
import { RequestLinkList } from "./RequestLinkList";

interface IssuedRequestLinkPanelProps {
  issued: IssuedRequestLink;
  formBase: string;
  onDismiss: () => void;
}

function IssuedRequestLinkPanel({ issued, formBase, onDismiss }: IssuedRequestLinkPanelProps) {
  const { t } = useTranslation();

  return (
    <OneTimeLink
      url={requestLinkUrl(formBase, issued.token)}
      heading={t("rr_link_ready", { email: issued.email })}
      note={t("rr_link_once")}
      footer={
        <div className="flex flex-col gap-2">
          <p className="text-small text-fg">
            {t("rr_link_code")}{" "}
            <code className="rounded-sm bg-elevated px-2 py-1 text-tag font-bold tracking-[0.2em] text-fg-strong">
              {issued.code}
            </code>
          </p>
          <p className="text-tag text-fg-subtle">
            {t("intake_expires_on", {
              date: formatDate(utcDay(issued.expires_at), t("locale")),
            })}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-micro leading-[1.45] text-fg-muted">{t("rr_link_email_note")}</p>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              {t("btn_close")}
            </Button>
          </div>
        </div>
      }
    />
  );
}

export interface RequestLinkDialogBodyProps {
  formBase: string | null;
  issued: IssuedRequestLink | null;
  issuing: boolean;
  refusal: string | null;
  links: readonly RequestLink[] | null;
  linksError: string | null;
  revokeError: string | null;
  onIssue: (payload: RequestLinkPayload) => void;
  onDismissIssued: () => void;
  onRevoke: (link: RequestLink) => void;
  onRetry: () => void;
}

export function RequestLinkDialogBody({
  formBase,
  issued,
  issuing,
  refusal,
  links,
  linksError,
  revokeError,
  onIssue,
  onDismissIssued,
  onRevoke,
  onRetry,
}: RequestLinkDialogBodyProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small leading-body text-fg">{t("rr_link_desc")}</p>
      <p className="text-small leading-body text-fg">{t("rr_link_guard")}</p>
      <p className="text-small leading-body text-fg">{t("rr_link_expiry")}</p>

      {formBase === null ? (
        <p className="text-small font-semibold text-status-attention-fg">
          {t("rr_form_unavailable", { admin: t("role_admin") })}
        </p>
      ) : issued ? (
        <IssuedRequestLinkPanel issued={issued} formBase={formBase} onDismiss={onDismissIssued} />
      ) : (
        <RequestLinkForm issuing={issuing} refusal={refusal} onIssue={onIssue} />
      )}

      <div className="flex flex-col gap-2">
        <p className="text-micro font-bold tracking-button uppercase text-fg-muted">
          {t("rr_links_title")}
        </p>
        {revokeError ? (
          <p role="alert" className="text-small font-semibold text-accent-press">
            {revokeError}
          </p>
        ) : null}
        <RequestLinkList links={links} error={linksError} onRevoke={onRevoke} onRetry={onRetry} />
      </div>
    </div>
  );
}

interface RequestLinkPanelProps {
  api: ResourceRequestsAPI;
  formBase: string | null;
}

function RequestLinkPanel({ api, formBase }: RequestLinkPanelProps) {
  const { t } = useTranslation();
  const [links, setLinks] = useState<readonly RequestLink[] | null>(null);
  const [linksFailure, setLinksFailure] = useState<ApiFailure | null>(null);
  const [issued, setIssued] = useState<IssuedRequestLink | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [refusal, setRefusal] = useState<ApiFailure | null>(null);
  const [revoking, setRevoking] = useState<RequestLink | null>(null);
  const [revokeFailure, setRevokeFailure] = useState<ApiFailure | null>(null);
  const [reads, setReads] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .links()
      .then((result) => {
        if (!cancelled) setLinks(result);
      })
      .catch((raw: unknown) => {
        if (!cancelled) setLinksFailure(toApiFailure(raw));
      });
    return () => {
      cancelled = true;
    };
  }, [api, reads]);

  const reload = () => {
    setLinks(null);
    setLinksFailure(null);
    setReads((count) => count + 1);
  };

  const issue = async (payload: RequestLinkPayload) => {
    setIssuing(true);
    setRefusal(null);
    try {
      setIssued(await api.issueLink(payload));
      reload();
    } catch (raw) {
      setRefusal(toApiFailure(raw));
    } finally {
      setIssuing(false);
    }
  };

  const revoke = async (link: RequestLink) => {
    setRevoking(null);
    setRevokeFailure(null);
    try {
      const revoked = await api.revokeLink(link.id);
      setLinks((current) => current?.map((row) => (row.id === link.id ? revoked : row)) ?? current);
    } catch (raw) {
      setRevokeFailure(toApiFailure(raw));
    }
  };

  return (
    <>
      <RequestLinkDialogBody
        formBase={formBase}
        issued={issued}
        issuing={issuing}
        refusal={refusal ? failureMessage(refusal, t) : null}
        links={links}
        linksError={linksFailure ? failureMessage(linksFailure, t) : null}
        revokeError={revokeFailure ? failureMessage(revokeFailure, t) : null}
        onIssue={(payload) => void issue(payload)}
        onDismissIssued={() => setIssued(null)}
        onRevoke={setRevoking}
        onRetry={reload}
      />
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(next) => !next && setRevoking(null)}
        title={t("rr_link_revoke_title")}
        confirmLabel={t("intake_revoke")}
        tone="danger"
        onConfirm={() => revoking && void revoke(revoking)}
      >
        <p className="text-small leading-body text-fg">
          {t("rr_link_revoke_body", { email: revoking?.email ?? "" })}
        </p>
      </ConfirmDialog>
    </>
  );
}

export interface RequestLinkDialogProps {
  api: ResourceRequestsAPI;
  formBase: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestLinkDialog({ api, formBase, open, onOpenChange }: RequestLinkDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{t("rr_link_btn")}</DialogTitle>
            <DialogDescription>{t("rr_link_sub")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <RequestLinkPanel api={api} formBase={formBase} />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            {t("btn_close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
