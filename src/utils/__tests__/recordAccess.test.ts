import { describe, expect, it } from "vitest";
import { writableDraft } from "../../components/pages/ficha/useDraft";
import { FREE_TEXT_FIELDS, PASTORAL_WRITES } from "../../constants/recordFields";
import type { NeedItem } from "../../types/project";
import { canReadHealth } from "../access";
import {
  FULL_ACCESS,
  mayWrite,
  mayWriteNeedDescription,
  recordAccess,
} from "../recordAccess";
import { makeProject } from "./factory";

const FREE_TEXT = ["notes", "healthNotes", "statusComments", "scopeDetails"] as const;
const PASTORAL = [
  "needsPastoralIntervention",
  "pastoralInterventionName",
  "pastoralInterventionWhen",
] as const;

const withheldOther = makeProject({ sensitiveCountry: true, readAs: "other" });
const withheldCoordination = makeProject({ sensitiveCountry: true, readAs: "coordination" });
const openOther = makeProject({ sensitiveCountry: false, readAs: "other" });

describe("a audiência de saúde, lida das funções da sessão (OBT-553)", () => {
  const cases: [string, Parameters<typeof canReadHealth>[0], boolean][] = [
    ["globalStrategist", ["globalStrategist"], true],
    ["coordinator", ["coordinator"], true],
    ["obtLab", ["obtLab"], true],
    ["resourceCircle", ["resourceCircle"], false],
    ["o papel admin do Shemá", ["admin"], false],
    ["quem só tem a Resource Circle e a equipe do projeto", ["resourceCircle", "equipe"], false],
    ["resourceCircle com obtLab", ["resourceCircle", "obtLab"], true],
    ["nenhum papel", [], false],
  ];
  it.each(cases)("%s", (_name, roles, expected) => {
    expect(canReadHealth(roles)).toBe(expected);
  });
});

describe("mayWrite e o acompanhamento pastoral (OBT-553)", () => {
  it.each(PASTORAL)("%s não é de quem não lê saúde", (field) => {
    expect(mayWrite(recordAccess(openOther, false, false), field)).toBe(false);
    expect(mayWrite(recordAccess(withheldCoordination, false, false), field)).toBe(false);
  });

  it.each(PASTORAL)("%s é de quem lê saúde, em qualquer registro", (field) => {
    expect(mayWrite(recordAccess(openOther, false, true), field)).toBe(true);
    expect(mayWrite(recordAccess(withheldOther, false, true), field)).toBe(true);
  });

  it("os três nomes são os do PASTORAL_WRITES do servidor, e só eles", () => {
    expect([...PASTORAL_WRITES].sort()).toEqual([...PASTORAL].sort());
  });

  it("quem não lê saúde segue escrevendo o que a saúde não toca", () => {
    const access = recordAccess(openOther, false, false);
    for (const field of ["prayerRequests", "needsItems", "status", "team", "notes"] as const) {
      expect(mayWrite(access, field)).toBe(true);
    }
  });

  it("um registro novo é livre, e o bit de saúde continua sendo de quem digita", () => {
    expect(mayWrite(recordAccess(undefined, true, true), "needsPastoralIntervention")).toBe(true);
    expect(mayWrite(recordAccess(undefined, true, false), "needsPastoralIntervention")).toBe(false);
    expect(mayWrite(recordAccess(undefined, true, false), "notes")).toBe(true);
    expect(FULL_ACCESS.readsHealth).toBe(true);
  });

  it("sem registro lido, nada é de quem escreve", () => {
    expect(mayWrite(recordAccess(undefined, false, true), "needsPastoralIntervention")).toBe(false);
  });
});

describe("mayWrite e o texto livre de um registro recolhido (OBT-556)", () => {
  it("o conjunto é o FREE_TEXT_FIELDS do servidor", () => {
    expect([...FREE_TEXT_FIELDS].sort()).toEqual([...FREE_TEXT].sort());
  });

  it.each(FREE_TEXT)("%s não é de quem lê o registro recolhido como other", (field) => {
    expect(mayWrite(recordAccess(withheldOther, false, true), field)).toBe(false);
    expect(mayWrite(recordAccess(withheldOther, false, false), field)).toBe(false);
  });

  it.each(FREE_TEXT)("%s é da coordenação no registro recolhido", (field) => {
    expect(mayWrite(recordAccess(withheldCoordination, false, true), field)).toBe(true);
  });

  it.each(FREE_TEXT)("%s segue livre no registro aberto, lido como other", (field) => {
    expect(mayWrite(recordAccess(openOther, false, true), field)).toBe(true);
  });

  it("os outros textos livres não entram: o servidor os deixa visíveis", () => {
    const access = recordAccess(withheldOther, false, true);
    for (const field of ["statusGoal", "needsNotes", "objectiveNotes", "financialNotes", "partnerOrg"] as const) {
      expect(mayWrite(access, field)).toBe(true);
    }
  });
});

describe("a descrição de uma necessidade (OBT-556)", () => {
  it("a descrição de uma necessidade salva não é de quem lê o registro recolhido", () => {
    expect(mayWriteNeedDescription(recordAccess(withheldOther, false, true), true)).toBe(false);
  });

  it("uma necessidade nova é de quem a cria, mesmo no recolhido", () => {
    expect(mayWriteNeedDescription(recordAccess(withheldOther, false, true), false)).toBe(true);
  });

  it("a coordenação e o registro aberto escrevem a descrição", () => {
    expect(mayWriteNeedDescription(recordAccess(withheldCoordination, false, true), true)).toBe(true);
    expect(mayWriteNeedDescription(recordAccess(openOther, false, true), true)).toBe(true);
  });
});

describe("o rascunho de outra pessoa, no mesmo navegador", () => {
  const need = (over: Partial<NeedItem>): NeedItem => ({
    category: "equipment",
    urgency: "low",
    status: "open",
    description: "",
    ...over,
  });
  const saved = makeProject({
    sensitiveCountry: true,
    readAs: "other",
    needsItems: [need({ id: "n1", description: "" })],
  });

  it("os pastorais e o texto livre digitados lá não valem para quem não os escreve", () => {
    const place = recordAccess(saved, false, false);
    const kept = writableDraft(
      { notes: "x", needsPastoralIntervention: "sim", status: "em-andamento" },
      place,
      saved,
    );
    expect(Object.keys(kept)).toEqual(["status"]);
  });

  it("a descrição digitada lá sobre uma necessidade salva volta ao que chegou", () => {
    const place = recordAccess(saved, false, true);
    const kept = writableDraft(
      {
        needsItems: [
          need({ id: "n1", description: "texto da coordenação", urgency: "high" }),
          need({ description: "minha, nova" }),
        ],
      },
      place,
      saved,
    );
    expect(kept.needsItems).toEqual([
      need({ id: "n1", description: "", urgency: "high" }),
      need({ description: "minha, nova" }),
    ]);
  });

  it("para a coordenação o rascunho passa como está", () => {
    const place = recordAccess({ ...saved, readAs: "coordination" }, false, true);
    const draft = { needsItems: [need({ id: "n1", description: "meu" })] };
    expect(writableDraft(draft, place, saved)).toBe(draft);
  });
});
