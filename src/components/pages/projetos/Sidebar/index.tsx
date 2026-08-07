import { ChevronDown, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../../../types/project";
import { cn } from "../../../../utils/cn";
import type { FacetCounts } from "../../../../utils/search";
import { ResultCount } from "./ResultCount";
import { SearchBox } from "./SearchBox";
import { TeamByRegion } from "./TeamByRegion";

const PRIMARY_SECTIONS = [
  { id: "status", titleKey: "sb_status" },
  { id: "team", titleKey: "sb_team" },
  { id: "health", titleKey: "sb_health" },
] as const;

const ADVANCED_SECTIONS = [
  { id: "country", titleKey: "sb_country" },
  { id: "objective", titleKey: "sb_objective" },
  { id: "translationType", titleKey: "sb_translation_type" },
  { id: "eten", titleKey: "sb_eten" },
  { id: "sensitive", titleKey: "sb_sensitive" },
  { id: "financial", titleKey: "sb_financial" },
  { id: "progressRange", titleKey: "sb_progress_range" },
  { id: "vitality", titleKey: "sb_vitality" },
  { id: "needCategory", titleKey: "sb_needs_section" },
  { id: "hasMedia", titleKey: "sb_media" },
  { id: "stale", titleKey: "sb_stale" },
] as const;

interface SidebarSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
}

function SidebarSection({ title, open, onToggle }: SidebarSectionProps) {
  return (
    <div className="mb-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between rounded-[10px] px-2.5 py-2",
          "text-tag font-bold tracking-button uppercase text-fg-muted",
          "transition-colors duration-fast ease-out hover:bg-muted hover:text-fg-strong",
          open && "text-fg-strong",
        )}
      >
        <span className="text-left">{title}</span>
        <span
          className={cn(
            "inline-flex size-[18px] items-center justify-center text-fg-subtle",
            open && "text-telha",
          )}
        >
          {open ? (
            <Minus size={12} strokeWidth={2} />
          ) : (
            <Plus size={12} strokeWidth={2} />
          )}
        </span>
      </button>
    </div>
  );
}

export interface SidebarProps {
  projects: readonly Project[];
  shown: number;
  total: number;
  counts: FacetCounts;
}

export function Sidebar({ projects, shown, total, counts }: SidebarProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(PRIMARY_SECTIONS.map((section) => section.id)),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  return (
    <aside className="self-start lg:sticky lg:top-[78px] lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto lg:pr-1.5">
      <div className="sticky top-0 z-5 mb-1 bg-linear-to-b from-canvas from-80% to-transparent pb-3.5">
        <SearchBox />
        <ResultCount shown={shown} total={total} />
      </div>

      <TeamByRegion projects={projects} counts={counts.continent} />

      <div className="mt-2 mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-fg-subtle">
          {t("expand_filters")}
        </span>
      </div>

      {PRIMARY_SECTIONS.map((section) => (
        <SidebarSection
          key={section.id}
          title={t(section.titleKey)}
          open={expanded.has(section.id)}
          onToggle={() => toggleSection(section.id)}
        />
      ))}

      <button
        type="button"
        aria-expanded={showAdvanced}
        onClick={() => setShowAdvanced((previous) => !previous)}
        className={cn(
          "mt-3 mb-1 flex w-full items-center justify-center gap-1.5 rounded-pill border border-dashed border-line-strong px-3.5 py-2.5",
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
        <div className="mt-2">
          {ADVANCED_SECTIONS.map((section) => (
            <SidebarSection
              key={section.id}
              title={t(section.titleKey)}
              open={expanded.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
