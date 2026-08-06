import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FORBIDDEN_ROLE_NAMES = [
  ["Global", "Articulator"].join(" "),
  ["Articulador", "Geral"].join(" "),
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

describe("role vocabulary", () => {
  it("never uses the stale global-role name anywhere in src", () => {
    const offenders: string[] = [];
    for (const file of walk(join(process.cwd(), "src"))) {
      const text = readFileSync(file, "utf8");
      for (const term of FORBIDDEN_ROLE_NAMES) {
        if (text.includes(term)) offenders.push(`${file} contains "${term}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
