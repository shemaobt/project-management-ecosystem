import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  failureMessage,
  pulseLanguage,
  toApiFailure,
  type PrayerPulseAPI,
  type PrayerPulseFile,
} from "../../../services/api";
import type { ApiFailure } from "../../../types/session";
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
import { savePulse } from "./pulseFile";

type Preview =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly file: PrayerPulseFile }
  | { readonly status: "failed"; readonly failure: ApiFailure };

export interface PulseButtonProps {
  api: PrayerPulseAPI;
  /**
   * How many requests the wall shows. Verified against BE-09, not assumed: the Pulse is
   * `list_prayer_requests(db, scope)` rendered (`generate_prayer_pulse.py`), the very function
   * `/prayer/requests` answers with, so the two differ only if a request is authorized or
   * withdrawn between the two reads — and then the file below is the truth, not this number.
   */
  count: number;
}

/**
 * The file as it will be read, drawn apart from the page (OBT-695). It is a whole HTML document
 * since OBT-690 and it carries text people typed: the server escapes every such value, and the
 * preview still never trusts that. An empty `sandbox` runs no script and gives the document an
 * opaque origin that reaches neither this page nor its session; `srcDoc` hands it over as data,
 * never through `dangerouslySetInnerHTML`. It is light in both themes, because the document
 * paints its own dark ink and no background: the ground is `branco`, and `.tema-claro` (§7.4,
 * the globe's) brings back the light `line`, which in `.dark` would vanish into that ground.
 */
export function PulsePreview({ file, title }: { file: PrayerPulseFile; title: string }) {
  return (
    <iframe
      sandbox=""
      srcDoc={file.text}
      title={title}
      className="tema-claro h-[50vh] w-full rounded-lg border border-line bg-branco"
    />
  );
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
      (raw: unknown) => setPreview({ status: "failed", failure: toApiFailure(raw) }),
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
            {preview.status === "failed" && (
              <p role="alert" className="text-small text-fg-muted">
                {failureMessage(preview.failure, t)}
              </p>
            )}
            {preview.status === "ready" && (
              <PulsePreview file={preview.file} title={t("oracao_pulse_preview")} />
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
                savePulse(preview.file);
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
