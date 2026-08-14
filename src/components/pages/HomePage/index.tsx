import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_TAB } from "../../../constants/recordTabs";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { Project } from "../../../types/project";
import { Globe } from "../projetos/Atlas/Globe";
import { Hero } from "./Hero";

export interface HomeViewProps {
  projects: readonly Project[] | null;
  onOpen: (project: Project) => void;
}

export function HomeView({ projects, onOpen }: HomeViewProps) {
  return (
    <>
      <Hero projects={projects} />
      {projects !== null && projects.length > 0 && (
        <div className="mx-auto w-full max-w-[1500px] px-5 pt-6 pb-20 sm:px-8">
          <Globe projects={projects} onSelect={onOpen} />
        </div>
      )}
    </>
  );
}

export function HomePage() {
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
    <HomeView projects={hydrated ? projects : null} onOpen={openRecord} />
  );
}
