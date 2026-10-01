import { describe, expect, it, vi } from "vitest";

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


const { parseProjectsImport } = await import("../export");

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
    // The wrapper BE-14's JSON export writes — `meta` above the reduced rows.
    const report = {
      meta: { exportId: "e1", contains: "…", projectCount: 1 },
      projects: [{ id: "a", languageName: "Tikuna", locationWithheld: false }],
    };
    const result = parseProjectsImport(JSON.stringify(report));

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

  it("um valor fora do vocabulário é recusado — status, visibilidade, saúde, coords", () => {
    const badRecords = [
      { status: "banana" },
      { prayerVisibility: "publico" },
      { healthEmotional: "otima" },
      { coords: [1] },
      { coords: ["-74.2", "-4.5"] },
      { objective: [42] },
    ];
    for (const fields of badRecords) {
      const result = parseProjectsImport(
        JSON.stringify([{ id: "a", languageName: "Tikuna", ...fields }]),
      );
      expect(result, JSON.stringify(fields)).toEqual({
        ok: false,
        error: { key: "import_bad_record", index: 1 },
      });
    }
  });

  it("um item de lista que não é registro é recusado — o mural quebraria depois", () => {
    const broken = [
      {
        id: "a",
        languageName: "Tikuna",
        needsItems: [{ description: 42, prayerShared: true }],
      },
    ];
    const result = parseProjectsImport(JSON.stringify(broken));

    expect(result).toEqual({
      ok: false,
      error: { key: "import_bad_record", index: 1 },
    });
  });

  it("os valores legais dos mesmos campos passam — a recusa é do vocabulário, não do campo", () => {
    const legal = [
      {
        id: "a",
        languageName: "Tikuna",
        status: "pausado",
        prayerVisibility: "rede",
        healthEmotional: "",
        healthRelational: "atencao",
        coords: [-74.2, -4.5],
        needsItems: [
          { category: "equipment", urgency: "high", status: "open", description: "Um gravador." },
        ],
        progressHistory: [{ date: "2026-05-14", translatedUnits: 3 }],
      },
    ];
    const result = parseProjectsImport(JSON.stringify(legal));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projects[0].status).toBe("pausado");
    expect(result.projects[0].coords).toEqual([-74.2, -4.5]);
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
