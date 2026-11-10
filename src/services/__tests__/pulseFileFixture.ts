import { createHash } from "node:crypto";
import type { PulseFileBlocks } from "../pulseFile";

/** What `scriptJson` in `docs/pulso-offline/teste-aparelho.html` writes: JSON with every `<` as `<`. */
export const scriptJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</gu, "\\u003c");

export const sha256Hex = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

export interface ReturnedPulseOptions {
  answers?: Record<string, unknown>;
  projectId?: string;
  image?: { type: string; bytes: Uint8Array };
  /** Overrides the answers block as written — `null` for a form never saved. */
  envelope?: string;
  format?: string | null;
  mediaOverride?: Record<string, unknown>;
}

export interface ReturnedPulse {
  html: string;
  blocks: PulseFileBlocks;
  envelope: string;
  reference: string | null;
}

/**
 * A returned file shaped as the prototype's `buildReturn` writes it (`teste-aparelho.html`): the
 * three JSON blocks in the head, the form's own script in the body. The body also carries a script
 * that would mark the window and an image whose error would — a reader that ran either would show.
 */
export function returnedPulse(options: ReturnedPulseOptions = {}): ReturnedPulse {
  const answers: Record<string, unknown> = {
    submittedBy: "Fresia",
    period: "2026-11",
    ...options.answers,
  };
  const media: Record<string, unknown> = {};
  let reference: string | null = null;
  if (options.image) {
    reference = `sha256:${sha256Hex(options.image.bytes)}`;
    media[reference] = {
      type: options.image.type,
      b64: Buffer.from(options.image.bytes).toString("base64"),
    };
    answers.image = reference;
  }
  const envelope =
    options.envelope ??
    scriptJson({ projectId: options.projectId ?? "kadiweu", definitionVersion: 3, answers });
  const mediaText = scriptJson(options.mediaOverride ?? media);
  const format = options.format === undefined ? "1" : options.format;
  const formatAttribute = format === null ? "" : ` data-format-version="${format}"`;

  const html =
    '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n' +
    "<title>Pulso Mensal · Kadiwéu · 2026-11</title>\n" +
    '<script type="application/json" id="shema-pulso-def">{"projectId":"kadiweu","definitionVersion":3}</script>\n' +
    `<script type="application/json" id="shema-pulso"${formatAttribute} data-saved-at="2026-11-10T14:45:48.803Z">${envelope}</script>\n` +
    `<script type="application/json" id="shema-pulso-media">${mediaText}</script>\n` +
    '</head>\n<body>\n<main id="root"><p>Abra este arquivo com o Chrome.</p></main>\n' +
    '<img src="x:" onerror="window.__shemaRan = true">\n' +
    '<script id="shema-app">window.__shemaRan = true;</script>\n</body>\n</html>\n';

  return { html, blocks: { block: envelope, format, media: mediaText }, envelope, reference };
}
