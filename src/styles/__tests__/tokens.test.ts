import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RATING_ON, RATING_TONES } from "../../constants/health";
import { MEETING_STATES } from "../../constants/meetings";
import {
  HEALTH_DOT_TONES,
  HEALTH_TONES,
  REPORTING_TONES,
  RHYTHM_TONES,
  STALE_TONES,
} from "../badges";
import {
  NEED_STATUSES,
  NEED_STATUS_TONES,
  NEED_URGENCIES,
  NEED_URGENCY_TONES,
  OVERALL_HEALTH_STATES,
  STALE_STATUSES,
} from "../../constants/project";
import {
  RECORD_TABS,
  TAB_MARKER_TONES,
} from "../../constants/recordTabs";

const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");

const HUE_TOLERANCE = 6;
const AA_SMALL_TEXT = 4.5;
const AA_NON_TEXT = 3;

function token(name: string): string {
  const prefix = `--${name}:`;
  const line = css
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));
  if (!line) throw new Error(name);
  const value = line.slice(prefix.length).replace(";", "").trim();
  const indirection = /^var\(--([a-z0-9-]+)\)$/u.exec(value);
  return indirection ? token(indirection[1]) : value;
}

type Paint = { rgb: number[]; alpha: number };

function paint(name: string): Paint {
  const value = token(name);
  const wash = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/u.exec(value);
  if (wash) {
    return { rgb: wash.slice(1, 4).map(Number), alpha: Number(wash[4]) };
  }
  const digits = value.slice(1);
  return {
    rgb: [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16)),
    alpha: 1,
  };
}

function channels(name: string): number[] {
  return paint(name).rgb;
}

// Uma cor translúcida não tem luminância própria: o que se lê é o que ela pinta
// sobre o que está atrás. Medir o rgba declarado devolve o número de uma cor que
// ninguém pinta — quem mede um wash é o contrastOn, com a superfície na mão.
function opaque(name: string): number[] {
  const { rgb, alpha } = paint(name);
  if (alpha !== 1) {
    throw new Error(
      `${name} é translúcido: meça com contrastOn(…, superfície), não com contrast`,
    );
  }
  return rgb;
}

function over(name: string, surface: string): number[] {
  const { rgb, alpha } = paint(name);
  return opaque(surface).map((base, index) =>
    Math.round(alpha * rgb[index] + (1 - alpha) * base),
  );
}

function hue(name: string): number {
  const [red, green, blue] = channels(name).map((value) => value / 255);
  const max = Math.max(red, green, blue);
  const span = max - Math.min(red, green, blue);
  if (span === 0) return 0;
  const sector =
    max === red
      ? ((green - blue) / span) % 6
      : max === green
        ? (blue - red) / span + 2
        : (red - green) / span + 4;
  return (sector * 60 + 360) % 360;
}

