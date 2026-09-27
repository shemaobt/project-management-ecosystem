import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { LeaveStatus } from "../LeaveNetworkPage";

const { default: i18n } = await import("../../../../i18n");
const { LeaveNetworkView } = await import("../LeaveNetworkPage");
const { default: ptBR } = await import("../../../../i18n/locales/pt-BR.json");
const { default: en } = await import("../../../../i18n/locales/en.json");

const noop = () => undefined;

const view = (status: LeaveStatus) =>
  renderToStaticMarkup(
    createElement(LeaveNetworkView, { status, onConfirm: noop, onRetry: noop }),
  );

const STATES: LeaveStatus[] = [
  { kind: "loading" },
  { kind: "confirm" },
  { kind: "leaving" },
  { kind: "done" },
  { kind: "dead" },
  { kind: "networkProblem", message: "sem conexão" },
];

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("sair da rede sem conta — a página do link de saída (OBT-531)", () => {
  it("confirmar diz o que acontece e oferece um botão só", () => {
    const markup = view({ kind: "confirm" });
    expect(markup).toContain(i18n.t("int_leave_title"));
    expect(markup).toContain(i18n.t("int_leave_body"));
    expect(markup).toContain(i18n.t("int_leave_confirm"));
    expect(markup.match(/<button/gu)).toHaveLength(1);
  });

  it("enquanto sai, o botão fica preso e diz o que está fazendo", () => {
    const markup = view({ kind: "leaving" });
    expect(markup).toContain(i18n.t("int_leave_leaving"));
    expect(markup).toMatch(/<button[^>]*disabled/u);
  });

  it("depois de sair, diz que o nome e o contato foram apagados — sem botão", () => {
    const markup = view({ kind: "done" });
    expect(markup).toContain(i18n.t("int_leave_done_title"));
    expect(markup).toContain(i18n.t("int_leave_done_body"));
    expect(markup).not.toContain("<button");
  });

  it("um link morto recebe uma frase só, e nada para tentar de novo", () => {
    const markup = view({ kind: "dead" });
    expect(markup).toContain(i18n.t("int_leave_dead_title"));
    expect(markup).toContain(i18n.t("int_leave_dead_body"));
    expect(markup).not.toContain("<button");
  });

  it("uma falha de conexão, ao contrário, vale tentar de novo", () => {
    const markup = view({ kind: "networkProblem", message: "sem conexão" });
    expect(markup).toContain(i18n.t("int_leave_network_title"));
    expect(markup).toContain("sem conexão");
    expect(markup).toContain(i18n.t("int_leave_retry"));
  });

  it("fala inglês quando o idioma muda, em todos os estados", async () => {
    await i18n.changeLanguage("en");
    expect(view({ kind: "confirm" })).toContain(en.int_leave_title);
    expect(view({ kind: "confirm" })).toContain(en.int_leave_confirm);
    expect(view({ kind: "done" })).toContain(en.int_leave_done_title);
    expect(view({ kind: "dead" })).toContain(en.int_leave_dead_body);
    for (const status of STATES) {
      const markup = view(status);
      for (const key of ["int_leave_title", "int_leave_body", "int_leave_dead_body"] as const) {
        expect(markup).not.toContain(ptBR[key]);
      }
    }
  });

  it("nenhum estado recebe, e portanto nenhum mostra, um dado da pessoa", () => {
    // The view's only input is the state: there is no prop through which a name, a country
    // or a contact could reach it. Asserted on the source so a later prop is a red build.
    const source = readFileSync(
      join(process.cwd(), "src/components/pages/intercessores/LeaveNetworkPage.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/IntercessorEntry|contactHint|\.name\b|country/u);
  });

  it("a rota é pública — irmã do intake, antes do SessionGate", () => {
    const app = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
    const leave = app.indexOf('path="leave/:token"');
    const gate = app.indexOf("<SessionGate>");
    expect(leave).toBeGreaterThan(-1);
    expect(leave).toBeLessThan(gate);
    expect(app.indexOf('path="intake/:token"')).toBeLessThan(gate);
  });
});
