import { describe, expect, it } from "vitest";
import { projectsAPI } from "../../fixtures";
import { loadRawProjects } from "../../fixtures/projects";
import type { Project } from "../../types/project";
import { getOverallHealth, getPriority, healthScore } from "../health";
import { getProgress, getProjectStatus } from "../progress";
import { getDaysSinceUpdate, getLastProgressUpdate, getStaleStatus } from "../recency";
import { getRegion } from "../region";
import parity from "./dataJsParity.json";

const REFERENCE = new Date(parity.referenceDate);

const encodeDays = (days: number | null): number | string | null => {
  if (days === null) return null;
  return Number.isNaN(days) ? "NaN" : days;
};

const describeProject = (project: Project) => ({
  id: project.id,
  status: getProjectStatus(project),
  health: getOverallHealth(project),
  stale: getStaleStatus(project, REFERENCE),
  progress: getProgress(project),
  priority: getPriority(project, REFERENCE),
  healthScore: healthScore(project),
  daysSinceUpdate: encodeDays(getDaysSinceUpdate(project, REFERENCE)),
  lastProgressUpdate: getLastProgressUpdate(project),
  region: getRegion(project),
});

describe("parity with DS-PROJECT/data.js", () => {
  it("covers every record of the export", () => {
    expect(parity.projects).toHaveLength(loadRawProjects().length);
  });

  it("reproduces the prototype derivations for all 127 records", () => {
    expect(loadRawProjects().map(describeProject)).toEqual(parity.projects);
  });
});

describe("the date normalization is the only divergence from the prototype", () => {
  it("leaves every date-free derivation untouched", async () => {
    const golden = new Map(parity.projects.map((row) => [row.id, row]));

    for (const project of await projectsAPI.list()) {
      const expected = golden.get(project.id);
      const actual = describeProject(project);
      expect(actual.status).toBe(expected?.status);
      expect(actual.health).toBe(expected?.health);
      expect(actual.progress).toBe(expected?.progress);
      expect(actual.healthScore).toBe(expected?.healthScore);
      expect(actual.region).toBe(expected?.region);
    }
  });

  it("only changes staleness for the records the export dated as DD/MM/YYYY", async () => {
    const golden = new Map(parity.projects.map((row) => [row.id, row]));
    const datedByExport = new Set(
      loadRawProjects()
        .filter((project) => project.startDate)
        .map((project) => project.id),
    );

    const changed = new Set<string>();
    for (const project of await projectsAPI.list()) {
      const expected = golden.get(project.id);
      const actual = describeProject(project);
      if (
        actual.stale !== expected?.stale ||
        actual.daysSinceUpdate !== expected?.daysSinceUpdate
      ) {
        changed.add(project.id);
      }
    }

    expect(changed).toEqual(datedByExport);
    expect(changed.size).toBe(8);
  });

  it("turns the unreadable dates into real days without news", async () => {
    const projects = await projectsAPI.list();
    const dated = projects.filter((project) => project.startDate);

    for (const project of dated) {
      expect(project.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(getDaysSinceUpdate(project, REFERENCE)).not.toBeNaN();
    }
    expect(dated.map((project) => getStaleStatus(project, REFERENCE))).not.toContain(
      null,
    );
  });
});
