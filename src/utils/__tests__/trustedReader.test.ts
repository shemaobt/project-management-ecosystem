import { describe, expect, it } from "vitest";
import { PASTORAL_WRITES } from "../../constants/recordFields";
import { readReadAs } from "../../services/api/projectRecord";
import type { RecordField } from "../../types/projectRecord";
import { canCreateProjects, canReadHealth, canWriteHealth } from "../access";
import { mayWrite, mayWriteNeedDescription, recordAccess } from "../recordAccess";
import { mayOpenRecord, readMode } from "../../components/pages/ficha/recordMode";
import { getLocationDisplay, readsTruth, withheldNotice } from "../region";
import { makeProject } from "./factory";

/**
 * OBT-571 — the Resource Circle sees everything, the sensitive projects included, and edits
 * nothing (Karina, 6/out). The server says so with a third `readAs`, `trusted`; this is the
 * console's half, and the OBT Lab stays `other`, by Daniel's decision.
 */
const EVERY_WRITE: RecordField[] = [
  "location",
  "sensitiveCountry",
  "team",
  "notes",
  "status",
  "prayerRequests",
  "needsItems",
  "mentor",
  "needsPastoralIntervention",
];

const sensitive = (readAs: "coordination" | "trusted" | "other") =>
  makeProject({ sensitiveCountry: true, location: "Peru", team: "Base Sintética", readAs });

describe("o terceiro readAs, trusted", () => {
  it("o fio aceita os três valores, e nada mais", () => {
    expect(readReadAs("coordination")).toBe("coordination");
    expect(readReadAs("trusted")).toBe("trusted");
    expect(readReadAs("other")).toBe("other");
    expect(readReadAs("confiável")).toBeUndefined();
    expect(readReadAs(undefined)).toBeUndefined();
  });

  it("trusted lê a verdade do lugar como a coordenação; other e a ausência leem a região", () => {
    expect(readsTruth("trusted")).toBe(true);
    expect(readsTruth("coordination")).toBe(true);
    expect(readsTruth("other")).toBe(false);
    expect(readsTruth(undefined)).toBe(false);
    expect(getLocationDisplay(sensitive("trusted")).withheld).toBe(false);
    expect(getLocationDisplay(sensitive("coordination")).withheld).toBe(false);
    expect(getLocationDisplay(sensitive("other")).withheld).toBe(true);
  });

  it("a contagem de retidos também vai ao leitor trusted", () => {
    expect(withheldNotice([sensitive("trusted")])).toBe(1);
    expect(withheldNotice([sensitive("other")])).toBeNull();
  });

  it("trusted lê tudo e escreve nada num registro sensível — Daniel, 7/out: o RC perde o PATCH", () => {
    const access = recordAccess(sensitive("trusted"), false, true, false);
    expect(access.withheld).toBe(false);
    expect(access.readOnly).toBe(true);
    expect(access.placeWritable).toBe(false);
    expect(access.baseWritable).toBe(false);
    for (const field of EVERY_WRITE) {
      expect(mayWrite(access, field), field).toBe(false);
    }
    expect(mayWriteNeedDescription(access, true)).toBe(false);
    expect(mayWriteNeedDescription(access, false)).toBe(false);
  });

  it("num registro aberto também: o que other escrevia, trusted não escreve", () => {
    const open = makeProject({ sensitiveCountry: false, readAs: "trusted" });
    const access = recordAccess(open, false, true, false);
    const asOther = recordAccess({ ...open, readAs: "other" }, false, true, false);
    expect(access.baseWritable).toBe(false);
    for (const field of EVERY_WRITE) {
      expect(mayWrite(access, field), field).toBe(false);
    }
    expect(mayWrite(asOther, "team")).toBe(true);
    expect(mayWrite(asOther, "status")).toBe(true);
  });

  it("/ficha/novo digitado não abre para o Círculo que não cria; um registro existente é do servidor", () => {
    expect(mayOpenRecord(true, ["resourceCircle"])).toBe(false);
    expect(mayOpenRecord(true, ["resourceCircle", "obtLab"])).toBe(false);
    expect(mayOpenRecord(true, ["resourceCircle", "coordinator"])).toBe(true);
    expect(mayOpenRecord(true, ["obtLab"])).toBe(true);
    expect(mayOpenRecord(false, ["resourceCircle"])).toBe(true);
  });

  it("mesmo pedindo ?modo=editar, a ficha de um leitor read-only abre em ver", () => {
    expect(readMode("editar", false, true)).toBe("ver");
    expect(readMode("editar", false, false)).toBe("editar");
    expect(readMode(null, false, false)).toBe("ver");
    expect(readMode(null, true, true)).toBe("editar");
  });
});

describe("a saúde: o Círculo de Recursos lê, e só a coordenação e o OBT Lab escrevem", () => {
  it("resourceCircle entra na audiência de leitura, e o admin do Shemá não", () => {
    expect(canReadHealth(["resourceCircle"])).toBe(true);
    expect(canReadHealth(["admin"])).toBe(false);
  });

  it("os escritores são coordinator e obtLab, nunca resourceCircle", () => {
    expect(canWriteHealth(["coordinator"])).toBe(true);
    expect(canWriteHealth(["obtLab"])).toBe(true);
    expect(canWriteHealth(["resourceCircle"])).toBe(false);
    expect(canWriteHealth(["resourceCircle", "equipe"])).toBe(false);
    expect(canWriteHealth(["resourceCircle", "obtLab"])).toBe(true);
  });

  it("quem lê sem escrever recebe o pastoral fechado em qualquer registro", () => {
    const reader = recordAccess(makeProject({ readAs: "trusted" }), false, true, false);
    for (const field of PASTORAL_WRITES) {
      expect(mayWrite(reader, field), field).toBe(false);
    }
    expect(reader.readsHealth).toBe(true);
  });
});

describe("quem abre uma ficha nova (OBT-571)", () => {
  it("o Círculo sem coordenação não cria projeto — o servidor recusa o create com 403", () => {
    expect(canCreateProjects(["resourceCircle"])).toBe(false);
    expect(canCreateProjects(["resourceCircle", "obtLab"])).toBe(false);
    expect(canCreateProjects(["resourceCircle", "coordinator"])).toBe(true);
    expect(canCreateProjects(["resourceCircle", "admin"])).toBe(true);
    expect(canCreateProjects(["coordinator"])).toBe(true);
    expect(canCreateProjects(["obtLab"])).toBe(true);
  });
});

describe("o OBT Lab continua exatamente como está", () => {
  it("other num registro sensível segue retido e sem o lugar", () => {
    const access = recordAccess(sensitive("other"), false, true, true);
    expect(access.withheld).toBe(true);
    expect(access.placeWritable).toBe(false);
    expect(access.baseWritable).toBe(false);
  });

  it("obtLab lê e escreve saúde, como antes", () => {
    expect(canReadHealth(["obtLab"])).toBe(true);
    expect(canWriteHealth(["obtLab"])).toBe(true);
  });
});
