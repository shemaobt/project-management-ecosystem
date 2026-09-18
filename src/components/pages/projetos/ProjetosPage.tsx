import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CardMetaphor } from "../../../constants/metaphors";
import { DEFAULT_TAB } from "../../../constants/recordTabs";
import { DEFAULT_SORT } from "../../../constants/sorting";
import { failureMessage } from "../../../services/api";
import { EMPTY_FILTERS, useFiltersStore } from "../../../stores/filtersStore";
import { usePrefsStore } from "../../../stores/prefsStore";
import type { Project } from "../../../types/project";
import { decodeView, encodeView } from "../../../utils/filterSerialisation";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui";
import { AtlasView } from "./Atlas";
import { JournalView } from "./Journal";
import { LoadMore } from "./LoadMore";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { useProjectBrowse } from "./useProjectBrowse";

const PAGE_SIZE = 30;
// BE-05's `limit` is `ge=1` — there is no "counts only, no items" request, so the
// smallest window that still asks for a page is the closest thing to it. The
// baseline's `items` are never read (only `.counts`, below), so this trades the whole
// unpaged collection for one card's worth of payload without changing what the
// sidebar, saved views or "Time por região" can see.
const BASELINE_LIMIT = 1;

interface ResultsViewProps {
  metaphor: CardMetaphor;
  projects: readonly Project[];
  onOpen: (project: Project) => void;
}

function ResultsView({ metaphor, projects, onOpen }: ResultsViewProps) {
  switch (metaphor) {
    case "diario":
      return <JournalView projects={projects} onOpen={onOpen} />;
    case "atlas":
      return <AtlasView projects={projects} onSelect={onOpen} />;
  }
}

export function ProjetosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = useFiltersStore((state) => state.filters);
  const search = useFiltersStore((state) => state.search);
  const clearAll = useFiltersStore((state) => state.clearAll);
  const applyState = useFiltersStore((state) => state.applyState);
  const metaphor = usePrefsStore((state) => state.metaphor);
  const sort = usePrefsStore((state) => state.sort);
  const setSort = usePrefsStore((state) => state.setSort);
  const setMetaphor = usePrefsStore((state) => state.setMetaphor);
  const readUrl = useRef(false);

  useEffect(() => {
    if (readUrl.current) return;
    readUrl.current = true;
    if ([...params.keys()].length === 0) return;
    const shared = decodeView(params);
    applyState(shared.filters, shared.search);
    setSort(shared.sort);
    setMetaphor(shared.metaphor);
  }, [params, applyState, setSort, setMetaphor]);

  useEffect(() => {
    if (!readUrl.current) return;
    const next = encodeView({ filters, search, sort, metaphor });
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [filters, search, sort, metaphor, params, setParams]);

  // The requested window resets to one page the moment the query underneath it
  // changes — the same reset-on-change-during-render pattern wave 1 used, kept because
  // it is what makes "Mostrar mais" ask for a bigger window rather than a reset one.
  const [paging, setPaging] = useState({ count: PAGE_SIZE, filters, search, sort, metaphor });
  const pagingIsStale =
    paging.filters !== filters ||
    paging.search !== search ||
    paging.sort !== sort ||
    paging.metaphor !== metaphor;
  if (pagingIsStale) {
    setPaging({ count: PAGE_SIZE, filters, search, sort, metaphor });
  }
  const requestedCount = pagingIsStale ? PAGE_SIZE : paging.count;
  // Atlas draws the whole matched set (the globe and its own "Mostrar mais" paginate
  // client-side below it, per §5.1); only Diário's grid is server-paged.
  const limit = metaphor === "atlas" ? null : requestedCount;

  const live = useProjectBrowse({ filters, search, sort, limit, offset: 0 });
  // The sidebar's option universe, saved-view availability and "Time por região" cards
  // read the whole scoped collection, unfiltered — `EMPTY_FILTERS` is a stable module
  // constant, so this fetch only ever runs once per mount.
  const baseline = useProjectBrowse({
    filters: EMPTY_FILTERS,
    search: "",
    sort: DEFAULT_SORT,
    limit: BASELINE_LIMIT,
    offset: 0,
  });

  const openRecord = (project: Project) => {
    navigate(`/ficha/${project.id}/${DEFAULT_TAB}`);
  };

  const retryBoth = () => {
    live.retry();
    baseline.retry();
  };

  if (!live.data || !baseline.data) {
    const failed = live.error ?? baseline.error;
    if (failed) {
      return (
        <section className="flex justify-center px-(--container-pad) py-24">
          <EmptyState
            message={failureMessage(failed, t)}
            action={
              <Button variant="secondary" size="sm" onClick={retryBoth}>
                {t("net_retry")}
              </Button>
            }
          />
        </section>
      );
    }
    return (
      <section className="flex justify-center px-(--container-pad) py-24">
        <LoadingSpinner size="lg" label={t("loading")} />
      </section>
    );
  }

  // Both queries have answered at least once — render the screen, keeping the last
  // good page visible under a refetch instead of blanking it (DoD: throttled connection).
  const data = live.data;
  const { items, matched, total } = data;

  return (
    <div className="mx-auto grid w-full max-w-(--container-wide) grid-cols-1 gap-8 px-(--container-pad) pt-6 pb-20 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <h1 className="sr-only">{t("projetos_title")}</h1>
      <Sidebar
        baseline={baseline.data.counts}
        shown={matched}
        total={total}
        counts={data.counts}
      />
      <section aria-label={t("projetos_results_label")}>
        <Toolbar count={matched} total={total} />
        {live.loading && (
          <p className="-mt-3 mb-3 text-tag text-fg-subtle">{t("loading")}</p>
        )}
        {live.error && (
          <p className="-mt-3 mb-3 text-tag text-telha">
            {failureMessage(live.error, t)}{" "}
            <button
              type="button"
              onClick={() => live.retry()}
              className="font-semibold underline"
            >
              {t("net_retry")}
            </button>
          </p>
        )}
        {matched === 0 ? (
          <EmptyState
            title={t("empty_title")}
            message={
              search.trim()
                ? t("empty_search_sub", { term: search.trim() })
                : t("empty_sub")
            }
            action={
              <Button variant="secondary" size="sm" onClick={clearAll}>
                {t("sb_clear_all")}
              </Button>
            }
          />
        ) : (
          <>
            <ResultsView metaphor={metaphor} projects={items} onOpen={openRecord} />
            {metaphor !== "atlas" && items.length < matched && (
              <LoadMore
                shown={items.length}
                total={matched}
                step={PAGE_SIZE}
                onMore={() =>
                  setPaging((state) => ({ ...state, count: state.count + PAGE_SIZE }))
                }
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
