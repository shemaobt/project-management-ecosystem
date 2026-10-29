import { useEffect } from "react";
import { useProjectsStore } from "../stores/projectsStore";

export interface ProjectListReadOptions {
  /**
   * Read the list again each time the screen opens (`revisit`) — for the Início, whose numbers
   * are the first thing a coordinator reads, and which somebody else's write reaches only by
   * reading again (OBT-663).
   */
  everyVisit?: boolean;
}

/**
 * For a screen that shows the project list: read it on mount — once, since against the server
 * it is the whole scoped browse — and again when a write leaves it outdated (OBT-590), so a
 * screen already open under the write does not keep the list from before it. The two are apart
 * so a screen read on every visit is not read twice when the write's read settles.
 */
export function useProjectListRead({ everyVisit = false }: ProjectListReadOptions = {}): void {
  const hydrate = useProjectsStore((state) => state.hydrate);
  const revisit = useProjectsStore((state) => state.revisit);
  const outdated = useProjectsStore((state) => state.outdated);

  useEffect(() => {
    void (everyVisit ? revisit() : hydrate());
  }, [everyVisit, hydrate, revisit]);

  useEffect(() => {
    if (outdated) void hydrate();
  }, [hydrate, outdated]);
}
