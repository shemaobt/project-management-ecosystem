import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntakeField } from "../../types/forms";
import {
  classifyIntakeLinkProblem,
  clearIntakeDraft,
  draftKeyOf,
  loadIntakeDraft,
  parseSubmitFaults,
  saveIntakeDraft,
  validateIntakeAnswers,
} from "../intake";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };
}

const storage = createMemoryStorage();
const tabStorage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("sessionStorage", tabStorage);

beforeEach(() => {
  storage.clear();
  tabStorage.clear();
});

const FIELDS: readonly IntakeField[] = [
  {
    key: "submittedBy",
    type: "text",
    required: true,
    labelKey: "forms_q_submitted_by",
    maxLength: 200,
    options: [],
  },
  {
    key: "period",
    type: "period",
    required: true,
    labelKey: "forms_q_period",
    maxLength: null,
    options: [],
  },
  {
    key: "voice",
    type: "longText",
    required: false,
    labelKey: "forms_q_voice",
    maxLength: 10,
    options: [],
  },
  {
    key: "prayerVisibility",
    type: "choice",
    required: false,
    labelKey: "forms_q_prayer_visibility",
    maxLength: null,
    options: ["coordenacao", "rede"],
  },
];

describe("o rascunho sobrevive a uma falha — a promessa central da task", () => {
  it("persiste e devolve exatamente o que foi salvo", () => {
    expect(loadIntakeDraft("tok-1")).toBeNull();

    saveIntakeDraft("tok-1", 1, { submittedBy: "Kuaray", period: "2026-09" });

    expect(loadIntakeDraft("tok-1")).toEqual({
      definitionVersion: 1,
      answers: { submittedBy: "Kuaray", period: "2026-09" },
    });
  });

  it("um link nunca vê o rascunho de outro", () => {
    saveIntakeDraft("tok-a", 1, { submittedBy: "A" });
    saveIntakeDraft("tok-b", 1, { submittedBy: "B" });

    expect(loadIntakeDraft("tok-a")?.answers.submittedBy).toBe("A");
    expect(loadIntakeDraft("tok-b")?.answers.submittedBy).toBe("B");
  });

  it("nada fica guardado depois do envio — a limpeza é exata, não tudo", () => {
    saveIntakeDraft("tok-a", 1, { submittedBy: "A" });
    saveIntakeDraft("tok-b", 1, { submittedBy: "B" });

    clearIntakeDraft("tok-a");

    expect(loadIntakeDraft("tok-a")).toBeNull();
    expect(loadIntakeDraft("tok-b")).not.toBeNull();
  });

  it("armazenamento indisponível não derruba a tela — falha silenciosa e contida", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    vi.stubGlobal("localStorage", broken);
    vi.stubGlobal("sessionStorage", broken);

    expect(() => saveIntakeDraft("tok-x", 1, {})).not.toThrow();
    expect(saveIntakeDraft("tok-x", 1, {})).toBe(false);
    expect(loadIntakeDraft("tok-x")).toBeNull();

    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", tabStorage);
  });
});

describe("o rascunho do líder fica na aba e não guarda o link (OBT-558)", () => {
  const TOKEN = "k9X2-um-token-longo-e-aleatorio";

  it("vai para a sessão da aba, nunca para o aparelho", () => {
    saveIntakeDraft(TOKEN, 1, { prayerRequest: "Orem pela gravação." });

    expect(tabStorage.getItem("shema-intake-draft-v2")).toContain("Orem pela gravação.");
    expect(storage.getItem("shema-intake-draft-v2")).toBeNull();
    expect(storage.getItem("shema-intake-draft-v1")).toBeNull();
  });

  it("é guardado sob um hash, então nada guardado abre o link", () => {
    saveIntakeDraft(TOKEN, 1, { submittedBy: "Kuaray" });

    const stored = tabStorage.getItem("shema-intake-draft-v2") ?? "";
    expect(stored).not.toContain(TOKEN);
    expect(stored).toContain(draftKeyOf(TOKEN));
    expect(draftKeyOf(TOKEN)).toMatch(/^[0-9a-f]{16}$/u);
    expect(draftKeyOf(TOKEN)).not.toBe(draftKeyOf(`${TOKEN}x`));
  });

  it("um rascunho da onda 1 é trazido uma vez, e a cópia antiga some do aparelho", () => {
    storage.setItem(
      "shema-intake-draft-v1",
      JSON.stringify({
        [TOKEN]: { definitionVersion: 2, answers: { submittedBy: "Ara" }, savedAt: "2026-09-30" },
      }),
    );

    expect(loadIntakeDraft(TOKEN)).toEqual({
      definitionVersion: 2,
      answers: { submittedBy: "Ara" },
    });
    expect(storage.getItem("shema-intake-draft-v1")).toBeNull();
  });

  it("os rascunhos de outros links da onda 1 também saem do aparelho", () => {
    storage.setItem(
      "shema-intake-draft-v1",
      JSON.stringify({
        "outro-token": { definitionVersion: 1, answers: { prayerRequest: "x" }, savedAt: "2026-09-29" },
      }),
    );

    expect(loadIntakeDraft(TOKEN)).toBeNull();
    expect(storage.getItem("shema-intake-draft-v1")).toBeNull();
  });

  it("um navegador que recusa até o acesso ao armazenamento não derruba a tela", () => {
    const refusing = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError");
      },
    });

    expect(saveIntakeDraft(TOKEN, 1, {})).toBe(false);
    expect(loadIntakeDraft(TOKEN)).toBeNull();

    if (refusing) Object.defineProperty(globalThis, "sessionStorage", refusing);
  });
});

