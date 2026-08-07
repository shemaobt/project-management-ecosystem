import type { Project } from "../../../../types/project";
import type { FacetCounts } from "../../../../utils/search";
import { DetailedFilters } from "./Filters";
import { ResultCount } from "./ResultCount";
import { SearchBox } from "./SearchBox";

export interface SidebarProps {
  projects: readonly Project[];
  shown: number;
  total: number;
  counts: FacetCounts;
}

export function Sidebar({ projects, shown, total, counts }: SidebarProps) {
  return (
    <aside className="self-start lg:sticky lg:top-[78px] lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto lg:pr-1.5">
      <div className="sticky top-0 z-5 mb-1 bg-linear-to-b from-canvas from-80% to-transparent pb-3.5">
        <SearchBox />
        <ResultCount shown={shown} total={total} />
      </div>

      <DetailedFilters projects={projects} counts={counts} />
    </aside>
  );
}
