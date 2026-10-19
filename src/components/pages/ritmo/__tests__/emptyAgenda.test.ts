import { describe, expect, it } from "vitest";
import { emptyAgendaKey } from "../reach";

describe("emptyAgendaKey", () => {
  it("tells a regional reader with no project in reach about their regions", () => {
    expect(emptyAgendaKey(0, ["europe"], true)).toBe("ritmo_no_projects_reach");
  });

  it("tells a reader who reaches everything that no project exists", () => {
    expect(emptyAgendaKey(0, null, true)).toBe("ritmo_no_projects");
  });

  it("keeps the reach sentence when projects exist but none are in reach", () => {
    expect(emptyAgendaKey(3, ["europe"], true)).toBe("ritmo_no_projects_reach");
    expect(emptyAgendaKey(3, ["europe"], false)).toBe("loading");
  });
});
