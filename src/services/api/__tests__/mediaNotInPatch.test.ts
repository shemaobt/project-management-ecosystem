import { describe, expect, it } from "vitest";
import { PENDING_WRITE, SERVER_WRITABLE } from "../../../constants/recordFields";
import { withheldFields } from "../../../stores/projectRecordStore";
import { toWire } from "../projectRecord";
import { makeProject } from "../../../utils/__tests__/factory";

/**
 * What the record's PATCH does with a server photo's authorization (OBT-584): nothing — it
 * never carries it. `mediaPhotos` is outside the write's surface (the server's
 * `ShemaProjectUpdate` has no media and forbids unknown keys), so `toWire` drops it and the save
 * keeps it in the draft as a pending write instead of reporting it written.
 */
describe("a autorização de uma foto nunca viaja no PATCH do registro (OBT-584)", () => {
  const project = makeProject({
    mediaPhotos: [
      { id: "item-1", image: null, caption: "", authorization: { granted: true, by: "X", at: "2026-10-14" } },
    ],
  });

  it("mediaPhotos não está na superfície da escrita, e é escrita pendente da aba Mídia", () => {
    expect(SERVER_WRITABLE.has("mediaPhotos")).toBe(false);
    expect(PENDING_WRITE.midia?.fields).toContain("mediaPhotos");
  });

  it("toWire não leva mediaPhotos nem nada dela", () => {
    const wire = toWire(project, ["mediaPhotos"]);
    expect(wire).toEqual({});
    expect(JSON.stringify(wire)).not.toContain("authorization");
  });

  it("o salvar guarda a decisão no rascunho como pendente, sem dizer que gravou", () => {
    expect(withheldFields({ mediaPhotos: project.mediaPhotos })).toEqual(["mediaPhotos"]);
  });
});
