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

const { default: i18n } = await import("../../i18n");
const {
  CSV_BOM,
  CSV_SEPARATOR,
  buildProjectsExport,
  exportFileName,
  parseProjectsImport,
  toCsvExport,
  toJsonExport,
} = await import("../export");
const { redactProjectForExport } = await import("../privacy");
const { makeProject } = await import("./factory");

const NOW = new Date(2026, 7, 15, 22, 40);

const t = i18n.t.bind(i18n);

const secrets = () =>
  makeProject({
    id: "guarded",
    languageName: "Waima’a",
    location: "Indonesia",
    team: "YWAM Dili",
    notes: "Nota interna: conflito delicado na liderança local.",
    healthNotes: "A equipe carrega um luto recente.",
    prayerRequests: "Pedido confiado só à coordenação.",
    teamLeaderContact: "+62 811 000 111",
    mentorContact: "mentor@exemplo.org",
    teamContact: "equipe@exemplo.org",
    mediaPhotos: [
      {
        image: { src: "data:image/jpeg;base64,AAAA", fileName: "foto.jpg" },
        caption: "Sessão de checagem",
        authorization: { granted: true, by: "Fresia", at: "2026-08-01" },
      },
    ],
  });

const shared = () =>
  makeProject({
    id: "shared",
    languageName: "Tikuna",
    location: "Brazil",
    team: "JOCUM Belém",
    prayerRequests: "Orem pelos anciãos que recebem o Evangelho.",
    prayerVisibility: "rede",
    needsItems: [
      {
        category: "equipment",
        urgency: "high",
        status: "open",
        description: "Um gravador para as sessões de checagem.",
        prayerShared: true,
      },
      {
        category: "training",
        urgency: "low",
        status: "open",
        description: "Ainda em conversa com a liderança.",
      },
    ],
  });

const sensitive = () =>
  makeProject({
    id: "sensitive",
    languageName: "Ngäbere",
    location: "Peru, Loreto",
    coords: [-74.2, -4.5],
    sensitiveCountry: true,
  });

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("nenhum formato de export vaza o que não foi autorizado", () => {
  const exports = () => {
    const data = buildProjectsExport([secrets(), shared(), sensitive()], t, NOW);
    return [toJsonExport(data), toCsvExport(data, t)];
  };

  it("um pedido de oração sem consentimento não aparece em formato nenhum", () => {
    for (const file of exports()) {
      expect(file).not.toContain("Pedido confiado só à coordenação.");
      expect(file).not.toContain("Ainda em conversa com a liderança.");
    }
  });

  it("o pedido autorizado à rede aparece — o filtro é o consentimento", () => {
    for (const file of exports()) {
      expect(file).toContain("Orem pelos anciãos que recebem o Evangelho.");
      expect(file).toContain("Um gravador para as sessões de checagem.");
    }
  });

  it("nota interna não aparece em formato nenhum", () => {
    for (const file of exports()) {
      expect(file).not.toContain("Nota interna");
      expect(file).not.toContain("luto recente");
    }
  });

  it("contatos pessoais e mídias não aparecem em formato nenhum", () => {
    for (const file of exports()) {
      expect(file).not.toContain("+62 811 000 111");
      expect(file).not.toContain("mentor@exemplo.org");
      expect(file).not.toContain("equipe@exemplo.org");
      expect(file).not.toContain("data:image/jpeg");
    }
  });
});

describe("a transformação de país sensível é visível, não silenciosa", () => {
  it("o registro sai com a região no lugar do local, e diz que recolheu", () => {
    const record = redactProjectForExport(sensitive(), t);

    expect(record.location).toBe(i18n.t("continent_south_america"));
    expect(record.locationWithheld).toBe(true);
    expect(JSON.stringify(record)).not.toContain("Peru");
    expect(JSON.stringify(record)).not.toContain("-74.2");
  });

  it("um projeto aberto mantém o local como está no registro", () => {
    const record = redactProjectForExport(shared(), t);

    expect(record.location).toBe("Brazil");
    expect(record.locationWithheld).toBe(false);
  });

  it("o cabeçalho dos dois formatos conta quantos locais foram recolhidos", () => {
    const data = buildProjectsExport([shared(), sensitive()], t, NOW);
    const meta = JSON.parse(toJsonExport(data)).meta;

    expect(meta.locationsWithheld).toBe(1);
    expect(meta.withheldNote).toBe(
      i18n.t("export_withheld_count", { count: 1 }),
    );
    expect(toCsvExport(data, t)).toContain(
      i18n.t("export_withheld_count", { count: 1 }),
    );
  });

  it("sem país sensível, o cabeçalho não inventa recolhimento", () => {
    const data = buildProjectsExport([shared()], t, NOW);

    expect(JSON.parse(toJsonExport(data)).meta.withheldNote).toBeNull();
    expect(toCsvExport(data, t)).not.toContain("recolhido");
  });
});

