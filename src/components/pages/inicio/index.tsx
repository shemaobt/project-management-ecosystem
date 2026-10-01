import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_TAB } from "../../../constants/recordTabs";
import { projectListAvailable } from "../../../services/api";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { Project } from "../../../types/project";
import { withheldNotice } from "../../../utils/region";
import { Globe } from "../projetos/Atlas/Globe";
import { Hero } from "./Hero";

export interface InicioViewProps {
  projects: readonly Project[] | null;
  onOpen: (project: Project) => void;
  /** `false` where the build withholds the project list (INT-12): no band, no globe. */
  served?: boolean;
}

export function InicioView({ projects, onOpen, served = true }: InicioViewProps) {
  return (
    <>
      <Hero projects={projects} served={served} />
      {served && projects !== null && projects.length > 0 && (
        <div className="mx-auto w-full max-w-(--container-wide) px-5 pt-6 pb-20 sm:px-8">
          <Globe
            projects={projects}
            locationsWithheld={withheldNotice(projects)}
            listPageSize={null}
            onSelect={onOpen}
          />
        </div>
      )}
    </>
  );
}

export function InicioPage() {
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const navigate = useNavigate();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const openRecord = (project: Project) => {
    navigate(`/ficha/${project.id}/${DEFAULT_TAB}`);
  };

  return (
    <InicioView
      projects={hydrated ? projects : null}
      onOpen={openRecord}
      served={projectListAvailable}
    />
  );
}
