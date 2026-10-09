import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canWithdrawMediaAuthorization } from "../../../../utils/access";
import { linkRefreshDelayMs } from "../../../../utils/mediaLink";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("o link da foto é pedido na hora e re-pedido antes de expirar (OBT-582)", () => {
  it("um minuto antes dos 15 do servidor, e nunca em menos de meio minuto", () => {
    expect(linkRefreshDelayMs(15)).toBe(14 * 60_000);
    expect(linkRefreshDelayMs(1)).toBe(30_000);
    expect(linkRefreshDelayMs(0)).toBe(30_000);
  });

  it("a URL vive só no estado do componente: nem store, nem storage, nem cache, nem log", () => {
    const component = source("src/components/pages/ficha/tabs/midia/MediaPhotoImage.tsx");
    expect(component).toContain("useState<string | null>(null)");
    for (const forbidden of [
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "caches.",
      "console.",
      "zustand",
      "useProjectRecordStore",
      "persist",
    ]) {
      expect(component, forbidden).not.toContain(forbidden);
    }
  });

  it("uma recusa não vira frase: o componente não traduz nada nem lê o erro", () => {
    const component = source("src/components/pages/ficha/tabs/midia/MediaPhotoImage.tsx");
    expect(component).not.toContain("useTranslation");
    expect(component).not.toMatch(/catch\(\(?\w+\)?\s*=>/u);
    expect(component).toContain(".catch(() =>");
  });

  it("a ficha nunca carrega a URL: o tipo do link não é campo do registro", () => {
    const types = source("src/types/project.ts");
    const photo = types.slice(types.indexOf("export interface MediaPhoto"));
    expect(photo.slice(0, photo.indexOf("}"))).not.toMatch(/\burl\b/u);
  });

  it("só o coordenador retira — como o CoordinatorUser da rota", () => {
    expect(canWithdrawMediaAuthorization(["coordinator"])).toBe(true);
    expect(canWithdrawMediaAuthorization(["admin"])).toBe(false);
    expect(canWithdrawMediaAuthorization(["obtLab"])).toBe(false);
    expect(canWithdrawMediaAuthorization(["resourceCircle"])).toBe(false);
  });
});
