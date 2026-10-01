import { useState } from "react";
import { useTranslation } from "react-i18next";
import { pulseLanguage, type PrayerPulseAPI, type PrayerPulseFile } from "../../../services/api";
import { downloadTextFile } from "../../../utils/export";
import { Button } from "../../ui/Button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/Dialog";

type Preview =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly file: PrayerPulseFile }
  | { readonly status: "unreachable" };

export interface PulseButtonProps {
  api: PrayerPulseAPI;
  /** How many requests the wall shows — the same scope the server renders the file from. */
  count: number;
}

/**
 * Generating the Prayer Pulse (INT-06 · OBT-411). **It is irreversible in practice**: once the
 * file is out, nothing recalls the copies (Karina, 22/set, 3.3). So the button never downloads
 * on its own. It opens a confirmation that shows **the file itself** — the server renders it,
 * and generating changes nothing there, so the preview is exactly what will be sent, not a
 * description of it — says how many requests go in and says plainly that it cannot be
 * recalled. Only then does the person save it.
 *
 * Rendered only for `resourceCircle` and only against the server (the wall decides both).
 */
export function PulseButton({ api, count }: PulseButtonProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview>({ status: "loading" });

  function openPreview() {
    setOpen(true);
    setPreview({ status: "loading" });
    void api.generate(pulseLanguage(i18n.language)).then(
      (file) => setPreview({ status: "ready", file }),
      () => setPreview({ status: "unreachable" }),
    );
  }

  return (
    <>
      <Button variant="primary" size="md" onClick={openPreview}>
        {t("oracao_pulse_generate")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("btn_close")}>
          <DialogHeader>
            <DialogTitle>{t("oracao_pulse_title")}</DialogTitle>
            <DialogDescription>{t("oracao_pulse_count", { count })}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p
              role="alert"
              className="mb-3 rounded-lg border border-status-critical-line bg-accent-soft px-3.5 py-2.5 text-small font-semibold text-accent-press"
            >
              {t("oracao_pulse_no_recall")}
            </p>
            {preview.status === "loading" && (
              <p className="text-small text-fg-muted">{t("oracao_pulse_loading")}</p>
            )}
            {preview.status === "unreachable" && (
              <p role="alert" className="text-small text-fg-muted">
                {t("oracao_pulse_unreachable")}
              </p>
            )}
            {preview.status === "ready" && (
              <pre
                aria-label={t("oracao_pulse_preview")}
                tabIndex={0}
                className="max-h-[50vh] overflow-auto rounded-lg bg-muted p-3.5 text-micro whitespace-pre-wrap text-fg"
              >
                {preview.file.text}
              </pre>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("oracao_pulse_cancel")}
            </Button>
            <Button
              variant="primary"
              disabled={preview.status !== "ready"}
              onClick={() => {
                if (preview.status !== "ready") return;
                downloadTextFile(preview.file.fileName, preview.file.text, "text/plain;charset=utf-8");
                setOpen(false);
              }}
            >
              {t("oracao_pulse_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
