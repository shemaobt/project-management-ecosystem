import { CheckCircle2, MailWarning } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  failureMessage,
  toApiFailure,
  type AccessAPI,
} from "../../../services/api";
import type {
  AwaitingProject,
  ConfirmedProject,
  ProjectConfirmation,
} from "../../../types/access";
import type { ApiFailure } from "../../../types/session";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { OneTimeLink } from "../../common/OneTimeLink";
import { Button, Label, Textarea } from "../../ui";
import { Panel } from "./Panel";
import { keepConfirmation } from "./pending";
import { PendingProjectForm } from "./PendingProjectForm";
import { RefusalNote } from "./RefusalNote";

export interface ConfirmedNoteProps {
  result: ConfirmedProject;
  onDismiss: () => void;
}

export function ConfirmedNote({ result, onDismiss }: ConfirmedNoteProps) {
  const { t } = useTranslation();

  return (
    <div role="status" className="flex flex-col gap-3 rounded-md bg-muted px-4 py-3.5">
      <p className="inline-flex items-center gap-1.5 text-small font-semibold text-fg">
        <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
        {t("acesso_pending_confirmed", { name: result.languageName })}
      </p>
      <p className="text-micro leading-[1.45] text-fg">
        {t("acesso_pending_joined", { count: result.joined.length })} ·{" "}
        {t("acesso_pending_invited", { count: result.invited.length })}
      </p>
      {result.withoutEmail.length > 0 ? (
        <p className="text-micro leading-[1.45] text-fg-muted">
          {t("acesso_pending_without_email", {
            names: result.withoutEmail
              .map((name) => name || t("acesso_pending_member_unnamed"))
              .join(", "),
          })}
        </p>
      ) : null}
      {result.invited.map((invite) => (
        <OneTimeLink
          key={invite.inviteId}
          url={invite.inviteUrl}
          heading={t("acesso_invite_ready", { email: invite.email })}
          note={t("acesso_pending_invite_once")}
          footer={
            <p className="inline-flex items-center gap-1.5 text-micro leading-[1.45] text-fg">
              {invite.emailSent ? (
                <CheckCircle2 size={14} strokeWidth={1.75} aria-hidden className="shrink-0" />
              ) : (
                <MailWarning size={14} strokeWidth={1.75} aria-hidden className="shrink-0" />
              )}
              {invite.emailSent
                ? t("acesso_invite_email_sent", { email: invite.email })
                : t("acesso_invite_email_not_sent")}
            </p>
          }
        />
      ))}
      <div>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          {t("btn_close")}
        </Button>
      </div>
    </div>
  );
}

export interface DiscardReasonProps {
  reason: string;
  onChange: (reason: string) => void;
}

