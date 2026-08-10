import type { Project } from "../../../../types/project";
import { ProjectCardDiario } from "./ProjectCardDiario";

export interface JournalViewProps {
  projects: readonly Project[];
  onOpen: (project: Project) => void;
}

export function JournalView({ projects, onOpen }: JournalViewProps) {
  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-x-5 gap-y-7 p-0 pt-2.5">
      {projects.map((project, index) => (
        <li key={project.id} className="grid">
          <ProjectCardDiario
            project={project}
            index={index}
            onOpen={() => onOpen(project)}
          />
        </li>
      ))}
    </ul>
  );
}
