import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  failureMessage,
  pulseLanguage,
  toApiFailure,
  transferAPI,
  type TransferFormat,
  type TransferProgress,
} from "../../../services/api";
import { downloadBlob } from "../../../utils/export";
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
import { progressPercent, readableSize, type ExportRun } from "./exportProgress";

export interface ExportDialogBodyProps {
  /** `false` without a server: there is no client-side export to fall back on. */
  available: boolean;
  run: ExportRun;
  onDownload: (format: TransferFormat) => void;
}

export function ExportDialogBody({
  available,
  run,
  onDownload,
}: ExportDialogBodyProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-small leading-body text-fg">{t("export_contains")}</p>
      <p className="text-small font-semibold leading-body text-fg-strong">
        {t("export_confidential")}
      </p>
      {!available ? (
        <p className="text-small leading-body text-fg-muted">
          {t("export_needs_server")}
        </p>
      ) : run.status === "running" ? (
        <ExportProgressLine progress={run.progress} />
      ) : (
        <>
          {run.status === "failed" && (
            <p role="alert" className="text-small leading-body text-fg">
              {failureMessage(run.failure, t)}
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

function ExportProgressLine({ progress }: { progress: TransferProgress }) {
  const { t } = useTranslation();
  const percent = progressPercent(progress);
  const size = readableSize(progress.loaded);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label={t("export_running")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="h-1.5 overflow-hidden rounded-pill bg-muted"
      >
        <div
          className="h-full rounded-pill bg-telha transition-[width] duration-fast ease-out"
          style={{ width: `${percent ?? 100}%` }}
        />
      </div>
      <p aria-live="polite" className="text-small text-fg-muted">
        {percent === null
          ? t("export_progress_bytes", { size })
          : t("export_progress_percent", {
              percent,
              size,
              total: readableSize(progress.total ?? progress.loaded),
            })}
      </p>
      <p className="text-micro leading-[1.4] text-fg-muted">
        {t("export_keep_working")}
      </p>
    </div>
  );
}

export interface HeaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The export is the server's (INT-11 · OBT-416, BE-14): the file is built there, reduced for
 * everybody and headed with its provenance, and this dialog only asks for it and saves it. The
 * run lives in this component, which the header keeps mounted, so closing the dialog does not
 * stop a download — the person goes on working, and a toast says when the file is saved.
 */
export function ExportDialog({ open, onOpenChange }: HeaderDialogProps) {
  const { t, i18n } = useTranslation();
  const [run, setRun] = useState<ExportRun>({ status: "idle" });

  const handleDownload = (format: TransferFormat) => {
    if (transferAPI === null || run.status === "running") return;
    setRun({ status: "running", progress: { loaded: 0, total: null } });
    transferAPI
      .exportProjects(format, pulseLanguage(i18n.language), (progress) =>
        setRun({ status: "running", progress }),
      )
      .then(
        (file) => {
          downloadBlob(file.fileName, file.blob);
          setRun({ status: "idle" });
          toast(t("toast_exported"));
        },
        (raw: unknown) => {
          const failure = toApiFailure(raw);
          setRun({ status: "failed", failure });
          toast(failureMessage(failure, t));
        },
      );
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
            available={transferAPI !== null}
            run={run}
            onDownload={handleDownload}
          />
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("btn_close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
