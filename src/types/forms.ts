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
  pending: readonly PendingProject[];
}

export interface ReceivedSubmission {
  id: string;
  kind: FormKind;
  projectId: string;
  languageName: string;
  submittedBy: string;
  receivedAt: string;
}
