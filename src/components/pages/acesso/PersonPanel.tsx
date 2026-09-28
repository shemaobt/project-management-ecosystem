import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ACCESS_APPS,
  ADMIN_ROLE,
  APP_LABEL_KEYS,
  GRANTABLE_ROLES,
  SHEMA_APP,
} from "../../../constants/access";
import { SESSION_ROLE_LABEL_KEYS } from "../../../contexts/AuthContext";
import type { AccessAppKey, AccountGrants } from "../../../types/access";
import type { RegionKey } from "../../../types/region";
import type { RoleKey } from "../../../types/role";
import type { ApiFailure, SessionRole } from "../../../types/session";
import { isRegionalRole, rolesHeld } from "../../../utils/access";
import { getRegionLabelKey } from "../../../utils/region";
import { Badge, Button } from "../../ui";
import { RegionPicker } from "./RegionPicker";
import { roleRow } from "./rows";
import { RoleRow } from "./RoleRow";

export interface RegionEditing {
  role: RoleKey;
  regions: RegionKey[];
}

export interface RoleRefusal {
  row: string;
  failure: ApiFailure;
}

export interface PersonPanelProps {
  account: AccountGrants;
  acting: string | null;
  refusal: RoleRefusal | null;
  editing: RegionEditing | null;
  onGrant: (app: AccessAppKey, role: SessionRole) => void;
  onRevoke: (app: AccessAppKey, role: SessionRole) => void;
  onEditRegions: () => void;
  onRegionsChange: (regions: RegionKey[]) => void;
  onSubmitRegions: () => void;
  onCancelRegions: () => void;
  children?: ReactNode;
}

export function PersonPanel({
  account,
  acting,
  refusal,
  editing,
  onGrant,
  onRevoke,
  onEditRegions,
  onRegionsChange,
  onSubmitRegions,
  onCancelRegions,
  children,
}: PersonPanelProps) {
  const { t } = useTranslation();
  const holdsRegional = rolesHeld(account, SHEMA_APP).some(isRegionalRole);
  const reach =
    account.regionScope === null
      ? t("acesso_reach_all")
      : account.regionScope.length === 0
        ? t("acesso_reach_none")
        : account.regionScope.map((key) => t(getRegionLabelKey(key))).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-h4 leading-snug font-bold wrap-anywhere text-fg-strong">
            {account.displayName ?? account.email}
          </p>
          <p className="text-small wrap-anywhere text-fg-muted">{account.email}</p>
        </div>
        <Badge tone={account.isActive ? "green" : "accent"}>
          {t(account.isActive ? "acesso_account_active" : "acesso_account_inactive")}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 rounded-md bg-muted px-4 py-3.5">
        <p className="text-micro font-bold tracking-button uppercase text-fg-muted">
          {t("acesso_regions_title")}
        </p>
        {account.regions.length === 0 ? (
          <p className="text-small text-fg-muted">{t("acesso_regions_none")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {account.regions.map((region) => (
              <li key={region.regionKey}>
                <Badge tone="azul">{t(getRegionLabelKey(region.regionKey))}</Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="text-micro text-fg-muted">
          {t("acesso_reach_label")}: {reach}
        </p>
        {holdsRegional ? (
          <div>
            <Button
              size="sm"
              variant="ghost"
              disabled={acting !== null}
              onClick={onEditRegions}
            >
              {t("acesso_edit_regions")}
            </Button>
          </div>
        ) : null}
      </div>

      {ACCESS_APPS.map((app) => {
        const held = rolesHeld(account, app);
        return (
          <div key={app}>
            <h3 className="text-small font-bold text-fg-strong">
              {t(APP_LABEL_KEYS[app])}
            </h3>
            <ul className="divide-y divide-line">
              {GRANTABLE_ROLES[app].map((role) => {
                const row = roleRow(app, role);
                const label = t(SESSION_ROLE_LABEL_KEYS[role]);
                const editingHere = editing !== null && app === SHEMA_APP && editing.role === role;
                return (
                  <RoleRow
                    key={row}
                    label={label}
                    note={role === ADMIN_ROLE ? t("acesso_admin_both_apps") : undefined}
                    held={held.includes(role)}
                    busy={acting === row}
                    locked={acting !== null}
                    refusal={refusal?.row === row ? refusal.failure : null}
                    onGrant={() => onGrant(app, role)}
                    onRevoke={() => onRevoke(app, role)}
                  >
                    {editingHere ? (
                      <div className="flex flex-col gap-3">
                        <RegionPicker
                          legend={t("acesso_regions_legend", { role: label })}
                          selected={editing.regions}
                          onChange={onRegionsChange}
                          disabled={acting !== null}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={acting !== null || editing.regions.length === 0}
                            onClick={onSubmitRegions}
                          >
                            {t(held.includes(role) ? "acesso_save_regions" : "acesso_grant_with_regions")}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={onCancelRegions}>
                            {t("btn_cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </RoleRow>
                );
              })}
            </ul>
          </div>
        );
      })}

      {children}
    </div>
  );
}
