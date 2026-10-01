import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  failureMessage,
  membersAPI,
  toApiFailure,
} from "../../../services/api";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { AccountGrants } from "../../../types/access";
import type { Project, ProjectMember } from "../../../types/project";
import type { ApiFailure } from "../../../types/session";
import { formatDate } from "../../../utils/format";
import { selectableProjects } from "../../../utils/forms";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui";
import { MembersPanel } from "../ficha/tabs/equipe/ProjectMembers";
import { ProjectSelector } from "../formularios/ProjectSelector";
import { RefusalNote } from "./RefusalNote";

export interface RosterViewProps {
  person: string;
  personId: string;
  members: readonly ProjectMember[] | null;
  error: string | null;
  busy: boolean;
  refusal: ApiFailure | null;
  onAdd: () => void;
  onRemove: () => void;
}

export function RosterView({
  person,
  personId,
  members,
  error,
  busy,
  refusal,
  onAdd,
  onRemove,
}: RosterViewProps) {
  const { t } = useTranslation();
  const member = members?.find((entry) => entry.userId === personId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {members !== null && !error ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small leading-normal text-fg">
            {member
              ? t("acesso_member_since", {
                  person,
                  date: formatDate(member.addedAt, t("locale")),
                })
              : t("acesso_member_not", { person })}
          </p>
          <Button
            size="sm"
            variant={member ? "ghost" : "secondary"}
            disabled={busy}
            onClick={member ? onRemove : onAdd}
          >
            {busy
              ? t("acesso_saving")
              : t(member ? "acesso_member_remove" : "acesso_member_add")}
          </Button>
        </div>
      ) : null}
      {refusal ? <RefusalNote failure={refusal} /> : null}
      <MembersPanel
        members={members}
        error={error}
        hint={t("acesso_members_same_list")}
      />
    </div>
  );
}

interface ProjectRosterProps {
  projectId: string;
  person: string;
  personId: string;
  busy: boolean;
  refusal: ApiFailure | null;
  onAdd: () => void;
  onRemove: () => void;
}

function ProjectRoster({ projectId, ...view }: ProjectRosterProps) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<readonly ProjectMember[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  useEffect(() => {
    let cancelled = false;
    membersAPI
      .list(projectId)
      .then((result) => {
        if (!cancelled) setMembers(result);
      })
      .catch((raw: unknown) => {
        if (!cancelled) setFailure(toApiFailure(raw));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <RosterView
      {...view}
      members={members}
      error={failure ? failureMessage(failure, t) : null}
    />
  );
}

export interface MembershipSectionProps {
  person: AccountGrants;
}

export function MembershipSection({ person }: MembershipSectionProps) {
  const { t } = useTranslation();
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const loadFailure = useProjectsStore((state) => state.error);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const reload = useProjectsStore((state) => state.reload);

  const [projectId, setProjectId] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<ApiFailure | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const name = person.displayName ?? person.email;

  const write = (change: () => Promise<unknown>) => {
    setBusy(true);
    setRefusal(null);
    setConfirmRemove(false);
    change()
      .then(() => setVersion((current) => current + 1))
      .catch((raw: unknown) => setRefusal(toApiFailure(raw)))
      .finally(() => setBusy(false));
  };

  const pick = (next: string) => {
    setProjectId(next);
    setRefusal(null);
  };

  const sorted: Project[] = hydrated ? selectableProjects(projects) : [];

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      <h3 className="text-small font-bold text-fg-strong">
        {t("acesso_members_title")}
      </h3>
      <p className="max-w-[68ch] text-small leading-normal text-fg-muted">
        {t("acesso_members_gap", { person: name })}
      </p>
      {!hydrated ? (
        loadFailure ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-small text-fg-muted">
              {failureMessage(loadFailure, t)}
            </p>
            <Button size="sm" variant="secondary" onClick={() => void reload()}>
              {t("net_retry")}
            </Button>
          </div>
        ) : (
          <LoadingSpinner size="sm" label={t("loading")} />
        )
      ) : sorted.length === 0 ? (
        <p className="text-small text-fg-muted">{t("acesso_members_no_projects")}</p>
      ) : (
        <ProjectSelector projects={sorted} value={projectId} onChange={pick} />
      )}
      {projectId ? (
        <ProjectRoster
          key={`${projectId}:${version}`}
          projectId={projectId}
          person={name}
          personId={person.userId}
          busy={busy}
          refusal={refusal}
          onAdd={() => write(() => membersAPI.add(projectId, person.userId))}
          onRemove={() => setConfirmRemove(true)}
        />
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        tone="danger"
        title={t("acesso_member_remove_title", { person: name })}
        confirmLabel={t("acesso_member_remove")}
        busy={busy}
        onConfirm={() => write(() => membersAPI.remove(projectId, person.userId))}
      >
        <p className="text-small leading-body text-fg">
          {t("acesso_member_remove_warning")}
        </p>
      </ConfirmDialog>
    </div>
  );
}