describe("validação do lado do cliente — a primeira leitura, não a última", () => {
  it("campo obrigatório vazio é marcado", () => {
    const errors = validateIntakeAnswers(FIELDS, { period: "2026-09" });
    expect(errors.submittedBy).toBe("intake_err_required");
  });

  it("um mês fora do formato AAAA-MM é marcado", () => {
    const errors = validateIntakeAnswers(FIELDS, {
      submittedBy: "Kuaray",
      period: "13/2026",
    });
    expect(errors.period).toBe("intake_err_period");
  });

  it("texto além do limite é marcado", () => {
    const errors = validateIntakeAnswers(FIELDS, {
      submittedBy: "Kuaray",
      period: "2026-09",
      voice: "onze caracteres!",
    });
    expect(errors.voice).toBe("intake_err_too_long");
  });

  it("uma escolha fora do vocabulário é marcada", () => {
    const errors = validateIntakeAnswers(FIELDS, {
      submittedBy: "Kuaray",
      period: "2026-09",
      prayerVisibility: "publico",
    });
    expect(errors.prayerVisibility).toBe("intake_err_choice");
  });

  it("um formulário completo e correto não tem erro nenhum", () => {
    const errors = validateIntakeAnswers(FIELDS, {
      submittedBy: "Kuaray",
      period: "2026-09",
      voice: "curto",
      prayerVisibility: "rede",
    });
    expect(errors).toEqual({});
  });
});

describe("a recusa do servidor volta para os campos — nunca um parágrafo só", () => {
  const KNOWN = FIELDS.map((field) => field.key);

  it("separa cada falta e reconhece só as chaves do formulário", () => {
    const detail =
      "pulso v1: the submission does not match the form, so none of it was kept — period: required; submittedBy: required";

    const { fields, general } = parseSubmitFaults(detail, KNOWN);

    expect(fields.has("period")).toBe(true);
    expect(fields.has("submittedBy")).toBe(true);
    expect(general).toBeNull();
  });

  it("uma descompatibilidade de versão do formulário é reconhecida, sem travessão", () => {
    const detail =
      "definitionVersion: this link answers version 1 of the pulso form, not 2. Reload the form.";

    const { fields, general } = parseSubmitFaults(detail, KNOWN);

    expect(fields.has("definitionVersion")).toBe(true);
    expect(general).toBeNull();
  });

  it("uma recusa sem estrutura de campo vira o aviso geral, não some", () => {
    const detail =
      "The submission is 300000 bytes and this form accepts 262144. Nothing was kept.";

    const { fields, general } = parseSubmitFaults(detail, KNOWN);

    expect(fields.size).toBe(0);
    expect(general).toBe(detail);
  });
});

describe("um link morto diz o quê aconteceu, não um 403 seco", () => {
  it("revogado é lido do texto do servidor", () => {
    expect(
      classifyIntakeLinkProblem(
        "This link has been revoked. Ask your coordinator for a new one.",
      ),
    ).toBe("revoked");
  });

  it("expirado é lido do texto do servidor", () => {
    expect(
      classifyIntakeLinkProblem(
        "This link has expired. Ask your coordinator for a new one.",
      ),
    ).toBe("expired");
  });

  it("qualquer outra coisa — ou nada — vira 'link inválido', nunca some", () => {
    expect(
      classifyIntakeLinkProblem("This link is not one this server issued."),
    ).toBe("invalid");
    expect(classifyIntakeLinkProblem(null)).toBe("invalid");
  });
});
