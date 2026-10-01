import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formsAPI, toApiFailure, failureMessage } from "../../../services/api";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { IntakeLink, IntakeLinkCreated } from "../../../types/forms";
import type { Project } from "../../../types/project";
import type { ApiFailure } from "../../../types/session";
import { selectableProjects } from "../../../utils/forms";
import { formatDate } from "../../../utils/format";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { OneTimeLink } from "../../common/OneTimeLink";
import { ProjectsUnread } from "../../common/ProjectsUnread";
import {
  LINK_STATUS_LABEL_KEYS,
  LINK_STATUS_TONES,
} from "../../../constants/linkStatus";
import { ProjectSelector } from "../formularios/ProjectSelector";
import type { HeaderDialogProps } from "./ExportDialog";

export interface LeaderLinkDialogBodyProps {
  projects: readonly Project[] | null;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  links: readonly IntakeLink[] | null;
  minted: IntakeLinkCreated | null;
  minting: boolean;
  onMint: () => void;
  onRevoke: (linkId: string) => void;
  error: string | null;
  /** Why the project list could not be read — said, with a retry, instead of a spinner. */
  loadFailure?: ApiFailure | null;
  onRetry?: () => void;
}

export function LeaderLinkDialogBody({
  projects,
  selectedProjectId,
  onSelectProject,
  links,
  minted,
  minting,
  onMint,
  onRevoke,
  error,
  loadFailure = null,
  onRetry,
}: LeaderLinkDialogBodyProps) {
  const { t } = useTranslation();
  const sorted = projects ? selectableProjects(projects) : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small leading-body text-fg">{t("intake_desc")}</p>
      <p className="text-small leading-body text-fg">{t("intake_scope")}</p>
      <p className="text-small leading-body text-fg">{t("intake_expiry")}</p>

      {projects === null && loadFailure && onRetry ? (
        <ProjectsUnread failure={loadFailure} onRetry={onRetry} />
      ) : projects === null ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner size="md" label={t("loading")} />
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-small text-fg-muted">{t("forms_no_projects")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <ProjectSelector
              projects={sorted}
              value={selectedProjectId}
              onChange={onSelectProject}
            />
            <Button
              size="sm"
              onClick={onMint}
              disabled={!selectedProjectId || minting}
            >
              {minting ? t("intake_minting") : t("intake_generate")}
            </Button>
          </div>

          {error ? (
            <p className="text-small font-semibold text-telha">{error}</p>
          ) : null}

          {minted ? (
            <OneTimeLink
              url={minted.url}
              heading={t("intake_link_ready")}
              note={t("intake_link_once")}
              footer={
                <p className="text-tag text-fg-subtle">
                  {t("intake_expires_on", { date: formatDate(minted.expiresAt) })}
                </p>
              }
            />
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="text-micro font-bold tracking-button uppercase text-fg-muted">
              {t("intake_links_title")}
            </p>
            {links === null ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" label={t("loading")} />
              </div>
            ) : links.length === 0 ? (
              <p className="text-small text-fg-subtle">{t("intake_links_empty")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge tone={LINK_STATUS_TONES[link.status]} size="sm" uppercase>
                        {t(LINK_STATUS_LABEL_KEYS[link.status])}
                      </Badge>
                      <span className="text-tag text-fg-subtle">
                        {t("intake_expires_on", {
                          date: formatDate(link.expiresAt),
                        })}
                      </span>
                    </div>
                    {link.status === "pending" || link.status === "used" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onRevoke(link.id)}
                      >
                        <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
                        {t("intake_revoke")}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function LeaderLinkDialog({ open, onOpenChange }: HeaderDialogProps) {
  const { t } = useTranslation();
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const loadFailure = useProjectsStore((state) => state.error);
  const reloadProjects = useProjectsStore((state) => state.reload);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [links, setLinks] = useState<readonly IntakeLink[] | null>(null);
  const [minted, setMinted] = useState<IntakeLinkCreated | null>(null);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = hydrated ? selectableProjects(projects) : [];
  // The default selection is derived at render, never set from an effect — the first
  // project stands in until the coordinator explicitly picks one (an event handler).
  const effectiveProjectId = selectedProjectId || sorted[0]?.id || "";

  useEffect(() => {
    if (open) void hydrate();
  }, [open, hydrate]);

  useEffect(() => {
    if (!open || !effectiveProjectId) return;
    let cancelled = false;
    formsAPI
      .listIntakeLinks(effectiveProjectId)
      .then((result) => {
        if (!cancelled) setLinks(result);
      })
      .catch((raw) => {
        if (!cancelled) {
          setError(failureMessage(toApiFailure(raw), t));
          setLinks([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, effectiveProjectId, t]);

  const selectProject = (id: string) => {
    setSelectedProjectId(id);
    setLinks(null);
    setMinted(null);
    setError(null);
  };

  const mint = async () => {
    if (!effectiveProjectId) return;
    setMinting(true);
    setError(null);
    try {
      const created = await formsAPI.mintIntakeLink({
        projectId: effectiveProjectId,
      });
      setMinted(created);
      setLinks((current) => [created, ...(current ?? [])]);
    } catch (raw) {
      setError(failureMessage(toApiFailure(raw), t));
    } finally {
      setMinting(false);
    }
  };

  const revoke = async (linkId: string) => {
    try {
      const revoked = await formsAPI.revokeIntakeLink(linkId);
      setLinks(
        (current) =>
          current?.map((link) => (link.id === linkId ? revoked : link)) ??
          current,
      );
    } catch (raw) {
      setError(failureMessage(toApiFailure(raw), t));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{t("btn_intake")}</DialogTitle>
            <DialogDescription>{t("intake_sub")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <LeaderLinkDialogBody
            projects={hydrated ? projects : null}
            selectedProjectId={effectiveProjectId}
            onSelectProject={selectProject}
            links={links}
            minted={minted}
            minting={minting}
            onMint={mint}
            onRevoke={revoke}
            error={error}
            loadFailure={loadFailure}
            onRetry={() => void reloadProjects()}
          />
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