describe("todo export carrega procedência e confidencialidade", () => {
  it("o JSON abre com o que contém, quando foi gerado e o aviso", () => {
    const meta = JSON.parse(
      toJsonExport(buildProjectsExport([shared()], t, NOW)),
    ).meta;

    expect(meta.contains).toBe(i18n.t("export_contains"));
    expect(meta.confidential).toBe(i18n.t("export_confidential"));
    expect(meta.generatedAt).toBe("2026-08-15 22:40");
    expect(meta.projectCount).toBe(1);
  });

  it("o CSV abre com as mesmas linhas antes da tabela", () => {
    const csv = toCsvExport(buildProjectsExport([shared()], t, NOW), t);
    const lines = csv.split("\r\n");

    expect(lines[0]).toContain(i18n.t("export_contains"));
    expect(lines[1]).toContain(
      i18n.t("export_generated", { when: "2026-08-15 22:40" }),
    );
    expect(lines[2]).toContain(i18n.t("export_confidential"));
  });

  it("o nome do arquivo carrega o dia local", () => {
    expect(exportFileName("json", NOW)).toBe("shema-projetos-2026-08-15.json");
    expect(exportFileName("csv", NOW)).toBe("shema-projetos-2026-08-15.csv");
  });
});

describe("o CSV sobrevive à planilha", () => {
  it("começa com BOM e mantém nomes não latinos intactos", () => {
    const csv = toCsvExport(
      buildProjectsExport([secrets(), sensitive()], t, NOW),
      t,
    );

    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain("Waima’a");
    expect(csv).toContain("Ngäbere");
  });

  it("nenhuma célula sai lida como fórmula", () => {
    const formula = makeProject({
      id: "formula",
      languageName: "=SUM(A1:A9)",
      languageCode: "+55x",
      bridgeLanguage: "-inicio",
      vitalityStatus: "@handle",
      location: "Brazil",
    });
    const csv = toCsvExport(buildProjectsExport([formula], t, NOW), t);

    expect(csv).toContain("'=SUM(A1:A9)");
    expect(csv).toContain("'+55x");
    expect(csv).toContain("'-inicio");
    expect(csv).toContain("'@handle");
    expect(csv).not.toMatch(new RegExp(`${CSV_SEPARATOR}=SUM`, "u"));
  });

  it("separador, aspas e quebra de linha viajam escapados", () => {
    const tricky = makeProject({
      id: "tricky",
      languageName: 'Língua "do vale"; ramo norte',
      location: "Brazil",
      scopeDetails: "primeira linha\nsegunda linha",
      team: "Base; Núcleo",
    });
    const csv = toCsvExport(buildProjectsExport([tricky], t, NOW), t);

    expect(csv).toContain('"Língua ""do vale""; ramo norte"');
    expect(csv).toContain('"Base; Núcleo"');
  });

  it("a linha de um projeto sensível mostra a região e diz Sim na coluna de país sensível", () => {
    const csv = toCsvExport(buildProjectsExport([sensitive()], t, NOW), t);
    const row = csv
      .split("\r\n")
      .find((line) => line.includes("Ngäbere"));

    expect(row).toBeDefined();
    expect(row).toContain(i18n.t("continent_south_america"));
    expect(row).toContain(i18n.t("bool_yes"));
    expect(row).not.toContain("Peru");
  });
});

describe("a importação valida tudo antes de aplicar qualquer coisa", () => {
  const valid = () => [
    { id: "a", languageName: "Tikuna", location: "Brazil" },
    { id: "b", languageName: "Kaingang" },
  ];

  it("uma lista válida entra inteira, completada pelo registro em branco", () => {
    const result = parseProjectsImport(JSON.stringify(valid()));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projects).toHaveLength(2);
    expect(result.projects[0].location).toBe("Brazil");
    expect(result.projects[1].needsItems).toEqual([]);
    expect(result.projects[1].status).toBe("em-andamento");
  });

  it("um arquivo que não é JSON é recusado com o motivo", () => {
    const result = parseProjectsImport("isto não é json {");

    expect(result).toEqual({
      ok: false,
      error: { key: "import_invalid_json" },
    });
  });

  it("um JSON que não é lista é recusado", () => {
    const result = parseProjectsImport(JSON.stringify({ foo: 1 }));

    expect(result).toEqual({ ok: false, error: { key: "import_not_list" } });
  });

  it("o relatório exportado é reconhecido e recusado por inteiro", () => {
    const data = buildProjectsExport([shared()], t, NOW);
    const result = parseProjectsImport(toJsonExport(data));

    expect(result).toEqual({ ok: false, error: { key: "import_is_export" } });
  });

  it("um registro quebrado no meio derruba o arquivo todo — nada entra", () => {
    const broken = [...valid(), { id: "c" }];
    const result = parseProjectsImport(JSON.stringify(broken));

    expect(result).toEqual({
      ok: false,
      error: { key: "import_bad_record", index: 3 },
    });
  });

  it("um campo com o tipo errado também derruba o arquivo todo", () => {
    const broken = [
      { id: "a", languageName: "Tikuna", needsItems: "não é lista" },
    ];
    const result = parseProjectsImport(JSON.stringify(broken));

    expect(result).toEqual({
      ok: false,
      error: { key: "import_bad_record", index: 1 },
    });
  });

  it("id repetido é recusado antes de aplicar", () => {
    const broken = [...valid(), { id: "a", languageName: "Duplicada" }];
    const result = parseProjectsImport(JSON.stringify(broken));

    expect(result).toEqual({
      ok: false,
      error: { key: "import_duplicate_id", id: "a" },
    });
  });
});
