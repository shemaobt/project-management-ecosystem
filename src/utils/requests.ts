import { ADMIN_ROLE, FORM_APP } from "../constants/access";
import { FORM_ENTRY_PATH, FORM_LINK_PATH } from "../constants/requests";
import type { RequestCard } from "../types/request";
import type { SessionRole } from "../types/session";

export type HandoffContext = Record<string, string>;

export type RequestAction =
  | { kind: "start" }
  | { kind: "continue" }
  | { kind: "inProgress"; by: string | null }
  | { kind: "none" };

export interface FormTab {
  opener: unknown;
  location: { replace: (url: string) => void };
  close: () => void;
}

export type FormOpening =
  | { kind: "opened" }
  | { kind: "blocked" }
  | { kind: "failed"; error: unknown };

export interface FormOpeningSteps {
  base: string;
  context: HandoffContext | null;
  handoff: (appKey: string, context: HandoffContext | null) => Promise<string>;
  openTab: () => FormTab | null;
}

export function formEntryUrl(base: string, code: string): string {
  return `${base}${FORM_ENTRY_PATH}#code=${encodeURIComponent(code)}`;
}

export function requestLinkUrl(base: string, token: string): string {
  return `${base}${FORM_LINK_PATH}/${encodeURIComponent(token)}`;
}

export function projectContext(projectId: string): HandoffContext {
  return { projectId };
}

export function openInstance(cards: readonly RequestCard[]): RequestCard | null {
  return cards.find((card) => card.open) ?? null;
}

export function mayStartRequest(
  roles: readonly SessionRole[],
  memberOf: readonly string[],
  projectId: string,
): boolean {
  return roles.includes(ADMIN_ROLE) || memberOf.includes(projectId);
}

export function requestAction(
  cards: readonly RequestCard[],
  mayStart: boolean,
): RequestAction {
  const open = openInstance(cards);
  if (open) {
    return open.can_edit
      ? { kind: "continue" }
      : { kind: "inProgress", by: open.started_by_name };
  }
  return mayStart ? { kind: "start" } : { kind: "none" };
}

export async function openResourceForm({
  base,
  context,
  handoff,
  openTab,
}: FormOpeningSteps): Promise<FormOpening> {
  const tab = openTab();
  if (!tab) return { kind: "blocked" };
  tab.opener = null;
  try {
    const code = await handoff(FORM_APP, context);
    tab.location.replace(formEntryUrl(base, code));
    return { kind: "opened" };
  } catch (error) {
    tab.close();
    return { kind: "failed", error };
  }
}
