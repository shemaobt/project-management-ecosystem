import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

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

const { default: i18n } = await import("../../../../../i18n");
const { GLOBE_FOCUS_POINTS } = await import("../../../../../constants/geo");
const { TOUCH_TARGET_PX } = await import("../../../../../styles");
const { makeProject } = await import("../../../../../utils/__tests__/factory");
const { GlobeMarkers } = await import("../GlobeMarkers");
const {
  buildMarkerSources,
  markerClick,
  opensProject,
  paintOrder,
  placeMarkers,
} = await import("../markers");
const { groupWithin, sphericalCentre, spreadOffsets } =
  await import("../projection");

type Placed = ReturnType<typeof placeMarkers>[number];

const R = 180;
const VIEWBOX = 2 * (R + 30);
const DESKTOP = TOUCH_TARGET_PX / (640 / VIEWBOX);
const PHONE = TOUCH_TARGET_PX / (300 / VIEWBOX);
const [lambda, phi] = GLOBE_FOCUS_POINTS.find((p) => p.key === "af")!.coords;
const AF = { lambda, phi };

const kampala = makeProject({
  id: "kampala",
  languageName: "Luganda",
  location: "Uganda, Kampala",
  coords: [32.58, 0.35],
});
const jinja = makeProject({
  id: "jinja",
  languageName: "Fotos do Pulso",
  location: "Uganda, Jinja",
  coords: [33.2, 0.44],
});
const mbale = makeProject({
  id: "mbale",
  languageName: "ETEN Leituras",
  location: "Uganda, Mbale",
  coords: [34.17, 1.08],
});
const kpalime = makeProject({
  id: "kpalime",
  languageName: "Ewe",
  location: "Togo, Kpalimé",
  coords: [0.63, 6.9],
});
const UGANDA = ["kampala", "jinja", "mbale"];
const sources = buildMarkerSources([kampala, jinja, mbale, kpalime]);

const place = (gap: number, spread: readonly string[] | null) =>
  placeMarkers({ sources, rotation: AF, radius: R, gap, spread });

const byId = (markers: readonly Placed[], id: string) =>
  markers.find((m) => m.source.project.id === id)!;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function topmostAt(
  markers: readonly Placed[],
  point: { x: number; y: number },
  hitRadius: number,
) {
  return paintOrder(markers)
    .filter((m) => distance(m, point) <= hitRadius)
    .at(-1);
}

function minPairDistance(points: readonly { x: number; y: number }[]) {
  let min = Infinity;
  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) {
      min = Math.min(min, distance(points[a], points[b]));
    }
  }
  return min;
}

const EPSILON = 1e-9;

beforeAll(async () => {
  await i18n.changeLanguage("pt");
});

