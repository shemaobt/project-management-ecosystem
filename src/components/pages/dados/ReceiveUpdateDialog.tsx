import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../../contexts/AuthContext";
import { projectRecordAPI, pulseReturnAPI } from "../../../services/api";
import { readPulseFile } from "../../../services/pulseFile";
import { useFormsStore } from "../../../stores/formsStore";
import { useProjectsStore } from "../../../stores/projectsStore";
import { canApplySubmission, canReceivePulseFile } from "../../../utils/access";
import { regionOf } from "../../../utils/region";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui";
import type { HeaderDialogProps } from "./ExportDialog";
import { ReceiveUpdateDialogBody, type Reception } from "./ReceiveUpdateBody";
import {
  prepareReceive,
  sendReceive,
  settled,
  type ReceivePorts,
  type ReceiveStep,
} from "./receivePulse";

const CHOOSE: ReceiveStep = { kind: "choose" };

/**
 * *Receber atualização* (OBT-687): a Pulse that came back as a file is read here, shown, and on
 * confirmation filed and applied — the photo first, then the answers (`receivePulse.ts`). Closing
 * the dialog forgets the file, and an answer that arrives after it closed draws nothing; nothing of
 * the file is kept in this browser.
 */
export function ReceiveUpdateDialog({ open, onOpenChange }: HeaderDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reread = useFormsStore((state) => state.reread);
  const listChanged = useProjectsStore((state) => state.invalidate);
  const [step, setStep] = useState<ReceiveStep>(CHOOSE);
  const [inFlight, setInFlight] = useState(false);
  const busy = useRef(false);
  const opening = useRef(0);

  const change = (next: boolean) => {
    if (!next) {
      opening.current += 1;
      setStep(CHOOSE);
    }
    onOpenChange(next);
  };

  const coordination = canReceivePulseFile(user.roles, user.writeRegionScope);
  const ports = useMemo((): ReceivePorts | null => {
    if (!pulseReturnAPI || !coordination) return null;
    return {
      readFile: readPulseFile,
      readRecord: (projectId) => projectRecordAPI.read(projectId),
      writes: (project) =>
        canApplySubmission(user.roles, user.writeRegionScope, regionOf(project)),
      uploadImage: pulseReturnAPI.uploadImage,
      fileSubmission: pulseReturnAPI.fileSubmission,
    };
  }, [coordination, user.roles, user.writeRegionScope]);
  const reception: Reception = !pulseReturnAPI
    ? "noServer"
    : coordination
      ? "receives"
      : "notCoordination";

  const run = (work: () => Promise<ReceiveStep>) => {
    if (busy.current) return;
    busy.current = true;
    setInFlight(true);
    const asked = opening.current;
    settled(work)
      .then((next) => {
        if (asked === opening.current) setStep(next);
        if (next.kind === "applied") {
          toast.success(t("toast_field_received"));
          listChanged();
        }
        if (next.kind === "applied" || next.kind === "conflict") void reread();
      })
      .finally(() => {
        busy.current = false;
        setInFlight(false);
      });
  };

  const pick = (chosen: File | undefined) => {
    if (!chosen || !ports) return;
    setStep({ kind: "reading" });
    run(async () => prepareReceive(await chosen.text(), ports));
  };

  const send = () => {
    if (!ports || (step.kind !== "preview" && step.kind !== "failed")) return;
    const sending = step;
    run(() => sendReceive(sending, ports));
  };

  const openForms = () => {
    change(false);
    navigate("/formularios");
  };

  const chooser = (labelKey: string, variant: "primary" | "secondary") => (
    <Button variant={variant} size="sm" asChild>
      <label className="relative cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
        {t(labelKey)}
        <input
          type="file"
          className="sr-only"
          disabled={inFlight}
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
    </Button>
  );

  const actions = () => {
    if (!ports) {
      return (
        <Button size="sm" onClick={openForms}>
          {t("receive_go_forms")}
        </Button>
      );
    }
    switch (step.kind) {
      case "choose":
        return chooser("receive_choose", "primary");
      case "reading":
        return (
          <Button size="sm" aria-disabled>
            {t("receive_reading_button")}
          </Button>
        );
      case "preview":
      case "failed":
        return (
          <>
            {chooser("receive_choose_other", "secondary")}
            <Button size="sm" aria-disabled={inFlight || undefined} onClick={send}>
              {inFlight
                ? t("receive_sending")
                : step.kind === "failed"
                  ? t("net_retry")
                  : t("receive_confirm")}
            </Button>
          </>
        );
      case "conflict":
        return (
          <Button size="sm" onClick={openForms}>
            {t("receive_go_forms")}
          </Button>
        );
      case "applied":
        return (
          <Button asChild size="sm">
            <Link
              to={`/ficha/${encodeURIComponent(step.submission.projectId)}/progresso`}
              onClick={() => change(false)}
            >
              {t("forms_apply_open_record")}
            </Link>
          </Button>
        );
      default:
        return chooser("receive_choose_other", "primary");
    }
  };

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle>{t("btn_field")}</DialogTitle>
            <DialogDescription>{t("forms_pulse_title")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <ReceiveUpdateDialogBody step={step} receives={reception} />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => change(false)}>
            {t("btn_close")}
          </Button>
          {actions()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
