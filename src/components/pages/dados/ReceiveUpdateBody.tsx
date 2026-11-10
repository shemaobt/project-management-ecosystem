import { useTranslation } from "react-i18next";
import { failureMessage } from "../../../services/api";
import { OutcomePanel } from "../../common/OutcomePanel";
import { conflictSentence } from "../ficha/saveReport";
import { ReceivePreview } from "./ReceivePreview";
import type { ReceiveStep } from "./receivePulse";

const REFUSAL_KEYS = {
  notPulse: "receive_refused_not_pulse",
  unknownFormat: "receive_refused_format",
  empty: "receive_refused_empty",
  unreadable: "receive_refused_unreadable",
  image: "receive_refused_image",
} as const;

export type Reception = "receives" | "noServer" | "notCoordination";

export interface ReceiveUpdateDialogBodyProps {
  step: ReceiveStep;
  /**
   * Whether this dialog receives at all: with no server (fixture mode), or for a reader the routes
   * refuse, the body says why and the footer offers no file.
   */
  receives: Reception;
}

/**
 * Every step of receiving one returned Pulse, as text — the notice for an end or a refusal, the
 * answers for the preview. The buttons live in the footer, one place for each verb.
 */
export function ReceiveUpdateDialogBody({ step, receives }: ReceiveUpdateDialogBodyProps) {
  const { t } = useTranslation();
  if (receives !== "receives") {
    return (
      <div className="flex flex-col gap-3.5">
        <p className="text-small leading-body text-fg">{t("receive_desc")}</p>
        <p className="text-small leading-body text-fg-muted">
          {t(receives === "noServer" ? "receive_needs_server" : "receive_not_coordination")}
        </p>
      </div>
    );
  }
  switch (step.kind) {
    case "choose":
      return (
        <div className="flex flex-col gap-3.5">
          <p className="text-small leading-body text-fg">{t("receive_desc")}</p>
          <p className="text-small leading-body text-fg-muted">{t("receive_choose_hint")}</p>
        </div>
      );
    case "reading":
      return <p className="text-small text-fg-subtle">{t("receive_reading")}</p>;
    case "refused":
      return (
        <OutcomePanel tone="quiet" title={t("receive_refused_title")}>
          <p>{t(REFUSAL_KEYS[step.refusal])}</p>
        </OutcomePanel>
      );
    case "unread":
      return (
        <OutcomePanel tone="quiet" title={failureMessage(step.failure, t)}>
          <p>{t("receive_unread")}</p>
        </OutcomePanel>
      );
    case "outside":
      return (
        <OutcomePanel tone="quiet" title={t("receive_refused_title")}>
          <p>{t("receive_outside")}</p>
        </OutcomePanel>
      );
    case "preview":
      return (
        <div className="flex flex-col gap-3.5">
          <p className="text-small leading-body text-fg">{t("receive_preview_lead")}</p>
          <ReceivePreview file={step.file} project={step.project} />
        </div>
      );
    case "failed":
      return (
        <div className="flex flex-col gap-3.5">
          <OutcomePanel tone="quiet" title={failureMessage(step.failure, t)}>
            <p>{t("receive_failed")}</p>
          </OutcomePanel>
          <ReceivePreview file={step.file} project={step.project} />
        </div>
      );
    case "unopened":
      return (
        <OutcomePanel tone="quiet" title={t("receive_refused_title")}>
          <p>{t("receive_unopened")}</p>
        </OutcomePanel>
      );
    case "imageMismatch":
      return (
        <OutcomePanel tone="quiet" title={t("receive_refused_title")}>
          <p>{t("receive_image_mismatch")}</p>
        </OutcomePanel>
      );
    case "conflict":
      return (
        <OutcomePanel tone="attention" title={t("receive_conflict_title")}>
          <p>{conflictSentence(step.conflict, t)}</p>
          <p className="font-semibold">{t("receive_conflict_kept")}</p>
        </OutcomePanel>
      );
    case "applied":
      return (
        <OutcomePanel tone="quiet" title={t("receive_applied_title")}>
          <p>{t("receive_applied")}</p>
        </OutcomePanel>
      );
  }
}
