import { CheckCircle2, MailWarning, Plus, X } from "lucide-react";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
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
import { formatDate, utcDay } from "../../../utils/format";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { OneTimeLink } from "../../common/OneTimeLink";
import { Button, CheckboxField, Input, Label, Textarea } from "../../ui";
import { Panel } from "./Panel";
import { RefusalNote } from "./RefusalNote";

interface MemberRow {
  key: string;
  name: string;
  role: string;
  email: string;
}

function rowsOf(project: AwaitingProject): MemberRow[] {
  return project.members.map((member, index) => ({
    key: `${project.id}-${index}`,
    name: member.name,
    role: member.role,
    email: member.email,
  }));
}

export interface PendingProjectFormProps {
  project: AwaitingProject;
  working: boolean;
  refusal: ApiFailure | null;
  onConfirm: (payload: ProjectConfirmation) => void;
  onDiscard: () => void;
}

export function PendingProjectForm({
  project,
  working,
  refusal,
  onConfirm,
  onDiscard,
}: PendingProjectFormProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [languageName, setLanguageName] = useState(project.languageName);
  const [languageCode, setLanguageCode] = useState(project.languageCode);
  const [location, setLocation] = useState(project.location);
  const [team, setTeam] = useState(project.team);
  const [sensitive, setSensitive] = useState(project.locationWithheld);
  const [members, setMembers] = useState<MemberRow[]>(() => rowsOf(project));
  const [added, setAdded] = useState(0);

  const ready = languageName.trim() !== "";
  const filed = formatDate(utcDay(project.filedAt), t("locale"));

  const edit = (key: string, field: "name" | "email", value: string) =>
    setMembers((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );

  const add = () => {
    setMembers((current) => [
      ...current,
      { key: `${project.id}-new-${added}`, name: "", role: "", email: "" },
    ]);
    setAdded((current) => current + 1);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || working) return;
    onConfirm({
      languageName: languageName.trim(),
      languageCode: languageCode.trim(),
      location: location.trim(),
      team: team.trim(),
      sensitiveCountry: sensitive,
      members: members.map((row) => ({ name: row.name.trim(), email: row.email.trim() })),
    });
  };

  return (
    <article
      aria-labelledby={`${fieldId}-title`}
      className="flex flex-col gap-5 border-t border-line pt-5 first:border-t-0 first:pt-0"
    >
      <header className="flex flex-col gap-1">
        <h3
          id={`${fieldId}-title`}
          className="text-small font-bold wrap-anywhere text-fg-strong"
        >
          {project.languageName || t("notif_request_unnamed")}
        </h3>
        <p className="text-micro text-fg-muted">
          {t("acesso_pending_from_request", {
            name: project.requestName || t("notif_request_unnamed"),
            date: filed,
          })}
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-name`}>{t("f_lang_name")}</Label>
            <Input
              id={`${fieldId}-name`}
              value={languageName}
              invalid={!ready}
              onChange={(event) => setLanguageName(event.target.value)}
            />
            {!ready ? (
              <p className="text-micro text-accent-press">{t("acesso_pending_name_required")}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-code`}>{t("f_lang_code")}</Label>
            <Input
              id={`${fieldId}-code`}
              value={languageCode}
              onChange={(event) => setLanguageCode(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-location`}>{t("f_location")}</Label>
            <Input
              id={`${fieldId}-location`}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-team`}>{t("f_facilitators")}</Label>
            <Input
              id={`${fieldId}-team`}
              value={team}
              onChange={(event) => setTeam(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <CheckboxField
            id={`${fieldId}-sensitive`}
            label={t("f_sensitive")}
            checked={sensitive}
            onCheckedChange={(checked) => setSensitive(checked === true)}
          />
          <p className="text-micro leading-[1.45] text-fg-muted">{t("f_sensitive_hint")}</p>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-tag font-bold tracking-button uppercase text-fg-muted">
            {t("acesso_pending_members_title")}
          </legend>
          <p className="text-micro leading-[1.45] text-fg-muted">
            {t("acesso_pending_members_hint")}
          </p>
          {members.length === 0 ? (
            <p className="text-small text-fg-muted">{t("acesso_pending_members_empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {members.map((row) => (
                <li key={row.key} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`${fieldId}-${row.key}-name`}>
                      {t("acesso_pending_member_name")}
                    </Label>
                    <Input
                      id={`${fieldId}-${row.key}-name`}
                      value={row.name}
                      onChange={(event) => edit(row.key, "name", event.target.value)}
                    />
                    {row.role ? (
                      <span className="text-micro text-fg-subtle">{row.role}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`${fieldId}-${row.key}-email`}>
                      {t("acesso_pending_member_email")}
                    </Label>
                    <Input
                      id={`${fieldId}-${row.key}-email`}
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      value={row.email}
                      onChange={(event) => edit(row.key, "email", event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={t("acesso_pending_member_remove", {
                      name: row.name || row.email || t("acesso_pending_member_unnamed"),
                    })}
                    onClick={() =>
                      setMembers((current) => current.filter((entry) => entry.key !== row.key))
                    }
                  >
                    <X size={14} strokeWidth={1.75} aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button type="button" size="sm" variant="secondary" onClick={add}>
              <Plus size={14} strokeWidth={1.75} aria-hidden />
              {t("acesso_pending_member_add")}
            </Button>
          </div>
        </fieldset>

        {refusal ? <RefusalNote failure={refusal} /> : null}

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" disabled={!ready || working}>
            {working ? t("acesso_pending_confirming") : t("acesso_pending_confirm")}
          </Button>
          <Button type="button" variant="ghost" disabled={working} onClick={onDiscard}>
            {t("acesso_pending_discard")}
          </Button>
        </div>
      </form>
    </article>
  );
}

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
  const reasonId = useId();
  const [projects, setProjects] = useState<readonly AwaitingProject[] | null>(null);
  const [loadFailure, setLoadFailure] = useState<ApiFailure | null>(null);
  const [version, setVersion] = useState(0);
  const [working, setWorking] = useState<string | null>(null);
  const [refusals, setRefusals] = useState<Record<string, ApiFailure>>({});
  const [confirmed, setConfirmed] = useState<ConfirmedProject | null>(null);
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
        setConfirmed(result);
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
        {confirmed ? (
          <ConfirmedNote result={confirmed} onDismiss={() => setConfirmed(null)} />
        ) : null}
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
        <div className="flex flex-col gap-3">
          <p className="text-small leading-body text-fg">{t("acesso_pending_discard_body")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>{t("acesso_pending_discard_reason")}</Label>
            <Textarea
              id={reasonId}
              value={reason}
              maxLength={1000}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
      </ConfirmDialog>
    </Panel>
  );
}
