import { toast } from "sonner";
import i18n from "../../i18n";
import type { ApiFailure } from "../../types/session";
import { failureMessage, isAnnounceable } from "./errors";

function translate(key: string, params?: Record<string, unknown>): string {
  return i18n.t(key, params ?? {});
}

export function failureSentence(failure: ApiFailure): string {
  return failureMessage(failure, translate);
}

export function announceFailure(failure: ApiFailure): void {
  if (!isAnnounceable(failure)) return;
  toast.error(failureSentence(failure));
}
