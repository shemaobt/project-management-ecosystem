import { ADMIN_ROLE, FORM_APP } from "../constants/access";
import { FORM_ENTRY_PATH, FORM_LINK_PATH } from "../constants/requests";
import type { AccessAppKey } from "../types/access";
import type { RequestCard } from "../types/request";
import type { SessionRole } from "../types/session";

export type HandoffContext = Record<string, string>;

export type StartPermission = "yes" | "no" | "checking" | "unread";

export type RequestAction =
  | { kind: "start" }
  | { kind: "continue" }
  | { kind: "inProgress"; by: string | null }
  | { kind: "checking" }
  | { kind: "unread" }
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
  handoff: (appKey: AccessAppKey, context: HandoffContext | null) => Promise<string>;
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

export function startPermission(
  roles: readonly SessionRole[],
  memberOf: readonly string[] | null,
  membershipFailed: boolean,
  projectId: string,
): StartPermission {
  if (roles.includes(ADMIN_ROLE)) return "yes";
  if (membershipFailed) return "unread";
  if (memberOf === null) return "checking";
  return memberOf.includes(projectId) ? "yes" : "no";
}

export function requestAction(
  cards: readonly RequestCard[],
  permission: StartPermission,
): RequestAction {
  const open = openInstance(cards);
  if (open) {
    return open.can_edit
      ? { kind: "continue" }
      : { kind: "inProgress", by: open.started_by_name };
  }
  switch (permission) {
    case "yes":
      return { kind: "start" };
    case "no":
      return { kind: "none" };
    case "checking":
      return { kind: "checking" };
    case "unread":
      return { kind: "unread" };
  }
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
