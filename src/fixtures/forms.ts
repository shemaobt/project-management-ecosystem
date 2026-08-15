import type { ReceivedSubmission } from "../types/forms";

const received: ReceivedSubmission[] = [];

export function loadReceivedSubmissions(): ReceivedSubmission[] {
  return structuredClone(received);
}
