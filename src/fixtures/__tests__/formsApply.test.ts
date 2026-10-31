import { afterEach, describe, expect, it, vi } from "vitest";
import type { MockRole } from "../../contexts/session";
import type { BookProgressItem } from "../../types/project";
import { getRegion } from "../../utils/region";
import { formsAPI, projectRecordAPI } from "..";
import { loadProjects } from "../projects";
import { MOCK_SESSION_KEY } from "../session";

const stored = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
});

afterEach(() => stored.clear());

const as = (role: MockRole) => stored.set(MOCK_SESSION_KEY, role);

const inRegion = (region: string) =>
  loadProjects().find((project) => getRegion(project) === region)!;

/** A table whose roll-up cannot equal the record's: the history only grows when the counts move. */
const rowsFor = (projectId: string): BookProgressItem[] => {
  const translated = (loadProjects().find((p) => p.id === projectId)!.translatedUnits || 0) + 3;
  return [
    { id: "r1", name: "Rute", chapters: translated, translated, communityChecked: 1, mentorApproved: 0 },
  ];
};

async function pulse(projectId: string, by: string, rows?: BookProgressItem[]) {
  as("admin");
  const link = await formsAPI.mintIntakeLink({ projectId });
  await formsAPI.submitIntake(link.token, {
    definitionVersion: 1,
    answers: { submittedBy: by, period: "2026-10", ...(rows ? { bookProgress: rows } : {}) },
  });
  return (await formsAPI.received()).find((row) => row.submittedBy === by)!;
}

describe("o dublê aplica um Pulso como o apply_submission do servidor (OBT-652)", () => {
  it("a coordenação da região aplica: a ficha ganha as linhas e a entrada de histórico do Pulso", async () => {
    const project = inRegion("south-america");
    const rows = rowsFor(project.id);
    const row = await pulse(project.id, "Fresia A", rows);

    as("coordinator");
    const before = await projectRecordAPI.read(project.id);
    const result = await formsAPI.applySubmission(row.id, before.version);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.submission.appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    const after = await projectRecordAPI.read(project.id);
    expect(after.version).not.toBe(before.version);
    expect(after.project.bookProgress).toEqual(rows);
    expect(after.project.progressHistory.at(-1)).toMatchObject({
      fromField: "Fresia A",
      formType: "pulso",
    });
  });

  it("aplicar de novo não escreve: a mesma resposta, a ficha na mesma versão e o mesmo histórico", async () => {
    const project = inRegion("south-america");
    const row = await pulse(project.id, "Fresia B", rowsFor(project.id));

    as("coordinator");
    const opened = await projectRecordAPI.read(project.id);
    const first = await formsAPI.applySubmission(row.id, opened.version);
    const applied = await projectRecordAPI.read(project.id);
    const again = await formsAPI.applySubmission(row.id, opened.version);
    const still = await projectRecordAPI.read(project.id);

    expect(again).toEqual(first);
    expect(still.version).toBe(applied.version);
    expect(still.project.progressHistory).toEqual(applied.project.progressHistory);
  });

  it("versão velha é conflito com a versão atual, e o Pulso continua esperando", async () => {
    const project = inRegion("south-america");
    const row = await pulse(project.id, "Fresia C", rowsFor(project.id));

    as("coordinator");
    const opened = await projectRecordAPI.read(project.id);
    const saved = await projectRecordAPI.patch(project.id, { notes: "salvo antes" }, opened.version);
    expect(saved.ok).toBe(true);
    const result = await formsAPI.applySubmission(row.id, opened.version);

    expect(result).toMatchObject({ ok: false, reason: "conflict" });
    if (result.ok || result.reason !== "conflict") return;
    expect(result.version).toBe((await projectRecordAPI.read(project.id)).version);
    const waiting = (await formsAPI.received()).find((entry) => entry.id === row.id)!;
    expect(waiting.appliedAt).toBeNull();
  });

  it("o OBT Lab é recusado pelo papel, e a coordenação de outra região não acha o projeto", async () => {
    const africa = inRegion("africa");
    const row = await pulse(africa.id, "Fresia D");

    as("obtLab");
    const version = (await projectRecordAPI.read(africa.id)).version;
    expect(await formsAPI.applySubmission(row.id, version)).toMatchObject({
      ok: false,
      reason: "failed",
      failure: { kind: "forbidden" },
    });

    as("coordinator");
    expect(await formsAPI.applySubmission(row.id, version)).toMatchObject({
      ok: false,
      reason: "failed",
      failure: { kind: "notFound" },
    });
  });
});
