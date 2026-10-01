import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

const { default: i18n } = await import("../../../i18n");
const { MemoryRouter } = await import("react-router-dom");
const { AuthContext } = await import("../../../contexts/session");
const { sessionFor } = await import("../acesso/__tests__/stubs");
const { makeProject } = await import("../../../utils/__tests__/factory");
const { createEmptyProject } = await import("../../../fixtures/blank");
const { buildEtenReport } = await import("../../../utils/etenCredits");
const { buildPrayerRequests } = await import("../../../utils/prayer");
const { EquipeView } = await import("../equipe");
const { EtenView } = await import("../eten");
const { FormulariosView } = await import("../formularios");
const { OracaoView } = await import("../oracao");
const { IntercessoresView } = await import("../intercessores/IntercessoresPage");
const { DesignSystemPage } = await import("../design-system/DesignSystemPage");
const { RitmoPage } = await import("../ritmo/RitmoPage");
const { Sidebar } = await import("../projetos/Sidebar");
const { emptyCounts } = await import("../../../utils/search");
const { REGIONS } = await import("../../../constants/regions");

const inApp = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        AuthContext.Provider,
        {
          value: {
            ...sessionFor(["globalStrategist"]),
            canSeeRegion: () => true,
          },
        },
        element,
      ),
    ),
  );

interface Heading {
  level: number;
  text: string;
}

const HEADING = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gu;

function outline(markup: string): Heading[] {
  return [...markup.matchAll(HEADING)].map(([, level, inner]) => ({
    level: Number(level),
    text: inner.replace(/<[^>]*>/gu, "").trim(),
  }));
}

/**
 * Descends at most one level at a time, from the level the page wrapper has already given
 * (`after`). Going back up is free: an h3 may be followed by the next h2.
 */
function skips(headings: readonly Heading[], after: number): Heading[] {
  const found: Heading[] = [];
  let previous = after;
  for (const heading of headings) {
    if (heading.level > previous + 1) found.push(heading);
    previous = heading.level;
  }
  return found;
}

const NOW = new Date(2027, 5, 14);

const areas: Record<string, () => string> = {
  Equipe: () =>
    renderToStaticMarkup(
      createElement(EquipeView, {
        regions: REGIONS.map((region) => ({
          key: region.key,
          labelKey: region.labelKey,
          team: { coordinator: "", obtLab: "", resourceCircle: "" },
        })),
        projects: [{ ...createEmptyProject("p1"), location: "Peru" }],
        changes: [],
        onSave: () =>
          Promise.resolve({
            outcome: { changed: 0, filled: 0, cleared: 0 },
            failedRegions: [],
          }),
      }),
    ),
  ETEN: () =>
    renderToStaticMarkup(
      createElement(EtenView, {
        year: 2026,
        onYearChange: () => {},
        report: buildEtenReport(
          [
            {
              ...createEmptyProject("kadiweu"),
              languageName: "Kadiwéu",
              location: "Brazil",
              inETEN: true,
              totalUnits: 260,
              status: "concluido",
              completedDate: "2026-03-10",
              approvedUnits: 260,
            },
          ],
          2026,
          [],
          NOW,
        ),
        error: null,
        onRetry: () => {},
        now: NOW,
      }),
    ),
  Formulários: () =>
    inApp(
      createElement(FormulariosView, {
        projects: [makeProject({ id: "a", languageName: "Aurora" })],
        submissions: [],
        now: NOW,
      }),
    ),
  Oração: () =>
    renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(OracaoView, {
          requests: buildPrayerRequests([
            makeProject({
              id: "brazil",
              location: "Brazil",
              languageName: "Tikuna",
              prayerRequests: "Orem pelos anciãos.",
              prayerVisibility: "rede",
            }),
          ]),
        }),
      ),
    ),
  Intercessores: () =>
    renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(IntercessoresView, {
          people: [
            {
              id: "i1",
              name: "João Alves",
              country: "PT",
              contactChannel: "phone",
              contactHint: "…5678",
              sensitiveCountry: false,
              addedAt: "2026-08-10",
              reviewedAt: null,
              lastSentAt: null,
              reviewDue: false,
              consents: [
                { context: "network", basis: "verbal", recordedAt: "2026-08-10" },
                { context: "directory", basis: "verbal", recordedAt: "2026-08-10" },
              ],
            },
          ],
          withheldCount: 0,
          withheldReviewDueCount: 0,
          onAdd: () => Promise.reject(new Error("unused")),
          onUpdate: () => Promise.reject(new Error("unused")),
          onRemove: () => Promise.reject(new Error("unused")),
          onRevealContact: async () => null,
          onReview: () => Promise.reject(new Error("unused")),
        }),
      ),
    ),
  Ritmo: () => inApp(createElement(RitmoPage)),
  Componentes: () => inApp(createElement(DesignSystemPage)),
};

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("cada área tem um só h1 e a hierarquia desce sem pular nível", () => {
  for (const [area, render] of Object.entries(areas)) {
    it(`${area}: um h1 e nenhum salto`, () => {
      const headings = outline(render());

      expect(
        headings.filter((heading) => heading.level === 1).length,
        JSON.stringify(headings),
      ).toBe(1);
      expect(skips(headings, 0), JSON.stringify(headings)).toEqual([]);
    });
  }
});

describe("Projetos: a barra lateral desce do h1 que a página dá", () => {
  const sidebar = () =>
    inApp(
      createElement(Sidebar, {
        baseline: emptyCounts(),
        shown: 0,
        total: 0,
        counts: emptyCounts(),
      }),
    );

  it("não tem h1 próprio e nenhum salto a partir do h1 da página", () => {
    const headings = outline(sidebar());

    expect(headings.some((heading) => heading.level === 1)).toBe(false);
    expect(skips(headings, 1), JSON.stringify(headings)).toEqual([]);
  });

  it("as visões salvas, o time por região e os filtros são h2, e cada grupo de filtro é h3", () => {
    const headings = outline(sidebar());

    expect(headings.filter((heading) => heading.level === 2).map((heading) => heading.text)).toEqual(
      expect.arrayContaining([
        i18n.t("sb_saved_views"),
        i18n.t("sb_regional_team"),
        i18n.t("sb_filters_heading"),
      ]),
    );
    expect(
      headings.filter((heading) => heading.level === 3).map((heading) => heading.text),
    ).toEqual(expect.arrayContaining([i18n.t("sb_status"), i18n.t("sb_team"), i18n.t("sb_health")]));
  });

  it("o h2 Filtros é só para leitor de tela", () => {
    const markup = sidebar();
    const tag = markup.match(/<h2\b[^>]*>(?=Filtros<)/u)?.[0] ?? "";

    expect(tag).toContain("sr-only");
  });
});

describe("o detector vê o que tem de ver", () => {
  it("um h3 logo depois do h1 é um salto, e voltar de nível não é", () => {
    const pulo = outline("<h1>A</h1><h3>B</h3>");
    const volta = outline("<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2>");

    expect(skips(pulo, 0).map((heading) => heading.text)).toEqual(["B"]);
    expect(skips(volta, 0)).toEqual([]);
  });

  it("um h2 sem h1 acima é um salto, a não ser que a página já tenha dado o h1", () => {
    const headings = outline("<h2>A</h2>");

    expect(skips(headings, 0)).toHaveLength(1);
    expect(skips(headings, 1)).toEqual([]);
  });
});

describe("o título de seção da vitrine é um heading", () => {
  it("cada seção de /design-system abre com um h2 sob o h1", () => {
    const headings = outline(areas.Componentes());

    expect(headings.filter((heading) => heading.level === 2).length).toBeGreaterThan(3);
  });
});
