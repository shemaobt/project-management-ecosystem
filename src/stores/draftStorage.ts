import type { PersistStorage, StorageValue } from "zustand/middleware";
import { toast } from "../components/ui";
import i18n from "../i18n";

export const FLUSH_DELAY_MS = 400;

export interface DeferredJsonStorage<T> extends PersistStorage<T> {
  flush: () => void;
}

export function createDeferredJsonStorage<T>(
  delayMs: number = FLUSH_DELAY_MS,
): DeferredJsonStorage<T> {
  let pending: StorageValue<T> | null = null;
  let pendingName: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let warned = false;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pendingName === null || pending === null) return;
    try {
      localStorage.setItem(pendingName, JSON.stringify(pending));
    } catch {
      if (!warned) {
        warned = true;
        toast.error(i18n.t("record_draft_persist_failed"));
      }
    }
    pending = null;
    pendingName = null;
  };

  if (typeof window !== "undefined" && "addEventListener" in window) {
    window.addEventListener("pagehide", flush);
  }
  if (typeof document !== "undefined" && "addEventListener" in document) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  return {
    getItem: (name) => {
      if (pendingName === name && pending !== null) return pending;
      const raw = localStorage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<T>) : null;
    },
    setItem: (name, value) => {
      pending = value;
      pendingName = name;
      if (timer === null) {
        timer = setTimeout(() => {
          timer = null;
          flush();
        }, delayMs);
      }
    },
    removeItem: (name) => {
      if (pendingName === name) {
        pending = null;
        pendingName = null;
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      }
      localStorage.removeItem(name);
    },
    flush,
  };
}
