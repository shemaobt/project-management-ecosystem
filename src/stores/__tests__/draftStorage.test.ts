import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
    clear: () => data.clear(),
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { createDeferredJsonStorage } = await import("../draftStorage");

const KEY = "shema-record-drafts-v1";
const value = (name: string) => ({ state: { drafts: { [name]: {} } }, version: 0 });

describe("createDeferredJsonStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storage.clear();
    storage.setItem.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses a burst of writes into one flush carrying the latest value", () => {
    const deferred = createDeferredJsonStorage(400);
    deferred.setItem(KEY, value("primeiro"));
    deferred.setItem(KEY, value("segundo"));
    deferred.setItem(KEY, value("terceiro"));
    expect(storage.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      KEY,
      JSON.stringify(value("terceiro")),
    );
  });

  it("reads back the pending value before the flush lands", () => {
    const deferred = createDeferredJsonStorage(400);
    deferred.setItem(KEY, value("pendente"));
    expect(deferred.getItem(KEY)).toEqual(value("pendente"));
  });

  it("removeItem drops the pending write and the stored copy", () => {
    const deferred = createDeferredJsonStorage(400);
    deferred.setItem(KEY, value("descartado"));
    deferred.removeItem(KEY);
    vi.advanceTimersByTime(400);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(deferred.getItem(KEY)).toBeNull();
  });

  it("a flush that exceeds the quota warns instead of throwing", () => {
    const deferred = createDeferredJsonStorage(400);
    storage.setItem.mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });
    deferred.setItem(KEY, value("grande"));
    expect(() => vi.advanceTimersByTime(400)).not.toThrow();
  });
});
