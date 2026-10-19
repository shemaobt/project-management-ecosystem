import type { SortKey } from "../constants/sorting";
import type { ProjectFilters } from "../stores/filtersStore";
import type { FacetCounts } from "../utils/search";
import type { Project } from "./project";

/**
 * What the Projetos screen asks for — one shape, shared by the real browse call
 * (`services/api/projectBrowse.ts`) and its fixtures test double
 * (`fixtures/projectBrowse.ts`), so `services/api/index.ts` can `pick()` between them.
 */
export interface ProjectBrowseQuery {
  filters: ProjectFilters;
  search: string;
  sort: SortKey;
  /** `null` asks for the whole scoped collection, unpaged — the frozen default (FE-44 §9.1). */
  limit: number | null;
  offset: number;
}

export interface ProjectBrowseResult {
  items: Project[];
  counts: FacetCounts;
  /** How many matched the filters — what the toolbar and the sidebar read. */
  matched: number;
  /** How many the caller reaches at all, before any filter. */
  total: number;
  /** How many of `items` had their place reduced — `null`, never `0`, when none were. */
  locationsWithheld: number | null;
}

/**
 * The counts of the whole list, read with no filter: by the facet rule (§7.6) each option's
 * count is how many that one filter returns, and `matched` is how many the list holds — so
 * every number the Início band shows is one of these cells (OBT-590).
 */
export type ListFacets = Pick<ProjectBrowseResult, "counts" | "matched">;
