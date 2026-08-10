import type { Project } from "../../../../types/project";
import { ProjectCardCoral } from "./ProjectCardCoral";

export interface CoralViewProps {
  projects: readonly Project[];
  onOpen: (project: Project) => void;
}

export function CoralView({ projects, onOpen }: CoralViewProps) {
  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4.5 p-0">
      {projects.map((project) => (
        <li key={project.id} className="grid">
          <ProjectCardCoral project={project} onOpen={() => onOpen(project)} />
        </li>
      ))}
    </ul>
  );
}
