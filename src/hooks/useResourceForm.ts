import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "../components/ui";
import { authAPI, failureMessage, toApiFailure } from "../services/api";
import {
  openResourceForm,
  type FormTab,
  type HandoffContext,
} from "../utils/requests";

function blankTab(): FormTab | null {
  return window.open("", "_blank");
}

export function useResourceForm(base: string | null) {
  const { t } = useTranslation();
  const [opening, setOpening] = useState(false);

  const open = useCallback(
    async (context: HandoffContext | null) => {
      if (base === null) return;
      setOpening(true);
      const outcome = await openResourceForm({
        base,
        context,
        handoff: authAPI.handoff,
        openTab: blankTab,
      });
      setOpening(false);
      if (outcome.kind === "blocked") toast.error(t("rr_tab_blocked"));
      if (outcome.kind === "failed") {
        toast.error(failureMessage(toApiFailure(outcome.error), t));
      }
    },
    [base, t],
  );

  return { open, opening };
}
