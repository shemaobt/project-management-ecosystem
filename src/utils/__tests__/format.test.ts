import { describe, expect, it } from "vitest";
import { formatDuration, utcDay } from "../format";

describe("formatDuration", () => {
  it("renders minutes and seconds under an hour", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(7)).toBe("0:07");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(272)).toBe("4:32");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("adds the hour block from 3600 seconds on", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(36000)).toBe("10:00:00");
  });

  it("rounds fractions and never renders a negative duration", () => {
    expect(formatDuration(4.6)).toBe("0:05");
    expect(formatDuration(-30)).toBe("0:00");
  });
});

describe("utcDay", () => {
  it("reads the day the server wrote, field by field, with no timezone", () => {
    expect(utcDay("2026-09-27T23:30:00Z")).toBe("2026-09-27");
    expect(utcDay("2026-12-31T23:59:59+00:00")).toBe("2026-12-31");
    expect(utcDay("2026-01-01")).toBe("2026-01-01");
  });

  it("answers nothing for a value that is not an ISO moment", () => {
    expect(utcDay("")).toBe("");
    expect(utcDay("27/09/2026")).toBe("");
  });
});
