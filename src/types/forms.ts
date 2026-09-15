import type { MeetingCadence, MeetingReadiness } from "./meeting";

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
  submittedBy: string;
  receivedAt: string;
  definitionVersion: number;
  appliedAt: string | null;
}

// --- the leader link and the form it serves — BE-12 (OBT-401) ---------------------

export type IntakeFieldType =
  | "text"
  | "longText"
  | "choice"
  | "period"
  | "progressRows";

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
