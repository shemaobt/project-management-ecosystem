import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HEALTH_ICONS, RHYTHM_ICONS } from "../components/common/StatusBadge";
import {
  HEALTH_TONES,
  PRAYER_TONES,
  PRIORITY_TONES,
  RHYTHM_TONES,
  STALE_TONES,
} from "../styles";
import { MEETING_STATES } from "./meetings";
import {
  OVERALL_HEALTH_STATES,
  PROJECT_PRIORITIES,
  STALE_STATUSES,
} from "./project";
import {
  HEALTH_LABEL_KEYS,
  HEALTH_SYMBOLS,
  PRAYER_LABEL_KEYS,
  PRAYER_STATES,
  RHYTHM_LABEL_KEYS,
  STALE_LABEL_KEYS,
} from "./status";

const PROTOTYPE = resolve(import.meta.dirname, "../../DS-PROJECT");
const hasPrototype = existsSync(resolve(PROTOTYPE, "data.js"));
const read = (file: string) => readFileSync(resolve(PROTOTYPE, file), "utf8");
const fnBody = (src: string, name: string) =>
  src.split(`function ${name}`)[1].split("\nfunction ")[0];
const returnedLiterals = (body: string) =>
  new Set([...body.matchAll(/return '([^']+)'/g)].map((m) => m[1]));

describe("cada vocabulário tem uma variante cva", () => {
  it.each([
    ["health", OVERALL_HEALTH_STATES, HEALTH_TONES],
    ["stale", STALE_STATUSES, STALE_TONES],
    ["rhythm", MEETING_STATES, RHYTHM_TONES],
    ["prayer", PRAYER_STATES, PRAYER_TONES],
    ["priority", PROJECT_PRIORITIES, PRIORITY_TONES],
  ] as const)("%s", (_kind, states, tones) => {
    expect(Object.keys(tones).sort()).toEqual([...states].sort());
  });
});

describe("cada estado tem uma chave i18n e um símbolo", () => {
  it.each([
    ["health", OVERALL_HEALTH_STATES, HEALTH_LABEL_KEYS],
    ["stale", STALE_STATUSES, STALE_LABEL_KEYS],
    ["rhythm", MEETING_STATES, RHYTHM_LABEL_KEYS],
    ["prayer", PRAYER_STATES, PRAYER_LABEL_KEYS],
  ] as const)("%s", (_kind, states, keys) => {
    expect(Object.keys(keys).sort()).toEqual([...states].sort());
  });

  it("health symbols", () => {
    expect(Object.keys(HEALTH_SYMBOLS).sort()).toEqual([...OVERALL_HEALTH_STATES].sort());
  });
});

describe("o status sobrevive sem cor", () => {
  it("cada estado de saúde tem um ícone próprio", () => {
    expect(new Set(Object.values(HEALTH_ICONS)).size).toBe(OVERALL_HEALTH_STATES.length);
  });

  it("cada estado de saúde tem um símbolo próprio", () => {
    expect(new Set(Object.values(HEALTH_SYMBOLS)).size).toBe(
      OVERALL_HEALTH_STATES.length,
    );
  });

  it("cada estado de ritmo tem um ícone próprio", () => {
    expect(new Set(Object.values(RHYTHM_ICONS)).size).toBe(MEETING_STATES.length);
  });
});

describe.skipIf(!hasPrototype)("os vocabulários batem com DS-PROJECT", () => {
  it("health vem de getOverallHealth", () => {
    expect(returnedLiterals(fnBody(read("data.js"), "getOverallHealth"))).toEqual(
      new Set(OVERALL_HEALTH_STATES),
    );
  });

  it("stale vem de getStaleStatus", () => {
    expect(returnedLiterals(fnBody(read("data.js"), "getStaleStatus"))).toEqual(
      new Set(STALE_STATUSES),
    );
  });

  it("rhythm vem dos estados de ritmo.jsx", () => {
    const stateLbl = read("ritmo.jsx").match(/const stateLbl = \{([^}]*)\}/);
    const returned = [...(stateLbl?.[1] ?? "").matchAll(/(\w+):\s*t\./g)].map(
      (m) => m[1],
    );
    expect(new Set(returned)).toEqual(new Set(MEETING_STATES));
  });

  it("priority vem de getPriority", () => {
    expect(returnedLiterals(fnBody(read("data.js"), "getPriority"))).toEqual(
      new Set(PROJECT_PRIORITIES),
    );
  });

  it("toda chave i18n existe em data.js, em PT e EN", () => {
    const data = read("data.js");
    const keys = [
      ...Object.values(HEALTH_LABEL_KEYS),
      ...Object.values(STALE_LABEL_KEYS),
      ...Object.values(RHYTHM_LABEL_KEYS),
      ...Object.values(PRAYER_LABEL_KEYS),
    ];
    for (const key of keys) {
      const occurrences = data.match(new RegExp(`\\b${key}:`, "g")) ?? [];
      expect(occurrences.length, `${key} em PT e EN`).toBe(2);
    }
  });

  it("os símbolos do HealthDot vêm de cards.jsx", () => {
    const symbols = read("cards.jsx").match(/const sym = \{([^}]*)\}/);
    const pairs = [
      ...(symbols?.[1] ?? "").matchAll(/(\w+):\s*'([^']*)'/g),
    ].map((m) => [m[1], m[2]]);
    expect(Object.fromEntries(pairs)).toEqual(HEALTH_SYMBOLS);
  });
});
