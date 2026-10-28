import type { Project } from "../../../../types/project";
import { ProjectCardDiario } from "./ProjectCardDiario";

export interface JournalViewProps {
  projects: readonly Project[];
  onOpen: (project: Project) => void;
}

/**
 * Each item is a grid so its card stretches to the row's height, and its track is `minmax(0, 1fr)`:
 * an implicit `auto` track starts at the whole `truncate`d name and widens the card (OBT-630).
 */
export function JournalView({ projects, onOpen }: JournalViewProps) {
  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(290px,100%),1fr))] gap-x-5 gap-y-7 p-0 pt-2.5">
      {projects.map((project, index) => (
        <li key={project.id} className="grid grid-cols-1">
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
