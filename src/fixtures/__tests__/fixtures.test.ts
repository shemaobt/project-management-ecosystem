import { describe, expect, it } from "vitest";
import { PROJECT_STATUSES } from "../../constants/project";
import { REGIONS } from "../../constants/regions";
import type { ProjectStatus } from "../../types/project";
import type { RegionKey } from "../../types/region";
import { createEmptyProject } from "../blank";
import { buildEtenReport } from "../eten";
import {
  etenAPI,
  fixtures,
  geoAPI,
  intercessorsAPI,
  meetingsAPI,
  prayerAPI,
  projectsAPI,
  regionsAPI,
} from "..";

describe("projects fixture", () => {
  it("loads the 127 projects of the Notion export", async () => {
    const projects = await projectsAPI.list();
    expect(projects).toHaveLength(127);
    expect(new Set(projects.map((project) => project.id)).size).toBe(127);
  });

  it("only carries statuses the domain knows", async () => {
    const projects = await projectsAPI.list();
    const statuses = new Set<ProjectStatus>(
      projects.map((project) => project.status),
    );
    for (const status of statuses) {
      expect(PROJECT_STATUSES).toContain(status);
    }
  });

  it("represents a record whose fields are mostly empty", async () => {
    const project = await projectsAPI.get("fataluku");
    expect(project).not.toBeNull();
    expect(project?.languageName).toBe("Fataluku");
    expect(project?.bridgeLanguage).toBe("");
    expect(project?.vitalityStatus).toBe("");
    expect(project?.speakerCount).toBe("");
    expect(project?.teamLeader).toBe("");
    expect(project?.mentor).toBe("");
    expect(project?.translators).toBe("");
    expect(project?.partnerOrg).toBe("");
    expect(project?.objective).toEqual([]);
    expect(project?.translationType).toEqual([]);
    expect(project?.financialResources).toEqual([]);
    expect(project?.needsItems).toEqual([]);
    expect(project?.progressHistory).toEqual([]);
  });

  it("keeps language names with non-Latin characters unchanged", async () => {
    const projects = await projectsAPI.list();
    const byId = new Map(projects.map((project) => [project.id, project]));

    expect(byId.get("waima-a")?.languageName).toBe("Waima’a");
    expect(byId.get("ngabere")?.languageName).toBe("Ngäbere");
    expect(byId.get("saotomense")?.languageName).toBe("Sãotomense");
    expect(byId.get("kraho")?.languageName).toBe("Krahô");
    expect(byId.get("mixteco-de-magdalena-penasco")?.languageName).toBe(
      "mixteco de Magdalena Peñasco",
    );
  });

  it("carries a longitude/latitude pair for every project", async () => {
    const projects = await projectsAPI.list();
    for (const project of projects) {
      expect(project.coords).toHaveLength(2);
      expect(Number.isFinite(project.coords[0])).toBe(true);
      expect(Number.isFinite(project.coords[1])).toBe(true);
    }
  });

  it("hands out an isolated copy on every read", async () => {
    const [first] = await projectsAPI.list();
    first.languageName = "mutado";
    first.needsItems.push({
      category: "financial",
      urgency: "high",
      status: "open",
      description: "mutado",
    });

    const [again] = await projectsAPI.list();
    expect(again.languageName).not.toBe("mutado");
    expect(again.needsItems).toEqual([]);
  });

  it("returns null for an unknown project", async () => {
    expect(await projectsAPI.get("nao-existe")).toBeNull();
  });
});

describe("regions fixture", () => {
  it("exposes the seven regions of the org chart", async () => {
    const regions = await regionsAPI.list();
    expect(regions.map((region) => region.key)).toEqual(
      REGIONS.map((region) => region.key),
    );
  });

  it("starts with no role holder assigned", async () => {
    const regions = await regionsAPI.list();
    for (const region of regions) {
      expect(region.team).toEqual({
        coordinator: "",
        obtLab: "",
        resourceCircle: "",
      });
    }
  });

  it("resolves every project to a known region", async () => {
    const regions = await regionsAPI.list();
    const keys = new Set<RegionKey>(regions.map((region) => region.key));
    const projects = await projectsAPI.list();
    for (const project of projects) {
      expect(project.regionalCoordinator).toBe("");
      expect(project.obtLabPerson).toBe("");
      expect(project.resourceCirclePerson).toBe("");
    }
    expect(keys.has("other")).toBe(true);
  });
});

describe("meetings fixture", () => {
  it("carries the listening cascade", async () => {
    const meetings = await meetingsAPI.list();
    expect(meetings.map((meeting) => meeting.id)).toEqual([
      "monthly_regional",
      "monthly_prayer",
      "obtlab_team",
      "quarterly_regional",
      "annual_celebration",
    ]);
    expect(meetings.map((meeting) => meeting.cadence)).toEqual([
      "monthly",
      "monthly",
      "quarterly",
      "quarterly",
      "annual",
    ]);
    expect(
      meetings.filter((meeting) => meeting.scope === "global").map((m) => m.id),
    ).toEqual(["annual_celebration"]);
  });

  it("starts with an empty meeting log", async () => {
    expect(await meetingsAPI.log()).toEqual([]);
  });
});

