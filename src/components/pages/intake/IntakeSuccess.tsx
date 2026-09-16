import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Static — no data echoed back. The server itself answers 202 with an empty body on
 * purpose (`receive_submission.py`): there is nothing to tell an anonymous caller that
 * they did not already know, and a body restating the project would tell a forwarded
 * link more than it told the leader.
 */
export function IntakeSuccessView() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-4 flex size-11 items-center justify-center rounded-pill bg-verde-claro-ink text-on-brand">
        <Check size={22} strokeWidth={2} aria-hidden />
      </div>
      <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
        {t("intake_success_title")}
      </h1>
      <p className="mt-3 max-w-[46ch] text-small leading-normal text-fg-muted">
        {t("intake_success_body")}
      </p>
    </div>
  );
}
