import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { projectsAPI } from "../../../fixtures";
import { useFiltersStore } from "../../../stores/filtersStore";
import { usePrefsStore, type CardMetaphor } from "../../../stores/prefsStore";
import { surfaceElevated } from "../../../styles";
import type { Project } from "../../../types/project";
import { cn } from "../../../utils/cn";
import { filterProjects } from "../../../utils/search";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button, toast } from "../../ui";
import { CoralView } from "./Coral";
import { JournalView } from "./Journal";
import { LoadMore } from "./LoadMore";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { DEFAULT_SORT, sortProjects, type SortKey } from "./sorting";

const PAGE_SIZE = 30;

interface ResultsViewProps {
  metaphor: CardMetaphor;
  projects: readonly Project[];
  onOpen: (project: Project) => void;
}

function ResultsView({ metaphor, projects, onOpen }: ResultsViewProps) {
  switch (metaphor) {
    case "diario":
      return <JournalView projects={projects} onOpen={onOpen} />;
    case "coral":
      return <CoralView projects={projects} onOpen={onOpen} />;
    case "atlas":
      return (
        <ul className="grid list-none gap-3 p-0">
          {projects.map((project) => (
            <li
              key={project.id}
              className={cn(surfaceElevated, "rounded-md px-5 py-4")}
            >
              <p className="font-semibold text-fg-strong">
                {project.languageName}
              </p>
              <p className="text-small text-fg-muted">
                {[project.team, project.location].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      );
  }
}

export function ProjetosPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const filters = useFiltersStore((state) => state.filters);
  const search = useFiltersStore((state) => state.search);
  const clearAll = useFiltersStore((state) => state.clearAll);
  const metaphor = usePrefsStore((state) => state.metaphor);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [paging, setPaging] = useState({
    count: PAGE_SIZE,
    filters,
    search,
    sort,
    metaphor,
  });
  const locale = t("locale");

  useEffect(() => {
    let active = true;
    void projectsAPI.list().then((list) => {
      if (active) setProjects(list);
    });
    return () => {
      active = false;
    };
  }, []);

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

  if (projects === null) {
    return (
      <section className="flex justify-center px-8 py-24">
        <LoadingSpinner size="lg" label={t("loading")} />
      </section>
    );
  }

  const visible = sorted.slice(0, visibleCount);
  const openRecord = () => {
    toast(t("toast_pending", { label: t("d_record") }));
  };

  return (
    <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-8 px-8 pt-6 pb-20 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar shown={result.projects.length} total={result.total} />
      <div>
        <Toolbar
          count={sorted.length}
          total={result.total}
          sort={sort}
          onSortChange={setSort}
        />
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
              projects={visible}
              onOpen={openRecord}
            />
            {sorted.length > visibleCount && (
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