describe("Kampala, Jinja e Mbale no globo (PME-PRJ-041)", () => {
  it("a menos de 24 px na tela, os três entram no mesmo grupo — no desktop e no celular", () => {
    for (const gap of [DESKTOP, PHONE]) {
      const markers = place(gap, null);
      for (const id of UGANDA) {
        expect([...byId(markers, id).group].sort()).toEqual([...UGANDA].sort());
        expect(opensProject(byId(markers, id))).toBe(false);
      }
    }
  });

  it("Kpalimé, longe de Uganda, não se move nem entra no grupo", () => {
    const resting = place(DESKTOP, null);
    const spread = place(DESKTOP, UGANDA);
    expect(byId(resting, "kpalime").group).toEqual(["kpalime"]);
    expect(byId(spread, "kpalime").x).toBe(byId(resting, "kpalime").x);
    expect(byId(spread, "kpalime").y).toBe(byId(resting, "kpalime").y);
  });

  it("em repouso, o clique em qualquer um dos três afasta o grupo e gira até o centro dele, sem abrir projeto", () => {
    const markers = place(DESKTOP, null);
    for (const id of UGANDA) {
      const click = markerClick(byId(markers, id), markers);
      expect(click.select).toBeNull();
      expect([...(click.spread ?? [])].sort()).toEqual([...UGANDA].sort());
      expect(click.focus[0]).toBeCloseTo(33.32, 1);
      expect(click.focus[1]).toBeCloseTo(0.62, 1);
    }
  });

  it("afastados, os três ficam a pelo menos 24 px um do outro e cada clique abre o próprio projeto", () => {
    for (const gap of [DESKTOP, PHONE]) {
      const markers = place(gap, UGANDA);
      const members = UGANDA.map((id) => byId(markers, id));
      expect(minPairDistance(members)).toBeGreaterThanOrEqual(gap - EPSILON);
      for (const member of members) {
        expect(member.spread).toBe(true);
        const click = markerClick(member, markers);
        expect(click.select).toBe(member.source.project.id);
        expect(click.focus).toEqual(member.source.placement.coords);
        expect([...(click.spread ?? [])].sort()).toEqual([...UGANDA].sort());
      }
    }
  });

  it("afastados, no centro de cada marcador o alvo de cima é o dele", () => {
    for (const gap of [DESKTOP, PHONE]) {
      const markers = place(gap, UGANDA);
      for (const marker of markers.filter((m) => m.visible)) {
        expect(topmostAt(markers, marker, gap / 2)?.source.project.id).toBe(
          marker.source.project.id,
        );
      }
    }
  });

  it("em repouso, o alvo de cima no centro de um membro é do mesmo grupo, então o clique afasta o grupo certo", () => {
    const markers = place(DESKTOP, null);
    for (const id of UGANDA) {
      const top = topmostAt(markers, byId(markers, id), DESKTOP / 2);
      expect(top?.group).toBe(byId(markers, id).group);
    }
  });

  it("Kampala continua a oeste de Mbale depois de afastados", () => {
    for (const gap of [DESKTOP, PHONE]) {
      const markers = place(gap, UGANDA);
      expect(byId(markers, "kampala").x).toBeLessThan(byId(markers, "mbale").x);
    }
  });
});

describe("grupos pela distância na tela", () => {
  it("a exatamente um alvo de distância não agrupa; um fio abaixo agrupa", () => {
    expect(groupWithin([{ x: 0, y: 0 }, { x: 10, y: 0 }], 10)).toEqual([
      [0],
      [1],
    ]);
    expect(groupWithin([{ x: 0, y: 0 }, { x: 9.99, y: 0 }], 10)).toEqual([
      [0, 1],
    ]);
  });

  it("o grupo é transitivo: A perto de B e B perto de C juntam os três", () => {
    const chain = [
      { x: 0, y: 0 },
      { x: 32, y: 0 },
      { x: 8, y: 0 },
      { x: 16, y: 0 },
      { x: 24, y: 0 },
    ];
    expect(groupWithin(chain, 9)).toEqual([[0, 1, 2, 3, 4]]);
    expect(groupWithin(chain, 7)).toHaveLength(5);
  });

  it("lista vazia não tem grupo e marcador sozinho é um grupo de um", () => {
    expect(groupWithin([], 10)).toEqual([]);
    expect(groupWithin([{ x: 3, y: 4 }], 10)).toEqual([[0]]);
  });

  it("marcador do outro lado do globo não agrupa nem empurra ninguém", () => {
    const front = makeProject({ id: "front", coords: [20, 10] });
    const back = makeProject({ id: "back", coords: [-160, 10] });
    const rotation = { lambda: 20, phi: 0 };
    const alone = placeMarkers({
      sources: buildMarkerSources([front]),
      rotation,
      radius: R,
      gap: DESKTOP,
      spread: null,
    });
    const both = placeMarkers({
      sources: buildMarkerSources([front, back]),
      rotation,
      radius: R,
      gap: DESKTOP,
      spread: null,
    });
    expect(byId(both, "back").visible).toBe(false);
    expect(Math.abs(byId(both, "back").x - byId(both, "front").x)).toBeLessThan(
      DESKTOP,
    );
    expect(byId(both, "front")).toEqual(byId(alone, "front"));
    expect(byId(both, "front").group).toEqual(["front"]);
  });
});

