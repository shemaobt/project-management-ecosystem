import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The nine derivations the server now owns, by the names the console called them.
 *
 * The ficha reads `derived` and computes none of them. A fallback would be worse than
 * no integration: it agrees with the server right up to the moment the two disagree,
 * which is a slow network — exactly when nobody can debug it.
 *
 * **The three utils are not deleted**, and that is the scope of this guard rather than
 * an exception to it. `utils/health.ts`, `utils/recency.ts` and `utils/indicators.ts`
 * still feed eight fixture-backed screens whose own INT has not run, and
 * `fixtures/projectBrowse.ts` — the browse endpoint's test double — has to reproduce
 * the server to stand in for it. What INT-03 removes is the *ficha's* second answer.
 */
const SERVER_OWNED = [
  "getOverallHealth",
  "healthScore",
  "getPriority",
  "getProjectStatus",
  "getStaleStatus",
  "getDaysSinceUpdate",
  "getLastProgressUpdate",
  "isRecentlyUpdated",
  "isNoNews",
  "staleFilterMatches",
  "computeDerived",
];

const SHIPPED = /\.tsx?$/u;
const TEST_FILE = /(?:^|\/)__tests__\//u;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const FICHA = join(process.cwd(), "src/components/pages/ficha");

const shippedFiles = walk(FICHA)
  .map((path) => relative(process.cwd(), path).split("\\").join("/"))
  .filter((path) => SHIPPED.test(path) && !TEST_FILE.test(path));

describe("a ficha não calcula status, saúde nem tempo sem notícias", () => {
  it("nenhum arquivo da ficha nomeia uma das derivações do servidor", () => {
    const offenders = shippedFiles.filter((path) => {
      const source = readFileSync(path, "utf8");
      return SERVER_OWNED.some((name) =>
        new RegExp(`\\b${name}\\b`, "u").test(source),
      );
    });
    expect(offenders).toEqual([]);
  });

  it("a varredura enxerga o corpus inteiro, e ele não é vazio", () => {
    expect(shippedFiles.length).toBeGreaterThan(30);
    expect(shippedFiles).toContain(
      "src/components/pages/ficha/tabs/progresso/ProgressoView.tsx",
    );
    expect(shippedFiles).toContain(
      "src/components/pages/ficha/tabs/saude/CareNote.tsx",
    );
  });

  it("o guarda pega uma violação de verdade", () => {
    const planted = "const stale = getStaleStatus(project);";
    expect(
      SERVER_OWNED.some((name) => new RegExp(`\\b${name}\\b`, "u").test(planted)),
    ).toBe(true);
  });

  it("as três utils continuam existindo, para as telas que ainda leem fixtures", async () => {
    const health = await import("../../../../utils/health");
    const recency = await import("../../../../utils/recency");
    const indicators = await import("../../../../utils/indicators");
    expect(typeof health.getOverallHealth).toBe("function");
    expect(typeof recency.getStaleStatus).toBe("function");
    expect(typeof indicators.indicatorCount).toBe("function");
  });
});
