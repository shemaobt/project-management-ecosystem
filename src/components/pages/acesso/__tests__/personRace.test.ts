import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHROME, launchChrome, serveProbe } from "../../../../__tests__/headlessChrome";

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

const A_EMAIL = "pessoa-a@exemplo.org";
const B_EMAIL = "pessoa-b@exemplo.org";

const PROBE_MODULE = `
import { StrictMode, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import i18n from "/src/i18n/index.ts";
import { Toaster } from "/src/components/ui/index.ts";
import { PersonSection } from "/src/components/pages/acesso/PersonSection.tsx";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

const people = {
  "${A_EMAIL}": {
    userId: "u-a", email: "${A_EMAIL}", displayName: "Pessoa A", isActive: true,
    apps: [], regions: [], regionScope: [],
  },
  "${B_EMAIL}": {
    userId: "u-b", email: "${B_EMAIL}", displayName: "Pessoa B", isActive: true,
    apps: [{ appKey: "shema", roles: ["obtLab"] }],
    regions: [{ regionKey: "europe", grantedBy: null, grantedAt: "2026-10-28T10:00:00Z" }],
    regionScope: ["europe"],
  },
};

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
const never = () => new Promise(() => undefined);
const waiting = { person: new Map(), grant: [] };
const sent = { grant: [], revoke: [] };
let changes = 0;

const api = {
  person(email) {
    const answer = deferred();
    waiting.person.set(email, answer);
    return answer.promise;
  },
  grant(payload) {
    sent.grant.push(payload);
    const answer = deferred();
    waiting.grant.push({ payload, answer });
    return answer.promise;
  },
  revoke(payload) {
    sent.revoke.push(payload);
    return never();
  },
  invite: never, revokeInvite: never, invites: never, changes: never,
  sensitiveCountries: never, saveSensitiveCountries: never, pendingProjects: never,
  confirmProject: never, discardProject: never, describeInvite: never, join: never,
};

let show = () => undefined;
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

function Screen() {
  const [shown, setShown] = useState(true);
  show = setShown;
  return h(
    "div",
    null,
    shown ? h(PersonSection, { api, onChanged: () => (changes += 1), onInvite: () => undefined }) : null,
    h(Toaster, { label: "Avisos" }),
  );
}

const panel = () => document.querySelector("form").nextElementSibling;
const buttonIn = (scope, label) =>
  [...scope.querySelectorAll("button")].find((node) => node.textContent.trim() === label);
const row = (app, label) => {
  const heading = [...document.querySelectorAll("h3")].find((node) => node.textContent === app);
  return [...heading.nextElementSibling.children].find(
    (item) => item.querySelector("span")?.textContent === label,
  );
};

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
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    root.render(h(StrictMode, null, h(Screen)));
    await this.until(() => document.querySelector('input[type="email"]'), "o campo de busca");
  },
  async search(email) {
    const input = document.querySelector('input[type="email"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, email);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await pause(20);
    document.querySelector('form button[type="submit"]').click();
    await this.until(() => waiting.person.has(email), "a busca sair");
  },
  async answerPerson(email) {
    waiting.person.get(email).resolve(structuredClone(people[email]));
    waiting.person.delete(email);
    await this.until(() => document.querySelector("p.text-h4")?.textContent === people[email].displayName, "o cartão de " + email);
  },
  async grantRegional(app, role, region, submit) {
    buttonIn(row(app, role), "${PT.acesso_grant}").click();
    await this.until(() => [...document.querySelectorAll("label")].some((node) => node.textContent === region), "o seletor");
    const label = [...document.querySelectorAll("label")].find((node) => node.textContent === region);
    document.getElementById(label.htmlFor).click();
    await pause(20);
    buttonIn(panel(), submit).click();
    await this.until(() => sent.grant.length > 0, "o POST da concessão");
  },
  async answerGrant() {
    const { payload, answer } = waiting.grant.shift();
    const person = Object.values(people).find((entry) => entry.userId === payload.userId);
    answer.resolve({
      ...structuredClone(person),
      apps: [{ appKey: payload.appKey, roles: [payload.roleKey] }],
      regions: payload.regionKeys.map((regionKey) => ({ regionKey, grantedBy: "u-admin", grantedAt: "2026-10-28T10:01:00Z" })),
      regionScope: payload.regionKeys,
    });
    await pause(150);
  },
  async revoke(app, role, confirm) {
    const asked = buttonIn(row(app, role), confirm);
    if (!asked) return { named: document.querySelector("p.text-h4")?.textContent ?? "", revoked: null };
    asked.click();
    await this.until(() => document.querySelector('[role="dialog"]'), "o diálogo");
    const dialog = document.querySelector('[role="dialog"]');
    const named = dialog.innerText;
    buttonIn(dialog, confirm).click();
    await this.until(() => sent.revoke.length > 0, "o POST da revogação");
    return { named, revoked: sent.revoke[0] };
  },
  async leave() {
    show(false);
    await this.until(() => !document.querySelector('input[type="email"]'), "a seção sair");
  },
  async toasts(count) {
    await this.until(() => heard.length >= count, count + " aviso(s)").catch(() => undefined);
    await pause(100);
    return [...heard];
  },
  read() {
    const card = panel();
    return {
      name: document.querySelector("p.text-h4")?.textContent ?? null,
      field: document.querySelector('input[type="email"]').value,
      saving: card.innerText.includes("${PT.acesso_saving}"),
      disabled: [...card.querySelectorAll("button")].filter((node) => node.disabled).length,
      changes,
    };
  },
};
`;

