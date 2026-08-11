import { describe, expect, it } from "vitest";
import { HEALTH_LABEL_KEYS, STALE_LABEL_KEYS } from "../../../../constants/status";
import { projectsAPI } from "../../../../fixtures";
import en from "../../../../i18n/locales/en.json";
import ptBR from "../../../../i18n/locales/pt-BR.json";
import type { OverallHealth, Project, StaleStatus } from "../../../../types/project";
import { getCountry, getLocationDisplay } from "../../../../utils/region";
import {
  QUOTE_MAX_LENGTH,
  getCardDateLabel,
  getCardQuote,
  getIdentityLabel,
  getSpeakerLabel,
  getUnitShare,
  isActivationKey,
  openableCardProps,
} from "../card";
import { makeProject } from "../../../../utils/__tests__/factory";

const PT = "pt-BR";

const findFixture = async (id: string): Promise<Project> => {
  const project = (await projectsAPI.list()).find((item) => item.id === id);
  if (!project) throw new Error(id);
  return project;
};

describe("país sensível nunca aparece com a localização real no cartão", () => {
  it("as fichas marcadas devolvem a região, e o país fica fora do que o cartão renderiza", async () => {
    const all = await projectsAPI.list();
    const sensitive = all.filter((project) => project.sensitiveCountry);
    expect(sensitive.length).toBeGreaterThan(0);

    for (const project of sensitive) {
      const display = getLocationDisplay(project);
      expect(display.withheld).toBe(true);
      if (display.withheld) {
        expect(Object.keys(ptBR)).toContain(display.regionLabelKey);
        expect(Object.keys(en)).toContain(display.regionLabelKey);
      }
      expect(JSON.stringify(display)).not.toContain(getCountry(project));
      expect(JSON.stringify(display)).not.toContain(project.location);
    }
  });

  it("a ficha comum continua mostrando a localização", async () => {
    const project = await findFixture("afrikaans-kaaps");
    const display = getLocationDisplay(project);

    expect(display).toEqual({ withheld: false, location: "South Africa" });
  });
});