describe("o desenho do grupo afastado", () => {
  it("de 2 a 200 membros, todo par fica a pelo menos um alvo", () => {
    for (let count = 2; count <= 200; count++) {
      const offsets = spreadOffsets(count, DESKTOP, 0.7);
      expect(offsets).toHaveLength(count);
      expect(minPairDistance(offsets)).toBeGreaterThanOrEqual(
        DESKTOP - EPSILON,
      );
    }
  });

  it("até seis cabem num anel só, de raio menor ou igual a um alvo", () => {
    for (let count = 2; count <= 6; count++) {
      const radii = spreadOffsets(count, 1).map((o) => Math.hypot(o.x, o.y));
      expect(Math.max(...radii)).toBeLessThanOrEqual(1 + EPSILON);
      expect(Math.min(...radii)).toBeCloseTo(Math.max(...radii));
    }
  });

  it("os 28 de Papua-Nova Guiné, todos no mesmo ponto, cabem em três alvos de raio", () => {
    const radii = spreadOffsets(28, 1).map((o) => Math.hypot(o.x, o.y));
    expect(Math.max(...radii)).toBeLessThanOrEqual(3 + EPSILON);
  });

  it("pontos coincidentes afastados abrem cada um o seu", () => {
    const png = Array.from({ length: 28 }, (_, i) =>
      makeProject({ id: `png-${i}`, coords: [145, -6] }),
    );
    const markers = placeMarkers({
      sources: buildMarkerSources(png),
      rotation: { lambda: 145, phi: -6 },
      radius: R,
      gap: PHONE,
      spread: png.map((p) => p.id),
    });
    expect(minPairDistance(markers)).toBeGreaterThanOrEqual(PHONE - EPSILON);
    for (const marker of markers) {
      expect(topmostAt(markers, marker, PHONE / 2)).toBe(marker);
    }
  });

  it("o centro esférico de pontos iguais é o próprio ponto", () => {
    const [lng, lat] = sphericalCentre([
      [145, -6],
      [145, -6],
      [145, -6],
    ]);
    expect(lng).toBeCloseTo(145);
    expect(lat).toBeCloseTo(-6);
  });
});

describe("a ordem de pintura põe o grupo afastado por cima", () => {
  const marker = (id: string, x: number, spread: boolean): Placed => ({
    ...place(DESKTOP, null)[0],
    source: buildMarkerSources([makeProject({ id, coords: [10, 10] })])[0],
    x,
    y: 0,
    group: [id],
    spread,
  });

  it("um vizinho em repouso por cima de um afastado não rouba o clique dele", () => {
    const markers = [marker("afastado", 0, true), marker("vizinho", 5, false)];
    expect(topmostAt(markers, markers[0], 8)?.source.project.id).toBe(
      "afastado",
    );
    expect(paintOrder(markers).map((m) => m.source.project.id)).toEqual([
      "vizinho",
      "afastado",
    ]);
  });
});

describe("o desenho dos marcadores no SVG", () => {
  const render = (spread: readonly string[] | null) =>
    renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(GlobeMarkers, {
          markers: place(DESKTOP, spread),
          hitRadius: DESKTOP / 2,
          hoveredId: null,
          selectedId: null,
          onHover: () => undefined,
          onSelect: () => undefined,
        }),
      ),
    );

  const markerGroups = (html: string) =>
    html.split('<g transform="').slice(1);

  it("cada marcador tem um único círculo que recebe o ponteiro, de meio alvo", () => {
    const groups = markerGroups(render(null));
    expect(groups).toHaveLength(4);
    for (const group of groups) {
      expect(group).toMatch(/^[^>]*pointer-events:none/);
      const targets = group.match(/<circle[^>]*pointer-events="all"[^>]*>/g);
      expect(targets).toHaveLength(1);
      expect(targets?.[0]).toContain(`r="${DESKTOP / 2}"`);
    }
  });

  it("o grupo afastado é desenhado por último", () => {
    const titles = markerGroups(render(UGANDA)).map(
      (group) => /<title>([^<·]*)/.exec(group)?.[1].trim(),
    );
    expect(titles[0]).toBe("Ewe");
    expect(titles.slice(1).sort()).toEqual(
      ["ETEN Leituras", "Fotos do Pulso", "Luganda"].sort(),
    );
  });

  it("o título do grupo em repouso diz quantos são e que o clique mostra cada um", () => {
    const html = render(null);
    expect(html).toContain("3 projetos neste ponto — clique para ver cada um");
    expect(render(UGANDA)).not.toContain("projetos neste ponto");
  });
});
