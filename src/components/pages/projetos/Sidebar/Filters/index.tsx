import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFiltersStore } from "../../../../../stores/filtersStore";
import type { Project } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import type { FacetCounts } from "../../../../../utils/search";
import { FilterSection } from "./FilterSection";
import type { FilterSectionConfig } from "./sections";
import {
  ADVANCED_SECTIONS,
  PRIMARY_SECTIONS,
  buildFilterOptions,
  resolveSectionOptions,
} from "./sections";

export interface DetailedFiltersProps {
  projects: readonly Project[];
  counts: FacetCounts;
}

export function DetailedFilters({ projects, counts }: DetailedFiltersProps) {
  const { t } = useTranslation();
  const filters = useFiltersStore((state) => state.filters);
  const setFilter = useFiltersStore((state) => state.setFilter);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(PRIMARY_SECTIONS.map((section) => section.id)),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const options = useMemo(() => buildFilterOptions(projects), [projects]);

  const toggleSection = (id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderSection = (section: FilterSectionConfig) => (
    <FilterSection
      key={section.id}
      id={section.id}
      title={t(section.titleKey)}
      open={expanded.has(section.id)}
      onToggle={() => toggleSection(section.id)}
      allCount={counts.groupAll[section.id]}
      options={resolveSectionOptions(
        section,
        options,
        counts,
        filters[section.id],
      ).map((option) => ({
        ...option,
        label: option.labelKey ? t(option.labelKey) : option.value,
      }))}
      activeValue={filters[section.id]}
      onSelect={(value) => setFilter(section.id, value as never)}
    />
  );

  return (
    <div>
      <div className="mt-2 mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-fg-subtle">
          {t("expand_filters")}
        </span>
      </div>

      {PRIMARY_SECTIONS.map(renderSection)}

      <button
        type="button"
        aria-expanded={showAdvanced}
        aria-controls="sb-advanced-filters"
        onClick={() => setShowAdvanced((previous) => !previous)}
        className={cn(
          "mt-3 mb-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-pill border border-dashed border-line-strong px-3.5 py-2.5",
          "text-micro font-semibold tracking-button text-fg",
          "transition-all duration-fast ease-out hover:border-telha hover:text-telha",
          !showAdvanced && "hover:bg-accent-soft",
          showAdvanced && "border-solid bg-muted",
        )}
      >
        <span>{showAdvanced ? t("sb_less_filters") : t("sb_more_filters")}</span>
        <span
          className={cn(
            "inline-flex transition-transform duration-[180ms] ease-out",
            showAdvanced && "rotate-180",
          )}
        >
          <ChevronDown size={12} strokeWidth={2} />
        </span>
      </button>

      {showAdvanced && (
        <div id="sb-advanced-filters" className="mt-2">
          {ADVANCED_SECTIONS.map(renderSection)}
        </div>
      )}
    </div>
  );
}
