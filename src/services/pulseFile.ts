import type { IntakeAnswers } from "../types/forms";
import { INTAKE_IMAGE_MAX_BYTES, isIntakeImageFile } from "./mediaStorage";

/**
 * The one reader of a Pulse that came back as a file (OBT-687; `docs/pulso-offline/desenho.md`
 * §6 and §8). The file is the leader's own document, so it is parsed with `DOMParser` as
 * `text/html` — which runs no script — and never enters a page or an iframe. Three blocks are
 * read by id: the answers (`shema-pulso`), their file format (`data-format-version` on the same
 * tag) and the media (`shema-pulso-media`). Everything that knows the file's shape is here, so a
 * new format costs this module and nothing else.
 */

/** The file shapes this reader knows. A file of any other is refused, never guessed at. */
export const PULSE_FILE_FORMATS: readonly string[] = ["1"];

const ANSWERS_ID = "shema-pulso";
const MEDIA_ID = "shema-pulso-media";
const FORMAT_ATTRIBUTE = "data-format-version";
const IMAGE_REFERENCE = /^sha256:([0-9a-f]{64})$/u;

/**
 * Why a file was not taken. `notPulse`: no answers block at all. `unknownFormat`: a block of a
 * shape this console does not know. `empty`: the form was never saved — the block is still the
 * `null` it was generated with. `unreadable`: the block is not the envelope. `image`: the answers
 * name a photo the file does not carry whole — absent, of a type the server refuses, over the
 * ceiling, or whose bytes do not hash to the name.
 */
export type PulseFileRefusal = "notPulse" | "unknownFormat" | "empty" | "unreadable" | "image";

/**
 * The photo the answers name, as the file carries it: the `sha256:` name, the bytes it hashes to,
 * and the file's own base64 of them — what the preview draws, so nothing is minted to show it.
 */
export interface PulseFileImage {
  reference: string;
  sha256: string;
  blob: Blob;
  base64: string;
}

/**
 * A file read. `block` is the answers block **verbatim** — the body `POST /forms/submissions`
 * archives byte for byte and hashes for its idempotency (D10), so it is sent as read and never
 * re-serialized. The rest is the same block parsed, for the preview and for the photo.
 */
export interface PulseFile {
  block: string;
  projectId: string;
  definitionVersion: number;
  answers: IntakeAnswers;
  image: PulseFileImage | null;
}

export type PulseFileReading =
  | { ok: true; file: PulseFile }
  | { ok: false; refusal: PulseFileRefusal };

/** The three blocks as the parser left them: text, never markup. `block` is `null` when the tag is absent. */
export interface PulseFileBlocks {
  block: string | null;
  format: string | null;
  media: string | null;
}

export function pulseFileBlocks(document: Document): PulseFileBlocks {
  const answers = document.getElementById(ANSWERS_ID);
  return {
    block: answers?.textContent ?? null,
    format: answers?.getAttribute(FORMAT_ATTRIBUTE) ?? null,
    media: document.getElementById(MEDIA_ID)?.textContent ?? null,
  };
}

export async function readPulseFile(html: string): Promise<PulseFileReading> {
  return readPulseBlocks(pulseFileBlocks(new DOMParser().parseFromString(html, "text/html")));
}

function parsed(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readPulseBlocks({
  block,
  format,
  media,
}: PulseFileBlocks): Promise<PulseFileReading> {
  if (block === null) return { ok: false, refusal: "notPulse" };
  if (format === null || !PULSE_FILE_FORMATS.includes(format)) {
    return { ok: false, refusal: "unknownFormat" };
  }
  const envelope = parsed(block);
  if (envelope === null) return { ok: false, refusal: "empty" };
  if (
    !isRecord(envelope) ||
    typeof envelope.projectId !== "string" ||
    !envelope.projectId ||
    typeof envelope.definitionVersion !== "number" ||
    !isRecord(envelope.answers)
  ) {
    return { ok: false, refusal: "unreadable" };
  }

  const named = envelope.answers.image;
  let image: PulseFileImage | null = null;
  if (named !== undefined && named !== null && named !== "") {
    const found = typeof named === "string" ? await imageOf(named, media) : null;
    if (!found) return { ok: false, refusal: "image" };
    image = found;
  }

  return {
    ok: true,
    file: {
      block,
      projectId: envelope.projectId,
      definitionVersion: envelope.definitionVersion,
      answers: envelope.answers,
      image,
    },
  };
}

async function imageOf(reference: string, media: string | null): Promise<PulseFileImage | null> {
  const sha256 = IMAGE_REFERENCE.exec(reference)?.[1];
  if (!sha256 || media === null) return null;
  const entries = parsed(media);
  const entry = isRecord(entries) ? entries[reference] : undefined;
  if (!isRecord(entry) || typeof entry.type !== "string" || typeof entry.b64 !== "string") {
    return null;
  }
  if (!isIntakeImageFile({ type: entry.type })) return null;
  const bytes = fromBase64(entry.b64);
  if (!bytes || bytes.byteLength > INTAKE_IMAGE_MAX_BYTES) return null;
  if ((await hexDigest(bytes)) !== sha256) return null;
  return { reference, sha256, blob: new Blob([bytes], { type: entry.type }), base64: entry.b64 };
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

async function hexDigest(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
