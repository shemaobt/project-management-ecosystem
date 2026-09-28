import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ADMIN_ROLE, APP_LABEL_KEYS, SHEMA_APP } from "../../../constants/access";
import { SESSION_ROLE_LABEL_KEYS } from "../../../contexts/AuthContext";
import { toApiFailure, type AccessAPI } from "../../../services/api";
import type { AccessAppKey, AccountGrants } from "../../../types/access";
import type { RegionKey } from "../../../types/region";
import type { ApiFailure, SessionRole } from "../../../types/session";
import {
  isRegionalRole,
  revokesLastRegional,
  rolesHeld,
} from "../../../utils/access";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button, Input, Label } from "../../ui";
import { MembershipSection } from "./MembershipSection";
import { Panel } from "./Panel";
import {
  PersonPanel,
  type RegionEditing,
  type RoleRefusal,
} from "./PersonPanel";
import { RefusalNote } from "./RefusalNote";
import { roleRow } from "./rows";

type Lookup =
  | { kind: "idle" }
  | { kind: "searching"; email: string }
  | { kind: "found"; account: AccountGrants }
  | { kind: "none"; email: string }
  | { kind: "failed"; email: string; failure: ApiFailure };

interface Confirming {
  app: AccessAppKey;
  role: SessionRole;
  verb: "grant" | "revoke";
}

export interface PersonLookupProps {
  lookup: Lookup;
  onInvite: (email: string) => void;
}

export function PersonLookupState({ lookup, onInvite }: PersonLookupProps) {
  const { t } = useTranslation();
  if (lookup.kind === "idle") {
    return <p className="text-small text-fg-muted">{t("acesso_search_empty")}</p>;
  }
  if (lookup.kind === "searching") {
    return <LoadingSpinner size="md" label={t("acesso_searching")} />;
  }
  if (lookup.kind === "none") {
    return (
      <EmptyState
        className="px-6 py-10"
        message={t("acesso_no_account", { email: lookup.email })}
        action={
          <Button size="sm" onClick={() => onInvite(lookup.email)}>
            {t("acesso_invite_this")}
          </Button>
        }
      />
    );
  }
  if (lookup.kind === "failed") return <RefusalNote failure={lookup.failure} />;
  return null;
}

export type { Lookup };

export interface PersonSectionProps {
  api: AccessAPI;
  onChanged: () => void;
  onInvite: (email: string) => void;
}

export function PersonSection({ api, onChanged, onInvite }: PersonSectionProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ kind: "idle" });
  const [acting, setActing] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<RoleRefusal | null>(null);
  const [editing, setEditing] = useState<RegionEditing | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);

  const account = lookup.kind === "found" ? lookup.account : null;

  const search = (event: FormEvent) => {
    event.preventDefault();
    const wanted = email.trim();
    if (!wanted) return;
    setLookup({ kind: "searching", email: wanted });
    setRefusal(null);
    setEditing(null);
    api
      .person(wanted)
      .then((found) => setLookup({ kind: "found", account: found }))
      .catch((raw: unknown) => {
        const failure = toApiFailure(raw);
        setLookup(
          failure.kind === "notFound"
            ? { kind: "none", email: wanted }
            : { kind: "failed", email: wanted, failure },
        );
      });
  };

  const act = (
    target: AccountGrants,
    app: AccessAppKey,
    role: SessionRole,
    verb: "grant" | "revoke",
    regions: RegionKey[] = [],
  ) => {
    const row = roleRow(app, role);
    setActing(row);
    setRefusal(null);
    setConfirming(null);
    const call =
      verb === "grant"
        ? api.grant({ userId: target.userId, appKey: app, roleKey: role, regionKeys: regions })
        : api.revoke({ userId: target.userId, appKey: app, roleKey: role });
    call
      .then((next) => {
        setLookup({ kind: "found", account: next });
        setEditing(null);
        onChanged();
      })
      .catch((raw: unknown) => setRefusal({ row, failure: toApiFailure(raw) }))
      .finally(() => setActing(null));
  };

  const currentRegions = (target: AccountGrants): RegionKey[] =>
    target.regions.map((region) => region.regionKey);

  const grant = (app: AccessAppKey, role: SessionRole) => {
    if (!account) return;
    if (isRegionalRole(role)) {
      setRefusal(null);
      setEditing({ role, regions: currentRegions(account) });
    } else if (role === ADMIN_ROLE) {
      setConfirming({ app, role, verb: "grant" });
    } else {
      act(account, app, role, "grant");
    }
  };

  const editRegions = () => {
    const role = account ? rolesHeld(account, SHEMA_APP).find(isRegionalRole) : undefined;
    if (account && role && isRegionalRole(role)) {
      setEditing({ role, regions: currentRegions(account) });
    }
  };

  const person = account ? (account.displayName ?? account.email) : "";
  const confirmRole = confirming ? t(SESSION_ROLE_LABEL_KEYS[confirming.role]) : "";

  return (
    <Panel title={t("acesso_search_title")} lead={t("acesso_search_hint")}>
      <form onSubmit={search} className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-email`}>{t("acesso_search_label")}</Label>
          <Input
            id={`${fieldId}-email`}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={!email.trim() || lookup.kind === "searching"}>
          {t("acesso_search_submit")}
        </Button>
      </form>

      {account ? (
        <PersonPanel
          account={account}
          acting={acting}
          refusal={refusal}
          editing={editing}
          onGrant={grant}
          onRevoke={(app, role) => setConfirming({ app, role, verb: "revoke" })}
          onEditRegions={editRegions}
          onRegionsChange={(regions) =>
            setEditing((current) => (current ? { ...current, regions } : current))
          }
          onSubmitRegions={() =>
            editing && act(account, SHEMA_APP, editing.role, "grant", editing.regions)
          }
          onCancelRegions={() => setEditing(null)}
        >
          <MembershipSection key={account.userId} person={account} />
        </PersonPanel>
      ) : (
        <PersonLookupState lookup={lookup} onInvite={onInvite} />
      )}

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        tone={confirming?.verb === "revoke" ? "danger" : "primary"}
        title={t(
          confirming?.verb === "revoke"
            ? "acesso_confirm_revoke_title"
            : "acesso_confirm_grant_title",
          { role: confirmRole },
        )}
        confirmLabel={t(confirming?.verb === "revoke" ? "acesso_revoke" : "acesso_grant")}
        busy={acting !== null}
        onConfirm={() =>
          account && confirming && act(account, confirming.app, confirming.role, confirming.verb)
        }
      >
        {account && confirming ? (
          <div className="flex flex-col gap-2 text-small leading-body text-fg">
            {confirming.verb === "revoke" ? (
              <p>
                {t("acesso_confirm_revoke_body", {
                  person,
                  role: confirmRole,
                  app: t(APP_LABEL_KEYS[confirming.app]),
                })}
              </p>
            ) : (
              <p>{t("acesso_confirm_admin_body", { person })}</p>
            )}
            {confirming.role === ADMIN_ROLE ? <p>{t("acesso_admin_both_apps")}</p> : null}
            {confirming.verb === "revoke" &&
            revokesLastRegional(account, confirming.app, confirming.role) ? (
              <p className="font-semibold">{t("acesso_confirm_last_regional")}</p>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </Panel>
  );
}
