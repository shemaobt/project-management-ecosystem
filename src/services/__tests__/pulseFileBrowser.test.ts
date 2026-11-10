import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { APP_DEPENDENCIES, CHROME, launchChrome, serveProbe } from "../../__tests__/headlessChrome";
import { returnedPulse } from "./pulseFileFixture";

const PROBE_MODULE = `
import { readPulseFile } from "/src/services/pulseFile.ts";

window.probe = {
  async read(html) {
    const reading = await readPulseFile(html);
    await new Promise((done) => setTimeout(done, 300));
    return {
      ok: reading.ok,
      refusal: reading.ok ? null : reading.refusal,
      block: reading.ok ? reading.file.block : null,
      submittedBy: reading.ok ? reading.file.answers.submittedBy : null,
      imageType: reading.ok && reading.file.image ? reading.file.image.blob.type : null,
      ran: window.__shemaRan === true,
    };
  },
};
`;

interface Reading {
  ok: boolean;
  refusal: string | null;
  block: string | null;
  submittedBy: unknown;
  imageType: string | null;
  ran: boolean;
}

const HOSTILE = "Fresia </script><script>window.__shemaRan = true</script> <b>x</b>";
const PHOTO = { type: "image/jpeg", bytes: new Uint8Array([255, 216, 255, 224, 0, 16]) };

describe.skipIf(!CHROME)("o arquivo devolvido lido por um DOMParser de verdade (OBT-687)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const seen: Record<string, Reading> = {};
  const files = {
    hostile: returnedPulse({ answers: { submittedBy: HOSTILE }, image: PHOTO }),
    never: returnedPulse({ envelope: "null" }),
    other: { html: "<!doctype html><p>Uma carta, não um Pulso.</p><script>window.__shemaRan = true</script>" },
  };

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "pulso-devolvido-"));
    server = await serveProbe({ scratch, module: PROBE_MODULE, include: APP_DEPENDENCIES });
    browser = await launchChrome(CHROME!, scratch);
    await browser.open(server.resolvedUrls!.local[0]);
    for (const [name, file] of Object.entries(files)) {
      seen[name] = await browser.evaluate<Reading>(`window.probe.read(${JSON.stringify(file.html)})`);
    }
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  it("nada do arquivo roda: nem o script do formulário, nem um onerror, nem o que veio numa resposta", () => {
    for (const name of Object.keys(files)) expect(seen[name].ran).toBe(false);
  });

  it("o bloco sai do DOM igual ao que está no arquivo, e o nome hostil volta como texto", () => {
    expect(seen.hostile.ok).toBe(true);
    expect(seen.hostile.block).toBe(files.hostile.envelope);
    expect(seen.hostile.submittedBy).toBe(HOSTILE);
    expect(seen.hostile.imageType).toBe("image/jpeg");
  });

  it("o formulário nunca salvo e o arquivo que não é Pulso são recusados com a razão de cada um", () => {
    expect(seen.never).toMatchObject({ ok: false, refusal: "empty" });
    expect(seen.other).toMatchObject({ ok: false, refusal: "notPulse" });
  });
});
