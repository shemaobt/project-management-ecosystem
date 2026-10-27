import type { Project } from "../../../../types/project";
import { ProjectCardDiario } from "./ProjectCardDiario";

export interface JournalViewProps {
  projects: readonly Project[];
  onOpen: (project: Project) => void;
}

/**
 * Each item is a grid so its card stretches to the height of the row. Its track is `grid-cols-1`,
 * `minmax(0, 1fr)`: the implicit `auto` track starts at the card's min-content, which is the whole
 * name since the title is `truncate` (nowrap), so a long name widened the card over the next
 * column (OBT-630). `min-w-0` on the item does not do it — the item already has the column's width.
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
