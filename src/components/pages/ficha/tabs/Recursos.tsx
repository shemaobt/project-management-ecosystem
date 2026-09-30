import { resourceRequestsAPI } from "../../../../services/api";
import { ProjectRequests } from "../pedidos/ProjectRequests";
import type { RecordTabProps } from "../types";
import { RecursosForm } from "./recursos/RecursosForm";
import { RecursosView } from "./recursos/RecursosView";

export function RecursosTab({ mode, draft }: RecordTabProps) {
  const projectId = draft.saved?.id;

  return (
    <div className="flex flex-col gap-5">
      {mode === "editar" ? <RecursosForm draft={draft} /> : <RecursosView draft={draft} />}
      {projectId && resourceRequestsAPI ? (
        <ProjectRequests key={projectId} api={resourceRequestsAPI} projectId={projectId} />
      ) : null}
    </div>
  );
}
