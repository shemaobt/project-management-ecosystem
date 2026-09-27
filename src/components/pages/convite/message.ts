import { failureMessage } from "../../../services/api";
import type { JoinFailure } from "./invitation";

type Translate = (key: string, params?: Record<string, unknown>) => string;

export function joinMessage({ stage, failure }: JoinFailure, t: Translate): string {
  if (stage === "auth" && failure.kind === "unauthorized") {
    return t("entrar_bad_credentials");
  }
  if (stage === "auth" && failure.kind === "conflict") {
    return t("convite_account_exists");
  }
  if (stage === "accept" && failure.kind === "forbidden") {
    return t("convite_other_email");
  }
  return failureMessage(failure, t);
}
