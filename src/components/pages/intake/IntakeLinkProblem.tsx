import { useTranslation } from "react-i18next";
import type { IntakeLinkProblem as Problem } from "../../../utils/intake";
import { Button } from "../../ui";

const COPY: Record<Problem, { titleKey: string; bodyKey: string }> = {
  expired: {
    titleKey: "intake_link_expired_title",
    bodyKey: "intake_link_expired_body",
  },
  revoked: {
    titleKey: "intake_link_revoked_title",
    bodyKey: "intake_link_revoked_body",
  },
  invalid: {
    titleKey: "intake_link_invalid_title",
    bodyKey: "intake_link_invalid_body",
  },
};

export interface IntakeLinkProblemViewProps {
  problem: Problem;
}

/**
 * A link that is dead does not have a "try again" — the person seeing this did
 * nothing wrong and cannot fix it themselves, so the only useful next step is naming
 * who to ask for a new one.
 */
export function IntakeLinkProblemView({ problem }: IntakeLinkProblemViewProps) {
  const { t } = useTranslation();
  const { titleKey, bodyKey } = COPY[problem];

  return (
    <div>
      <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
        {t(titleKey)}
      </h1>
      <p className="mt-3 max-w-[46ch] text-small leading-normal text-fg-muted">
        {t(bodyKey)}
      </p>
    </div>
  );
}

export interface IntakeNetworkProblemViewProps {
  message: string;
  onRetry: () => void;
}

/** Unlike a dead link, this one is worth trying again — the connection, not the link. */
export function IntakeNetworkProblemView({
  message,
  onRetry,
}: IntakeNetworkProblemViewProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
        {t("intake_link_network_title")}
      </h1>
      <p className="mt-3 max-w-[46ch] text-small leading-normal text-fg-muted">
        {message}
      </p>
      <Button className="mt-5" onClick={onRetry}>
        {t("intake_retry")}
      </Button>
    </div>
  );
}
