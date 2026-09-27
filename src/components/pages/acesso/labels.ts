import { ACCESS_APPS, APP_LABEL_KEYS } from "../../../constants/access";
import { REGIONS } from "../../../constants/regions";
import { SESSION_ROLES } from "../../../constants/roles";
import { SESSION_ROLE_LABEL_KEYS } from "../../../contexts/session";
import type { GrantAction, GrantChange } from "../../../types/access";

type Translate = (key: string, params?: Record<string, unknown>) => string;

export function roleLabel(role: string, t: Translate): string {
  const known = SESSION_ROLES.find((key) => key === role);
  return known ? t(SESSION_ROLE_LABEL_KEYS[known]) : role;
}

export function appLabel(app: string, t: Translate): string {
  const known = ACCESS_APPS.find((key) => key === app);
  return known ? t(APP_LABEL_KEYS[known]) : app;
}

export function regionLabel(region: string, t: Translate): string {
  const known = REGIONS.find((entry) => entry.key === region);
  return known ? t(known.labelKey) : region;
}

const HISTORY_KEYS: Record<
  "role" | "region",
  Record<GrantAction, { byActor: string; unrecorded: string }>
> = {
  role: {
    granted: {
      byActor: "acesso_history_role_granted",
      unrecorded: "acesso_history_role_granted_anon",
    },
    revoked: {
      byActor: "acesso_history_role_revoked",
      unrecorded: "acesso_history_role_revoked_anon",
    },
  },
  region: {
    granted: {
      byActor: "acesso_history_region_granted",
      unrecorded: "acesso_history_region_granted_anon",
    },
    revoked: {
      byActor: "acesso_history_region_revoked",
      unrecorded: "acesso_history_region_revoked_anon",
    },
  },
};

export function changeSentence(change: GrantChange, t: Translate): string {
  const person =
    change.userName ?? change.userEmail ?? t("acesso_history_unknown_account");
  const actor = change.actorName ?? change.actorEmail;
  const keys = HISTORY_KEYS[change.regionKey ? "region" : "role"][change.action];
  return t(actor ? keys.byActor : keys.unrecorded, {
    person,
    actor: actor ?? "",
    role: roleLabel(change.roleKey ?? "", t),
    app: appLabel(change.appKey, t),
    region: regionLabel(change.regionKey ?? "", t),
  });
}
