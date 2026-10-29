import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHROME, launchChrome, serveProbe } from "../../../../__tests__/headlessChrome";

/**
 * The Projetos screen reads the list through its own browses, so the header's *Recarregar*
 * reaches the saved views only if those browses ask again (OBT-663). Proven on the real page,
 * in a real browser: effects are what re-ask, and this suite has no other way to run them.
 */
const PT = JSON.parse(
  readFileSync(join(process.cwd(), "src/i18n/locales/pt-BR.json"), "utf8"),
) as Record<string, string>;

const DEPENDENCIES = Object.keys(
  (
    JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    }
  ).dependencies,
);

const BASE = "Base da sonda";
const VIEW = "Sonda";

const PROBE_MODULE = `
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import i18n from "/src/i18n/index.ts";
import { Toaster } from "/src/components/ui/index.ts";
import { AuthProvider } from "/src/contexts/AuthContext.tsx";
import { ProjetosPage } from "/src/components/pages/projetos/ProjetosPage.tsx";
import { useProjectsStore } from "/src/stores/projectsStore.ts";
import { useSavedViewsStore } from "/src/stores/savedViewsStore.ts";
import { usePrefsStore } from "/src/stores/prefsStore.ts";
import { EMPTY_FILTERS, useFiltersStore } from "/src/stores/filtersStore.ts";
import { MOCK_SESSION_KEY, MOCK_SESSION_PERSONAS } from "/src/fixtures/session.ts";
import { loadProjects } from "/src/fixtures/projects.ts";
import { patchRecord, readRecord } from "/src/fixtures/projectRecord.ts";
import { projectBrowseAPI } from "/src/services/api/index.ts";
import { getProjectStatus } from "/src/utils/progress.ts";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

const heard = [];
const counted = new WeakSet();
setInterval(() => {
  for (const node of document.querySelectorAll("[data-sonner-toast]")) {
    const text = node.innerText.trim();
    if (counted.has(node) || !text) continue;
    counted.add(node);
    heard.push(text);
  }
}, 10);

const project = loadProjects().find(
  (candidate) => getProjectStatus(candidate) === "em-andamento" && !candidate.sensitiveCountry,
);
const rebase = (team) => {
  const { version } = readRecord(project.id);
  const saved = patchRecord(project.id, { team }, version);
  if (!saved.ok) throw new Error("a dupla recusou a base: " + JSON.stringify(saved));
};
const row = () =>
  document.querySelector('button[aria-label="${PT.sb_view_apply.replace("{{name}}", VIEW)}"]');
const showing = () =>
  [...document.querySelectorAll("span.sr-only")]
    .map((node) => node.textContent)
    .find((text) => text.startsWith("${PT.sb_results_count} "));

window.probe = {
  async until(check, what) {
    const deadline = Date.now() + 30000;
    while (!check()) {
      if (Date.now() > deadline) throw new Error("nunca aconteceu: " + what);
      await pause(20);
    }
  },
  async mount() {
    await i18n.changeLanguage("pt");
    localStorage.setItem(MOCK_SESSION_KEY, "admin");
    usePrefsStore.getState().setMetaphor("diario");
    rebase(${JSON.stringify(BASE)});
    useSavedViewsStore.getState().saveView(MOCK_SESSION_PERSONAS.admin.id, ${JSON.stringify(VIEW)}, {
      filters: { ...EMPTY_FILTERS, team: ${JSON.stringify(BASE)}, status: "em-andamento" },
      search: "",
      sort: usePrefsStore.getState().sort,
      metaphor: "diario",
    });
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    root.render(
      h(MemoryRouter, { initialEntries: ["/projetos"] },
        h(AuthProvider, null, h(ProjetosPage), h(Toaster, { label: "Avisos" }))),
    );
    await this.until(() => row() && showing(), "a página e a visão salva");
  },
  rowText() {
    return row().closest("div.flex.flex-col").innerText;
  },
  async baseLeavesTheServer() {
    rebase(${JSON.stringify(BASE + ", mudada")});
    await pause(600);
  },
  async reload() {
    return useProjectsStore.getState().reload();
  },
  async untilRowWarns() {
    await this.until(() => this.rowText().includes(${JSON.stringify(PT.sb_view_stale_hint.replace("{{filters}}", PT.sb_team))}), "o aviso na linha");
  },
  async open() {
    row().click();
    await this.until(() => heard.length > 0, "o aviso ao abrir");
    const { matched } = await projectBrowseAPI.browse({
      filters: { ...EMPTY_FILTERS, status: "em-andamento" },
      search: "",
      sort: usePrefsStore.getState().sort,
      limit: 1,
      offset: 0,
    });
    await this.until(() => showing().startsWith("${PT.sb_results_count} " + matched + " "), "o resto aplicado");
    const { team, status } = useFiltersStore.getState().filters;
    return { heard: [...heard], team, status, showing: showing(), matched };
  },
};
`;

interface Opened {
  heard: string[];
  team: string | null;
  status: string;
  showing: string;
  matched: number;
}

describe.skipIf(!CHROME)("o Recarregar reavalia as visões salvas da tela de Projetos (Chrome headless, OBT-663)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const call = <T>(expression: string) => browser!.evaluate<T>(`window.probe.${expression}`);

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "recarregar-"));
    server = await serveProbe({
      scratch,
      module: PROBE_MODULE,
      include: [
        ...DEPENDENCIES,
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom/client",
        "zustand/middleware",
      ],
      define: { "import.meta.env.VITE_DATA_SOURCE": JSON.stringify("fixtures") },
    });
    browser = await launchChrome(CHROME!, scratch);
    await browser.open(server.resolvedUrls!.local[0]);
    await call("mount()");
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  it("depois do Recarregar, a visão salva cuja base sumiu avisa na linha e, aberta, avisa e aplica o resto", async () => {
    const stale = PT.sb_view_stale_hint.replace("{{filters}}", PT.sb_team);
    expect(await call<string>("rowText()")).not.toContain(stale);

    await call("baseLeavesTheServer()");
    expect(await call<string>("rowText()")).not.toContain(stale);

    expect(await call<boolean>("reload()")).toBe(true);
    await call("untilRowWarns()");

    const opened = await call<Opened>("open()");
    expect(opened.heard).toContain(PT.sb_view_partial.replace("{{filters}}", PT.sb_team));
    expect(opened.team).toBeNull();
    expect(opened.status).toBe("em-andamento");
    expect(opened.matched).toBeGreaterThan(0);
  }, 120_000);
});
