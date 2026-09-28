import type { RecordTabProps } from "../types";
import { EquipeForm } from "./equipe/EquipeForm";
import { EquipeView } from "./equipe/EquipeView";
import { ProjectMembers } from "./equipe/ProjectMembers";

export function EquipeTab({ mode, draft }: RecordTabProps) {
  const projectId = draft.saved?.id;

  return (
    <div className="flex flex-col gap-5">
      {mode === "editar" ? <EquipeForm draft={draft} /> : <EquipeView draft={draft} />}
      {projectId && <ProjectMembers key={projectId} projectId={projectId} />}
    </div>
  );
}
