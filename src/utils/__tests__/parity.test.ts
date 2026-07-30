import { describe, expect, it } from "vitest";
import { projectsAPI } from "../../fixtures";
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
  it("covers every fixture project", async () => {
    const projects = await projectsAPI.list();
    expect(parity.projects).toHaveLength(projects.length);
  });

  it("reproduces the prototype derivations for all 127 records", async () => {
    const projects = await projectsAPI.list();
    expect(projects.map(describeProject)).toEqual(parity.projects);
  });
});
