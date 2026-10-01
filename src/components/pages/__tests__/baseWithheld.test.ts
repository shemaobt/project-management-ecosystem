import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, ReadAs } from "../../../types/project";

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
const { makeProject } = await import("../../../utils/__tests__/factory");
const { NOTIF_DEFAULTS } = await import("../../../constants/notifications");
const { ProjectCardAtlas } = await import("../projetos/ProjectCardAtlas");
const { ProjectCardDiario } = await import(
  "../projetos/Journal/ProjectCardDiario"
);
const { ScopeSection } = await import("../notificacoes/PrefsSections");
const { RequestCard } = await import("../oracao/RequestCard");
const { projectOptionLabel } = await import("../../../utils/forms");
const { buildNotifications } = await import("../../../utils/notifications");
const { buildPrayerRequests } = await import("../../../utils/prayer");
const { filterProjects, matchesSearch } = await import("../../../utils/search");
const { INDICATORS, indicatorCount } = await import(
  "../../../utils/indicators"
);
const { EMPTY_FILTERS } = await import("../../../stores/filtersStore");

const NOW = new Date("2026-09-20T12:00:00");
const BASE = "Base Farol Sintético";
const noop = () => {};
const BASES = INDICATORS.find((spec) => spec.id === "bases")!;

/** A project whose base names nothing real, and which every output below has a reason to show. */
const project = (over: Partial<Project> = {}): Project =>
  makeProject({
    id: "farol",
    languageName: "Língua Sintética",
    location: "Peru, Vila Sintética",
    team: BASE,
    ywamBase: BASE,
    status: "em-andamento",
    lastUpdated: "2026-09-10",
    healthAssessmentDate: "2026-09-18",
    healthEmotional: "critica",
    prayerRequests: "Orem pela equipe desta semana.",
    prayerVisibility: "rede",
    ...over,
  });

/** Every place the issue names, each rendering or deriving what it shows for `p`. */
const PLACES: Record<string, (p: Project) => string> = {
  "projetos/ProjectCardAtlas": (p) =>
    renderToStaticMarkup(
      createElement(ProjectCardAtlas, { project: p, onOpen: noop }),
    ),
  "projetos/Journal/ProjectCardDiario": (p) =>
    renderToStaticMarkup(
      createElement(ProjectCardDiario, { project: p, index: 0, onOpen: noop }),
    ),
  "formularios/ProjectSelector": (p) => projectOptionLabel(p),
  "notificacoes/PrefsSections": (p) =>
    renderToStaticMarkup(
      createElement(ScopeSection, {
        prefs: { ...NOTIF_DEFAULTS, scope: "custom", customProjectIds: [p.id] },
        handlers: {
          setEnabled: noop,
          toggleChannel: noop,
          setWhen: noop,
          setScope: noop,
          setEmailAddr: noop,
          setPhoneAddr: noop,
          toggleCustomProject: noop,
        },
        projects: [p],
      }),
    ),
  "utils/notifications": (p) => JSON.stringify(buildNotifications([p], NOW)),
  "utils/prayer + oracao/RequestCard": (p) =>
    buildPrayerRequests([p])
      .map(
        (request) =>
          JSON.stringify(request) +
          renderToStaticMarkup(createElement(RequestCard, { request })),
      )
      .join(""),
  "utils/search": (p) =>
    [
      matchesSearch(p, BASE) ? BASE : "",
      ...Object.keys(filterProjects([p], EMPTY_FILTERS, "", NOW).counts.team),
    ].join(" "),
  "utils/indicators": (p) =>
    indicatorCount(BASES, [p], NOW) > 0 ? BASE : "",
};

const LEAVING = [
  "utils/notifications",
  "utils/prayer + oracao/RequestCard",
] as const;

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a base de um projeto sensível não aparece em nenhum dos nove lugares", () => {
  it("a lista percorre exatamente os nove lugares da issue", () => {
    // Nine places: the prayer wall's query and its card are one place in the issue.
    expect(Object.keys(PLACES)).toHaveLength(8);
    expect(
      Object.keys(PLACES).flatMap((place) => place.split(" + ")),
    ).toHaveLength(9);
  });

  it.each(Object.keys(PLACES))(
    "%s mostra a base de um projeto aberto — o controle",
    (place) => {
      expect(PLACES[place](project())).toContain(BASE);
    },
  );

  it.each(Object.keys(PLACES))(
    "%s não renderiza a base de um projeto sensível que nenhum servidor leu",
    (place) => {
      expect(PLACES[place](project({ sensitiveCountry: true }))).not.toContain(
        BASE,
      );
    },
  );

  it.each(Object.keys(PLACES))(
    "%s não renderiza a base de um projeto sensível lido como other",
    (place) => {
      const read: ReadAs = "other";
      expect(
        PLACES[place](project({ sensitiveCountry: true, readAs: read })),
      ).not.toContain(BASE);
    },
  );

  it.each(Object.keys(PLACES))(
    "%s: lido como coordenação, a base só aparece nas leituras do console",
    (place) => {
      const markup = PLACES[place](
        project({ sensitiveCountry: true, readAs: "coordination" }),
      );
      if ((LEAVING as readonly string[]).includes(place)) {
        expect(markup).not.toContain(BASE);
      } else {
        expect(markup).toContain(BASE);
      }
    },
  );
});
