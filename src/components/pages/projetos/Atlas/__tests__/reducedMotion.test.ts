import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("localStorage", {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
});

const { Globe } = await import("../Globe");
const { prefersReducedMotion, REDUCED_MOTION_QUERY } = await import(
  "../../../../../utils/motion"
);

const PLAYING = "❚❚";
const PAUSED = "▶";

function withPreference(reduce: boolean) {
  const matchMedia = vi.fn((query: string) => ({
    matches: query === REDUCED_MOTION_QUERY && reduce,
  }));
  vi.stubGlobal("window", { matchMedia });
  return matchMedia;
}

const globe = () =>
  renderToStaticMarkup(
    createElement(Globe, { projects: [], locationsWithheld: null }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
  });
});

describe("the globe under prefers-reduced-motion (OBT-502)", () => {
  it("starts paused, with the play control still on the stage", () => {
    withPreference(true);
    const html = globe();
    expect(html).toContain(PAUSED);
    expect(html).not.toContain(PLAYING);
  });

  it("keeps spinning by default for everybody else", () => {
    withPreference(false);
    const html = globe();
    expect(html).toContain(PLAYING);
    expect(html).not.toContain(PAUSED);
  });

  it("reads the preference once per globe, not once per frame", () => {
    const matchMedia = withPreference(true);
    globe();
    expect(matchMedia).toHaveBeenCalledTimes(1);
  });

  it("answers false where there is no window or no matchMedia", () => {
    vi.stubGlobal("window", undefined);
    expect(prefersReducedMotion()).toBe(false);
    vi.stubGlobal("window", {});
    expect(prefersReducedMotion()).toBe(false);
  });
});
