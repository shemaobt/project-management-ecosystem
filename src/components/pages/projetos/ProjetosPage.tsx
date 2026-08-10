import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { projectsAPI } from "../../../fixtures";
import { useFiltersStore } from "../../../stores/filtersStore";
import type { Project } from "../../../types/project";
import { filterProjects } from "../../../utils/search";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui/Button";
import { AtlasView } from "./Atlas";
import { Sidebar } from "./Sidebar";

export function ProjetosPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const filters = useFiltersStore((state) => state.filters);
  const search = useFiltersStore((state) => state.search);
  const clearAll = useFiltersStore((state) => state.clearAll);

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

  if (projects === null) {
    return (
      <section className="flex justify-center px-8 py-24">
        <LoadingSpinner size="lg" label={t("loading")} />
      </section>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-8 px-8 pt-6 pb-20 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar
        projects={projects}
        shown={result.projects.length}
        total={result.total}
        counts={result.counts}
      />
      <div>
        {result.projects.length === 0 ? (
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
          <AtlasView projects={result.projects} />
        )}
      </div>
    </div>
  );
}
