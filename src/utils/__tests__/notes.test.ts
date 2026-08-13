import { describe, expect, it } from "vitest";
import type { MediaAudience } from "../../types/project";
import { canExportNotes } from "../notes";

describe("canExportNotes", () => {
  it("notes stay with coordination and never reach a public output", () => {
    expect(canExportNotes("coordenacao")).toBe(true);
    expect(canExportNotes("publico")).toBe(false);
  });

  it("stays total over the audience vocabulary", () => {
    const audiences: readonly MediaAudience[] = ["coordenacao", "publico"];
    for (const audience of audiences) {
      expect(typeof canExportNotes(audience)).toBe("boolean");
    }
  });
});
