import { describe, expect, it } from "vitest";
import { getOverallHealth, getPriority, healthScore } from "../health";
import { matchesPreset } from "../presets";
import { getProgress, getProjectStatus, rollUpProgress } from "../progress";
import {
  getDaysSinceUpdate,
  getDeadlineInfo,
  getLastProgressUpdate,
  getStaleStatus,
  isRecentlyUpdated,
} from "../recency";
import { getCountry, getRegion } from "../region";
import { escapeHtml, formatDate } from "../format";
import { makeProject } from "./factory";

const NOW = new Date("2026-05-14T00:00:00");

const pad = (value: number): string => String(value).padStart(2, "0");

const daysBefore = (days: number): string => {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

describe("getProjectStatus", () => {
  it("keeps an explicit status from the import", () => {
    for (const status of [
      "em-andamento",
      "cancelado",
      "pausado",
      "planejado",
      "concluido",
      "desconhecido",
    ] as const) {
      expect(
        getProjectStatus(
          makeProject({ status, totalUnits: 10, translatedUnits: 10 }),
        ),
      ).toBe(status);
    }
  });

  it("derives nao-iniciado when nothing was translated", () => {
    const project = makeProject({
      status: "final",
      totalUnits: 100,
      translatedUnits: 0,
    });
    expect(getProjectStatus(project)).toBe("nao-iniciado");
  });

  it("derives concluido at 100%", () => {
    const project = makeProject({
      status: "final",
      totalUnits: 100,
      translatedUnits: 100,
    });
    expect(getProjectStatus(project)).toBe("concluido");
  });

  it("derives final from 75% up", () => {
    const project = makeProject({
      status: "final",
      totalUnits: 100,
      translatedUnits: 80,
    });
    expect(getProjectStatus(project)).toBe("final");
  });

  it("derives em-andamento below 75%", () => {
    const project = makeProject({
      status: "final",
      totalUnits: 100,
      translatedUnits: 30,
    });
    expect(getProjectStatus(project)).toBe("em-andamento");
  });

  it("treats a project without units as nao-iniciado", () => {
    expect(getProjectStatus(makeProject({ status: "final" }))).toBe(
      "nao-iniciado",
    );
  });
});

describe("getProgress", () => {
  it("returns 0 when there are no planned units", () => {
    expect(getProgress(makeProject({ totalUnits: 0, translatedUnits: 5 }))).toBe(
      0,
    );
  });

  it("returns the translated share of the planned units", () => {
    expect(
      getProgress(makeProject({ totalUnits: 200, translatedUnits: 50 })),
    ).toBe(25);
  });
});

describe("getOverallHealth", () => {
  it("returns na when no dimension was assessed", () => {
    expect(getOverallHealth(makeProject())).toBe("na");
  });

  it("returns critica when any dimension is critical", () => {
    const project = makeProject({
      healthEmotional: "boa",
      healthRelational: "critica",
      healthSpiritual: "atencao",
      healthPhysical: "boa",
    });
    expect(getOverallHealth(project)).toBe("critica");
  });

  it("returns atencao when the worst dimension needs attention", () => {
    const project = makeProject({
      healthEmotional: "boa",
      healthRelational: "atencao",
    });
    expect(getOverallHealth(project)).toBe("atencao");
  });

  it("returns boa when every assessed dimension is good", () => {
    const project = makeProject({
      healthEmotional: "boa",
      healthRelational: "boa",
      healthSpiritual: "boa",
      healthPhysical: "boa",
    });
    expect(getOverallHealth(project)).toBe("boa");
  });

  it("ignores the physical dimension when the record does not carry it", () => {
    const project = makeProject({ healthEmotional: "boa" });
    delete project.healthPhysical;
    expect(getOverallHealth(project)).toBe("boa");
  });
});

describe("healthScore", () => {
  it("adds the four dimensions", () => {
    const project = makeProject({
      healthEmotional: "boa",
      healthRelational: "atencao",
      healthSpiritual: "critica",
      healthPhysical: "",
    });
    expect(healthScore(project)).toBe(6);
  });
});

describe("getStaleStatus", () => {
  it("returns null for statuses that cannot go stale", () => {
    for (const status of [
      "concluido",
      "cancelado",
      "planejado",
      "desconhecido",
    ] as const) {
      const project = makeProject({ status, startDate: daysBefore(400) });
      expect(getStaleStatus(project, NOW)).toBeNull();
    }
  });

  it("returns null when there is no date to compare", () => {
    expect(getStaleStatus(makeProject(), NOW)).toBeNull();
  });

  it("returns critico from 120 days on", () => {
    const project = makeProject({ startDate: daysBefore(120) });
    expect(getStaleStatus(project, NOW)).toBe("critico");
  });

  it("returns atencao from 60 days on", () => {
    const project = makeProject({ startDate: daysBefore(60) });
    expect(getStaleStatus(project, NOW)).toBe("atencao");
  });

  it("returns em-dia below 60 days", () => {
    const project = makeProject({ startDate: daysBefore(59) });
    expect(getStaleStatus(project, NOW)).toBe("em-dia");
  });

  it("reads the newest progress record before the start date", () => {
    const project = makeProject({
      startDate: daysBefore(400),
      progressHistory: [
        {
          date: daysBefore(300),
          translatedUnits: 1,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
        {
          date: daysBefore(10),
          translatedUnits: 2,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
      ],
    });
    expect(getLastProgressUpdate(project)).toBe(daysBefore(10));
    expect(getStaleStatus(project, NOW)).toBe("em-dia");
  });

  it("falls back to em-dia when the date cannot be parsed", () => {
    const project = makeProject({ startDate: "13/04/2024" });
    expect(getDaysSinceUpdate(project, NOW)).toBeNaN();
    expect(getStaleStatus(project, NOW)).toBe("em-dia");
  });
});

describe("getDeadlineInfo", () => {
  it("has no class without a deadline", () => {
    expect(getDeadlineInfo("", NOW)).toEqual({ cls: "", days: null });
  });

  it("marks a past deadline as overdue", () => {
    expect(getDeadlineInfo("2026-05-01", NOW).cls).toBe("overdue");
  });

  it("marks a deadline within 90 days as soon", () => {
    expect(getDeadlineInfo("2026-06-14", NOW).cls).toBe("soon");
  });

  it("marks a distant deadline as ok", () => {
    expect(getDeadlineInfo("2027-05-14", NOW).cls).toBe("ok");
  });
});

describe("getPriority", () => {
  it("ranks canceled and paused before every other signal", () => {
    expect(
      getPriority(
        makeProject({ status: "cancelado", healthEmotional: "critica" }),
        NOW,
      ),
    ).toBe("canceled");
    expect(
      getPriority(
        makeProject({ status: "pausado", healthEmotional: "critica" }),
        NOW,
      ),
    ).toBe("paused");
  });

  it("ranks critical health and critical staleness as critical", () => {
    expect(getPriority(makeProject({ healthEmotional: "critica" }), NOW)).toBe(
      "critical",
    );
    expect(
      getPriority(makeProject({ startDate: daysBefore(200) }), NOW),
    ).toBe("critical");
  });

  it("ranks attention health and attention staleness as warning", () => {
    expect(getPriority(makeProject({ healthEmotional: "atencao" }), NOW)).toBe(
      "warning",
    );
    expect(getPriority(makeProject({ startDate: daysBefore(70) }), NOW)).toBe(
      "warning",
    );
  });

  it("ranks the remaining statuses", () => {
    expect(getPriority(makeProject({ status: "concluido" }), NOW)).toBe(
      "completed",
    );
    expect(getPriority(makeProject({ status: "planejado" }), NOW)).toBe(
      "planned",
    );
    expect(getPriority(makeProject({ status: "desconhecido" }), NOW)).toBe(
      "unknown",
    );
    expect(getPriority(makeProject({ status: "em-andamento" }), NOW)).toBe(
      "default",
    );
  });
});

describe("rollUpProgress", () => {
  it("returns null when nothing was broken down", () => {
    expect(rollUpProgress(makeProject())).toBeNull();
  });

  it("adds books, stories and other units", () => {
    const project = makeProject({
      bookProgress: [
        {
          id: "jhn",
          name: "João",
          chapters: 21,
          translated: 10,
          communityChecked: 5,
          mentorApproved: 2,
        },
      ],
      storyProgress: [{ name: "A criação", audioHours: 2 }],
      otherProgress: [
        {
          name: "Cartilha",
          chapters: 4,
          translated: 4,
          communityChecked: 1,
          mentorApproved: 0,
        },
      ],
    });
    expect(rollUpProgress(project)).toEqual({
      total: 25,
      translated: 14,
      community: 6,
      approved: 2,
    });
  });
});

describe("matchesPreset", () => {
  it("matches attention on critical health, critical staleness or an urgent open need", () => {
    expect(
      matchesPreset(makeProject({ healthEmotional: "critica" }), "attention", NOW),
    ).toBe(true);
    expect(
      matchesPreset(makeProject({ startDate: daysBefore(150) }), "attention", NOW),
    ).toBe(true);
    expect(
      matchesPreset(
        makeProject({
          needsItems: [
            {
              category: "financial",
              urgency: "high",
              status: "open",
              description: "Gravador",
            },
          ],
        }),
        "attention",
        NOW,
      ),
    ).toBe(true);
    expect(
      matchesPreset(
        makeProject({
          needsItems: [
            {
              category: "financial",
              urgency: "high",
              status: "fulfilled",
              description: "Gravador",
            },
          ],
        }),
        "attention",
        NOW,
      ),
    ).toBe(false);
  });

  it("matches prayer only on a shared need", () => {
    expect(
      matchesPreset(
        makeProject({
          needsItems: [
            {
              category: "training",
              urgency: "low",
              status: "open",
              description: "Oficina",
              prayerShared: true,
            },
          ],
        }),
        "prayer",
        NOW,
      ),
    ).toBe(true);
    expect(matchesPreset(makeProject(), "prayer", NOW)).toBe(false);
  });

  it("matches celebrate on a completed project or an answered prayer", () => {
    expect(
      matchesPreset(makeProject({ status: "concluido" }), "celebrate", NOW),
    ).toBe(true);
    expect(
      matchesPreset(
        makeProject({
          needsItems: [
            {
              category: "equipment",
              urgency: "low",
              status: "fulfilled",
              description: "Notebook",
              prayerAnswered: true,
            },
          ],
        }),
        "celebrate",
        NOW,
      ),
    ).toBe(true);
  });

  it("matches recent within 30 days of the last update", () => {
    expect(
      matchesPreset(makeProject({ lastUpdated: daysBefore(10) }), "recent", NOW),
    ).toBe(true);
    expect(
      matchesPreset(makeProject({ lastUpdated: daysBefore(31) }), "recent", NOW),
    ).toBe(false);
    expect(matchesPreset(makeProject(), "recent", NOW)).toBe(false);
    expect(isRecentlyUpdated(makeProject({ lastUpdated: "16/06/2026" }), NOW)).toBe(
      false,
    );
  });
});

describe("region", () => {
  it("reads the country from the first segment of the location", () => {
    expect(getCountry(makeProject({ location: "China, Laos, Vietnam" }))).toBe(
      "China",
    );
  });

  it("maps a known country to its region and everything else to other", () => {
    expect(getRegion(makeProject({ location: "Brazil" }))).toBe("south-america");
    expect(getRegion(makeProject({ location: "Narnia" }))).toBe("other");
    expect(getRegion(makeProject({ location: "" }))).toBe("other");
  });
});

describe("format", () => {
  it("renders an em dash for an empty date", () => {
    expect(formatDate("")).toBe("—");
  });

  it("formats a date in the given locale", () => {
    expect(formatDate("2026-05-14", "pt-BR")).toContain("2026");
  });

  it("escapes html entities", () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
    );
    expect(escapeHtml(null)).toBe("");
  });
});
