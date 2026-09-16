import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
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
const { StatusBadge, StatusDot, PriorityPin } = await import(
  "../../common/StatusBadge"
);
const { OVERALL_HEALTH_STATES, PROJECT_PRIORITIES, STALE_STATUSES } =
  await import("../../../constants/project");
const { MEETING_STATES } = await import("../../../constants/meetings");
const {
  HEALTH_LABEL_KEYS,
  PRIORITY_LABEL_KEYS,
  RHYTHM_LABEL_KEYS,
  STALE_LABEL_KEYS,
} = await import("../../../constants/status");
const { CONTENT_ANCHOR_ID } = await import("../../../utils/focus");

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function shipped(): { path: string; source: string }[] {
  return walk(SRC)
    .filter((path) => /\.tsx?$/u.test(path) && !/__tests__/u.test(path))
    .map((path) => ({
      path: relative(process.cwd(), path).split("\\").join("/"),
      source: readFileSync(path, "utf8"),
    }));
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("toda tela tem como pular o cabeçalho", () => {
  const shell = read("src/components/layout/AppShell.tsx");

  it("o atalho é o primeiro nó focável do documento", () => {
    const skip = shell.indexOf("skipLink");
    const header = shell.indexOf("<AppHeader");
    expect(skip).toBeGreaterThan(-1);
    expect(skip).toBeLessThan(header);
  });

  it("e aponta para a mesma âncora que o conteúdo declara", () => {
    expect(shell).toContain(`href={\`#\${CONTENT_ANCHOR_ID}\`}`);
    expect(shell).toContain(`<main id={CONTENT_ANCHOR_ID} tabIndex={-1}`);
  });

  it("a âncora é programaticamente focável, não um alvo só de rolagem", () => {
    expect(shell).toMatch(/<main[^>]*tabIndex=\{-1\}/u);
  });
});

describe("nenhum modal devolve o foco para lugar nenhum", () => {
  it("as duas superfícies em camada resgatam o foco ao fechar", () => {
    for (const path of [
      "src/components/ui/Dialog.tsx",
      "src/components/ui/Sheet.tsx",
    ]) {
      const source = read(path);
      expect(source, path).toContain("onCloseAutoFocus");
      expect(source, path).toContain("scheduleFocusRescue()");
    }
  });

  it("o resgate roda depois do handler de quem chama, não no lugar dele", () => {
    for (const path of [
      "src/components/ui/Dialog.tsx",
      "src/components/ui/Sheet.tsx",
    ]) {
      const source = read(path);
      const own = source.indexOf("onCloseAutoFocus?.(event)");
      const rescue = source.indexOf("scheduleFocusRescue()");
      expect(own, path).toBeGreaterThan(-1);
      expect(own, path).toBeLessThan(rescue);
    }
  });

  it("nenhuma tela monta o conteúdo do Radix sem passar pelo primitivo", () => {
    const offenders = shipped().filter(
      (entry) =>
        !entry.path.startsWith("src/components/ui/") &&
        /DialogPrimitive\.Content|<Dialog\.Content/u.test(entry.source),
    );
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });
});

describe("nenhum estado é distinguível só por cor", () => {
  const markup = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
    renderToStaticMarkup(element);

  it("cada estado de saúde carrega um ícone e o próprio nome", () => {
    for (const state of OVERALL_HEALTH_STATES) {
      const label = i18n.t(HEALTH_LABEL_KEYS[state]);
      const html = markup(
        createElement(StatusBadge, { kind: "health", state, label }),
      );
      expect(html, state).toContain("<svg");
      expect(html, state).toContain(label);
    }
  });

  it("os quatro ícones de saúde são quatro desenhos diferentes", () => {
    const shapes = OVERALL_HEALTH_STATES.map((state) => {
      const html = markup(
        createElement(StatusBadge, { kind: "health", state, label: "x" }),
      );
      return [...html.matchAll(/<path[^>]*d="([^"]+)"/gu)]
        .map((match) => match[1])
        .join("|");
    });
    expect(new Set(shapes).size).toBe(OVERALL_HEALTH_STATES.length);
  });

  it("o ponto de saúde carrega o glifo e a frase lida em voz alta", () => {
    for (const state of OVERALL_HEALTH_STATES) {
      const html = markup(
        createElement(StatusDot, { state, label: "Emocional" }),
      );
      expect(html, state).toContain("sr-only");
      expect(html, state).toContain(i18n.t(HEALTH_LABEL_KEYS[state]));
      expect(html, state).toContain("Emocional");
    }
  });

  it("cada estado de atualização e de reunião também tem dois canais", () => {
    for (const state of STALE_STATUSES) {
      const label = i18n.t(STALE_LABEL_KEYS[state]);
      const html = markup(
        createElement(StatusBadge, { kind: "stale", state, label }),
      );
      expect(html, state).toContain("<svg");
      expect(html, state).toContain(label);
    }
    for (const state of MEETING_STATES) {
      const label = i18n.t(RHYTHM_LABEL_KEYS[state]);
      const html = markup(
        createElement(StatusBadge, { kind: "rhythm", state, label }),
      );
      expect(html, state).toContain("<svg");
      expect(html, state).toContain(label);
    }
  });

  it("o alfinete de prioridade do Diário diz o que a cor diz", () => {
    for (const priority of PROJECT_PRIORITIES) {
      const html = markup(createElement(PriorityPin, { priority }));
      const label = i18n.t(PRIORITY_LABEL_KEYS[priority]);
      expect(html, priority).toContain("sr-only");
      expect(html, priority).toContain(label);
      expect(html, priority).not.toContain("aria-hidden");
    }
  });

  it("e as oito prioridades têm oito frases, já que só têm cinco cores", () => {
    const spoken = PROJECT_PRIORITIES.map((priority) =>
      i18n.t(PRIORITY_LABEL_KEYS[priority]),
    );
    expect(new Set(spoken).size).toBe(PROJECT_PRIORITIES.length);
  });
});

describe("a tela cabe num aparelho emprestado", () => {
  const FIXED_TRACK = /minmax\((\d+)px,\s*1fr\)/gu;
  const PAGE_WRAPPER = /mx-auto[^"`]*\bmax-w-\[(\d+)px\]/u;

  it("nenhuma grade de cartões exige uma trilha maior que a tela", () => {
    const offenders = shipped().flatMap((entry) =>
      [...entry.source.matchAll(FIXED_TRACK)].map(
        (match) => `${entry.path}: ${match[0]}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("nenhum contêiner de página crava a largura máxima em pixels", () => {
    const offenders = shipped()
      .filter((entry) => PAGE_WRAPPER.test(entry.source))
      .map((entry) => entry.path);
    expect(offenders).toEqual([]);
  });

  const CONTAINER = /\bmax-w-\(--container-(?:max|wide|reading|narrow)\)/u;
  const RIGID_PAD = /(?:^|[\s"'`])(?:sm:|md:|lg:)?px-\d/u;

  it("os contêineres de página respiram com a janela", () => {
    const wrappers = shipped().filter((entry) => CONTAINER.test(entry.source));
    expect(wrappers.length).toBeGreaterThan(5);
    const rigid = wrappers.filter((entry) =>
      entry.source
        .split("\n")
        .some((line) => CONTAINER.test(line) && RIGID_PAD.test(line)),
    );
    expect(rigid.map((entry) => entry.path)).toEqual([]);
  });
});

describe("Projetos e a Ficha se leem em voz alta", () => {
  it("Projetos abre com um h1 e nomeia as duas regiões da tela", () => {
    const page = read("src/components/pages/projetos/ProjetosPage.tsx");
    expect(page).toContain('<h1 className="sr-only">{t("projetos_title")}</h1>');
    expect(page).toContain('aria-label={t("projetos_results_label")}');
    const sidebar = read("src/components/pages/projetos/Sidebar/index.tsx");
    expect(sidebar).toContain('aria-label={t("projetos_filters_label")}');
  });

  it("a Ficha é a rota, então o nome do projeto é o h1 dela", () => {
    const hero = read("src/components/pages/ficha/RecordHero.tsx");
    expect(hero).toContain("<DialogTitle asChild>");
    expect(hero).toContain("<h1");
  });

  it("as dez abas da Ficha continuam vindo do primitivo Radix", () => {
    const nav = read("src/components/pages/ficha/TabNav.tsx");
    expect(nav).toContain("TabsList");
    expect(nav).toContain("TabsTrigger");
    expect(nav).not.toMatch(/role=["']tab/u);
  });

  it("a âncora de conteúdo tem um nome só em todo o repositório", () => {
    const hardcoded = shipped().filter(
      (entry) =>
        entry.path !== "src/utils/focus.ts" &&
        entry.source.includes(`"${CONTENT_ANCHOR_ID}"`),
    );
    expect(hardcoded.map((entry) => entry.path)).toEqual([]);
  });
});

describe("uma região que rola é alcançável pelo teclado", () => {
  it("a tabela leva foco e nome, porque suas células não levam", () => {
    const table = read("src/components/ui/Table.tsx");
    expect(table).toContain('role="region"');
    expect(table).toContain("tabIndex={0}");
    expect(table).toContain("aria-label={label}");
  });

  it("e o nome é obrigatório, não opcional", () => {
    const table = read("src/components/ui/Table.tsx");
    expect(table).toMatch(/interface TableProps[^}]*label: string;/su);
  });
});
