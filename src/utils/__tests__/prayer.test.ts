import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import type { NeedItem, Project } from "../../types/project";
import {
  buildPrayerRequests,
  countPrayerIndicators,
  groupPrayerRequests,
} from "../prayer";
import { makeProject } from "./factory";

const need = (overrides: Partial<NeedItem> = {}): NeedItem => ({
  category: "equipment",
  urgency: "high",
  status: "open",
  description: "Um gravador para as sessões de checagem.",
  ...overrides,
});

const shared = (overrides: Partial<Project> = {}): Project =>
  makeProject({
    id: "shared",
    location: "Brazil",
    team: "JOCUM Belém",
    languageName: "Tikuna",
    prayerRequests: "Orem pelos anciãos que recebem o Evangelho.",
    prayerVisibility: "rede",
    healthAssessmentDate: "2026-05-14",
    ...overrides,
  });

describe("buildPrayerRequests", () => {
  it("só entrega ao mural o pedido autorizado à rede", () => {
    const withheld = makeProject({
      id: "withheld",
      location: "Peru",
      prayerRequests: "Pedido confiado só à coordenação.",
      healthAssessmentDate: "2026-06-01",
    });

    const requests = buildPrayerRequests([shared(), withheld]);

    expect(requests.map((request) => request.projectId)).toEqual(["shared"]);
    expect(JSON.stringify(requests)).not.toContain(
      "Pedido confiado só à coordenação.",
    );
  });

  it("um pedido só de áudio autorizado entra no mural", () => {
    const recorded = shared({
      id: "recorded",
      prayerRequests: "",
      prayerRequestsAudio: "data:audio/webm;base64,UklGRg==",
    });

    const requests = buildPrayerRequests([recorded]);

    expect(requests).toHaveLength(1);
    expect(requests[0].audioUrl).toBe("data:audio/webm;base64,UklGRg==");
    expect(requests[0].text).toBe("");
  });

  it("um áudio sem autorização não vaza", () => {
    const recorded = makeProject({
      id: "recorded",
      location: "Peru",
      prayerRequests: "",
      prayerRequestsAudio: "data:audio/webm;base64,UklGRg==",
    });

    expect(buildPrayerRequests([recorded])).toEqual([]);
  });

  it("a necessidade entra pelo consentimento dela, item a item", () => {
    const project = makeProject({
      id: "needs",
      location: "Indonesia",
      healthAssessmentDate: "2026-04-02",
      needsItems: [
        need({
          prayerShared: true,
          prayerAnswered: true,
          description: "Agradecemos: o gravador chegou.",
        }),
        need({ description: "Ainda em conversa com a liderança." }),
      ],
    });

    const requests = buildPrayerRequests([project]);

    expect(requests).toHaveLength(1);
    expect(requests[0].source).toBe("Necessidade");
    expect(requests[0].answered).toBe(true);
    expect(JSON.stringify(requests)).not.toContain(
      "Ainda em conversa com a liderança.",
    );
  });

  it("um pedido de país sensível não carrega o país", () => {
    const sensitive = shared({
      id: "sensitive",
      location: "Peru",
      sensitiveCountry: true,
    });

    const requests = buildPrayerRequests([sensitive, shared()]);
    const [fromSensitive] = requests.filter(
      (request) => request.projectId === "sensitive",
    );
    const [fromOpen] = requests.filter(
      (request) => request.projectId === "shared",
    );

    expect(fromSensitive.country).toBe("");
    expect(fromSensitive.locationWithheld).toBe(true);
    expect(fromSensitive.region).toBe("south-america");
    expect(JSON.stringify(requests)).not.toContain("Peru");
    expect(fromOpen.country).toBe("Brazil");
    expect(fromOpen.locationWithheld).toBe(false);
  });

  it("ordena o mural do mais recente para o mais antigo", () => {
    const older = shared({ id: "older", healthAssessmentDate: "2025-11-30" });
    const requests = buildPrayerRequests([older, shared()]);

    expect(requests.map((request) => request.projectId)).toEqual([
      "shared",
      "older",
    ]);
  });
});

