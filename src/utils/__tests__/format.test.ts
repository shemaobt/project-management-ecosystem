import { describe, expect, it } from "vitest";
import { formatDuration } from "../format";

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
