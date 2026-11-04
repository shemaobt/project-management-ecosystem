import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import type { ReceivedSubmission, SubmissionApplyResult } from "../../../../types/forms";
import type { RecordConflict } from "../../../../types/projectRecord";
import type { PulseApplyAccess } from "../PulseApply";

const { default: i18n } = await import("../../../../i18n");
const { afterAttempt, buttonFor } = await import("../pulseApply");
const { PulseApplyView, AppliedNote } = await import("../PulseApply");
const { ApplySlot, ReceivedArchive } = await import("../ReceivedArchive");
const { SaveOutcomeNote } = await import("../../ficha/SaveOutcomeNote");
const { conflictSentence } = await import("../../ficha/saveReport");
const { formatDate } = await import("../../../../utils/format");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const t = i18n.t.bind(i18n);

const CONFLICT: RecordConflict = {
  expectedVersion: 7,
  currentVersion: 9,
  changedFields: ["bookProgress", "notes"],
  unknownFields: [],
  changedBy: "Sofia",
  changedAt: "2026-10-30",
  detail: null,
};

const conflicted = (version: string): SubmissionApplyResult => ({
  ok: false,
  reason: "conflict",
  conflict: CONFLICT,
  version,
});

const pulse = (over: Partial<ReceivedSubmission> = {}): ReceivedSubmission => ({
  id: "s1",
  kind: "pulso",
  projectId: "kadiweu",
  languageName: "Kadiwéu",
  languageNameWithheld: false,
  submittedBy: "Fresia",
  receivedAt: "2026-10-28",
  definitionVersion: 1,
  appliedAt: null,
  ...over,
});

const access = (allows: boolean): PulseApplyAccess => ({
  allows: () => allows,
  readVersion: async () => '"7"',
  submit: async () => ({ ok: true, submission: pulse({ appliedAt: "2026-10-30" }) }),
  applying: [],
});

const routed = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, element));

describe("o fluxo de aplicar um Pulso aberto (OBT-652)", () => {
  it("depois de um 409, o botão aplica a versão que a recusa trouxe — não a lida ao abrir", () => {
    const step = afterAttempt(conflicted('"9"'), '"7"');

    expect(buttonFor(step, false)).toEqual({
      labelKey: "forms_apply_again",
      action: { kind: "apply", version: '"9"' },
    });
  });

  it("uma recusa que não trouxe versão faz o botão reler a ficha, em vez de reenviar a velha", () => {
    expect(buttonFor(afterAttempt(conflicted(""), '"7"'), false).action).toEqual({ kind: "read" });
  });

  it("uma falha de rede tenta de novo com a mesma versão; sem a ficha lida, relê", () => {
    const failure = { kind: "offline", status: null, code: null, detail: null } as const;
    const failed = afterAttempt({ ok: false, reason: "failed", failure }, '"7"');

    expect(buttonFor(failed, false).action).toEqual({ kind: "apply", version: '"7"' });
    expect(buttonFor({ kind: "unread", failure }, false).action).toEqual({ kind: "read" });
  });

  it("com um pedido no ar, ou a ficha ainda sendo lida, o botão não age", () => {
    expect(buttonFor({ kind: "ready", version: '"7"' }, true)).toEqual({
      labelKey: "forms_applying",
      action: null,
    });
    expect(buttonFor({ kind: "reading" }, false).action).toBeNull();
  });
});

