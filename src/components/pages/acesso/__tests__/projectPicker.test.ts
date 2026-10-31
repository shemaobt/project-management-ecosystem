import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { APP_DEPENDENCIES, CHROME, launchChrome, serveProbe } from "../../../../__tests__/headlessChrome";

const PT = JSON.parse(
  readFileSync(join(process.cwd(), "src/i18n/locales/pt-BR.json"), "utf8"),
) as Record<string, string>;

const card = (id: string, languageName: string) => ({
  id,
  languageName,
  languageCode: "",
  bridgeLanguage: "",
  vitalityStatus: "",
  location: "Malawi",
  location2: null,
  speakerCount: "",
  coords: [34, -13],
  translationType: [],
  financialResources: [],
  team: "",
  teamLeader: "",
  mentor: "",
  partnerOrg: "",
  objective: [],
  scopeDetails: "",
  totalUnits: 0,
  totalUnitsType: "",
  translatedUnits: 0,
  communityCheckedUnits: 0,
  approvedUnits: 0,
  startDate: null,
  deadline: null,
  locationWithheld: false,
  readAs: "coordination",
  statusComments: "",
  statusGoal: "",
  orgRole: "",
  healthEmotional: null,
  healthRelational: null,
  healthSpiritual: null,
  healthPhysical: null,
  healthAssessmentDate: null,
  healthAssessor: "",
  healthNotes: "",
  needs: [],
  needsNotes: "",
  notes: "",
  inEten: false,
  lastUpdated: null,
  derived: null,
});

const served = [card("chichewa", "Chichewa")];
let reads = 0;
let holding = false;
const held: ServerResponse[] = [];

const answer = (response: ServerResponse) => {
  response.setHeader("content-type", "application/json");
  response.end(
    JSON.stringify({
      items: served,
      counts: { groups: {}, presets: {}, groupAll: {} },
      matched: served.length,
      total: served.length,
      locationsWithheld: null,
    }),
  );
};

const PROBE_MODULE = `
import { createElement as h, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import i18n from "/src/i18n/index.ts";
import { MembershipSection } from "/src/components/pages/acesso/MembershipSection.tsx";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const person = {
  userId: "u-alvo", email: "alvo@exemplo.org", displayName: "Pessoa Alvo", isActive: true,
  apps: [], regions: [], regionScope: [],
};

let nextCard = () => undefined;
function Card() {
  const [search, setSearch] = useState(0);
  nextCard = () => setSearch((count) => count + 1);
  return h(MembershipSection, { key: search, person });
}

const trigger = () => document.querySelector('button[role="combobox"]');

window.probe = {
  async until(check, what, ms = 5000) {
    const deadline = Date.now() + ms;
    while (!check()) {
      if (Date.now() > deadline) throw new Error("nunca aconteceu: " + what);
      await pause(20);
    }
  },
  async mount() {
    await i18n.changeLanguage("pt");
    createRoot(document.body.appendChild(document.createElement("div"))).render(h(StrictMode, null, h(Card)));
    await this.until(() => trigger(), "o seletor");
  },
  options() {
    return [...document.querySelectorAll('[role="option"]')].map((node) => node.textContent.trim());
  },
  async open() {
    trigger().click();
    await this.until(() => document.querySelector('[role="listbox"]'), "a lista aberta");
  },
  async close() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await this.until(() => !document.querySelector('[role="listbox"]'), "a lista fechar");
  },
  async waitOption(name) {
    await this.until(() => this.options().includes(name), "a opção " + name);
    return this.options();
  },
  async newCard() {
    nextCard();
    await this.until(() => trigger(), "o seletor do cartão novo");
  },
};
`;

describe.skipIf(!CHROME)("o seletor de projetos de /acesso traz um projeto criado depois da última leitura — num navegador de verdade (OBT-680)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const call = <T>(expression: string) => browser!.evaluate<T>(`window.probe.${expression}`);
  const readsReach = async (count: number) => {
    const deadline = Date.now() + 5000;
    while (reads < count) {
      if (Date.now() > deadline) throw new Error(`o servidor recebeu ${reads} leituras, esperava ${count}`);
      await new Promise((done) => setTimeout(done, 20));
    }
  };
  const seen: {
    openCard?: string[];
    newCardReads?: number;
    newCard?: string[];
    whileHeld?: string[];
    afterHeld?: string[];
  } = {};

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "acesso-picker-"));
    server = await serveProbe({
      scratch,
      module: PROBE_MODULE,
      include: APP_DEPENDENCIES,
      define: {
        "import.meta.env.VITE_DATA_SOURCE": JSON.stringify("api"),
        "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api"),
      },
      middleware: (request, response, next) => {
        const path = (request.url ?? "").split("?")[0];
        if (!path.startsWith("/api/")) return next();
        if (request.method === "GET" && path === "/api/shema/projects") {
          reads += 1;
          if (holding) held.push(response);
          else answer(response);
          return;
        }
        if (request.method === "GET" && /^\/api\/shema\/projects\/[^/]+\/members$/u.test(path)) {
          response.setHeader("content-type", "application/json");
          response.end("[]");
          return;
        }
        response.statusCode = 404;
        response.end();
      },
    });
    browser = await launchChrome(CHROME!, scratch);
    await browser.open(server.resolvedUrls!.local[0]);
    await call("mount()");
    await readsReach(1);

    served.push(card("bari", "Bari"));
    await call("open()");
    seen.openCard = await call<string[]>(`waitOption("Bari")`);
    await call("close()");

    served.push(card("lingala", "Lingala"));
    const before = reads;
    await call("newCard()");
    await readsReach(before + 1);
    seen.newCardReads = reads - before;
    await call("open()");
    seen.newCard = await call<string[]>(`waitOption("Lingala")`);
    await call("close()");

    served.push(card("tikuna", "Tikuna"));
    holding = true;
    const asked = reads;
    await call("open()");
    await readsReach(asked + 1);
    seen.whileHeld = await call<string[]>("options()");
    holding = false;
    held.splice(0).forEach(answer);
    seen.afterHeld = await call<string[]>(`waitOption("Tikuna")`);
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  it("com o cartão aberto, abrir o seletor traz o projeto criado depois da última leitura", () => {
    expect(seen.openCard).toEqual(["Bari", "Chichewa"]);
  });

  it("um cartão novo — outra busca — pede a lista ao aparecer, e o projeto criado depois está no seletor", () => {
    expect(seen.newCardReads).toBeGreaterThanOrEqual(1);
    expect(seen.newCard).toEqual(["Bari", "Chichewa", "Lingala"]);
  });

  it("enquanto a releitura não responde, o seletor aberto mostra as opções que já tinha", () => {
    expect(seen.whileHeld).toEqual(["Bari", "Chichewa", "Lingala"]);
    expect(seen.whileHeld).not.toContain(PT.loading);
    expect(seen.afterHeld).toEqual(["Bari", "Chichewa", "Lingala", "Tikuna"]);
  });
});
