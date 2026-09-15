import { UNKNOWN_VOCABULARY, failureMessage } from "../../../services/api";
import type { ApiFailure } from "../../../types/session";

type Translate = (key: string, params?: Record<string, unknown>) => string;

export function signInMessage(failure: ApiFailure, t: Translate): string {
  if (failure.code === UNKNOWN_VOCABULARY)
    return t("entrar_unknown_vocabulary");
  if (failure.kind === "unauthorized") return t("entrar_bad_credentials");
  if (failure.kind === "forbidden") return t("entrar_no_role");
  return failureMessage(failure, t);
}
