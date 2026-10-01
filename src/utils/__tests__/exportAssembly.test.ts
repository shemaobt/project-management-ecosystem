import { describe, expect, it } from "vitest";

/**
 * **The client-side export assembly is gone** (INT-11 · OBT-416): the DoD asks it deleted, not
 * kept as a fallback, because a second implementation of the export is a second place for the
 * privacy filters to be wrong. What remains here saves a file and reads an import — nothing
 * that builds one.
 */
const exported = await import("../export");

describe("export.ts não monta mais arquivo nenhum", () => {
  it("expõe só o download e a leitura da importação", () => {
    expect(Object.keys(exported).sort()).toEqual([
      "downloadBlob",
      "downloadTextFile",
      "parseProjectsImport",
    ]);
  });
});
