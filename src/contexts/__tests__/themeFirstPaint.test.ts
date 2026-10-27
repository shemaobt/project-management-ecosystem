import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const html = read("index.html");
const headEnd = html.indexOf("</head>");

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((match) => ({
  attrs: match[1],
  body: match[2],
  at: match.index,
}));
const inlineInHead = scripts.filter((script) => script.at < headEnd && !/\bsrc\s*=/i.test(script.attrs));
const boot = inlineInHead[0];

const DARK_QUERY = "(prefers-color-scheme: dark)";

const stored = new Map<string, string>();
let systemDark = false;

function classListOf(classes: Set<string>) {
  return {
    add: (name: string) => void classes.add(name),
    toggle: (name: string, on: boolean) => void (on ? classes.add(name) : classes.delete(name)),
  };
}

function storageReading(reads: string[]) {
  return new Proxy(
    {},
    {
      get(_, property) {
        if (property !== "getItem") {
          reads.push(`<${String(property)}>`);
          return undefined;
        }
        return (key: string) => {
          reads.push(key);
          return stored.get(key) ?? null;
        };
      },
    },
  );
}

const matchMedia = (query: string) => ({ matches: systemDark && query === DARK_QUERY });

const contextReads: string[] = [];
const contextClasses = new Set<string>();
vi.stubGlobal("localStorage", storageReading(contextReads));
vi.stubGlobal("window", { matchMedia });
vi.stubGlobal("document", { documentElement: { classList: classListOf(contextClasses) } });

const { applyStoredTheme } = await import("../ThemeContext");

function viaContext() {
  contextReads.length = 0;
  contextClasses.clear();
  applyStoredTheme();
  return { dark: contextClasses.has("dark"), reads: [...contextReads] };
}

function viaIndexHtml(storage: "readable" | "blocked" = "readable") {
  const reads: string[] = [];
  const classes = new Set<string>();
  const sandbox: Record<string, unknown> = {
    matchMedia,
    document: { documentElement: { classList: classListOf(classes) } },
  };
  if (storage === "readable") sandbox.localStorage = storageReading(reads);
  else
    Object.defineProperty(sandbox, "localStorage", {
      get() {
        throw new Error("SecurityError: o armazenamento está bloqueado");
      },
    });
  runInNewContext(boot.body, sandbox);
  return { dark: classes.has("dark"), reads };
}

const themeKey = (() => {
  stored.clear();
  return viaContext().reads[0];
})();

describe("o index.html aplica o tema guardado antes do módulo (OBT-651)", () => {
  beforeEach(() => {
    stored.clear();
    systemDark = false;
  });

  it("o <head> traz um script clássico, em linha e síncrono — ele roda enquanto o documento é lido, antes de qualquer módulo e da primeira pintura", () => {
    expect(inlineInHead).toHaveLength(1);
    expect(boot.attrs).not.toMatch(/\b(src|async|defer)\b|\btype\s*=\s*["']?module/i);

    const entry = html.search(/<script\b[^>]*\btype\s*=\s*["']module["']/i);
    expect(entry).toBeGreaterThan(boot.at);
  });

  it("com o tema escuro guardado, o <html> já sai com a classe dark; claro, nada guardado ou valor estranho deixam o claro", () => {
    stored.set("shema-theme-v1", "dark");
    expect(viaIndexHtml().dark).toBe(true);

    for (const value of ["light", "", "auto"]) {
      stored.set("shema-theme-v1", value);
      expect(viaIndexHtml().dark).toBe(false);
    }
    stored.clear();
    systemDark = true;
    expect(viaIndexHtml().dark).toBe(false);
  });

  it("lê só a chave do tema — a mesma que o ThemeContext lê — e nada mais do armazenamento", () => {
    expect(themeKey).toBe("shema-theme-v1");
    stored.set(themeKey, "dark");
    expect(viaIndexHtml().reads).toEqual([themeKey]);
  });

  it("concorda com applyStoredTheme em todo valor guardado, com o sistema claro e escuro", () => {
    for (const value of [null, "light", "dark", "system", "", "Dark", "auto"]) {
      for (const system of [false, true]) {
        stored.clear();
        if (value !== null) stored.set(themeKey, value);
        systemDark = system;
        expect(viaIndexHtml().dark, `guardado ${value}, sistema escuro ${system}`).toBe(viaContext().dark);
      }
    }
  });

  it("sem acesso ao armazenamento, não derruba a página e fica no claro", () => {
    systemDark = true;
    expect(() => viaIndexHtml("blocked")).not.toThrow();
    expect(viaIndexHtml("blocked").dark).toBe(false);
  });

  it("a classe que ele põe é a que o index.css usa para pintar html e body de escuro", () => {
    const css = read("src/index.css");
    expect(css).toMatch(/\.dark\s*\{[^}]*--bg:/);
    expect(css).toMatch(/html,\s*body\s*\{[^}]*background:\s*var\(--bg\)/);
  });

  it("nenhuma CSP do deploy o barra: nem o nginx.conf nem o index.html declaram uma", () => {
    const hash = `'sha256-${createHash("sha256").update(boot.body).digest("base64")}'`;
    const why = `uma CSP no deploy barra o script do tema em linha, a menos que a script-src admita ${hash}`;
    expect(read("nginx.conf"), why).not.toMatch(/Content-Security-Policy/i);
    expect(html, why).not.toMatch(/Content-Security-Policy/i);
  });
});
