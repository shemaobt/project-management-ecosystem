import type { YesNo } from "../../../../../types/project";
import { pastoralWhenFor } from "../../../../../utils/health";
import type { DraftHandle } from "../../useDraft";

export function setPastoralAnswer(
  draft: Pick<DraftHandle, "set" | "saved">,
  checked: boolean | "indeterminate",
): void {
  const answer: YesNo = checked === true ? "sim" : "nao";
  draft.set("needsPastoralIntervention", answer);
  draft.set("pastoralInterventionWhen", pastoralWhenFor(draft.saved, answer));
}
