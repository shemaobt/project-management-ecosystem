import { useState } from "react";
import type { Project } from "../../../../types/project";
import { LoadMore } from "../LoadMore";
import { ProjectCardAtlas } from "../ProjectCardAtlas";
import { Globe } from "./Globe";

const PAGE_SIZE = 30;

export interface AtlasViewProps {
  projects: Project[];
  onSelect?: (project: Project) => void;
}

export function AtlasView({ projects, onSelect }: AtlasViewProps) {
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
        <LoadMore
          shown={visibleCount}
          total={projects.length}
          step={PAGE_SIZE}
          onMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
        />
      )}
    </div>
  );
}
