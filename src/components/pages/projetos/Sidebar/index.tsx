import { useTranslation } from "react-i18next";
import type { FacetCounts } from "../../../../utils/search";
import { Chips } from "./Chips";
import { DetailedFilters } from "./Filters";
import { ResultCount } from "./ResultCount";
import { SavedViews } from "../SavedViews";
import { SearchBox } from "./SearchBox";
import { TeamByRegion } from "./TeamByRegion";

export interface SidebarProps {
  /** Unfiltered, whole-scope counts — option universes, saved-view availability, and
   * which "Time por região" cards exist. Never re-derived from a raw project list here:
   * the server (or, for local dev, the fixtures browse adapter) is the one owner. */
  baseline: FacetCounts;
  shown: number;
  total: number;
  counts: FacetCounts;
}

export function Sidebar({ baseline, shown, total, counts }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      aria-label={t("projetos_filters_label")}
      className="self-start lg:sticky lg:top-[78px] lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto lg:pr-1.5"
    >
      <div className="sticky top-0 z-5 mb-1 bg-linear-to-b from-canvas from-80% to-transparent pb-3.5">
        <SearchBox />
        <Chips counts={counts.preset} />
        <ResultCount shown={shown} total={total} />
      </div>

      <SavedViews counts={baseline} />

      <TeamByRegion baseline={baseline.continent} counts={counts.continent} />

      <DetailedFilters baseline={baseline} counts={counts} />
    </aside>
  );
}
