import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const written: string[] = [];

function spyStorage() {
  return {
    getItem: () => null,
    setItem: (key: string, value: string) => {
      written.push(`${key}=${value}`);
    },
    removeItem: (key: string) => {
      written.push(`remove ${key}`);
    },
    clear: () => {
      written.push("clear");
    },
    key: () => null,
    length: 0,
  };
}

vi.stubGlobal("localStorage", spyStorage());
vi.stubGlobal("sessionStorage", spyStorage());
vi.stubGlobal("window", {
  localStorage: spyStorage(),
  sessionStorage: spyStorage(),
});

const {
  accessToken,
  forgetTokens,
  hasSession,
  onSessionEvent,
  refreshToken,
  replaceAccessToken,
  setTokens,
} = await import("../tokens");

const API_DIR = join(process.cwd(), "src", "services", "api");

const WEB_STORAGE = [
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "document.cookie",
];

function apiSources(): string[] {
  return readdirSync(API_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name);
}

beforeEach(() => {
  written.length = 0;
  forgetTokens("signedOut");
});

describe("onde o token vive", () => {
  it("um ciclo inteiro de sessão não escreve nada em web storage", () => {
    setTokens({ accessToken: "access-1", refreshToken: "refresh-1" });
    expect(accessToken()).toBe("access-1");
    expect(refreshToken()).toBe("refresh-1");
    replaceAccessToken("access-2");
    expect(accessToken()).toBe("access-2");
    forgetTokens("expired");
    expect(written).toEqual([]);
  });

  it("esquecer é esquecer: nada sobra para uma chamada seguinte achar", () => {
    setTokens({ accessToken: "access-1", refreshToken: "refresh-1" });
    forgetTokens("signedOut");
    expect(accessToken()).toBeNull();
    expect(refreshToken()).toBeNull();
    expect(hasSession()).toBe(false);
  });

  it("nenhum arquivo da camada de API menciona web storage", () => {
    const files = apiSources();
    expect(files).toContain("tokens.ts");
    expect(files).toContain("client.ts");
    expect(files.length).toBeGreaterThan(5);

    const offenders = files.flatMap((name) => {
      const text = readFileSync(join(API_DIR, name), "utf8");
      return WEB_STORAGE.filter((api) => text.includes(api)).map(
        (api) => `${name} mentions ${api}`,
      );
    });
    expect(offenders).toEqual([]);
  });

  it("substituir o access token não inventa sessão onde não havia", () => {
    replaceAccessToken("access-1");
    expect(accessToken()).toBeNull();
    expect(hasSession()).toBe(false);
  });
});

describe("quem escuta a sessão", () => {
  it("recebe entrada, saída e expiração, nessa ordem", () => {
    const seen: string[] = [];
    const stop = onSessionEvent((event) => seen.push(event));

    setTokens({ accessToken: "a", refreshToken: "r" });
    forgetTokens("expired");
    setTokens({ accessToken: "a", refreshToken: "r" });
    forgetTokens("signedOut");

    expect(seen).toEqual(["signedIn", "expired", "signedIn", "signedOut"]);
    stop();
  });

  it("esquecer sem sessão não anuncia expiração que nunca houve", () => {
    const seen: string[] = [];
    const stop = onSessionEvent((event) => seen.push(event));
    forgetTokens("expired");
    expect(seen).toEqual([]);
    stop();
  });

  it("parar de escutar para de receber", () => {
    const seen: string[] = [];
    onSessionEvent((event) => seen.push(event))();
    setTokens({ accessToken: "a", refreshToken: "r" });
    expect(seen).toEqual([]);
  });
});
