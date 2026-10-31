import type { MeetingCadence, MeetingReadiness } from "./meeting";
import type { RecordConflict } from "./projectRecord";
import type { ApiFailure } from "./session";

export type FormKind = MeetingReadiness;

export type FormMechanism = "file" | "inApp";

export type FormFiller = "teamLeader" | "obtLab";

export type ReportingState = "reported" | "awaiting" | "never";

export interface FormDefinition {
  kind: FormKind;
  cadence: MeetingCadence;
  mechanism: FormMechanism;
  filledBy: FormFiller;
  titleKey: string;
  voiceKey: string;
  descriptionKey: string;
  mechanismKey: string;
}

export type StepActor = "coordinator" | "leader" | "system";

export interface FormStep {
  key: string;
  actor: StepActor;
  labelKey: string;
  detailKey: string;
}

export interface ProjectReporting {
  state: ReportingState;
  lastDate: string | null;
  periodEnd: string;
}

export interface PendingProject {
  id: string;
  languageName: string;
  /** The project's own bit (OBT-560), so the list says *Projeto sensível — {região}* and never the key. */
  languageNameWithheld?: boolean;
  regionLabelKey: string;
  lastDate: string | null;
}

export interface FormReadiness {
  reported: number;
  total: number;
  periodEnd: string;
  pending: readonly PendingProject[];
}

export type ArchivedKind = Extract<FormKind, "pulso">;

export interface ReceivedSubmission {
  id: string;
  kind: ArchivedKind;
  projectId: string;
  languageName: string;
  /**
   * `true` when `languageName` is not the language's own — the public name, or the region key
   * while none is registered — because the project is sensitive and this reader does not read
   * the truth (OBT-600). The server's `languageNameWithheld`, read by `getLanguageNameDisplay`.
   */
  languageNameWithheld?: boolean;
  submittedBy: string;
  receivedAt: string;
  definitionVersion: number;
  appliedAt: string | null;
}

/**
 * What applying one received Pulse to the record answered (`POST …/forms/submissions/{id}/import`,
 * OBT-652). A Pulse already applied answers `ok` too — the server's idempotent no-op — so the row
 * converges on *applied* whoever applied it. A conflict carries the record's version the refusal
 * named (its `ETag`): the panel says who moved what since the Pulse was opened, and applying again
 * quotes exactly that version. `version` is `""` when the refusal carried none.
 */
export type SubmissionApplyResult =
  | { ok: true; submission: ReceivedSubmission }
  | { ok: false; reason: "conflict"; conflict: RecordConflict; version: string }
  | { ok: false; reason: "failed"; failure: ApiFailure };

// --- the leader link and the form it serves — BE-12 (OBT-401) ---------------------

export type IntakeFieldType =
  | "text"
  | "longText"
  | "choice"
  | "period"
  | "progressRows"
  /** The id of an image uploaded through the same link (OBT-578): the bytes go up first, the answer is the pointer. */
  | "image"
  /** A box — `true` or `false`; absent and `false` both mean nothing was authorized. */
  | "checkbox";

export interface IntakeField {
  key: string;
  type: IntakeFieldType;
  required: boolean;
  labelKey: string;
  maxLength: number | null;
  options: readonly string[];
}

/** What one live link grants — the whole of it, per BE-12's write-mostly rule. */
export interface IntakeForm {
  kind: ArchivedKind;
  definitionVersion: number;
  languageName: string;
  expiresAt: string;
  fields: readonly IntakeField[];
}

export type IntakeAnswers = Record<string, unknown>;

/** What `POST /api/shema/intake/{token}/image` answers — the id the `image` answer then carries, and nothing else (OBT-578). */
export interface IntakeImageStored {
  id: string;
  fileName: string | null;
  contentType: string;
}

/**
 * One submission opened — the answers as they arrived, beside the form they answered
 * (`GET /api/shema/forms/submissions/{id}`). `answersWithheld` is `true` when this reader was
 * given none of them: the project's place is withheld and the reader is not coordination.
 */
export interface ReceivedSubmissionDetail extends ReceivedSubmission {
  fields: readonly IntakeField[];
  answers: IntakeAnswers;
  answersWithheld: boolean;
}

export interface IntakeSubmissionPayload {
  definitionVersion: number;
  answers: IntakeAnswers;
}

export type IntakeLinkStatus = "pending" | "used" | "expired" | "revoked";

export interface IntakeLink {
  id: string;
  projectId: string;
  definitionVersion: number;
  expiresAt: string;
  status: IntakeLinkStatus;
  createdAt: string;
  usedAt: string | null;
  revokedAt: string | null;
}

export interface IntakeLinkCreated extends IntakeLink {
  token: string;
  url: string;
}

export interface IntakeLinkCreatePayload {
  projectId: string;
  expiresAt?: string;
}
