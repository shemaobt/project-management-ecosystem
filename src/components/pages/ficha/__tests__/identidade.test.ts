import { beforeEach, describe, expect, it, vi } from "vitest";

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
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { projectsAPI } = await import("../../../../fixtures");
const { useRecordStore, NEW_RECORD, makeEmptyProject } = await import(
  "../../../../stores/recordStore"
);
const { isIsoShape, parseCoordinate, hasPlottableCoords } = await import(
  "../../../../utils/identity"
);
const { getMapPlacement } = await import("../../../../utils/region");
const { VITALITY_SCALE } = await import("../../../../constants/project");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { default: i18n } = await import("../../../../i18n");

const projects = await projectsAPI.list();

beforeEach(() => {
  storage.clear();
  useRecordStore.setState({ drafts: {} });
});

describe("o nome da língua é dado de campo, não texto a corrigir", () => {
  const NAMES = [
    "नेपाली",
    "العربية",
    "Ямал ненэцие”",
    "ᏣᎳᎩ",
    "中文",
    "Ngäbere",
    "purépecha de capacuaro",
    "Embera Dobida",
  ];

  it("volta byte a byte do rascunho, em qualquer escrita", () => {
    const { updateDraft } = useRecordStore.getState();
    for (const name of NAMES) {
      updateDraft(NEW_RECORD, { languageName: name });
      expect(useRecordStore.getState().drafts[NEW_RECORD].languageName).toBe(
        name,
      );
    }
  });

  it("atravessa o localStorage sem perder caractere", async () => {
    useRecordStore.getState().updateDraft(NEW_RECORD, {
      languageName: "नेपाली",
      bridgeLanguage: "Español",
    });
    const onDisk = storage.getItem("shema-record-drafts-v1")!;
    useRecordStore.setState({ drafts: {} });
    storage.setItem("shema-record-drafts-v1", onDisk);
    await useRecordStore.persist.rehydrate();

    const draft = useRecordStore.getState().drafts[NEW_RECORD];
    expect(draft.languageName).toBe("नेपाली");
    expect(draft.bridgeLanguage).toBe("Español");
  });

  it("os nomes que as fixtures já carregam não são normalizados", () => {
    const nbsp = projects.find((project) =>
      project.languageName.includes(" "),
    );
    expect(nbsp).toBeDefined();
    expect(nbsp!.languageName).toContain(" ");

    const lowercase = projects.filter(
      (project) =>
        project.languageName &&
        project.languageName[0] === project.languageName[0].toLowerCase() &&
        project.languageName[0] !== project.languageName[0].toUpperCase(),
    );
    expect(lowercase.length).toBeGreaterThan(0);
  });
});

describe("o código ISO é conferido, nunca recusado", () => {
  it("três letras passam, o resto só recebe aviso", () => {
    expect(isIsoShape("ymv")).toBe(true);
    expect(isIsoShape("Rop")).toBe(true);
    expect(isIsoShape(" aec ")).toBe(true);
    expect(isIsoShape("jaa-b")).toBe(false);
    expect(isIsoShape("?")).toBe(false);
    expect(isIsoShape("not iso language")).toBe(false);
  });

  it("os valores fora do formato que as fixtures já têm continuam válidos como dado", () => {
    const odd = projects.filter(
      (project) => project.languageCode && !isIsoShape(project.languageCode),
    );
    expect(odd.length).toBeGreaterThan(0);
    for (const project of odd) {
      expect(project.languageCode).toBe(project.languageCode.trim());
    }
  });
});

describe("coordenada ausente não vira ilha no golfo da Guiné", () => {
  it("[0,0] conta como ausente, não como lugar", () => {
    expect(hasPlottableCoords([0, 0])).toBe(false);
    expect(hasPlottableCoords(undefined)).toBe(false);
    expect(hasPlottableCoords([0, -14.2])).toBe(true);
    expect(hasPlottableCoords([-60.1, 0])).toBe(true);
  });

  it("as fixtures com [0,0] caem no centro da região", () => {
    const zeroed = projects.filter(
      (project) => !hasPlottableCoords(project.coords),
    );
    expect(zeroed.length).toBeGreaterThan(0);
    for (const project of zeroed) {
      expect(getMapPlacement(project).precision).toBe("region");
    }
  });

  it("uma ficha nova nasce sem coordenada plotável", () => {
    expect(hasPlottableCoords(makeEmptyProject().coords)).toBe(false);
  });

  it("o campo aceita vírgula decimal e recusa o que não é número", () => {
    expect(parseCoordinate("-60,12")).toBe(-60.12);
    expect(parseCoordinate("-60.12")).toBe(-60.12);
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("norte")).toBeNull();
  });

  it("um componente zero é coordenada legítima — equador e meridiano de Greenwich", () => {
    expect(parseCoordinate("0")).toBe(0);
    for (const pair of [
      [0, -14.2],
      [-60.1, 0],
      [0, 0.1],
    ] as const) {
      expect(hasPlottableCoords(pair)).toBe(true);
      expect(
        getMapPlacement(makeProject({ coords: [pair[0], pair[1]] })).precision,
      ).toBe("exact");
    }
  });
});

describe("a vitalidade é escala ordenada, não texto livre", () => {
  it("traz os degraus do protótipo, do vital ao extinto", () => {
    expect(VITALITY_SCALE.map((step) => step.value)).toEqual([
      "Vital",
      "Vulnerável",
      "Ameaçada",
      "Seriamente ameaçada",
      "Em situação crítica",
      "Extinta",
    ]);
  });

  it("o valor guardado é português, mas cada degrau tem tradução nas duas línguas", async () => {
    for (const lang of ["pt", "en"]) {
      await i18n.changeLanguage(lang);
      const rotulos = VITALITY_SCALE.map((step) => i18n.t(step.labelKey));
      expect(rotulos).toHaveLength(new Set(rotulos).size);
      for (const [index, rotulo] of rotulos.entries()) {
        expect(rotulo).not.toBe(VITALITY_SCALE[index].labelKey);
      }
      if (lang === "en") {
        expect(rotulos).not.toContain("Vulnerável");
      }
    }
    await i18n.changeLanguage("pt");
  });
});

describe("a ficha esparsa é o caso comum", () => {
  it("há projeto real sem ponte, sem falantes e sem vitalidade", () => {
    const sparse = projects.filter(
      (project) =>
        !project.bridgeLanguage &&
        !project.speakerCount &&
        !project.vitalityStatus,
    );
    expect(sparse.length).toBeGreaterThan(0);
  });
});