interface Reading {
  name: string | null;
  field: string;
  saving: boolean;
  disabled: number;
  changes: number;
}

const SHEMA = PT.acesso_app_shema;
const INTERCESSOR = PT.role_resource;
const OBT_LAB = PT.role_obtlab;
const PACIFIC = PT.continent_oceania;

describe.skipIf(!CHROME)("conceder para A, buscar B, a resposta de A chegar — num navegador de verdade (OBT-653)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const seen: {
    whileWriting?: Reading;
    bSearched?: Reading;
    aAnswered?: Reading;
    toastsAfterA?: string[];
    revoke?: { named: string; revoked: { userId: string; roleKey: string } | null };
    toastsAfterLeaving?: string[];
  } = {};

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "acesso-race-"));
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
    const page = browser;
    const call = (expression: string) => page.evaluate(`window.probe.${expression}`);
    const read = () => page.evaluate<Reading>("window.probe.read()");

    await page.open(server.resolvedUrls!.local[0]);
    await call("mount()");
    await call(`search(${JSON.stringify(A_EMAIL)})`);
    await call(`answerPerson(${JSON.stringify(A_EMAIL)})`);
    await call(
      `grantRegional(${JSON.stringify(SHEMA)}, ${JSON.stringify(INTERCESSOR)}, ${JSON.stringify(PACIFIC)}, ${JSON.stringify(PT.acesso_grant_with_regions)})`,
    );
    seen.whileWriting = await read();

    await call(`search(${JSON.stringify(B_EMAIL)})`);
    await call(`answerPerson(${JSON.stringify(B_EMAIL)})`);
    seen.bSearched = await read();

    await call("answerGrant()");
    seen.aAnswered = await read();
    seen.toastsAfterA = await page.evaluate<string[]>("window.probe.toasts(1)");

    seen.revoke = await page.evaluate(
      `window.probe.revoke(${JSON.stringify(SHEMA)}, ${JSON.stringify(OBT_LAB)}, ${JSON.stringify(PT.acesso_revoke)})`,
    );

    await call(`search(${JSON.stringify(A_EMAIL)})`);
    await call(`answerPerson(${JSON.stringify(A_EMAIL)})`);
    await call(
      `grantRegional(${JSON.stringify(SHEMA)}, ${JSON.stringify(INTERCESSOR)}, ${JSON.stringify(PACIFIC)}, ${JSON.stringify(PT.acesso_grant_with_regions)})`,
    );
    await call("leave()");
    await call("answerGrant()");
    seen.toastsAfterLeaving = await page.evaluate<string[]>("window.probe.toasts(2)");
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  const savedA = PT.acesso_change_saved.replace("{{person}}", "Pessoa A");

  it("o teste vê o Gravando… quando ele é de quem está no cartão", () => {
    expect(seen.whileWriting).toMatchObject({ name: "Pessoa A", saving: true });
    expect(seen.whileWriting!.disabled).toBeGreaterThan(0);
  });

  it("buscar B com a gravação de A no ar mostra B sem Gravando… e sem trava", () => {
    expect(seen.bSearched).toMatchObject({ name: "Pessoa B", field: B_EMAIL, saving: false, disabled: 0 });
  });

  it("depois da resposta de A, o cartão e o campo de busca seguem B, sem Gravando…", () => {
    expect(seen.aAnswered).toMatchObject({
      name: "Pessoa B",
      field: B_EMAIL,
      saving: false,
      disabled: 0,
      changes: 1,
    });
  });

  it("a resposta de A vira um aviso só, com o nome de A", () => {
    expect(seen.toastsAfterA).toEqual([savedA]);
  });

  it("o Revogar seguinte cai em B: o diálogo nomeia B e o pedido leva o userId de B", () => {
    expect(seen.revoke!.named).toContain("Pessoa B");
    expect(seen.revoke!.named).not.toContain("Pessoa A");
    expect(seen.revoke!.revoked).toMatchObject({ userId: "u-b", roleKey: "obtLab" });
  });

  it("uma gravação que responde depois que a seção saiu ainda é dita", () => {
    expect(seen.toastsAfterLeaving).toHaveLength(2);
    expect(seen.toastsAfterLeaving!.filter((text) => text === savedA)).toHaveLength(2);
  });
});
