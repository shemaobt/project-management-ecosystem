import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ROLES } from "../../../constants/roles";
import { BODY_LABEL_KEYS, ROLE_BODY } from "../../../constants/team";
import { surfaceOutlined } from "../../../styles";
import type { Region, RegionTeam, RoleChange } from "../../../types/region";
import type { RoleKey } from "../../../types/role";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { lastChangeFor } from "../../../utils/team";
import { Input, Label } from "../../ui";

export interface RegionRolesProps {
  region: Region;
  count: number;
  draft: RegionTeam;
  changes: readonly RoleChange[];
  onChange: (role: RoleKey, holder: string) => void;
}

export function RegionRoles({
  region,
  count,
  draft,
  changes,
  onChange,
}: RegionRolesProps) {
  const { t } = useTranslation();
  const fieldId = useId();

  return (
    <section className={cn("rounded-lg p-5 shadow-card", surfaceOutlined)}>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-3">
        <h3 className="text-h4 leading-tight font-black tracking-tight text-fg-strong">
          {t(region.labelKey)}
        </h3>
        <span className="text-tag tabular-nums text-fg-subtle">
          {t("equipe_projects_count", { count })}
        </span>
      </header>

      <div className="flex flex-col gap-4">
        {ROLES.map((role) => {
          const inputId = `${fieldId}-${role.key}`;
          const holder = draft[role.key];
          const change = lastChangeFor(changes, region.key, role.key);

          return (
            <div key={role.key} className="flex flex-col gap-1.5">
              <Label htmlFor={inputId}>{t(role.labelKey)}</Label>
              <p className="text-tag leading-normal text-fg-muted">
                {t(role.descriptionKey)}
              </p>
              <p className="text-tag text-fg-subtle">
                {t("equipe_from_body", {
                  body: t(BODY_LABEL_KEYS[ROLE_BODY[role.key]]),
                })}
              </p>
              <Input
                id={inputId}
                value={holder}
                placeholder={t("equipe_placeholder")}
                onChange={(event) => onChange(role.key, event.target.value)}
              />
              {holder.trim() ? null : (
                <p className="text-tag font-semibold text-telha">
                  {t("equipe_unassigned")}
                </p>
              )}
              {change ? (
                <p className="text-tag text-fg-subtle">
                  {t("equipe_changed_by", {
                    who: change.changedBy,
                    date: formatDate(change.changedAt),
                  })}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
