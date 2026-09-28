import {
  UNKNOWN_VOCABULARY,
  failureMessage,
  serverSentence,
  type Translate,
} from "../../../services/api";
import type { ApiFailure } from "../../../types/session";

export type AccessRefusal =
  | { from: "server"; sentence: string }
  | { from: "console"; sentence: string };

export function readRefusal(failure: ApiFailure, t: Translate): AccessRefusal {
  if (failure.code === UNKNOWN_VOCABULARY) {
    return { from: "console", sentence: t("entrar_unknown_vocabulary") };
  }
  const sentence =
    serverSentence(failure) ??
    (failure.kind === "forbidden" ? failure.detail : null);
  return sentence
    ? { from: "server", sentence }
    : { from: "console", sentence: failureMessage(failure, t) };
}
