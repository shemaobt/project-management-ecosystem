import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CardMetaphor } from "../../../constants/metaphors";
import { DEFAULT_TAB } from "../../../constants/recordTabs";
import { useFiltersStore } from "../../../stores/filtersStore";
import { usePrefsStore } from "../../../stores/prefsStore";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { Project } from "../../../types/project";
import { decodeView, encodeView } from "../../../utils/filterSerialisation";
import { filterProjects } from "../../../utils/search";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui";
import { AtlasView } from "./Atlas";
import { JournalView } from "./Journal";
import { LoadMore } from "./LoadMore";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { sortProjects } from "./sorting";

const PAGE_SIZE = 30;

interface ResultsViewProps {
  metaphor: CardMetaphor;
  projects: readonly Project[];
  visible: readonly Project[];
  onOpen: (project: Project) => void;
}

function ResultsView({
  metaphor,
  projects,
  visible,
  onOpen,
}: ResultsViewProps) {
  switch (metaphor) {
    case "diario":
      return <JournalView projects={visible} onOpen={onOpen} />;
    case "atlas":
      return <AtlasView projects={projects} onSelect={onOpen} />;
  }
}

export function ProjetosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
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
  const [paging, setPaging] = useState({
    count: PAGE_SIZE,
    filters,
    search,
    sort,
    metaphor,
  });
  const locale = t("locale");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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

  const result = useMemo(
    () => filterProjects(projects ?? [], filters, search),
    [projects, filters, search],
  );

  const sorted = useMemo(
    () => sortProjects(result.projects, sort, locale),
    [result.projects, sort, locale],
  );

  const pagingIsStale =
    paging.filters !== filters ||
    paging.search !== search ||
    paging.sort !== sort ||
    paging.metaphor !== metaphor;

  if (pagingIsStale) {
    setPaging({ count: PAGE_SIZE, filters, search, sort, metaphor });
  }

  const visibleCount = pagingIsStale ? PAGE_SIZE : paging.count;

  if (!hydrated) {
    return (
      <section className="flex justify-center px-8 py-24">
        <LoadingSpinner size="lg" label={t("loading")} />
      </section>
    );
  }

  const visible = sorted.slice(0, visibleCount);
  const openRecord = (project: Project) => {
    navigate(`/ficha/${project.id}/${DEFAULT_TAB}`);
  };

  return (
    <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-8 px-8 pt-6 pb-20 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar
        projects={projects}
        shown={result.projects.length}
        total={result.total}
        counts={result.counts}
      />
      <div>
        <Toolbar count={sorted.length} total={result.total} />
        {sorted.length === 0 ? (
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
            <ResultsView
              metaphor={metaphor}
              projects={sorted}
              visible={visible}
              onOpen={openRecord}
            />
            {metaphor !== "atlas" && sorted.length > visibleCount && (
              <LoadMore
                shown={visible.length}
                total={sorted.length}
                step={PAGE_SIZE}
                onMore={() =>
                  setPaging((state) => ({
                    ...state,
                    count: state.count + PAGE_SIZE,
                  }))
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