describe("countPrayerIndicators", () => {
  const projects = [
    shared(),
    shared({ id: "asia", location: "Indonesia", languageName: "Waima’a" }),
    makeProject({
      id: "answered",
      location: "Peru",
      needsItems: [need({ prayerShared: true, prayerAnswered: true })],
    }),
  ];

  it("conta pedidos, regiões e respondidas sobre o que é visível", () => {
    const indicators = countPrayerIndicators(buildPrayerRequests(projects));

    expect(indicators).toEqual({ gathered: 3, regions: 2, answered: 1 });
  });

  it("um pedido não autorizado não move nenhum indicador", () => {
    const unauthorized = makeProject({
      id: "unauthorized",
      location: "Kenya",
      prayerRequests: "Não compartilhem ainda.",
      prayerRequestsAudio: "data:audio/webm;base64,UklGRg==",
      needsItems: [need()],
    });

    const before = countPrayerIndicators(buildPrayerRequests(projects));
    const after = countPrayerIndicators(
      buildPrayerRequests([...projects, unauthorized]),
    );

    expect(after).toEqual(before);
  });
});

describe("groupPrayerRequests", () => {
  it("agrupa por região, da mais cheia para a menos cheia", () => {
    const requests = buildPrayerRequests([
      shared(),
      shared({ id: "shared-2", languageName: "Kaingang" }),
      shared({ id: "asia", location: "Indonesia" }),
    ]);

    const groups = groupPrayerRequests(requests);

    expect(groups.map((group) => group.region)).toEqual([
      "south-america",
      "asia",
    ]);
    expect(groups.map((group) => group.labelKey)).toEqual([
      "continent_south_america",
      "continent_asia",
    ]);
    expect(groups[0].requests).toHaveLength(2);
  });

  it("desempata pela ordem das regiões do organograma", () => {
    const requests = buildPrayerRequests([
      shared({ id: "asia", location: "Indonesia" }),
      shared(),
    ]);

    const groups = groupPrayerRequests(requests);

    expect(groups.map((group) => group.region)).toEqual([
      "south-america",
      "asia",
    ]);
  });

  it("não perde nem duplica pedido nenhum ao agrupar", () => {
    const requests = buildPrayerRequests([
      shared(),
      shared({ id: "asia", location: "Indonesia" }),
      makeProject({
        id: "needs",
        location: "Peru",
        needsItems: [need({ prayerShared: true })],
      }),
    ]);

    const grouped = groupPrayerRequests(requests).flatMap(
      (group) => group.requests,
    );

    expect(grouped.map((request) => request.id).sort()).toEqual(
      requests.map((request) => request.id).sort(),
    );
    for (const group of groupPrayerRequests(requests)) {
      for (const request of group.requests) {
        expect(request.region).toBe(group.region);
      }
    }
  });
});

describe("todo caminho de leitura passa pelo dono da visibilidade", () => {
  const RAW_FIELD =
    /\bprayerRequests\b|\bprayerVisibility\b|\bprayerRequestsAudio\b/u;
  const STRING_LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/gu;

  const withoutStringLiterals = (source: string): string =>
    source.replace(STRING_LITERAL, '""');

  const SHIPPED_SOURCE = /\.tsx?$/u;
  const TEST_FILE = /(?:^|\/)__tests__\//u;

  const RECORD_SURFACES_AND_OWNER = [
    "src/components/pages/ficha/tabs/saude/SaudeForm.tsx",
    "src/components/pages/ficha/tabs/saude/SaudeView.tsx",
    "src/components/pages/projetos/card.ts",
    "src/fixtures/blank.ts",
    "src/fixtures/seeds.ts",
    "src/stores/recordStore.ts",
    "src/types/project.ts",
    "src/utils/prayer.ts",
  ];

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    });
  }

  const readers = walk(join(process.cwd(), "src"))
    .map((path) => relative(process.cwd(), path).split("\\").join("/"))
    .filter((path) => SHIPPED_SOURCE.test(path) && !TEST_FILE.test(path))
    .filter((path) =>
      RAW_FIELD.test(withoutStringLiterals(readFileSync(path, "utf8"))),
    );

  it("nenhum arquivo novo lê os campos crus fora da lista", () => {
    expect(readers.sort()).toEqual([...RECORD_SURFACES_AND_OWNER].sort());
  });

  it("a varredura ignora o nome entre aspas e pega o acesso à propriedade", () => {
    expect(
      RAW_FIELD.test(withoutStringLiterals('["prayerRequests", isString]')),
    ).toBe(false);
    expect(
      RAW_FIELD.test(withoutStringLiterals("project.prayerRequests.trim()")),
    ).toBe(true);
    expect(
      RAW_FIELD.test(withoutStringLiterals("const { prayerVisibility } = p")),
    ).toBe(true);
  });

  it("o mural consome a consulta, nunca os campos crus", () => {
    expect(
      readers.filter((path) => path.startsWith("src/components/pages/oracao")),
    ).toEqual([]);
    expect(readers).not.toContain("src/fixtures/index.ts");
  });
});