export function DiscardReason({ reason, onChange }: DiscardReasonProps) {
  const { t } = useTranslation();
  const reasonId = useId();
  const missing = reason.trim() === "";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small leading-body text-fg">{t("acesso_pending_discard_body")}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={reasonId}>{t("acesso_pending_discard_reason")}</Label>
        <Textarea
          id={reasonId}
          value={reason}
          maxLength={1000}
          aria-describedby={missing ? `${reasonId}-required` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {missing ? (
          <p id={`${reasonId}-required`} className="text-micro text-accent-press">
            {t("acesso_pending_discard_reason_required")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export interface PendingStateProps {
  projects: readonly AwaitingProject[] | null;
  error: string | null;
  onRetry: () => void;
}

export function PendingState({ projects, error, onRetry }: PendingStateProps) {
  const { t } = useTranslation();

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
  if (projects === null) return <LoadingSpinner size="sm" label={t("loading")} />;
  if (projects.length === 0) {
    return <p className="text-small text-fg-muted">{t("acesso_pending_empty")}</p>;
  }
  return null;
}

export interface PendingProjectsSectionProps {
  api: AccessAPI;
  onChanged: () => void;
}

export function PendingProjectsSection({ api, onChanged }: PendingProjectsSectionProps) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<readonly AwaitingProject[] | null>(null);
  const [loadFailure, setLoadFailure] = useState<ApiFailure | null>(null);
  const [version, setVersion] = useState(0);
  const [working, setWorking] = useState<string | null>(null);
  const [refusals, setRefusals] = useState<Record<string, ApiFailure>>({});
  const [confirmed, setConfirmed] = useState<readonly ConfirmedProject[]>([]);
  const [discarding, setDiscarding] = useState<AwaitingProject | null>(null);
  const [reason, setReason] = useState("");
  const [discarded, setDiscarded] = useState<string | null>(null);
  const [discardFailure, setDiscardFailure] = useState<ApiFailure | null>(null);

  const reload = useCallback(() => {
    setLoadFailure(null);
    setProjects(null);
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .pendingProjects()
      .then((result) => {
        if (!cancelled) setProjects(result);
      })
      .catch((raw: unknown) => {
        if (!cancelled) setLoadFailure(toApiFailure(raw));
      });
    return () => {
      cancelled = true;
    };
  }, [api, version]);

  const refuse = (projectId: string, failure: ApiFailure | null) =>
    setRefusals((current) => {
      const next = { ...current };
      if (failure) next[projectId] = failure;
      else delete next[projectId];
      return next;
    });

  const confirm = (project: AwaitingProject, payload: ProjectConfirmation) => {
    setWorking(project.id);
    refuse(project.id, null);
    setDiscarded(null);
    api
      .confirmProject(project.id, payload)
      .then((result) => {
        setConfirmed((current) => keepConfirmation(current, result));
        setProjects((current) => current?.filter((entry) => entry.id !== project.id) ?? null);
        onChanged();
      })
      .catch((raw: unknown) => refuse(project.id, toApiFailure(raw)))
      .finally(() => setWorking(null));
  };

  const discard = (project: AwaitingProject) => {
    setWorking(project.id);
    setDiscardFailure(null);
    api
      .discardProject(project.id, reason.trim())
      .then(() => {
        setDiscarding(null);
        setReason("");
        setDiscarded(project.languageName || t("notif_request_unnamed"));
        setProjects((current) => current?.filter((entry) => entry.id !== project.id) ?? null);
      })
      .catch((raw: unknown) => {
        setDiscarding(null);
        setDiscardFailure(toApiFailure(raw));
      })
      .finally(() => setWorking(null));
  };

  return (
    <Panel id="aguardando" title={t("acesso_pending_title")} lead={t("acesso_pending_lead")}>
      <div className="flex flex-col gap-6">
        {confirmed.map((result) => (
          <ConfirmedNote
            key={result.id}
            result={result}
            onDismiss={() =>
              setConfirmed((current) => current.filter((entry) => entry.id !== result.id))
            }
          />
        ))}
        {discarded ? (
          <p role="status" className="text-small text-fg">
            {t("acesso_pending_discarded", { name: discarded })}
          </p>
        ) : null}
        {discardFailure ? <RefusalNote failure={discardFailure} /> : null}
        <PendingState
          projects={projects}
          error={loadFailure ? failureMessage(loadFailure, t) : null}
          onRetry={reload}
        />
        {projects?.map((project) => (
          <PendingProjectForm
            key={project.id}
            project={project}
            working={working === project.id}
            refusal={refusals[project.id] ?? null}
            onConfirm={(payload) => confirm(project, payload)}
            onDiscard={() => {
              setReason("");
              setDiscarding(project);
            }}
          />
        ))}
      </div>

      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(open) => {
          if (!open) setDiscarding(null);
        }}
        tone="danger"
        title={t("acesso_pending_discard_title", {
          name: discarding?.languageName || t("notif_request_unnamed"),
        })}
        confirmLabel={t("acesso_pending_discard")}
        busy={reason.trim() === "" || working !== null}
        onConfirm={() => discarding && discard(discarding)}
      >
        <DiscardReason reason={reason} onChange={setReason} />
      </ConfirmDialog>
    </Panel>
  );
}