function luminanceOf(rgb: number[]): number {
  const [red, green, blue] = rgb
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function luminance(name: string): number {
  return luminanceOf(opaque(name));
}

function ratio(one: number, other: number): number {
  const [lighter, darker] = [one, other].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrast(foreground: string, background: string): number {
  return ratio(luminance(foreground), luminance(background));
}

function contrastOn(
  foreground: string,
  background: string,
  surface: string,
): number {
  return ratio(
    luminanceOf(over(foreground, surface)),
    luminanceOf(over(background, surface)),
  );
}

describe("uma cor translúcida se mede pelo que ela pinta, não pelo rgba declarado", () => {
  it("contrast recusa um wash, em vez de devolver o número de uma cor que ninguém pinta", () => {
    expect(() =>
      contrast("color-status-good-ink", "color-status-good-bg"),
    ).toThrow(/translúcido/u);
  });

  it("e recusa porque o número real depende do que está atrás do wash", () => {
    const sobrePapelBranco = contrastOn(
      "color-status-good-ink",
      "color-status-good-bg",
      "bg-elevated",
    );
    const sobreOMuted = contrastOn(
      "color-status-good-ink",
      "color-status-good-bg",
      "bg-muted",
    );
    expect(sobrePapelBranco).toBeGreaterThan(sobreOMuted);
    expect(sobreOMuted).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });
});

describe("um segundo valor de uma cor da paleta é peso de tinta, não cor nova", () => {
  const inkPairs: { ink: string; base: string }[] = [
    { ink: "azul-ink", base: "shema-azul" },
    { ink: "verde-claro-ink", base: "shema-verde-claro" },
    { ink: "accent-hover", base: "shema-telha" },
    { ink: "accent-press", base: "shema-telha" },
    { ink: "status-attention-fg", base: "status-attention" },
    { ink: "status-attention-ink", base: "status-attention" },
    { ink: "deadline-soon", base: "status-attention" },
    { ink: "status-good-ink", base: "status-good" },
  ];

  for (const pair of inkPairs) {
    it(`${pair.ink} fica na matiz de ${pair.base}`, () => {
      expect(Math.abs(hue(pair.ink) - hue(pair.base))).toBeLessThan(
        HUE_TOLERANCE,
      );
    });
  }
});

describe("o azul da paleta precisa da tinta para carregar significado", () => {
  it("não passa em texto pequeno sobre bg-muted, a tinta passa", () => {
    expect(contrast("shema-azul", "bg-muted")).toBeLessThan(AA_SMALL_TEXT);
    expect(contrast("azul-ink", "bg-muted")).toBeGreaterThanOrEqual(
      AA_SMALL_TEXT,
    );
  });

  it("nem como traço sobre o papel do Diário, onde o anel do meio vive", () => {
    expect(contrast("shema-azul", "paper")).toBeLessThan(AA_NON_TEXT);
    expect(contrast("azul-ink", "paper")).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe("o número da aba se lê sobre o marcador dela", () => {
  const RAW_TOKEN: Record<string, string> = {
    verde: "shema-verde",
    "verde-claro": "shema-verde-claro",
    "verde-claro-ink": "verde-claro-ink",
    azul: "shema-azul",
    "azul-ink": "azul-ink",
    telha: "shema-telha",
    "status-attention": "status-attention",
    "status-attention-fg": "status-attention-fg",
    "record-health": "record-health",
    areia: "shema-areia",
    preto: "shema-preto",
    "on-dark": "shema-branco",
    "on-brand": "shema-branco",
    "on-light": "shema-verde",
    muted: "bg-muted",
    "fg-muted": "fg-muted",
  };

  const read = (tone: string, prefix: string): string => {
    const found = tone
      .split(" ")
      .find((entry) => entry.startsWith(`${prefix}-`))
      ?.slice(prefix.length + 1);
    if (!found || !RAW_TOKEN[found]) throw new Error(`${prefix}: ${tone}`);
    return RAW_TOKEN[found];
  };

  for (const tab of RECORD_TABS) {
    it(`${tab} carrega o numeral de 10px`, () => {
      const tone = TAB_MARKER_TONES[tab];
      expect(contrast(read(tone, "text"), read(tone, "bg"))).toBeGreaterThanOrEqual(
        AA_SMALL_TEXT,
      );
    });
  }

  describe("a nota escolhida se lê sobre o próprio botão", () => {
    const bare = (tone: string): string =>
      tone.split(" ").join(" ").replaceAll(RATING_ON, "");

    for (const [rating, tone] of Object.entries(RATING_TONES)) {
      it(`${rating || "não avaliado"} carrega o rótulo de 11px`, () => {
        const plain = bare(tone);
        expect(
          contrast(read(plain, "text"), read(plain, "bg")),
        ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
      });
    }

    it("cada urgência e cada estado do pedido se leem no próprio selo", () => {
      const tones = [
        ...Object.entries(NEED_URGENCY_TONES),
        ...Object.entries(NEED_STATUS_TONES),
      ];
      expect(tones).toHaveLength(
        NEED_URGENCIES.length + NEED_STATUSES.length,
      );
      for (const [name, tone] of tones) {
        expect(
          contrast(read(tone, "text"), read(tone, "bg")),
          name,
        ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
      }
    });

    it("a borda do botão marcado acompanha o preenchimento", () => {
      for (const tone of Object.values(RATING_TONES)) {
        const plain = bare(tone);
        expect(read(plain, "border")).toBe(read(plain, "bg"));
      }
    });
  });
});

describe("cada estado da reunião se lê no próprio selo", () => {
  const tokenOf = (tone: string, prefix: string): string => {
    const found = tone
      .split(" ")
      .find((entry) => entry.startsWith(`${prefix}-`));
    if (!found) throw new Error(`${prefix}: ${tone}`);
    return found.slice(prefix.length + 1);
  };

  it("os quatro estados estão cobertos", () => {
    expect(Object.keys(RHYTHM_TONES).sort()).toEqual([...MEETING_STATES].sort());
  });

  for (const state of MEETING_STATES) {
    it(`${state} carrega o rótulo de 11px`, () => {
      const tone = RHYTHM_TONES[state];
      expect(
        contrast(tokenOf(tone, "text"), tokenOf(tone, "bg")),
      ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
    });
  }
});

describe("os selos de saúde e de atualização se leem onde quer que apareçam", () => {
  const SURFACES = ["bg-elevated", "bg", "bg-muted", "paper"] as const;

  const colour = (tone: string, prefix: string): string => {
    const found = tone
      .split(" ")
      .find((entry) => entry.startsWith(`${prefix}-`));
    if (!found) throw new Error(`${prefix}: ${tone}`);
    return `color-${found.slice(prefix.length + 1)}`;
  };

  it("os quatro estados de saúde e os três de atualização estão cobertos", () => {
    expect(Object.keys(HEALTH_TONES).sort()).toEqual(
      [...OVERALL_HEALTH_STATES].sort(),
    );
    expect(Object.keys(HEALTH_DOT_TONES).sort()).toEqual(
      [...OVERALL_HEALTH_STATES].sort(),
    );
    expect(Object.keys(STALE_TONES).sort()).toEqual([...STALE_STATUSES].sort());
  });

  describe("a pílula, cujo preenchimento translúcido muda com o que está atrás", () => {
    const pills: [string, string][] = [
      ...Object.entries(HEALTH_TONES).map(
        ([state, tone]): [string, string] => [`saúde ${state}`, tone],
      ),
      ...Object.entries(STALE_TONES).map(
        ([state, tone]): [string, string] => [`atualização ${state}`, tone],
      ),
    ];

    for (const [name, tone] of pills) {
      it(`${name} carrega o rótulo de 11px sobre as quatro superfícies`, () => {
        for (const surface of SURFACES) {
          expect(
            contrastOn(colour(tone, "text"), colour(tone, "bg"), surface),
            surface,
          ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
        }
      });
    }

    it("a tinta anterior de cada família não bastava sobre bg-muted — por isso existe a nova", () => {
      expect(
        contrastOn("color-verde-claro-ink", "color-status-good-bg", "bg-muted"),
      ).toBeLessThan(AA_SMALL_TEXT);
      expect(
        contrastOn(
          "color-status-attention-fg",
          "color-status-attention-bg",
          "bg-muted",
        ),
      ).toBeLessThan(AA_SMALL_TEXT);
    });
  });

  describe("o ponto, que é o que os cartões e a aba Saúde de fato mostram", () => {
    for (const state of OVERALL_HEALTH_STATES) {
      it(`${state} carrega o glifo sobre o próprio preenchimento`, () => {
        const tone = HEALTH_DOT_TONES[state];
        expect(
          tone,
          "um véu sobre o selo inteiro apaga o glifo junto com o preenchimento",
        ).not.toMatch(/\bopacity-/u);
        expect(
          contrast(colour(tone, "text"), colour(tone, "bg")),
        ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
      });
    }
  });
});

describe("o telha sobre o realce suave também precisa da tinta", () => {
  it("não passa em texto pequeno, a tinta passa", () => {
    expect(contrast("shema-telha", "accent-soft")).toBeLessThan(AA_SMALL_TEXT);
    expect(contrast("accent-press", "accent-soft")).toBeGreaterThanOrEqual(
      AA_SMALL_TEXT,
    );
  });
});

describe("o estado do relatório se lê sobre a superfície do cartão", () => {
  const REPORTING_STATES = ["reported", "awaiting", "never"] as const;
  const PALETTE_TOKEN: Record<string, string> = { telha: "shema-telha" };

  it("os três estados estão cobertos", () => {
    expect(Object.keys(REPORTING_TONES).sort()).toEqual(
      [...REPORTING_STATES].sort(),
    );
  });

  for (const state of REPORTING_STATES) {
    it(`${state} passa em texto pequeno sobre bg-elevated`, () => {
      const tone = REPORTING_TONES[state];
      expect(tone.startsWith("text-"), tone).toBe(true);
      const utility = tone.slice("text-".length);
      expect(
        contrast(PALETTE_TOKEN[utility] ?? utility, "bg-elevated"),
      ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
    });
  }
});

describe("a interface tem duas famílias, e só as que o tema declara", () => {
  const SHIPPED = /\.tsx?$/u;
  const TEST_FILE = /(?:^|\/)__tests__\//u;
  const FONT_UTILITY = /(?:^|[\s"'`])font-([a-z]+)\b/gu;

  const WEIGHTS = new Set([
    "thin",
    "extralight",
    "light",
    "normal",
    "medium",
    "semibold",
    "bold",
    "extrabold",
    "black",
  ]);

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    });

  const declared = new Set(
    [...css.matchAll(/^\s*--font-([a-z]+):/gmu)].map((match) => match[1]),
  );

  const used = new Map<string, string[]>();
  for (const path of walk(join(process.cwd(), "src"))) {
    if (!SHIPPED.test(path) || TEST_FILE.test(path)) continue;
    for (const match of readFileSync(path, "utf8").matchAll(FONT_UTILITY)) {
      if (WEIGHTS.has(match[1])) continue;
      used.set(match[1], [...(used.get(match[1]) ?? []), path]);
    }
  }

  it("o tema declara sans, serif e display, e nada mais", () => {
    expect([...declared].sort()).toEqual(["display", "sans", "serif"]);
  });

  it("nenhum arquivo que ships pede uma família fora do tema", () => {
    const undeclared = [...used].filter(([family]) => !declared.has(family));
    expect(undeclared).toEqual([]);
  });
});

describe("os três anéis se distinguem sobre o papel do Diário", () => {
  const RING_COLOURS = ["shema-telha", "azul-ink", "shema-verde-claro"];

  for (const colour of RING_COLOURS) {
    it(`${colour} passa como objeto gráfico`, () => {
      expect(contrast(colour, "paper")).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  }
});

describe("a voz urgente é um vermelho próprio, e o halo é da mesma série", () => {
  it("o ponto urgente carrega significado sobre o painel e sobre a tela", () => {
    expect(contrast("urgent", "bg-elevated")).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
    expect(contrast("urgent", "bg")).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it("e serve de tinta de texto pequeno onde a etiqueta Urgente vive", () => {
    expect(contrast("urgent", "bg-elevated")).toBeGreaterThanOrEqual(
      AA_SMALL_TEXT,
    );
  });

  it("é mais fundo que o telha, para as duas vozes não se confundirem", () => {
    expect(luminance("urgent")).toBeLessThan(luminance("status-critical"));
  });

  it("urgent-soft fica na matiz de urgent", () => {
    expect(Math.abs(hue("urgent-soft") - hue("urgent"))).toBeLessThan(
      HUE_TOLERANCE,
    );
  });
});
