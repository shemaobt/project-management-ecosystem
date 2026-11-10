import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPulseBlocks, type PulseFile } from "../../../../services/pulseFile";
import { returnedPulse } from "../../../../services/__tests__/pulseFileFixture";
import type { ReceivedSubmission, SubmissionApplyResult } from "../../../../types/forms";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { default: i18n } = await import("../../../../i18n");
const { createEmptyProject } = await import("../../../../fixtures/blank");
const { failure } = await import("../../../../services/api");
const { readConflict } = await import("../../../../services/api/projectRecord");
const { conflictSentence } = await import("../../ficha/saveReport");
const { prepareReceive, sendReceive } = await import("../receivePulse");
const { ReceiveUpdateDialogBody } = await import("../ReceiveUpdateBody");

type Project = ReturnType<typeof createEmptyProject>;
type Step = Awaited<ReturnType<typeof prepareReceive>>;

const PROJECT: Project = { ...createEmptyProject("kadiweu"), languageName: "Kadiwéu", location: "Brazil" };
const PHOTO = { type: "image/png", bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) };

const FILED: ReceivedSubmission = {
  id: "s9",
  kind: "pulso",
  projectId: "kadiweu",
  languageName: "Kadiwéu",
  languageNameWithheld: false,
  submittedBy: "Fresia",
  receivedAt: "2026-11-10",
  definitionVersion: 3,
  appliedAt: "2026-11-10",
};

const CONFLICT = readConflict({
  detail: "This record was saved by somebody else.",
  code: "CONFLICT",
  expectedVersion: 7,
  currentVersion: 9,
  changedFields: ["bookProgress"],
  changedBy: "Sofia",
  changedAt: "2026-11-10T13:02:00+00:00",
});

const readFile = (html: string) => readPulseBlocks(JSON.parse(html) as Parameters<typeof readPulseBlocks>[0]);
const asHtml = (pulse: ReturnType<typeof returnedPulse>) => JSON.stringify(pulse.blocks);

async function fileOf(pulse = returnedPulse()): Promise<PulseFile> {
  const reading = await readPulseBlocks(pulse.blocks);
  if (!reading.ok) throw new Error(reading.refusal);
  return reading.file;
}

function ports(answer: SubmissionApplyResult = { ok: true, submission: FILED }, sha?: string) {
  const calls: string[] = [];
  return {
    calls,
    uploadImage: async (projectId: string, image: Blob) => {
      calls.push(`image:${projectId}:${image.type}`);
      return { ok: true as const, stored: { id: "img1", sha256: sha ?? "" } };
    },
    fileSubmission: async (block: string, version: string) => {
      calls.push(`envelope:${version}:${block}`);
      return answer;
    },
  };
}

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("receber: o arquivo e a ficha são lidos antes de qualquer envio (OBT-687)", () => {
  const record = { project: PROJECT, version: '"7"' };

  it("um arquivo bom, de um projeto em que se grava, vira a prévia com a versão lida", async () => {
    const step = await prepareReceive(asHtml(returnedPulse()), {
      readFile,
      readRecord: async () => record,
      writes: () => true,
    });
    expect(step).toMatchObject({ kind: "preview", project: PROJECT, version: '"7"' });
  });

  it("um arquivo recusado não lê a ficha", async () => {
    const readRecord = vi.fn(async () => record);
    const step = await prepareReceive(asHtml(returnedPulse({ envelope: "null" })), {
      readFile,
      readRecord,
      writes: () => true,
    });
    expect(step).toEqual({ kind: "refused", refusal: "empty" });
    expect(readRecord).not.toHaveBeenCalled();
  });

  it("uma ficha que não se lê, ou de fora do alcance de escrita, não manda nada", async () => {
    const unread = await prepareReceive(asHtml(returnedPulse()), {
      readFile,
      readRecord: () => Promise.reject(new Error("offline")),
      writes: () => true,
    });
    expect(unread.kind).toBe("unread");

    const outside = await prepareReceive(asHtml(returnedPulse()), {
      readFile,
      readRecord: async () => record,
      writes: () => false,
    });
    expect(outside).toEqual({ kind: "outside" });
  });
});

