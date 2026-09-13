import { CURRENT_QUESTION_SET_VERSION } from "../constants/health";
import { allWritableFields } from "../constants/recordFields";
import type { AssessmentDraft } from "../types/assessment";
import type { Project } from "../types/project";
import type { LoadedRecord } from "../types/projectRecord";
import type { RecordSaveResult } from "../services/api/projectRecord";
import type { ApiFailure } from "../types/session";
import { applyAssessment } from "../utils/assessment";
import { toLocalIsoDate } from "../utils/format";
import { applyProgressUpdate } from "../utils/progress";
import { computeDerived } from "../utils/projectDerived";
import { loadProject, loadProjects } from "./projects";

/**
 * The record endpoint's test double — and, unlike wave 1's fixtures, it remembers.
 *
 * §4.1.1's "the fixture module never mutates" is a rule about wave 1, where the store
 * owned every edit and the fixtures were a read-only seed. In wave 2 this namespace
 * stands in for a *write* endpoint, and a double that forgets what it accepted cannot
 * stand in for one: a conflict has no version to be stale against, and a save has
 * nothing to read back. So the writes live here, in memory only —
 * `data/projects.json` is never touched, and a reload starts from the export again.
 *
 * `overlay` is the one owner of what the double has been told. `applyOverlay` is how
 * the browse double sees the same edits, so the list and the record do not disagree
 * inside one session.
 */
const overlay = new Map<string, { project: Project; version: number }>();

const VERSION_ONE = 1;

const clone = (project: Project): Project => structuredClone(project);

function withDerived(project: Project): Project {
  return { ...clone(project), derived: computeDerived(project) };
}

function held(id: string): { project: Project; version: number } | null {
  const kept = overlay.get(id);
  if (kept) return kept;
  const seed = loadProject(id);
  return seed ? { project: seed, version: VERSION_ONE } : null;
}

/** Every project the double knows, with anything it has been told applied on top. */
export function applyRecordOverlay(projects: Project[]): Project[] {
  if (overlay.size === 0) return projects;
  return projects.map((project) => {
    const kept = overlay.get(project.id);
    return kept ? clone(kept.project) : project;
  });
}

/** Only for tests and for a page reload — the double forgets everything it was told. */
export function resetRecordOverlay(): void {
  overlay.clear();
}

/**
 * The real read answers 404 through the shared client, which hands the caller an
 * `ApiFailure`; the double answers the same shape so the screen has one not-found path.
 * The literal rather than `failure()` from `services/api/errors`: the fixture layer is
 * the foundation every seam reads from and takes no runtime dependency on the seam.
 */
export function readRecord(id: string): LoadedRecord {
  const kept = held(id);
  if (!kept) {
    const absent: ApiFailure = {
      kind: "notFound",
      status: 404,
      code: null,
      detail: null,
    };
    throw absent;
  }
  return { project: withDerived(kept.project), version: `"${kept.version}"` };
}

const versionOf = (etag: string): number =>
  Number(etag.replace(/^W\//, "").replaceAll('"', "")) || 0;

function store(project: Project, version: number): LoadedRecord {
  overlay.set(project.id, { project: clone(project), version });
  return { project: withDerived(project), version: `"${version}"` };
}

export function createRecord(project: Project): RecordSaveResult {
  const taken =
    overlay.has(project.id) ||
    loadProjects().some((candidate) => candidate.id === project.id);
  if (taken) {
    return {
      ok: false,
      reason: "invalid",
      errors: [
        {
          field: null,
          index: null,
          message: `${project.id}: a project already exists at this slug`,
        },
      ],
    };
  }
  const filed = applyProgressUpdate(null, clone(project), toLocalIsoDate());
  return { ok: true, record: store(filed, VERSION_ONE) };
}

/**
 * The double's own version guard: the same shape the server's is, so a screen that
 * handles one handles the other. It rolls the aggregates and appends the history entry
 * on the way in, because that is what the server does and a double that skipped it
 * would let the record screen render something the real save never produces.
 */
export function patchRecord(
  id: string,
  patch: Record<string, unknown>,
  version: string,
): RecordSaveResult {
  const kept = held(id);
  if (!kept) {
    return {
      ok: false,
      reason: "invalid",
      errors: [{ field: null, index: null, message: `${id}: no such record` }],
    };
  }
  if (kept.version !== versionOf(version)) {
    return {
      ok: false,
      reason: "conflict",
      conflict: {
        expectedVersion: versionOf(version),
        currentVersion: kept.version,
        changedFields: [],
        unknownFields: [],
        changedBy: "",
        changedAt: null,
        detail: null,
      },
    };
  }

  const merged = { ...clone(kept.project) } as Project;
  for (const field of allWritableFields()) {
    if (!(field in patch)) continue;
    const value = patch[field];
    Object.assign(merged, { [field]: value ?? "" });
  }
  if ("team" in patch) merged.ywamBase = merged.team;

  const applied = applyProgressUpdate(kept.project, merged, toLocalIsoDate());
  return { ok: true, record: store(applied, kept.version + 1) };
}

/**
 * BE-07's own fixed dimension names — the note is compiled once, server-side, at write
 * time (never re-rendered from `dimensionNotes` on read), so it carries one language
 * regardless of the reader's locale. `d_emotional` etc. are `HEALTH_DIMENSIONS`'
 * `labelKey`s; a key this map does not know still returns something rather than nothing.
 */
const DIMENSION_LABEL: Record<string, string> = {
  d_emotional: "Emocional",
  d_relational: "Relacional",
  d_spiritual: "Espiritual",
  d_physical: "Física",
};
const wireLabel = (key: string): string => DIMENSION_LABEL[key] ?? key;

/**
 * The double for `POST /projects/{id}/health-assessments` (BE-07, INT-04): append one
 * reading, re-project the flat fields, bump the version. No `If-Match` — the real
 * endpoint has none either, appending is not replacing (`append_assessment.py`).
 *
 * `applyAssessment` already does the append-and-reproject `recordAssessment` does
 * server-side; what this adds is the three keys BE-07 stamps that a purely local save
 * never needed — `author`, `questionSetVersion`, and the entry's own `overall`, all
 * computed the same way the server computes them.
 */
export function submitAssessment(
  id: string,
  draft: AssessmentDraft,
  actorName: string,
): RecordSaveResult {
  const kept = held(id);
  if (!kept) {
    return {
      ok: false,
      reason: "invalid",
      errors: [{ field: null, index: null, message: `${id}: no such record` }],
    };
  }

  const assessorFilled = draft.assessor.trim() === ""
    ? { ...draft, assessor: actorName }
    : draft;

  // `buildSubmission` never sends `overallNote` — BE-07 has no field for it — so the
  // double drops it here too, before `compileNotes` can fold it into `notes` the way
  // the wizard's own `hw_overallnote_local_only` says it never does server-side.
  const filed = applyAssessment(
    kept.project,
    { ...assessorFilled, overallNote: "" },
    wireLabel,
    {
      author: actorName,
      questionSetVersion: CURRENT_QUESTION_SET_VERSION,
    },
  );

  return { ok: true, record: store(filed, kept.version + 1) };
}
