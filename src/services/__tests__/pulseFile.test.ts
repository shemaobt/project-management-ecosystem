import { describe, expect, it } from "vitest";
import { readPulseBlocks } from "../pulseFile";
import { returnedPulse, scriptJson, sha256Hex } from "./pulseFileFixture";

const PHOTO = { type: "image/webp", bytes: new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4, 87, 69, 66, 80]) };

describe("o leitor do Pulso devolvido (OBT-687, desenho §6 e §8)", () => {
  it("lê o envelope e devolve o bloco tal como está no arquivo, byte a byte", async () => {
    const file = returnedPulse({ answers: { voice: "Um mês bom." } });
    const reading = await readPulseBlocks(file.blocks);

    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.file.block).toBe(file.envelope);
    expect(file.html).toContain(`>${reading.file.block}</script>`);
    expect(reading.file.projectId).toBe("kadiweu");
    expect(reading.file.definitionVersion).toBe(3);
    expect(reading.file.answers.voice).toBe("Um mês bom.");
    expect(reading.file.image).toBeNull();
  });

  it("um nome hostil atravessa sem virar tag, e o bloco não é reserializado (D10)", async () => {
    const hostile = "Fresia </script> <b>x</b> <img src=x onerror=alert(1)>";
    const file = returnedPulse({ answers: { submittedBy: hostile } });
    const reading = await readPulseBlocks(file.blocks);

    expect(file.html.match(/<\/script>/gu)).toHaveLength(4);
    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.file.answers.submittedBy).toBe(hostile);
    expect(reading.file.block).toContain("\\u003c/script>");
    expect(reading.file.block).not.toBe(JSON.stringify(JSON.parse(reading.file.block)));
  });

  it("um formulário nunca salvo — o bloco ainda é o null em que nasceu — é recusado como vazio", async () => {
    expect(await readPulseBlocks(returnedPulse({ envelope: "null" }).blocks)).toEqual({
      ok: false,
      refusal: "empty",
    });
  });

  it("um formato que este console não conhece é recusado, e um sem versão também", async () => {
    for (const format of ["2", "", null]) {
      expect(await readPulseBlocks(returnedPulse({ format }).blocks)).toEqual({
        ok: false,
        refusal: "unknownFormat",
      });
    }
  });

  it("um arquivo sem o bloco de respostas não é um Pulso", async () => {
    expect(await readPulseBlocks({ block: null, format: null, media: null })).toEqual({
      ok: false,
      refusal: "notPulse",
    });
  });

  it("um bloco que não é o envelope é ilegível", async () => {
    for (const envelope of [
      "{",
      "[]",
      "3",
      scriptJson({ definitionVersion: 3, answers: {} }),
      scriptJson({ projectId: "", definitionVersion: 3, answers: {} }),
      scriptJson({ projectId: "kadiweu", definitionVersion: "3", answers: {} }),
      scriptJson({ projectId: "kadiweu", definitionVersion: 3, answers: [] }),
    ]) {
      expect(await readPulseBlocks(returnedPulse({ envelope }).blocks)).toEqual({
        ok: false,
        refusal: "unreadable",
      });
    }
  });

  it("a foto sai do bloco de mídia pelo nome sha256:, com os bytes que dão esse hash", async () => {
    const file = returnedPulse({ image: PHOTO });
    const reading = await readPulseBlocks(file.blocks);

    expect(reading.ok).toBe(true);
    if (!reading.ok || !reading.file.image) throw new Error("sem foto");
    expect(reading.file.image.reference).toBe(file.reference);
    expect(reading.file.image.sha256).toBe(sha256Hex(PHOTO.bytes));
    expect(reading.file.image.blob.type).toBe("image/webp");
    expect(new Uint8Array(await reading.file.image.blob.arrayBuffer())).toEqual(PHOTO.bytes);
  });

  it("uma foto citada e ausente, de outro tipo, ou cujos bytes não dão o nome, recusa o arquivo inteiro", async () => {
    const named = returnedPulse({ image: PHOTO });
    const reference = named.reference!;
    const cases = [
      returnedPulse({ image: PHOTO, mediaOverride: {} }),
      returnedPulse({ image: { ...PHOTO, type: "image/svg+xml" } }),
      returnedPulse({
        image: PHOTO,
        mediaOverride: { [reference]: { type: "image/webp", b64: Buffer.from([9, 9, 9]).toString("base64") } },
      }),
      returnedPulse({ answers: { image: "4f1c-upload-id" } }),
      returnedPulse({ image: PHOTO, mediaOverride: { [reference]: { type: "image/webp", b64: "%%%" } } }),
    ];
    for (const file of cases) {
      expect(await readPulseBlocks(file.blocks)).toEqual({ ok: false, refusal: "image" });
    }
  });
});
