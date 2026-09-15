import { useEffect, useState } from "react";
import type { SortKey } from "../../../constants/sorting";
import { projectBrowseAPI, toApiFailure } from "../../../services/api";
import type { ProjectFilters } from "../../../stores/filtersStore";
import type { ProjectBrowseResult } from "../../../types/projectBrowse";
import type { ApiFailure } from "../../../types/session";

const SEARCH_DEBOUNCE_MS = 300;

export interface ProjectBrowseParams {
  filters: ProjectFilters;
  search: string;
  sort: SortKey;
  /** `null` asks for the whole scoped collection, unpaged. */
  limit: number | null;
  offset: number;
}

export interface ProjectBrowseState {
  data: ProjectBrowseResult | null;
  /** True only while a request for the *current* params is in flight — `data` keeps
   * the last good page, so a refetch never blanks a screen the reader is already
   * looking at. */
  loading: boolean;
  error: ApiFailure | null;
  retry: () => void;
}

interface Fetched {
  key: string;
  loading: boolean;
  data: ProjectBrowseResult | null;
  error: ApiFailure | null;
}

/**
 * The Projetos screen's one query, server-side (§9.1's superseding decision, BE-05). Two
 * behaviours a throttled connection needs and the naive `useEffect` fetch does not give
 * for free:
 *
 * - **Search is debounced** before it becomes a request — a keystroke must not fire a
 *   round trip per character.
 * - **A response that resolves after a newer request has started is dropped**, and a
 *   stale page stays on screen while the new one loads rather than blanking — a slow
 *   reply for a filter set the reader already changed away from must never overwrite
 *   what they are looking at now.
 *
 * The "a new request started" reset is a conditional `setState` *during render* — the
 * same pattern `ProjetosPage`'s own paging window already uses — rather than a
 * synchronous `setState` at the top of the effect, which `react-hooks/set-state-in-effect`
 * flags as a cascading-render risk. The effect's only direct `setState` calls are the
 * ones inside the promise's `.then()` / `.catch()`, answering an external system.
 */
export function useProjectBrowse(params: ProjectBrowseParams): ProjectBrowseState {
  const [debouncedSearch, setDebouncedSearch] = useState(params.search);
  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(params.search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [params.search]);

  const [attempt, setAttempt] = useState(0);
  const { filters, sort, limit, offset } = params;
  const key = JSON.stringify([filters, debouncedSearch, sort, limit, offset, attempt]);

  const [fetched, setFetched] = useState<Fetched>({
    key,
    loading: true,
    data: null,
    error: null,
  });

  if (fetched.key !== key) {
    setFetched((previous) => ({ ...previous, key, loading: true, error: null }));
  }

  useEffect(() => {
    let active = true;
    projectBrowseAPI
      .browse({ filters, search: debouncedSearch, sort, limit, offset })
      .then((result) => {
        if (!active) return;
        setFetched((previous) =>
          previous.key === key
            ? { ...previous, loading: false, data: result }
            : previous,
        );
      })
      .catch((thrown: unknown) => {
        if (!active) return;
        setFetched((previous) =>
          previous.key === key
            ? { ...previous, loading: false, error: toApiFailure(thrown) }
            : previous,
        );
      });
    return () => {
      active = false;
    };
  }, [key, filters, debouncedSearch, sort, limit, offset]);

  return {
    data: fetched.data,
    loading: fetched.loading,
    error: fetched.error,
    retry: () => setAttempt((count) => count + 1),
  };
}
