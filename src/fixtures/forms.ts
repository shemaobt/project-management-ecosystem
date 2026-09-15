import { toLocalIsoDate } from "../utils/format";
import { failure } from "../services/api/errors";
import type {
  IntakeAnswers,
  IntakeField,
  IntakeForm,
  IntakeLink,
  IntakeLinkCreated,
  IntakeLinkCreatePayload,
  IntakeLinkStatus,
  IntakeSubmissionPayload,
  ReceivedSubmission,
} from "../types/forms";
import { loadProject } from "./projects";

const received: ReceivedSubmission[] = [];

export function loadReceivedSubmissions(): ReceivedSubmission[] {
  return structuredClone(received);
}

// --- the leader link, simulated for local dev with no shema-api running ------------
//
// Mirrors BE-12's own shape and its own refusal sentences (app/services/shema/
// _intake_tokens.py, _form_validation.py) so the console's failure handling — which
// tells "expired" from "revoked" from "not one this server issued" apart by reading the
// detail text — behaves identically against fixtures and against the real API.

const PULSE_DEFINITION_VERSION = 1;

const PULSE_FIELDS: readonly IntakeField[] = [
  {
    key: "submittedBy",
    type: "text",
    required: true,
    labelKey: "forms_q_submitted_by",
    maxLength: 200,
    options: [],
  },
  {
    key: "period",
    type: "period",
    required: true,
    labelKey: "forms_q_period",
    maxLength: null,
    options: [],
  },
  {
    key: "voice",
    type: "longText",
    required: false,
    labelKey: "forms_q_voice",
    maxLength: 4000,
    options: [],
  },
  {
    key: "bookProgress",
    type: "progressRows",
    required: false,
    labelKey: "forms_q_chapters",
    maxLength: null,
    options: [],
  },
  {
    key: "blockers",
    type: "longText",
    required: false,
    labelKey: "forms_q_blockers",
    maxLength: 4000,
    options: [],
  },
  {
    key: "prayerRequest",
    type: "longText",
    required: false,
    labelKey: "forms_q_prayer",
    maxLength: 4000,
    options: [],
  },
  {
    key: "prayerVisibility",
    type: "choice",
    required: false,
    labelKey: "forms_q_prayer_visibility",
    maxLength: null,
    options: ["coordenacao", "rede"],
  },
];

const DEFAULT_LINK_DAYS = 45;
const MAX_LINK_DAYS = 90;

interface StoredLink {
  id: string;
  projectId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
  revokedAt: string | null;
}

let links: StoredLink[] = [];
let linkSeq = 0;

function randomToken(): string {
  const bytes =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint8Array(24))
      : Array.from({ length: 24 }, () => Math.floor(Math.random() * 256));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusOf(link: StoredLink, today: string): IntakeLinkStatus {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt < today) return "expired";
  if (link.usedAt) return "used";
  return "pending";
}

function asLink(link: StoredLink): IntakeLink {
  return {
    id: link.id,
    projectId: link.projectId,
    definitionVersion: PULSE_DEFINITION_VERSION,
    expiresAt: link.expiresAt,
    status: statusOf(link, toLocalIsoDate()),
    createdAt: link.createdAt,
    usedAt: link.usedAt,
    revokedAt: link.revokedAt,
  };
}

export async function mintIntakeLink(
  payload: IntakeLinkCreatePayload,
): Promise<IntakeLinkCreated> {
  const project = loadProject(payload.projectId);
  if (!project) {
    throw failure("notFound", "This project cannot be reached.");
  }

  const today = toLocalIsoDate();
  const requested = payload.expiresAt ?? addDays(today, DEFAULT_LINK_DAYS);
  if (requested < today) {
    throw failure("invalid", `expiresAt: ${requested} has already passed`);
  }
  if (requested > addDays(today, MAX_LINK_DAYS)) {
    throw failure(
      "invalid",
      `expiresAt: ${requested} is more than ${MAX_LINK_DAYS} days out, and a leader link may not live that long`,
    );
  }

  const link: StoredLink = {
    id: `link-${(linkSeq += 1)}`,
    projectId: project.id,
    token: randomToken(),
    expiresAt: requested,
    createdAt: today,
    usedAt: null,
    revokedAt: null,
  };
  links = [...links, link];

  return {
    ...asLink(link),
    token: link.token,
    // The same dev fallback BE-12's own intake_url uses when no app_url is seeded.
    url: `http://localhost:5173/intake/${link.token}`,
  };
}

