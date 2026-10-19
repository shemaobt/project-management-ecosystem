import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CONTROL_OPENER = /<(?:button|Button|a|Link|NavLink|label)\b/gu;
const CONTROL_CLOSER = /<\/(?:button|Button|a|Link|NavLink|label)>/u;
const SR_ONLY = /className="sr-only"/u;
const POSITIONED = /\b(?:relative|absolute|fixed|sticky)\b|touchTargetPseudo/u;

interface Unanchored {
  line: number;
  control: string;
}

function openingTag(lines: readonly string[], from: number): string {
  const end = lines.findIndex(
    (line, index) => index >= from && /(?<!=)>\s*$/u.test(line),
  );
  return lines.slice(from, end === -1 ? lines.length : end + 1).join("\n");
}

export function srOnlyWithoutPositionedControl(source: string): Unanchored[] {
  const lines = source.split("\n");
  const found: Unanchored[] = [];
  lines.forEach((text, index) => {
    if (!SR_ONLY.test(text)) return;
    let opener = -1;
    for (let at = index; at >= 0; at -= 1) {
      const line = lines[at] ?? "";
      if (at < index && CONTROL_CLOSER.test(line)) break;
      if ([...line.matchAll(CONTROL_OPENER)].length > 0) {
        opener = at;
        break;
      }
    }
    if (opener === -1) return;
    const tag = openingTag(lines, opener);
    if (!POSITIONED.test(tag)) {
      found.push({ line: index + 1, control: (lines[opener] ?? "").trim() });
    }
  });
  return found;
}

function walkSource(): { path: string; source: string }[] {
  const walkAll = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walkAll(path) : [path];
    });
  return walkAll(join(process.cwd(), "src"))
    .filter((path) => /\.tsx$/u.test(path) && !/__tests__/u.test(path))
    .map((path) => ({
      path: path.replace(`${process.cwd()}/`, ""),
      source: readFileSync(path, "utf8"),
    }));
}

describe("um sr-only dentro de um controle não estica a página nas faixas com rolagem", () => {
  it("todo controle que carrega um sr-only é ele mesmo posicionado", () => {
    const loose = walkSource().flatMap(({ path, source }) =>
      srOnlyWithoutPositionedControl(source).map(
        ({ line, control }) => `${path}:${line} ${control}`,
      ),
    );

    expect(loose).toEqual([]);
  });

  it("o detector reprova um botão sem posição e aceita o mesmo botão com relative", () => {
    const loose = [
      "<button",
      '  type="button"',
      '  className={cn(className, "inline-flex")}',
      ">",
      '  <span className="sr-only">x</span>',
      "</button>",
    ].join("\n");
    const anchored = loose.replace('"inline-flex"', '"inline-flex relative"');

    expect(srOnlyWithoutPositionedControl(loose)).toHaveLength(1);
    expect(srOnlyWithoutPositionedControl(anchored)).toEqual([]);
  });

  it("um sr-only fora de qualquer controle não é cobrado", () => {
    const source = ['<span role="status">', '  <span className="sr-only">x</span>', "</span>"].join("\n");

    expect(srOnlyWithoutPositionedControl(source)).toEqual([]);
  });

  it("um controle já fechado acima não empresta a posição ao sr-only seguinte", () => {
    const source = [
      '<button className="relative" onClick={go}>',
      "  ok",
      "</button>",
      '<span className="sr-only">x</span>',
    ].join("\n");

    expect(srOnlyWithoutPositionedControl(source)).toEqual([]);
  });
});

describe("a lista de um Select nunca passa da largura que a tela deixa", () => {
  const select = readFileSync(
    join(process.cwd(), "src/components/ui/Select.tsx"),
    "utf8",
  );

  it("o conteúdo é limitado pela largura disponível que o Radix mede", () => {
    expect(select).toContain("max-w-(--radix-select-content-available-width)");
  });

  it("o seletor de projeto do Hub usa o SelectContent, sem largura própria", () => {
    const selector = readFileSync(
      join(process.cwd(), "src/components/pages/formularios/ProjectSelector.tsx"),
      "utf8",
    );

    expect(selector).toContain("<SelectContent>");
    expect(selector).not.toMatch(/\bw-\[|\bmin-w-\[|max-w-none/u);
  });
});
