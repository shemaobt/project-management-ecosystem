export type DataNamespace =
  | "session"
  | "projects"
  | "regions"
  | "meetings"
  | "prayer"
  | "intercessors"
  | "eten"
  | "forms";

export type DataSource = "api" | "fixtures";

export const SOURCES: readonly DataSource[] = ["api", "fixtures"];

export const OVERRIDE_VARIABLE = "VITE_DATA_SOURCE";

export const INTEGRATED_BY: Record<DataNamespace, string> = {
  session: "INT-01 · BE-03",
  projects: "INT-02 · BE-05",
  regions: "INT-10 · BE-13",
  meetings: "INT-07 · BE-10",
  prayer: "INT-06 · BE-09",
  // The org chart and the intercessor network share one owner on the backend
  // (BE-13 · Equipe e intercessores, `docs/shema.md` §1.3 C3) even though
  // FE-44 §9.6 grouped this namespace with the prayer wall under BE-09. The
  // frozen paths did not move, only who builds them, and INT-10 is the
  // screen the graph names as blocked by BE-13.
  intercessors: "INT-10 · BE-13",
  eten: "INT-08 · BE-11",
  forms: "INT-09 · BE-12",
};

export const INTEGRATED: Record<DataNamespace, DataSource> = {
  session: "api",
  projects: "fixtures",
  regions: "api",
  meetings: "fixtures",
  prayer: "fixtures",
  intercessors: "api",
  eten: "fixtures",
  forms: "fixtures",
};

export function parseOverride(raw: unknown): DataSource | null {
  return typeof raw === "string" && (SOURCES as readonly string[]).includes(raw)
    ? (raw as DataSource)
    : null;
}

export function sourceFor(
  namespace: DataNamespace,
  override: DataSource | null,
): DataSource {
  return override ?? INTEGRATED[namespace];
}

export function resolveSource(namespace: DataNamespace): DataSource {
  return sourceFor(namespace, parseOverride(import.meta.env.VITE_DATA_SOURCE));
}
