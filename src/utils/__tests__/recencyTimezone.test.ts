import { afterAll, describe, expect, it } from "vitest";
import { toLocalIsoDate } from "../format";
import {
  getDaysSinceUpdate,
  getDeadlineInfo,
  isRecentlyUpdated,
} from "../recency";
import { makeProject } from "./factory";

const originalTz = process.env.TZ;
process.env.TZ = "America/Sao_Paulo";

afterAll(() => {
  process.env.TZ = originalTz;
});

describe("date-only strings under a non-UTC timezone", () => {
  const localMidnight = new Date("2026-05-14T00:00:00");

  it("counts staleness and the recent preset from the same midnight", () => {
    const project = makeProject({
      lastUpdated: "2026-04-14",
      progressHistory: [
        {
          date: "2026-04-14",
          translatedUnits: 1,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
      ],
    });

    expect(getDaysSinceUpdate(project, localMidnight)).toBe(30);
    expect(isRecentlyUpdated(project, localMidnight)).toBe(true);
  });

  it("does not read a deadline as overdue on the deadline day", () => {
    const lateEvening = new Date("2026-05-14T22:00:00");

    expect(getDeadlineInfo("2026-05-14", lateEvening).cls).toBe("soon");
  });

  it("stamps the save with the local day, not the UTC day", () => {
    expect(toLocalIsoDate(new Date("2026-12-31T23:30:00"))).toBe("2026-12-31");
    expect(toLocalIsoDate(new Date("2026-01-05T00:10:00"))).toBe("2026-01-05");
  });
});
