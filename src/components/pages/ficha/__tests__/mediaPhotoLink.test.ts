import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { canWithdrawMediaAuthorization } from "../../../../utils/access";
import {
  FIRST_LINK,
  asksForPhotoBytes,
  linkRefreshDelayMs,
  nextPhotoLink,
  type PhotoLinkEvent,
  type PhotoLinkState,
} from "../../../../utils/mediaLink";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("o link da foto é pedido na hora e re-pedido antes de expirar (OBT-582 · OBT-674)", () => {
  it("um minuto antes dos 15 do servidor, e nunca em menos de meio minuto", () => {
    expect(linkRefreshDelayMs(15)).toBe(14 * 60_000);
    expect(linkRefreshDelayMs(1)).toBe(30_000);
    expect(linkRefreshDelayMs(0)).toBe(30_000);
  });

  /** The body of a function, from its signature to the next top-level declaration. */
  const block = (text: string, signature: string) => {
    const start = text.indexOf(signature);
    expect(start, signature).toBeGreaterThan(-1);
    const rest = text.slice(start + signature.length);
    const end = rest.search(/\n(?:export |function |const |async | {2}async )/u);
    return rest.slice(0, end < 0 ? undefined : end);
  };

  const FORBIDDEN = [
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "caches.",
    "console.",
    "zustand",
    "useProjectRecordStore",
    "persist",
    "overlay.set",
    "store(",
    "useFormsStore",
  ];

  it("a URL vive só no estado do PhotoByLink: nem store, nem storage, nem cache, nem log", () => {
    const component = source("src/components/common/PhotoByLink.tsx");
    expect(component).toContain("useState<string | null>(null)");
    for (const forbidden of FORBIDDEN) {
      expect(component, forbidden).not.toContain(forbidden);
    }
  });

  it("e nem a chamada da API nem o dublê guardam uma cópia: devolvem e esquecem", () => {
    const pieces = {
      "projectRecordAPI.mediaLink": block(source("src/services/api/projectRecord.ts"), "async mediaLink("),
      "fixture mediaLink": block(source("src/fixtures/projectRecord.ts"), "export function mediaLink("),
      "fixture mediaLinkFor": block(source("src/fixtures/reader.ts"), "export function mediaLinkFor("),
      "formsAPI.pendingImageLink": block(source("src/services/api/endpoints.ts"), "async pendingImageLink("),
      "fixture pendingImageLink": block(source("src/fixtures/forms.ts"), "export async function pendingImageLink("),
      "fixture pendingImageFor": block(source("src/fixtures/forms.ts"), "function pendingImageFor("),
    };
    for (const [name, body] of Object.entries(pieces)) {
      expect(body.length, name).toBeGreaterThan(40);
      for (const forbidden of FORBIDDEN) {
        expect(body, `${name} · ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it("o MediaPhotoImage só endereça: nenhum estado, nenhum efeito — o ciclo é do PhotoByLink (OBT-674)", () => {
    const adapter = source("src/components/pages/ficha/tabs/midia/MediaPhotoImage.tsx");
    expect(adapter).toContain("<PhotoByLink");
    expect(adapter).not.toMatch(/use(State|Effect|EffectEvent|Ref)\b/u);
  });

  it("uma recusa não vira frase: o componente não traduz nada nem lê o erro", () => {
    const component = source("src/components/common/PhotoByLink.tsx");
    expect(component).not.toContain("useTranslation");
    expect(component).not.toMatch(/catch\(\(?\w+\)?\s*=>/u);
    expect(component).toContain(".catch(() =>");
  });

  it("a ficha nunca carrega a URL: o tipo do link não é campo do registro", () => {
    const types = source("src/types/project.ts");
    const photo = types.slice(types.indexOf("export interface MediaPhoto"));
    expect(photo.slice(0, photo.indexOf("}"))).not.toMatch(/\burl\b/u);
  });

  it("a caixa de entrada só passa o pedido adiante: nem lê a URL, nem a guarda (OBT-674)", () => {
    for (const path of [
      "src/components/pages/formularios/SubmissionAnswers.tsx",
      "src/components/pages/formularios/ReceivedArchive.tsx",
    ]) {
      const inbox = source(path);
      expect(inbox, path).not.toMatch(/\.url\b|useState<string/u);
      for (const forbidden of FORBIDDEN) {
        expect(inbox, `${path} · ${forbidden}`).not.toContain(forbidden);
      }
    }
    expect(source("src/components/pages/formularios/SubmissionAnswers.tsx")).toContain(
      "ask={() => pendingImageLink(detail.id)}",
    );
  });

  it("em todo o src, o link pendente só é pedido pela API, pelo dublê e pelo PhotoByLink da caixa (OBT-674)", () => {
    const shipped = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) return entry === "__tests__" ? [] : shipped(path);
        return /\.tsx?$/u.test(entry) ? [relative(process.cwd(), path)] : [];
      });
    const corpus = shipped(join(process.cwd(), "src"));
    expect(corpus).toContain("src/components/pages/formularios/SubmissionAnswers.tsx");
    expect(corpus.some((path) => path.includes("__tests__"))).toBe(false);
    const callers = corpus.filter((path) => source(path).includes("pendingImageLink(")).sort();
    expect(callers).toEqual([
      "src/components/pages/formularios/SubmissionAnswers.tsx",
      "src/components/pages/formularios/index.tsx",
      "src/fixtures/forms.ts",
      "src/fixtures/index.ts",
      "src/services/api/endpoints.ts",
    ]);
    expect(source("src/components/pages/formularios/index.tsx")).toContain(
      "pendingImageLink={(id) => formsAPI.pendingImageLink(id)}",
    );
  });

  it("o detalhe da submissão nunca carrega a URL: pendingImage é um bit (OBT-674)", () => {
    const types = source("src/types/forms.ts");
    const detail = types.slice(types.indexOf("export interface ReceivedSubmissionDetail"));
    const body = detail.slice(0, detail.indexOf("\n}"));
    expect(body).toContain("pendingImage?: boolean;");
    expect(body.replace(/\/\*\*[\s\S]*?\*\//gu, "")).not.toMatch(/\burl\b/u);
  });

  it("só o coordenador retira — como o CoordinatorUser da rota", () => {
    expect(canWithdrawMediaAuthorization(["coordinator"], undefined, "asia")).toBe(true);
    expect(canWithdrawMediaAuthorization(["admin"], undefined, "asia")).toBe(false);
    expect(canWithdrawMediaAuthorization(["obtLab"], undefined, "asia")).toBe(false);
    expect(canWithdrawMediaAuthorization(["resourceCircle"], undefined, "asia")).toBe(false);
  });
});

describe("uma imagem que falha ganha UM link novo, e só um (OBT-582)", () => {
  /** Drives the machine and counts the link requests the component's effect would make. */
  function drive(events: PhotoLinkEvent[]): { requests: number; state: PhotoLinkState } {
    let state = FIRST_LINK;
    let requests = 1; // the first request, when the photo is shown
    for (const event of events) {
      const next = nextPhotoLink(state, event);
      if (!next.givenUp && next.attempt !== state.attempt) requests += 1;
      state = next;
    }
    return { requests, state };
  }

  it("falha sempre: exatamente dois pedidos de link no total, e o slot fica vazio", () => {
    const { requests, state } = drive(["imageFailed", "imageFailed", "imageFailed", "imageFailed"]);
    expect(requests).toBe(2);
    expect(state.givenUp).toBe(true);
  });

  it("falha uma vez e depois carrega: dois pedidos, e a foto fica", () => {
    const { requests, state } = drive(["imageFailed", "imageLoaded"]);
    expect(requests).toBe(2);
    expect(state.givenUp).toBe(false);
    expect(state.imageRetries).toBe(0);
  });

  it("o re-pedido por tempo não gasta a tentativa da falha", () => {
    const { requests, state } = drive(["imageLoaded", "expiring", "imageFailed", "imageLoaded", "expiring"]);
    expect(requests).toBe(4);
    expect(state.givenUp).toBe(false);
  });

  it("desistido, nada mais é pedido — nem por tempo", () => {
    const { requests } = drive(["imageFailed", "imageFailed", "expiring", "expiring"]);
    expect(requests).toBe(2);
  });
});

describe("quem a tela deixa pedir os bytes (OBT-582, decisão b)", () => {
  const photo = {
    id: "item-1",
    image: null,
    caption: "",
    authorization: { granted: true, by: "", at: "2026-10-01" },
  };
  const project = (sensitiveCountry: boolean, readAs: "coordination" | "trusted" | "other") => ({
    id: "p1",
    sensitiveCountry,
    readAs,
  });

  it("em sensível, só a coordenação; OBT Lab (other) e Resource Circle (trusted) não", () => {
    expect(asksForPhotoBytes(project(true, "coordination"), photo)).toBe(true);
    expect(asksForPhotoBytes(project(true, "other"), photo)).toBe(false);
    expect(asksForPhotoBytes(project(true, "trusted"), photo)).toBe(false);
  });

  it("fora de sensível, qualquer leitor pede; foto não autorizada, ninguém", () => {
    expect(asksForPhotoBytes(project(false, "other"), photo)).toBe(true);
    expect(asksForPhotoBytes(project(false, "trusted"), photo)).toBe(true);
    expect(
      asksForPhotoBytes(project(false, "coordination"), { ...photo, authorization: null }),
    ).toBe(false);
  });
});