describe("ficha esparsa mantém o cartão composto", () => {
  it("a ficha sem ponte, mentor, falantes, prazo e histórico rende travessões, não vazios", async () => {
    const project = await findFixture("afrikaans-kaaps");

    expect(project.bridgeLanguage).toBe("");
    expect(getIdentityLabel(project)).toBe("afr");
    expect(getSpeakerLabel(project, PT)).toBe("—");
    expect(getCardQuote(project)).toBe("");
    expect(getCardDateLabel(project, PT)).toBeNull();
  });

  it("sem código de língua o cartão ainda tem uma linha de identidade", () => {
    expect(getIdentityLabel(makeProject({ languageCode: "" }))).toBe("—");
    expect(
      getIdentityLabel(
        makeProject({ languageCode: "abc", bridgeLanguage: "Português" }),
      ),
    ).toBe("abc · Português");
  });

  it("falantes fora de formato numérico saem como vieram, nunca como NaN", () => {
    expect(getSpeakerLabel(makeProject({ speakerCount: "12000" }), PT)).toBe(
      "12.000",
    );
    expect(getSpeakerLabel(makeProject({ speakerCount: "~5 mil" }), PT)).toBe(
      "~5 mil",
    );
  });

  it("a data do carimbo é dia e mês do último registro de progresso", () => {
    const project = makeProject({
      startDate: "2026-01-05",
      progressHistory: [
        {
          date: "2026-05-14",
          translatedUnits: 4,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
      ],
    });

    expect(getCardDateLabel(project, PT)).toBe("14 de mai.");
    expect(getCardDateLabel(makeProject({ startDate: "2026-01-05" }), PT)).toBe(
      "05 de jan.",
    );
  });
});

describe("a citação do diário", () => {
  it("prefere pedido de oração, depois saúde, depois necessidades, depois notas", () => {
    const base = {
      prayerRequests: "oração",
      healthNotes: "saúde",
      needsNotes: "necessidade",
      notes: "nota",
    };

    expect(getCardQuote(makeProject(base))).toBe("oração");
    expect(getCardQuote(makeProject({ ...base, prayerRequests: "" }))).toBe(
      "saúde",
    );
    expect(
      getCardQuote(makeProject({ ...base, prayerRequests: "", healthNotes: "" })),
    ).toBe("necessidade");
    expect(
      getCardQuote(
        makeProject({
          ...base,
          prayerRequests: "",
          healthNotes: "",
          needsNotes: "",
        }),
      ),
    ).toBe("nota");
  });

  it("corta no limite, e só depois dele", () => {
    const exact = "a".repeat(QUOTE_MAX_LENGTH);
    const overflow = "a".repeat(QUOTE_MAX_LENGTH + 1);

    expect(getCardQuote(makeProject({ prayerRequests: exact }))).toBe(exact);
    expect(getCardQuote(makeProject({ prayerRequests: overflow }))).toBe(
      `${exact}...`,
    );
  });
});

describe("os anéis de progresso", () => {
  it("nunca passam da volta completa, mesmo com dado inconsistente", async () => {
    const broken = await findFixture("jaminawa-yaminahua-brazilian-side");
    expect(broken.translatedUnits).toBeGreaterThan(broken.totalUnits);

    expect(getUnitShare(broken.translatedUnits, broken.totalUnits)).toBe(1);
    expect(getUnitShare(0, 0)).toBe(0);
    expect(getUnitShare(5, 0)).toBe(0);
    expect(getUnitShare(-5, 10)).toBe(0);
    expect(getUnitShare(5, 10)).toBe(0.5);
  });
});

describe("o cartão abre pelo teclado", () => {
  it("Enter e Espaço abrem a ficha e seguram o comportamento padrão", () => {
    let opened = 0;
    const props = openableCardProps("abrir", () => {
      opened += 1;
    });
    const press = (key: string) => {
      let prevented = false;
      props.onKeyDown({
        key,
        preventDefault: () => {
          prevented = true;
        },
      });
      return prevented;
    };

    expect(props.role).toBe("button");
    expect(props.tabIndex).toBe(0);
    expect(props["aria-label"]).toBe("abrir");

    expect(press("Enter")).toBe(true);
    expect(press(" ")).toBe(true);
    expect(opened).toBe(2);

    expect(press("Tab")).toBe(false);
    expect(press("a")).toBe(false);
    expect(opened).toBe(2);

    props.onClick();
    expect(opened).toBe(3);
  });

  it("reconhece só as teclas de ativação", () => {
    expect(isActivationKey("Enter")).toBe(true);
    expect(isActivationKey(" ")).toBe(true);
    expect(isActivationKey("Spacebar")).toBe(false);
    expect(isActivationKey("ArrowDown")).toBe(false);
  });
});

describe("estado que o cartão mostra em cor também é dito em texto", () => {
  it("todo estado de saúde tem rótulo nos dois catálogos", () => {
    const states: OverallHealth[] = ["boa", "atencao", "critica", "na"];

    for (const state of states) {
      const key = HEALTH_LABEL_KEYS[state];
      expect(Object.keys(ptBR)).toContain(key);
      expect(Object.keys(en)).toContain(key);
    }
  });

  it("todo estado de atualização tem rótulo nos dois catálogos", () => {
    const states: StaleStatus[] = ["em-dia", "atencao", "critico"];

    for (const state of states) {
      const key = STALE_LABEL_KEYS[state];
      expect(Object.keys(ptBR)).toContain(key);
      expect(Object.keys(en)).toContain(key);
    }
  });

  it("prazo vencido e prazo próximo têm texto, não só cor", () => {
    for (const key of ["days_overdue", "days_remaining"]) {
      expect(Object.keys(ptBR)).toContain(key);
      expect(Object.keys(en)).toContain(key);
    }
  });
});
