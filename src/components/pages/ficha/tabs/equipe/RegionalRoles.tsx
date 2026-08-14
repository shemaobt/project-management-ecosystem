import { Globe } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useRegionsStore } from "../../../../../stores/regionsStore";
import {
  getRegion,
  getRegionLabelKey,
  resolveProjectRoles,
  type RoleHolder,
} from "../../../../../utils/region";

export interface RolesPanelProps {
  roles: readonly RoleHolder[];
  regionLabelKey: string;
}

export function RolesPanel({ roles, regionLabelKey }: RolesPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="rounded-[12px] border border-line bg-muted px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
          <Globe size={14} strokeWidth={1.75} aria-hidden />
          {t("f_roles_title")} · {t(regionLabelKey)}
        </span>
        <Link
          to="/equipe"
          className="text-micro font-semibold text-telha underline underline-offset-2 hover:no-underline"
        >
          {t("f_roles_open")}
        </Link>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4.5 gap-y-2.5 sm:grid-cols-3">
        {roles.map((role) => (
          <div key={role.key} className="flex flex-col gap-0.5">
            <dt className="text-[10px] font-bold tracking-[0.08em] uppercase text-fg-subtle">
              {t(role.labelKey)}
            </dt>
            <dd className="text-[13px] leading-[1.35] font-semibold wrap-anywhere text-fg">
              {role.holder ?? t("sb_no_coordinator")}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-micro leading-[1.45] text-fg-subtle">
        {t("f_roles_hint")}
      </p>
    </section>
  );
}

export interface RegionalRolesProps {
  location: string;
}

export function RegionalRoles({ location }: RegionalRolesProps) {
  const regions = useRegionsStore((state) => state.regions);
  const hydrate = useRegionsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <RolesPanel
      roles={resolveProjectRoles({ location }, regions)}
      regionLabelKey={getRegionLabelKey(getRegion({ location }))}
    />
  );
}
