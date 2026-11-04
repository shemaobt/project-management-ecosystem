import { afterEach, describe, expect, it, vi } from "vitest";
import type { MockRole } from "../../contexts/session";
import { formsAPI } from "..";
import { MOCK_SESSION_KEY } from "../session";

const stored = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
});

afterEach(() => stored.clear());

const as = (role: MockRole) => stored.set(MOCK_SESSION_KEY, role);

/** An open project in Africa — the OBT Lab persona's region. */
const OPEN = "afrikaans-kaaps";
/** The fixtures' sensitive project in Africa. */
const WITHHELD = "sa-di-of-high-egypt";

const webp = () => new Blob([new Uint8Array([82, 73, 70, 70])], { type: "image/webp" });

/** A Pulse received through a leader link, with or without its image and the leader's box. */
async function pulse(
  projectId: string,
  image: "authorized" | "unchecked" | "none",
): Promise<string> {
  as("admin");
  const link = await formsAPI.mintIntakeLink({ projectId });
  const answers: Record<string, unknown> = { submittedBy: "Fresia", period: "2026-10" };
  if (image !== "none") {
    const upload = await formsAPI.uploadIntakeImage(link.token, webp(), "vale.webp");
    answers.image = upload.id;
    answers.imageAuthorized = image === "authorized";
  }
  await formsAPI.submitIntake(link.token, { definitionVersion: 1, answers });
  const rows = await formsAPI.received();
  return rows[rows.length - 1].id;
}

const refusal = async (submissionId: string) => {
  try {
    await formsAPI.pendingImageLink(submissionId);
  } catch (thrown) {
    return thrown as { kind: string; status: number | null; detail: string | null };
  }
  throw new Error("expected a refusal");
};

describe("o dublê da imagem pendente espelha pending_image_download_url (OBT-585/674)", () => {
  it("projeto aberto, caixa marcada: o detalhe diz que serve e o link vale 15 minutos, para quem lê", async () => {
    const id = await pulse(OPEN, "authorized");
    for (const role of ["admin", "obtLab"] as const) {
      as(role);
      expect((await formsAPI.readSubmission(id)).pendingImage, role).toBe(true);
      expect(await formsAPI.pendingImageLink(id), role).toEqual({
        url: "data:image/webp;base64,UklGRg==",
        expiresInMinutes: 15,
      });
    }
  });

  it("caixa desmarcada: nenhum leitor recebe — nem a coordenação — e o detalhe diz falso", async () => {
    const id = await pulse(OPEN, "unchecked");
    as("admin");
    expect((await formsAPI.readSubmission(id)).pendingImage).toBe(false);
    expect(await refusal(id)).toMatchObject({ kind: "forbidden", status: 403 });
  });

  it("Pulso sem imagem: 404, e o detalhe diz falso", async () => {
    const id = await pulse(OPEN, "none");
    as("admin");
    expect((await formsAPI.readSubmission(id)).pendingImage).toBe(false);
    expect(await refusal(id)).toMatchObject({ kind: "notFound", status: 404 });
  });

  it("projeto retido: só a coordenação recebe; OBT Lab e Resource Circle ouvem a mesma frase", async () => {
    const id = await pulse(WITHHELD, "authorized");
    as("admin");
    expect((await formsAPI.readSubmission(id)).pendingImage).toBe(true);
    const sentences = new Set<string | null>();
    for (const role of ["obtLab", "resourceCircle"] as const) {
      as(role);
      expect((await formsAPI.readSubmission(id)).pendingImage, role).toBe(false);
      const refused = await refusal(id);
      expect(refused, role).toMatchObject({ kind: "forbidden", status: 403 });
      sentences.add(refused.detail);
    }
    expect(sentences.size).toBe(1);
  });

  it("o leitor é perguntado antes do objeto: em retido, um Pulso sem foto também é 403, não 404", async () => {
    const id = await pulse(WITHHELD, "none");
    as("resourceCircle");
    expect(await refusal(id)).toMatchObject({ kind: "forbidden", status: 403 });
    as("admin");
    expect(await refusal(id)).toMatchObject({ kind: "notFound", status: 404 });
  });

  it("uma submissão que não existe é 404", async () => {
    as("admin");
    expect(await refusal("submission-nao-existe")).toMatchObject({ kind: "notFound" });
  });
});
