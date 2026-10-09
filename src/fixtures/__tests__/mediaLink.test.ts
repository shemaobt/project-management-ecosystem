import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockRole } from "../../contexts/session";
import type { MediaPhoto, Project } from "../../types/project";
import { createEmptyProject } from "../blank";
import {
  createRecord,
  mediaLink,
  readRecord,
  resetRecordOverlay,
  withdrawMediaAuthorization,
} from "../projectRecord";
import { MOCK_SESSION_KEY } from "../session";

const stored = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
});

beforeEach(() => resetRecordOverlay());
afterEach(() => stored.clear());

const as = (role: MockRole) => stored.set(MOCK_SESSION_KEY, role);

const photo = (granted: boolean | null): MediaPhoto => ({
  image: { src: "data:image/webp;base64,AAAA", fileName: "vale.webp" },
  caption: "A equipe no vale",
  authorization: granted === null ? null : { granted, by: "Fresia", at: "2026-10-01" },
});

/** A record in Peru — south-america, the mock coordinator's region — holding one photo. */
function seed(sensitiveCountry: boolean, granted: boolean | null = true): { id: string; itemId: string } {
  as("admin");
  const project: Project = {
    ...createEmptyProject(`p-${sensitiveCountry}-${String(granted)}`),
    languageName: "Sintético",
    location: "Peru, Vila Sintética",
    sensitiveCountry,
    mediaPhotos: [photo(granted)],
  };
  const result = createRecord(project);
  if (!result.ok) throw new Error("seed refused");
  const itemId = readRecord(project.id).project.mediaPhotos![0].id!;
  return { id: project.id, itemId };
}

const refusal = (run: () => unknown) => {
  try {
    run();
  } catch (thrown) {
    return thrown as { status: number; detail: string | null };
  }
  throw new Error("expected a refusal");
};

describe("o dublê do link da foto espelha media_download_url (OBT-581/582)", () => {
  it("toda foto salva ganha um id, como a linha de mídia do servidor", () => {
    const { itemId } = seed(false);
    expect(itemId).toMatch(/[0-9a-f-]{36}/);
  });

  it("a coordenação recebe o link, com validade de 15 minutos", () => {
    const { id, itemId } = seed(true);
    for (const role of ["admin", "coordinator"] as const) {
      as(role);
      expect(mediaLink(id, itemId), role).toEqual({
        url: "data:image/webp;base64,AAAA",
        expiresInMinutes: 15,
      });
    }
  });

  it("em projeto sensível, OBT Lab e Resource Circle recebem 403 — e a mesma frase", () => {
    const { id, itemId } = seed(true);
    as("obtLab");
    const lab = refusal(() => mediaLink(id, itemId));
    as("resourceCircle");
    const circle = refusal(() => mediaLink(id, itemId));
    expect(lab.status).toBe(403);
    expect(circle.status).toBe(403);
    expect(lab.detail).toBe(circle.detail);
  });

  it("e a ficha deles chega sem os bytes, mas com o id e a decisão", () => {
    const { id } = seed(true);
    for (const role of ["obtLab", "resourceCircle"] as const) {
      as(role);
      const read = readRecord(id).project.mediaPhotos![0];
      expect(read.image, role).toBeNull();
      expect(read.id, role).toBeTruthy();
      expect(read.authorization?.granted, role).toBe(true);
    }
  });

  it("fora de sensível, OBT Lab e Resource Circle veem a foto autorizada", () => {
    const { id, itemId } = seed(false);
    for (const role of ["obtLab", "resourceCircle"] as const) {
      as(role);
      expect(mediaLink(id, itemId).url, role).toBe("data:image/webp;base64,AAAA");
    }
  });

  it("foto recusada ou indecisa dá 403 até para a coordenação, com a mesma frase", () => {
    const refused = seed(false, false);
    const undecided = seed(false, null);
    as("admin");
    const a = refusal(() => mediaLink(refused.id, refused.itemId));
    const b = refusal(() => mediaLink(undecided.id, undecided.itemId));
    expect([a.status, b.status]).toEqual([403, 403]);
    expect(a.detail).toBe(b.detail);
  });

  it("um id que não existe é 404", () => {
    const { id } = seed(false);
    as("admin");
    expect(refusal(() => mediaLink(id, "nao-existe")).status).toBe(404);
  });
});

describe("a retirada pelo id (OBT-582)", () => {
  it("o coordenador retira, a decisão vira recusa e a foto deixa de ter link", () => {
    const { id, itemId } = seed(false);
    as("coordinator");
    expect(mediaLink(id, itemId).url).toBeTruthy();
    const decision = withdrawMediaAuthorization(id, itemId);
    expect(decision.granted).toBe(false);
    expect(readRecord(id).project.mediaPhotos![0].authorization?.granted).toBe(false);
    expect(refusal(() => mediaLink(id, itemId)).status).toBe(403);
  });

  it("quem não é coordenador recebe 403, e nada muda", () => {
    const { id, itemId } = seed(false);
    for (const role of ["obtLab", "resourceCircle"] as const) {
      as(role);
      expect(refusal(() => withdrawMediaAuthorization(id, itemId)).status, role).toBe(403);
    }
    as("admin");
    expect(readRecord(id).project.mediaPhotos![0].authorization?.granted).toBe(true);
  });
});
