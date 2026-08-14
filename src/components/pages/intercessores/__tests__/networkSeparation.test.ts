import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROLE_DEFINITIONS } from "../../../../constants/roles";
import { EMPTY_REGION_TEAM } from "../../../../constants/regions";

const SHIPPED = /\.tsx?$/u;
const TEST_FILE = /(?:^|\/)__tests__\//u;

const NETWORK_PATHS = [
  "src/utils/intercessors.ts",
  "src/utils/countries.ts",
  "src/stores/prayerStore.ts",
  "src/constants/countries.ts",
  "src/components/pages/intercessores",
];

const PLATFORM_ROLE_PATHS = [
  "src/constants/roles.ts",
  "src/types/role.ts",
  "src/utils/region.ts",
  "src/stores/regionsStore.ts",
];

const PLATFORM_ROLE_IMPORT =
  /from\s+"[^"]*(?:constants\/roles|types\/role|stores\/regionsStore)"/gu;

const NETWORK_MENTION = /\bIntercessor\b(?!es)/gu;

function walk(path: string): string[] {
  const entries = readdirSync(path, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

function shippedFiles(paths: readonly string[]): string[] {
  return paths
    .flatMap((path) => {
      const full = join(process.cwd(), path);
      return SHIPPED.test(path) ? [full] : walk(full);
    })
    .filter((path) => SHIPPED.test(path) && !TEST_FILE.test(path));
}

describe("a rede de intercessores e o papel da plataforma são coisas diferentes", () => {
  it("nada no caminho da rede importa o papel, a região ou o organograma", () => {
    const offenders = shippedFiles(NETWORK_PATHS).flatMap((path) => {
      const matches = readFileSync(path, "utf8").match(PLATFORM_ROLE_IMPORT);
      return matches ? [`${path} importa ${matches.join(", ")}`] : [];
    });
    expect(offenders).toEqual([]);
  });

  it("e o organograma não conhece a rede", () => {
    const offenders = shippedFiles(PLATFORM_ROLE_PATHS).flatMap((path) => {
      const matches = readFileSync(path, "utf8").match(NETWORK_MENTION);
      return matches ? [`${path} menciona ${matches[0]}`] : [];
    });
    expect(offenders).toEqual([]);
  });

  it("o titular de um papel é um nome, nunca um registro da rede", () => {
    for (const holder of Object.values(EMPTY_REGION_TEAM)) {
      expect(typeof holder).toBe("string");
    }
    expect(Object.keys(EMPTY_REGION_TEAM).sort()).toEqual(
      Object.keys(ROLE_DEFINITIONS).sort(),
    );
  });

  it("o papel Intercessor do organograma continua sendo papel, não pessoa da rede", () => {
    expect(ROLE_DEFINITIONS.resourceCircle.labelKey).toBe("role_resource");
    expect(Object.keys(ROLE_DEFINITIONS.resourceCircle).sort()).toEqual([
      "descriptionKey",
      "key",
      "labelKey",
    ]);
  });

  it("os dois vocabulários de lugar não se misturam", () => {
    const countries = readFileSync(
      join(process.cwd(), "src/constants/countries.ts"),
      "utf8",
    );
    for (const region of ["south-america", "oceania", "resourceCircle", "obtLab"]) {
      expect(countries, region).not.toContain(region);
    }
  });
});
