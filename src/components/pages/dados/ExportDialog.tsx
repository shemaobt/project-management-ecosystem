import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { Project } from "../../../types/project";
import {
  EXPORT_MIME_TYPES,
  buildProjectsExport,
  downloadTextFile,
  exportFileName,
  serializeExport,
  type ExportFormat,
} from "../../../utils/export";
import { getLocationDisplay } from "../../../utils/region";
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

export interface ExportDialogBodyProps {
  projects: readonly Project[] | null;
  onDownload: (format: ExportFormat) => void;
}

export function ExportDialogBody({
  projects,
  onDownload,
}: ExportDialogBodyProps) {
  const { t } = useTranslation();
  const withheld =
    projects === null
      ? 0
      : projects.filter((project) => getLocationDisplay(project).withheld)
          .length;

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-small leading-body text-fg">{t("export_contains")}</p>
      <p className="text-small font-semibold leading-body text-fg-strong">
        {t("export_confidential")}
      </p>
      {projects === null ? (
        <p className="text-small text-fg-muted">{t("loading")}</p>
      ) : (
        <>
          <p className="text-small text-fg-muted">
            {t("export_count", { count: projects.length })}
          </p>
          {withheld > 0 && (
            <p className="text-small leading-body text-fg-muted">
              {t("export_withheld_count", { count: withheld })}
            </p>
          )}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button size="sm" onClick={() => onDownload("json")}>
              {t("export_json")}
            </Button>
            <Button size="sm" onClick={() => onDownload("csv")}>
              {t("export_csv")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export interface HeaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: HeaderDialogProps) {
  const { t } = useTranslation();
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);

  useEffect(() => {
    if (open) void hydrate();
  }, [open, hydrate]);

  const handleDownload = (format: ExportFormat) => {
    const data = buildProjectsExport(projects, t);
    downloadTextFile(
      exportFileName(format),
      serializeExport(data, format, t),
      EXPORT_MIME_TYPES[format],
    );
    toast(t("toast_exported"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{t("btn_export")}</DialogTitle>
            <DialogDescription>{t("export_sub")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <ExportDialogBody
            projects={hydrated ? projects : null}
            onDownload={handleDownload}
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