export async function listIntakeLinks(
  projectId?: string,
): Promise<IntakeLink[]> {
  return links
    .filter((link) => !projectId || link.projectId === projectId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(asLink);
}

export async function revokeIntakeLink(linkId: string): Promise<IntakeLink> {
  const link = links.find((entry) => entry.id === linkId);
  if (!link) {
    throw failure("notFound", "This link cannot be reached.");
  }
  if (!link.revokedAt) link.revokedAt = toLocalIsoDate();
  return asLink(link);
}

function findLiveLink(token: string): StoredLink {
  const link = links.find((entry) => entry.token === token);
  if (!link) {
    throw failure("notFound", "This link is not one this server issued.");
  }
  const status = statusOf(link, toLocalIsoDate());
  if (status === "revoked") {
    throw failure(
      "notFound",
      "This link has been revoked. Ask your coordinator for a new one.",
    );
  }
  if (status === "expired") {
    throw failure(
      "notFound",
      "This link has expired. Ask your coordinator for a new one.",
    );
  }
  return link;
}

export async function readIntakeForm(token: string): Promise<IntakeForm> {
  const link = findLiveLink(token);
  const project = loadProject(link.projectId);
  if (!project) {
    throw failure("notFound", "The project this link was issued for no longer exists.");
  }
  return {
    kind: "pulso",
    definitionVersion: PULSE_DEFINITION_VERSION,
    languageName: project.languageName,
    expiresAt: link.expiresAt,
    fields: PULSE_FIELDS,
  };
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isEmptyAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function validate(answers: IntakeAnswers): void {
  const faults: string[] = [];
  const spec = new Map(PULSE_FIELDS.map((field) => [field.key, field]));

  for (const key of Object.keys(answers).sort()) {
    if (!spec.has(key)) faults.push(`${key}: this form has no such field`);
  }

  for (const field of PULSE_FIELDS) {
    const value = answers[field.key];
    if (isEmptyAnswer(value)) {
      if (field.required) faults.push(`${field.key}: required`);
      continue;
    }
    if (field.type === "period" && !PERIOD_PATTERN.test(String(value))) {
      faults.push(`${field.key}: ${JSON.stringify(value)} is not a YYYY-MM month`);
    }
    if (
      (field.type === "text" || field.type === "longText") &&
      field.maxLength &&
      String(value).length > field.maxLength
    ) {
      faults.push(
        `${field.key}: ${String(value).length} characters, and the field holds ${field.maxLength}`,
      );
    }
    if (field.type === "choice" && !field.options.includes(String(value))) {
      faults.push(`${field.key}: ${JSON.stringify(value)} is not one of ${field.options.join(", ")}`);
    }
  }

  if (faults.length > 0) {
    throw failure(
      "invalid",
      `pulso v${PULSE_DEFINITION_VERSION}: the submission does not match the form, so none of it was kept — ${faults.sort().join("; ")}`,
    );
  }
}

export async function submitIntake(
  token: string,
  payload: IntakeSubmissionPayload,
): Promise<void> {
  const link = findLiveLink(token);
  if (payload.definitionVersion !== PULSE_DEFINITION_VERSION) {
    throw failure(
      "invalid",
      `definitionVersion: this link answers version ${PULSE_DEFINITION_VERSION} of the pulso form, not ${payload.definitionVersion}. Reload the form.`,
    );
  }
  validate(payload.answers);

  const project = loadProject(link.projectId);
  received.push({
    id: `submission-${received.length + 1}`,
    kind: "pulso",
    projectId: link.projectId,
    languageName: project?.languageName ?? "",
    submittedBy: String(payload.answers.submittedBy ?? ""),
    receivedAt: toLocalIsoDate(),
    definitionVersion: PULSE_DEFINITION_VERSION,
    appliedAt: null,
  });
  if (!link.usedAt) link.usedAt = toLocalIsoDate();
}
