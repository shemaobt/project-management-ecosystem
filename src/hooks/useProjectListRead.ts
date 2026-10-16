import { useEffect } from "react";
import { useProjectsStore } from "../stores/projectsStore";

/**
 * For a screen that shows the project list: read it on mount — once, since against the server
 * it is the whole scoped browse — and again when a write leaves it outdated (OBT-590), so a
 * screen already open under the write does not keep the list from before it.
 */
export function useProjectListRead(): void {
  const hydrate = useProjectsStore((state) => state.hydrate);
  const outdated = useProjectsStore((state) => state.outdated);

  useEffect(() => {
    void hydrate();
  }, [hydrate, outdated]);
}
