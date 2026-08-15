import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectsStore } from "../../../stores/projectsStore";
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

export interface ImportPick {
  fileName: string;
  result: ImportParseResult;
}

export interface ImportDialogBodyProps {
  pick: ImportPick | null;
  onChoose: () => void;
  onApply: () => void;
}

export function ImportDialogBody({
  pick,
  onChoose,
  onApply,
}: ImportDialogBodyProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-small leading-body text-fg">{t("import_desc")}</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="secondary" size="sm" onClick={onChoose}>
          {t("import_choose")}
        </Button>
        {pick !== null && (
          <span className="text-small text-fg-muted">{pick.fileName}</span>
        )}
      </div>
      {pick !== null &&
        (pick.result.ok ? (
          <>
            <p className="text-small text-fg">
              {t("import_ready", { count: pick.result.projects.length })}
            </p>
            <p className="text-small font-semibold leading-body text-fg-strong">
              {t("confirm_import")}
            </p>
            <div className="pt-1">
              <Button size="sm" onClick={onApply}>
                {t("import_apply")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p
              role="status"
              className="rounded-md border-l-4 border-status-attention bg-status-attention-bg px-4 py-3 text-small leading-[1.45] text-status-attention-fg"
            >
              {t(pick.result.error.key, { ...pick.result.error })}
            </p>
            <p className="text-small text-fg-muted">{t("import_none_applied")}</p>
          </>
        ))}
    </div>
  );
}

export function ImportDialog({ open, onOpenChange }: HeaderDialogProps) {
  const { t } = useTranslation();
  const importProjects = useProjectsStore((state) => state.importProjects);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pick, setPick] = useState<ImportPick | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) setPick(null);
    onOpenChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const raw = await file.text();
    setPick({ fileName: file.name, result: parseProjectsImport(raw) });
  };

  const handleApply = () => {
    if (pick === null || !pick.result.ok) return;
    importProjects(pick.result.projects);
    toast(`${pick.result.projects.length} ${t("toast_imported")}`);
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
            pick={pick}
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
