import { useEffect, useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ADMIN_ROLE, APP_LABEL_KEYS, SHEMA_APP } from "../../../constants/access";
import { SESSION_ROLE_LABEL_KEYS } from "../../../contexts/AuthContext";
import { toApiFailure, type AccessAPI } from "../../../services/api";
import type { AccessAppKey, AccountGrants } from "../../../types/access";
import type { RegionKey } from "../../../types/region";
import type { SessionRole } from "../../../types/session";
import {
  isRegionalRole,
  revokesLastRegional,
  rolesHeld,
} from "../../../utils/access";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button, Input, Label, toast } from "../../ui";
import { MembershipSection } from "./MembershipSection";
import { Panel } from "./Panel";
import { PersonPanel } from "./PersonPanel";
import {
  cardOf,
  createPersonStore,
  writingRow,
  type AwayNotice,
  type Lookup,
} from "./personState";
import { RefusalNote, RefusalText } from "./RefusalNote";
import { roleRow } from "./rows";

interface Confirming {
  target: AccountGrants;
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

const nameOf = (account: AccountGrants) => account.displayName ?? account.email;

function announceAway({ target, failure }: AwayNotice, t: TFunction) {
  if (failure === null) {
    toast(t("acesso_change_saved", { person: nameOf(target) }));
  } else {
    toast(t("acesso_change_not_saved", { person: nameOf(target) }), {
      description: <RefusalText failure={failure} />,
    });
  }
}

export interface PersonSectionProps {
  api: AccessAPI;
  onChanged: () => void;
  onInvite: (email: string) => void;
}

export function PersonSection({ api, onChanged, onInvite }: PersonSectionProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [store] = useState(createPersonStore);
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [confirming, setConfirming] = useState<Confirming | null>(null);

  useEffect(() => {
    store.dispatch({ type: "entered" });
    return () => {
      store.dispatch({ type: "left" });
    };
  }, [store]);

  const { lookup } = state;
  const card = cardOf(state);
  const account = card?.account ?? null;

  const search = (event: FormEvent) => {
    event.preventDefault();
    const wanted = email.trim();
    if (!wanted) return;
    const ticket = store.ticket();
    store.dispatch({ type: "search", ticket, email: wanted });
    api.person(wanted).then(
      (found) =>
        store.dispatch({ type: "answered", ticket, lookup: { kind: "found", account: found } }),
      (raw: unknown) => {
        const failure = toApiFailure(raw);
        store.dispatch({
          type: "answered",
          ticket,
          lookup:
            failure.kind === "notFound"
              ? { kind: "none", email: wanted }
              : { kind: "failed", email: wanted, failure },
        });
      },
    );
  };

  const act = (
    target: AccountGrants,
    app: AccessAppKey,
    role: SessionRole,
    verb: "grant" | "revoke",
    regions: RegionKey[] = [],
  ) => {
    const ticket = store.ticket();
    setConfirming(null);
    store.dispatch({ type: "write", ticket, target, row: roleRow(app, role) });
    const call =
      verb === "grant"
        ? api.grant({ userId: target.userId, appKey: app, roleKey: role, regionKeys: regions })
        : api.revoke({ userId: target.userId, appKey: app, roleKey: role });
    call.then(
      (next) => {
        const away = store.dispatch({ type: "written", ticket, account: next });
        if (away) announceAway(away, t);
        onChanged();
      },
      (raw: unknown) => {
        const away = store.dispatch({ type: "refused", ticket, failure: toApiFailure(raw) });
        if (away) announceAway(away, t);
      },
    );
  };

  const currentRegions = (target: AccountGrants): RegionKey[] =>
    target.regions.map((region) => region.regionKey);

  const grant = (app: AccessAppKey, role: SessionRole) => {
    if (!account) return;
    if (isRegionalRole(role)) {
      store.dispatch({
        type: "openRegions",
        editing: { role, regions: currentRegions(account) },
        clearsRefusal: true,
      });
    } else if (role === ADMIN_ROLE) {
      setConfirming({ target: account, app, role, verb: "grant" });
    } else {
      act(account, app, role, "grant");
    }
  };

  const editRegions = () => {
    const role = account ? rolesHeld(account, SHEMA_APP).find(isRegionalRole) : undefined;
    if (account && role && isRegionalRole(role)) {
      store.dispatch({
        type: "openRegions",
        editing: { role, regions: currentRegions(account) },
        clearsRefusal: false,
      });
    }
  };

  const person = confirming ? nameOf(confirming.target) : "";
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

      {card ? (
        <PersonPanel
          {...card}
          onGrant={grant}
          onRevoke={(app, role) => setConfirming({ target: card.account, app, role, verb: "revoke" })}
          onEditRegions={editRegions}
          onRegionsChange={(regions) => store.dispatch({ type: "pickRegions", regions })}
          onSubmitRegions={() =>
            card.editing &&
            act(card.account, SHEMA_APP, card.editing.role, "grant", card.editing.regions)
          }
          onCancelRegions={() => store.dispatch({ type: "closeRegions" })}
        >
          <MembershipSection key={card.account.userId} person={card.account} />
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
        busy={confirming !== null && writingRow(state, confirming.target.userId) !== null}
        onConfirm={() =>
          confirming &&
          act(confirming.target, confirming.app, confirming.role, confirming.verb)
        }
      >
        {confirming ? (
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
            revokesLastRegional(confirming.target, confirming.app, confirming.role) ? (
              <p className="font-semibold">{t("acesso_confirm_last_regional")}</p>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </Panel>
  );
}