describe("receber: a foto antes, depois o envelope que já aplica (desenho §8)", () => {
  it("com foto, sobe a foto e só então manda o bloco, cru, com a versão lida", async () => {
    const pulse = returnedPulse({ image: PHOTO });
    const file = await fileOf(pulse);
    const port = ports(undefined, file.image!.sha256);
    const step = await sendReceive({ kind: "preview", file, project: PROJECT, version: '"7"' }, port);

    expect(port.calls).toEqual(["image:kadiweu:image/png", `envelope:"7":${pulse.envelope}`]);
    expect(step).toEqual({ kind: "applied", submission: FILED });
  });

  it("sem foto, só o envelope", async () => {
    const port = ports();
    await sendReceive({ kind: "preview", file: await fileOf(), project: PROJECT, version: '"7"' }, port);
    expect(port.calls).toHaveLength(1);
    expect(port.calls[0]).toMatch(/^envelope:/u);
  });

  it("uma foto que o servidor guardou com outro hash não leva o envelope", async () => {
    const port = ports(undefined, "0".repeat(64));
    const file = await fileOf(returnedPulse({ image: PHOTO }));
    const step = await sendReceive({ kind: "preview", file, project: PROJECT, version: '"7"' }, port);

    expect(step).toEqual({ kind: "imageMismatch" });
    expect(port.calls).toEqual(["image:kadiweu:image/png"]);
  });

  it("uma foto recusada pela porta é a falha dela, e o envelope não vai", async () => {
    const file = await fileOf(returnedPulse({ image: PHOTO }));
    const refused = failure("invalid", "The image is larger than 10 MiB.");
    const port = {
      ...ports(),
      uploadImage: async () => ({ ok: false as const, failure: refused }),
    };
    const step = await sendReceive({ kind: "preview", file, project: PROJECT, version: '"7"' }, port);

    expect(step).toMatchObject({ kind: "failed", failure: refused, version: '"7"' });
    expect(port.calls).toEqual([]);
  });

  it("o 409 é o conflito da ficha, e a resposta fica na caixa", async () => {
    const port = ports({ ok: false, reason: "conflict", conflict: CONFLICT, version: '"9"' });
    const step = await sendReceive(
      { kind: "preview", file: await fileOf(), project: PROJECT, version: '"7"' },
      port,
    );
    expect(step).toEqual({ kind: "conflict", conflict: CONFLICT });
  });
});

describe("o que a tela diz em cada passo", () => {
  const render = (step: Step) =>
    renderToStaticMarkup(createElement(ReceiveUpdateDialogBody, { step, receives: "receives" }));

  it("a prévia mostra projeto, mês, quem respondeu, progresso, pedido com visibilidade e a autorização da foto", async () => {
    const file = await fileOf(
      returnedPulse({
        image: PHOTO,
        answers: {
          bookProgress: [{ name: "Marcos", translated: 4 }],
          prayerRequest: "Pela saúde do Kuaray.",
          prayerVisibility: "rede",
          imageDescription: "A equipe na aldeia.",
          imageAuthorized: true,
        },
      }),
    );
    const markup = render({ kind: "preview", file, project: PROJECT, version: '"7"' });

    expect(markup).toContain(i18n.t("receive_preview_lead"));
    expect(markup).toContain("Kadiwéu");
    expect(markup).toContain("Novembro 2026");
    expect(markup).toContain("Fresia");
    expect(markup).toContain(i18n.t("forms_submission_rows", { count: 1 }));
    expect(markup).toContain("Pela saúde do Kuaray.");
    expect(markup).toContain(i18n.t("prayer_vis_network"));
    expect(markup).toContain(i18n.t("prayer_vis_network_no_recall"));
    expect(markup).toContain("A equipe na aldeia.");
    expect(markup).toContain(i18n.t("receive_preview_image_authorized"));
  });

  it("um pedido sem visibilidade é da coordenação, e uma foto sem a caixa marcada não está autorizada", async () => {
    const file = await fileOf(
      returnedPulse({ image: PHOTO, answers: { prayerRequest: "Pelas famílias." } }),
    );
    const markup = render({ kind: "preview", file, project: PROJECT, version: '"7"' });

    expect(markup).toContain(i18n.t("prayer_vis_coordination"));
    expect(markup).not.toContain(i18n.t("prayer_vis_network_no_recall"));
    expect(markup).toContain(i18n.t("receive_preview_image_not_authorized"));
  });

  it("o que vem do líder é texto, nunca marcação", async () => {
    const file = await fileOf(returnedPulse({ answers: { voice: "<b>bom</b><script>x()</script>" } }));
    const markup = render({ kind: "preview", file, project: PROJECT, version: '"7"' });

    expect(markup).toContain("&lt;b&gt;bom&lt;/b&gt;&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });

  it("o conflito diz quem mudou o quê, com a frase da ficha, e que a resposta ficou na caixa", () => {
    const markup = render({ kind: "conflict", conflict: CONFLICT });

    expect(markup).toContain(i18n.t("receive_conflict_title"));
    expect(markup).toContain(conflictSentence(CONFLICT, i18n.t).replace(/"/gu, "&quot;"));
    expect(markup).toContain("Sofia");
    expect(markup).toContain(i18n.t("receive_conflict_kept"));
  });

  it("uma falha diz a frase do servidor, e a prévia continua à vista", async () => {
    const file = await fileOf();
    const markup = render({
      kind: "failed",
      failure: failure("invalid", "pulso v3: the submission does not match the record"),
      file,
      project: PROJECT,
      version: '"7"',
    });
    expect(markup).toContain("pulso v3: the submission does not match the record");
    expect(markup).toContain(i18n.t("receive_failed"));
    expect(markup).toContain("Fresia");
  });

  it("cada recusa do arquivo tem a sua frase", () => {
    for (const [refusal, key] of [
      ["notPulse", "receive_refused_not_pulse"],
      ["unknownFormat", "receive_refused_format"],
      ["empty", "receive_refused_empty"],
      ["unreadable", "receive_refused_unreadable"],
      ["image", "receive_refused_image"],
    ] as const) {
      expect(render({ kind: "refused", refusal })).toContain(i18n.t(key));
    }
  });
});
