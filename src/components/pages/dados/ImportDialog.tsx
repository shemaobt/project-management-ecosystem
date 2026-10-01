import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import {
  failureMessage,
  toApiFailure,
  transferAPI,
  type TransferAPI,
} from "../../../services/api";
import { useProjectsStore } from "../../../stores/projectsStore";
import { canImportProjects } from "../../../utils/access";
import {
  parseProjectsImport,
  type ImportParseResult,
} from "../../../utils/export";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "../../ui";
import type { HeaderDialogProps } from "./ExportDialog";
import { previewNames } from "./importPreview";

export interface ImportPick {
  fileName: string;
  /** The file's bytes as read — what the server receives, untouched. */
  raw: string;
  result: ImportParseResult;
}

export interface ImportDialogBodyProps {
  /** `"server"` merges by id through the record's own write; `"local"` replaces the fixtures. */
  target: "server" | "local";
  /** Only coordination imports (BE-14); anybody else is told whose it is. */
  allowed: boolean;
  pick: ImportPick | null;
  applying: boolean;
  /** The sentence a failed apply earned, when it did. */
  refusal: string | null;
  onChoose: () => void;
  onApply: () => void;
}

export function ImportDialogBody({
  target,
  allowed,
  pick,
  applying,
  refusal,
  onChoose,
  onApply,
}: ImportDialogBodyProps) {
  const { t } = useTranslation();

  if (!allowed) {
    return (
      <p className="text-small leading-body text-fg">
        {t("import_coordination_only")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-small leading-body text-fg">{t("import_desc")}</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="secondary" size="sm" onClick={onChoose} disabled={applying}>
          {t("import_choose")}
        </Button>
        {pick !== null && (
          <span className="text-small text-fg-muted">{pick.fileName}</span>
        )}
      </div>
      {pick !== null &&
        (pick.result.ok ? (
          <ImportPreview
            target={target}
            projects={pick.result.projects}
            applying={applying}
            onApply={onApply}
          />
        ) : (
          <>
            <p
              role="status"
              className="rounded-md border-l-4 border-status-attention bg-status-attention-bg px-4 py-3 text-small leading-[1.45] text-status-attention-ink"
            >
              {t(pick.result.error.key, { ...pick.result.error })}
            </p>
            <p className="text-small text-fg-muted">{t("import_none_applied")}</p>
          </>
        ))}
      {refusal !== null && (
        <>
          <p
            role="alert"
            className="rounded-md border-l-4 border-status-attention bg-status-attention-bg px-4 py-3 text-small leading-[1.45] text-status-attention-ink"
          >
            {refusal}
          </p>
          <p className="text-small text-fg-muted">{t("import_none_applied")}</p>
        </>
      )}
    </div>
  );
}

interface ImportPreviewProps {
  target: "server" | "local";
  projects: readonly { languageName: string; id: string }[];
  applying: boolean;
  onApply: () => void;
}

/**
 * What the file will do, before it does it (INT-11 · OBT-416). BE-14 has no dry run, so the
 * preview reads the file itself — how many records, which ones — and states the server's own
 * rules for a merge, each checked against `import_projects.py`: a project the file does not name
 * is left as it is; the file authorizes nothing (`NOT_FROM_A_FILE` drops the visibility, and a
 * request it changes is unauthorized again); what the server derives is dropped and named.
 */
function ImportPreview({ target, projects, applying, onApply }: ImportPreviewProps) {
  const { t } = useTranslation();
  const { shown, more } = previewNames(projects);

  return (
    <>
      <p className="text-small text-fg">
        {t("import_ready", { count: projects.length })}
      </p>
      <ul className="flex flex-col gap-1 rounded-md bg-muted px-3.5 py-2.5 text-small text-fg">
        {shown.map((name, index) => (
          <li key={`${name}-${index}`} className="truncate">
            {name}
          </li>
        ))}
        {more > 0 && (
          <li className="text-fg-muted">{t("import_preview_more", { count: more })}</li>
        )}
      </ul>
      {target === "server" ? (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-small leading-body text-fg">
          <li>{t("import_preview_kept")}</li>
          <li>{t("import_preview_prayer")}</li>
          <li>{t("import_preview_server_fields")}</li>
        </ul>
      ) : null}
      <p className="text-small font-semibold leading-body text-fg-strong">
        {t(target === "server" ? "import_confirm_server" : "confirm_import")}
      </p>
      <div className="pt-1">
        <Button size="sm" onClick={onApply} disabled={applying}>
          {t(
            applying
              ? "import_applying"
              : target === "server"
                ? "import_apply_server"
                : "import_apply",
          )}
        </Button>
      </div>
    </>
  );
}

export function ImportDialog({ open, onOpenChange }: HeaderDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const importLocally = useProjectsStore((state) => state.importProjects);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pick, setPick] = useState<ImportPick | null>(null);
  const [applying, setApplying] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && !applying) {
      setPick(null);
      setRefusal(null);
    }
    onOpenChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setRefusal(null);
    let raw: string;
    try {
      raw = await file.text();
    } catch {
      setPick({
        fileName: file.name,
        raw: "",
        result: { ok: false, error: { key: "import_invalid_json" } },
      });
      return;
    }
    setPick({ fileName: file.name, raw, result: parseProjectsImport(raw) });
  };

  // The dialog may be closed while the file is in flight; the toast is what still reaches the
  // person then, exactly as it does when the import succeeds.
  const refuse = (sentence: string) => {
    setRefusal(sentence);
    toast(sentence);
  };

  const applyOnServer = async (api: TransferAPI, chosen: ImportPick) => {
    setApplying(true);
    try {
      const answer = await api.importProjects(chosen.raw);
      if (!answer.ok) {
        refuse(t(answer.error.key, { ...answer.error }));
        return;
      }
      toast(t("import_done", { count: answer.applied }));
      if (answer.ignoredFields.length > 0) {
        toast(t("import_ignored_fields", { fields: answer.ignoredFields.join(", ") }));
      }
      setPick(null);
      onOpenChange(false);
    } catch (raw: unknown) {
      refuse(failureMessage(toApiFailure(raw), t));
    } finally {
      setApplying(false);
    }
  };

  const handleApply = () => {
    if (pick === null || !pick.result.ok || applying) return;
    if (transferAPI !== null) {
      void applyOnServer(transferAPI, pick);
      return;
    }
    importLocally(pick.result.projects);
    toast(t("import_done", { count: pick.result.projects.length }));
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{t("btn_import")}</DialogTitle>
            <DialogDescription>{t("import_sub")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <ImportDialogBody
            target={transferAPI === null ? "local" : "server"}
            allowed={transferAPI === null || canImportProjects(user.roles)}
            pick={pick}
            applying={applying}
            refusal={refusal}
            onChoose={() => inputRef.current?.click()}
            onApply={handleApply}
          />
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            {t("btn_cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
