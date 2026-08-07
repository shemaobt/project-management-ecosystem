import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../../../types/project";
import { ProjectCardAtlas } from "../ProjectCardAtlas";
import { Globe } from "./Globe";

const PAGE_SIZE = 30;

export interface AtlasViewProps {
  projects: Project[];
  onSelect?: (project: Project) => void;
}

export function AtlasView({ projects, onSelect }: AtlasViewProps) {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [prevProjects, setPrevProjects] = useState(projects);
  if (projects !== prevProjects) {
    setPrevProjects(projects);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div>
      {projects.length > 0 && <Globe projects={projects} onSelect={onSelect} />}
      <div className="grid grid-cols-1 gap-3">
        {projects.slice(0, visibleCount).map((project) => (
          <ProjectCardAtlas
            key={project.id}
            project={project}
            onClick={onSelect ? () => onSelect(project) : undefined}
          />
        ))}
      </div>
      {projects.length > visibleCount && (
        <div className="mt-7 flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="group inline-flex items-center gap-3.5 rounded-pill border border-telha bg-elevated px-6 py-3 text-micro font-bold tracking-[0.08em] uppercase text-telha transition-all duration-[180ms] ease-out hover:-translate-y-px hover:bg-telha hover:text-branco hover:shadow-md"
          >
            {t("load_more")}
            <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-tag font-extrabold tracking-button text-telha group-hover:bg-[rgba(246,245,235,0.2)] group-hover:text-branco">
              +{Math.min(PAGE_SIZE, projects.length - visibleCount)}
            </span>
            <span className="text-tag tracking-button text-fg-muted tabular-nums group-hover:text-[rgba(246,245,235,0.7)]">
              {visibleCount}/{projects.length}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
