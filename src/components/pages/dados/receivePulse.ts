import { toApiFailure } from "../../../services/api";
import type {
  PulseFile,
  PulseFileReading,
  PulseFileRefusal,
} from "../../../services/pulseFile";
import type {
  PulseImageUploadResult,
  ReceivedSubmission,
  SubmissionApplyResult,
} from "../../../types/forms";
import type { Project } from "../../../types/project";
import type { LoadedRecord, RecordConflict } from "../../../types/projectRecord";
import type { ApiFailure } from "../../../types/session";

/**
 * Where receiving one returned Pulse stands (OBT-687). The record is read **before** anything is
 * sent — its version is what the file is applied against, and its region is how the write scope
 * is checked — and the coordinator sees the answers (P8) before the one call that files and
 * applies. *Applied* and *conflict* are ends: the first lands in the record, the second leaves the
 * answer archived and waiting in the inbox, where the part A apply takes over.
 */
export type ReceiveStep =
  | { kind: "choose" }
  | { kind: "reading" }
  | { kind: "refused"; refusal: PulseFileRefusal }
  | { kind: "unread"; failure: ApiFailure }
  | { kind: "outside" }
  | { kind: "preview"; file: PulseFile; project: Project; version: string }
  | { kind: "failed"; failure: ApiFailure; file: PulseFile; project: Project; version: string }
  | { kind: "imageMismatch" }
  | { kind: "conflict"; conflict: RecordConflict }
  | { kind: "applied"; submission: ReceivedSubmission };

export interface ReceivePorts {
  readFile: (html: string) => Promise<PulseFileReading>;
  readRecord: (projectId: string) => Promise<LoadedRecord>;
  writes: (project: Project) => boolean;
  uploadImage: (projectId: string, image: Blob) => Promise<PulseImageUploadResult>;
  fileSubmission: (block: string, version: string) => Promise<SubmissionApplyResult>;
}

/** The file read, then its project's record: a file refused or a project out of reach sends nothing. */
export async function prepareReceive(
  html: string,
  ports: Pick<ReceivePorts, "readFile" | "readRecord" | "writes">,
): Promise<ReceiveStep> {
  const reading = await ports.readFile(html);
  if (!reading.ok) return { kind: "refused", refusal: reading.refusal };
  const { file } = reading;
  let record: LoadedRecord;
  try {
    record = await ports.readRecord(file.projectId);
  } catch (thrown) {
    return { kind: "unread", failure: toApiFailure(thrown) };
  }
  if (!ports.writes(record.project)) return { kind: "outside" };
  return { kind: "preview", file, project: record.project, version: record.version };
}

/**
 * The photo first, then the envelope that names it and is applied (`desenho.md` §8). A photo the
 * server stored under another hash is not the one the envelope names, so nothing more is sent.
 * Sending again after a failure is safe: the same bytes answer the same photo row, and the same
 * block the same submission (P7).
 */
export async function sendReceive(
  step: Extract<ReceiveStep, { kind: "preview" | "failed" }>,
  ports: Pick<ReceivePorts, "uploadImage" | "fileSubmission">,
): Promise<ReceiveStep> {
  const { file, project, version } = step;
  if (file.image) {
    const uploaded = await ports.uploadImage(file.projectId, file.image.blob);
    if (!uploaded.ok) return { kind: "failed", failure: uploaded.failure, file, project, version };
    if (uploaded.stored.sha256 !== file.image.sha256) return { kind: "imageMismatch" };
  }
  const filed = await ports.fileSubmission(file.block, version);
  if (filed.ok) return { kind: "applied", submission: filed.submission };
  if (filed.reason === "conflict") return { kind: "conflict", conflict: filed.conflict };
  return { kind: "failed", failure: filed.failure, file, project, version };
}
