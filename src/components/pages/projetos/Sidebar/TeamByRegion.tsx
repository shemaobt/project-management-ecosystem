import { Globe } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ROLES } from "../../../../constants/roles";
import { useAuth } from "../../../../contexts/AuthContext";
import { useFiltersStore } from "../../../../stores/filtersStore";
import { useRegionsStore } from "../../../../stores/regionsStore";
import type { Project } from "../../../../types/project";
import type { RegionKey } from "../../../../types/region";
import { cn } from "../../../../utils/cn";
import { buildRegionPanel, holderName } from "../../../../utils/region";

export interface TeamByRegionProps {
  projects: readonly Project[];
  counts: Partial<Record<RegionKey, number>>;
}

export function TeamByRegion({ projects, counts }: TeamByRegionProps) {
  const { t } = useTranslation();
  const { canSeeRegion } = useAuth();
  const regions = useRegionsStore((state) => state.regions);
  const hydrate = useRegionsStore((state) => state.hydrate);
  const continent = useFiltersStore((state) => state.filters.continent);
  const setFilter = useFiltersStore((state) => state.setFilter);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const cards = buildRegionPanel(projects, regions, canSeeRegion);
  if (cards.length === 0) return null;

  return (
    <div className="mt-1 px-0.5">
      <div className="mt-4 mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-fg-subtle">
          <Globe size={14} strokeWidth={1.75} />
          {t("sb_regional_team")}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {cards.map(({ key, labelKey, team }) => {
          const active = continent === key;
          return (
            <div
              key={key}
              className={cn(
                "overflow-hidden rounded-[12px] border border-line bg-elevated transition-colors duration-fast ease-out",
                active && "border-telha",
              )}
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setFilter("continent", active ? null : key)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between border-b border-line px-3 py-2.5",
                  "transition-colors duration-fast ease-out",
                  active ? "bg-accent-soft" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "text-micro font-bold tracking-button uppercase",
                    active ? "text-telha" : "text-fg-strong",
                  )}
                >
                  {t("sb_region_name", { region: t(labelKey) })}
                </span>
                <span
                  className={cn(
                    "rounded-pill px-[9px] py-0.5 text-tag font-bold",
                    active ? "bg-telha text-on-brand" : "bg-muted text-fg-muted",
                  )}
                >
                  {counts[key] ?? 0}
                </span>
              </button>
              <div className="flex flex-col px-3 pt-1 pb-2">
                {ROLES.map((role) => (
                  <div
                    key={role.key}
                    className="flex flex-col items-start gap-[3px] border-t border-dashed border-line py-[7px] first:border-t-0"
                  >
                    <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-fg-subtle">
                      {t(role.labelKey)}
                    </span>
                    <span className="text-[12.5px] leading-[1.3] font-semibold wrap-anywhere text-fg">
                      {holderName(team, role.key) ?? t("sb_no_coordinator")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
