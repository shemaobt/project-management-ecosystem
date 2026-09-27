import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  failureMessage,
  intercessorsAPI,
  toApiFailure,
} from "../../../services/api";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui";
import { IntakeShell } from "../intake/IntakeShell";

export type LeaveStatus =
  | { kind: "loading" }
  | { kind: "confirm" }
  | { kind: "leaving" }
  | { kind: "done" }
  | { kind: "dead" }
  | { kind: "networkProblem"; message: string };

export interface LeaveNetworkViewProps {
  status: LeaveStatus;
  onConfirm: () => void;
  onRetry: () => void;
}

const TITLE = "font-serif text-h3 leading-snug font-normal text-fg italic";
const BODY = "mt-3 max-w-[46ch] text-small leading-normal text-fg-muted";

/**
 * The exit link's whole page (OBT-531) — a person in the prayer network has no account,
 * and this is how they leave it. **Nothing about the person is on it, in any state**: the
 * link travels in a message that can be forwarded, and whoever holds it must not learn who
 * is in the network. A dead link gets one sentence whatever killed it, for the same reason
 * — the server answers every one alike, and so does the page.
 */
export function LeaveNetworkView({
  status,
  onConfirm,
  onRetry,
}: LeaveNetworkViewProps) {
  const { t } = useTranslation();

  if (status.kind === "loading") {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner size="lg" label={t("int_leave_loading")} />
      </div>
    );
  }

  if (status.kind === "done") {
    return (
      <div>
        <div className="mb-4 flex size-11 items-center justify-center rounded-pill bg-verde-claro-ink text-on-brand">
          <Check size={22} strokeWidth={2} aria-hidden />
        </div>
        <h1 className={TITLE}>{t("int_leave_done_title")}</h1>
        <p className={BODY}>{t("int_leave_done_body")}</p>
      </div>
    );
  }

  if (status.kind === "dead") {
    return (
      <div>
        <h1 className={TITLE}>{t("int_leave_dead_title")}</h1>
        <p className={BODY}>{t("int_leave_dead_body")}</p>
      </div>
    );
  }

  if (status.kind === "networkProblem") {
    return (
      <div>
        <h1 className={TITLE}>{t("int_leave_network_title")}</h1>
        <p className={BODY}>{status.message}</p>
        <Button className="mt-5" onClick={onRetry}>
          {t("int_leave_retry")}
        </Button>
      </div>
    );
  }

  const leaving = status.kind === "leaving";
  return (
    <div>
      <h1 className={TITLE}>{t("int_leave_title")}</h1>
      <p className={BODY}>{t("int_leave_body")}</p>
      <Button
        className="mt-5"
        variant="danger"
        disabled={leaving}
        onClick={onConfirm}
      >
        {leaving ? t("int_leave_leaving") : t("int_leave_confirm")}
      </Button>
    </div>
  );
}

/**
 * Opening the page only asks whether the link still opens something — a link previewer
 * fetches every URL it is sent, so the read is never the act. The act is the button.
 */
export function LeaveNetworkPage() {
  const { token = "" } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [status, setStatus] = useState<LeaveStatus>({ kind: "loading" });

  const fail = useCallback(
    (raw: unknown) => {
      const failure = toApiFailure(raw);
      setStatus(
        failure.kind === "notFound"
          ? { kind: "dead" }
          : { kind: "networkProblem", message: failureMessage(failure, t) },
      );
    },
    [t],
  );

  const check = useCallback(() => {
    intercessorsAPI
      .exitLink(token)
      .then(() => setStatus({ kind: "confirm" }))
      .catch(fail);
  }, [token, fail]);

  useEffect(() => {
    // `status` already starts at "loading"; `check` only sets state from its callbacks.
    check();
  }, [check]);

  const retry = () => {
    setStatus({ kind: "loading" });
    check();
  };

  const confirm = () => {
    setStatus({ kind: "leaving" });
    intercessorsAPI
      .leave(token)
      .then(() => setStatus({ kind: "done" }))
      .catch(fail);
  };

  return (
    <IntakeShell>
      <LeaveNetworkView status={status} onConfirm={confirm} onRetry={retry} />
    </IntakeShell>
  );
}