describe("o 409 na caixa é dito como o PATCH da ficha o diz, sem segunda frase (OBT-646)", () => {
  it("a frase de quem mudou o quê é a mesma que o painel da ficha renderiza para o mesmo conflito", () => {
    const sentence = conflictSentence(CONFLICT, t);
    const inbox = renderToStaticMarkup(
      createElement(PulseApplyView, {
        step: { kind: "conflict", conflict: CONFLICT, version: '"9"' },
        inFlight: false,
        onAction: () => {},
      }),
    );
    const ficha = renderToStaticMarkup(
      createElement(SaveOutcomeNote, {
        outcome: { kind: "conflict", conflict: CONFLICT, overlap: [] },
        saving: false,
        onRetry: () => {},
        onGoToTab: () => {},
      }),
    );

    expect(sentence).toContain("Sofia");
    expect(sentence).toContain(t("f_notes"));
    expect(inbox).toContain(sentence);
    expect(ficha).toContain(sentence);
  });

  it("o painel diz que o Pulso não foi aplicado e o que aplicar de novo faz, com o botão de aplicar de novo", () => {
    const markup = renderToStaticMarkup(
      createElement(PulseApplyView, {
        step: { kind: "conflict", conflict: CONFLICT, version: '"9"' },
        inFlight: false,
        onAction: () => {},
      }),
    );

    expect(markup).toContain(t("forms_apply_conflict_title"));
    expect(markup).toContain(t("forms_apply_conflict_kept"));
    expect(markup).toContain(t("forms_apply_again"));
  });
});

describe("cada passo diz onde está, em texto", () => {
  const view = (step: Parameters<typeof PulseApplyView>[0]["step"], inFlight = false) =>
    renderToStaticMarkup(createElement(PulseApplyView, { step, inFlight, onAction: () => {} }));

  it("lendo a ficha: diz que lê, e o botão espera sem sair do lugar", () => {
    const markup = view({ kind: "reading" });
    expect(markup).toContain(t("forms_apply_reading"));
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain("disabled=\"\"");
  });

  it("pronto: o botão aplica e não está desabilitado", () => {
    const markup = view({ kind: "ready", version: '"7"' });
    expect(markup).toContain(t("forms_apply"));
    expect(markup).not.toContain('aria-disabled="');
  });

  it("falha e ficha sem leitura dizem que nada foi aplicado e oferecem tentar de novo", () => {
    const failure = { kind: "offline", status: null, code: null, detail: null } as const;
    expect(view({ kind: "failed", failure, version: '"7"' })).toContain(t("forms_apply_failed"));
    expect(view({ kind: "unread", failure })).toContain(t("forms_apply_unread"));
    expect(view({ kind: "unread", failure })).toContain(t("net_retry"));
  });
});

describe("um Pulso aplicado não oferece aplicar de novo", () => {
  it("aberto, diz o dia, onde as respostas se leem agora, e leva ao progresso da ficha — sem o botão", () => {
    const markup = routed(
      createElement(ApplySlot, { submission: pulse({ appliedAt: "2026-10-30" }), access: access(true) }),
    );

    expect(markup).toContain(t("forms_applied_note", { date: formatDate("2026-10-30") }));
    expect(markup).toContain('href="/ficha/kadiweu/progresso"');
    expect(markup).not.toContain(t("forms_apply"));
  });

  it("pendente, a coordenação da região vê o botão (a ficha ainda sendo lida)", () => {
    const markup = routed(createElement(ApplySlot, { submission: pulse(), access: access(true) }));

    expect(markup).toContain(t("forms_apply"));
    expect(markup).toContain(t("forms_apply_reading"));
  });

  it("pendente, quem a rota recusa não vê botão nenhum", () => {
    expect(routed(createElement(ApplySlot, { submission: pulse(), access: access(false) }))).toBe("");
    expect(routed(createElement(ApplySlot, { submission: pulse() }))).toBe("");
  });

  it("na lista, a linha aplicada diz o dia e a pendente diz que ainda não foi aplicada", () => {
    const markup = routed(
      createElement(ReceivedArchive, {
        submissions: [pulse({ id: "a", appliedAt: "2026-10-30" }), pulse({ id: "b" })],
        apply: access(true),
      }),
    );

    expect(markup).toContain(t("forms_applied_on", { date: formatDate("2026-10-30") }));
    expect(markup).toContain(t("forms_not_applied"));
  });

  it("o AppliedNote marca o link que recebe o foco quando o botão some", () => {
    const markup = routed(createElement(AppliedNote, { submission: { ...pulse(), appliedAt: "2026-10-30" } }));
    expect(markup).toContain('data-applied-link="s1"');
  });
});