describe("prayer fixture", () => {
  it("compiles the wall from the projects that shared a request", async () => {
    const requests = await prayerAPI.list();
    expect(requests).toHaveLength(8);
    for (const request of requests) {
      expect(request.text.length).toBeGreaterThan(0);
      expect(request.source).toBe("Formulário");
      expect(request.answered).toBe(false);
    }
    expect(requests.map((request) => request.projectId)).toContain("korowai");
  });

  it("sorts the wall newest first", async () => {
    const requests = await prayerAPI.list();
    const dates = requests.map((request) => request.date);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it("starts with no intercessor registered", async () => {
    expect(await intercessorsAPI.list()).toEqual([]);
  });
});

describe("eten fixture", () => {
  it("reports only the projects on the ETEN list", async () => {
    const projects = await projectsAPI.list();
    const listed = projects.filter((project) => project.inETEN);
    const report = await etenAPI.report(2025);

    expect(report.year).toBe(2025);
    expect(report.listedProjects).toBe(listed.length);
    expect(report.snapshots).toHaveLength(listed.length);
  });

  it("starts with no credit informed", async () => {
    expect(await etenAPI.credits()).toEqual([]);
    const report = await etenAPI.report(2025);
    expect(report.totalCredits).toBe(0);
    for (const snapshot of report.snapshots) {
      expect(snapshot.credits).toBeNull();
      expect(snapshot.creditsSource).toBeNull();
    }
  });

  it("takes the credit from the ledger instead of deriving it", () => {
    const project = {
      ...createEmptyProject("kadiweu"),
      languageName: "Kadiwéu",
      location: "Brazil",
      inETEN: true,
      totalUnits: 260,
      translatedUnits: 40,
      progressHistory: [
        {
          date: "2024-12-31",
          translatedUnits: 12,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
        {
          date: "2025-12-31",
          translatedUnits: 40,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
      ],
    };

    const report = buildEtenReport(
      [project],
      2025,
      [{ projectId: "kadiweu", year: 2025, credits: 25, source: "manual" }],
      new Date("2026-05-14"),
    );

    expect(report.snapshots[0].translatedUnitsAtPreviousYearEnd).toBe(12);
    expect(report.snapshots[0].translatedUnitsAtYearEnd).toBe(40);
    expect(report.snapshots[0].credits).toBe(25);
    expect(report.snapshots[0].creditsSource).toBe("manual");
    expect(report.totalCredits).toBe(25);
  });

  it("keeps a credit informed for another year out of the report", () => {
    const project = { ...createEmptyProject("kadiweu"), inETEN: true };
    const report = buildEtenReport(
      [project],
      2025,
      [{ projectId: "kadiweu", year: 2024, credits: 9, source: "manual" }],
      new Date("2026-05-14"),
    );

    expect(report.snapshots[0].credits).toBeNull();
    expect(report.totalCredits).toBe(0);
  });
});

describe("geo fixture", () => {
  it("carries the continent outlines the Atlas draws", async () => {
    const outlines = await geoAPI.outlines();
    expect(outlines).toHaveLength(77);
    for (const outline of outlines) {
      expect(outline.length).toBeGreaterThan(0);
      for (const [longitude, latitude] of outline) {
        expect(longitude).toBeGreaterThanOrEqual(-180);
        expect(longitude).toBeLessThanOrEqual(180);
        expect(latitude).toBeGreaterThanOrEqual(-90);
        expect(latitude).toBeLessThanOrEqual(90);
      }
    }
  });
});

describe("fixture module contract", () => {
  it("exposes every screen-facing read as an async call", async () => {
    const calls = [
      projectsAPI.list(),
      projectsAPI.get("fataluku"),
      regionsAPI.list(),
      meetingsAPI.list(),
      meetingsAPI.log(),
      prayerAPI.list(),
      intercessorsAPI.list(),
      etenAPI.report(2025),
      geoAPI.outlines(),
    ];
    for (const call of calls) {
      expect(call).toBeInstanceOf(Promise);
    }
    await Promise.all(calls);
  });

  it("groups every namespace under a single entry point", () => {
    expect(Object.keys(fixtures)).toEqual([
      "projects",
      "regions",
      "meetings",
      "prayer",
      "intercessors",
      "eten",
      "geo",
    ]);
    for (const namespace of Object.values(fixtures)) {
      for (const method of Object.values(namespace)) {
        expect(typeof method).toBe("function");
      }
    }
  });
});
