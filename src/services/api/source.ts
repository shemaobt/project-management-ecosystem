export type DataNamespace =
  | "session"
  | "projects"
  | "projectsBrowse"
  | "projectRecord"
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
  // `.list()` / `.get()` stay fixture-backed on purpose: BE-05 only ever shipped the
  // browse envelope (`{items, counts, …}`), never the plain `Project[]` those two
  // promise, and the screens that still call them (ficha, avaliação, dados, equipe,
  // eten, formulários, início, oração, ritmo) read the full record shape BE-06 hasn't
  // shipped yet. Flipping this flag would break all of them at once, ahead of their own
  // INTs — see `projectsBrowse` for what INT-02 actually integrated.
  projects: "INT-02 · BE-05",
  // The Projetos screen's own capability — filtered, counted, sorted, paged.
  projectsBrowse: "INT-02 · BE-05",
  // The ficha's own capability — one record, its version, and the writes that quote it.
  projectRecord: "INT-03 · BE-06",
  regions: "INT-10 · BE-13",
  meetings: "INT-07 · BE-10",
  prayer: "INT-06 · BE-09",
  intercessors: "INT-06 · BE-09",
  eten: "INT-08 · BE-11",
  forms: "INT-09 · BE-12",
};

export const INTEGRATED: Record<DataNamespace, DataSource> = {
  session: "api",
  projects: "fixtures",
  projectsBrowse: "api",
  projectRecord: "api",
  regions: "fixtures",
  meetings: "fixtures",
  prayer: "fixtures",
  intercessors: "fixtures",
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
