import { announceFailure, toApiFailure } from "../services/api";
import type { ApiFailure } from "../types/session";

export interface HydrationStatus {
  hydrated: boolean;
  loading: boolean;
  error: ApiFailure | null;
}

export const NOT_HYDRATED: HydrationStatus = {
  hydrated: false,
  loading: false,
  error: null,
};

export interface HydrationSlot {
  pending: Promise<void> | null;
}

export function createHydrationSlot(): HydrationSlot {
  return { pending: null };
}

export function hydrateOnce(
  slot: HydrationSlot,
  status: () => HydrationStatus,
  update: (partial: Partial<HydrationStatus>) => void,
  load: () => Promise<void>,
  force = false,
): Promise<void> {
  if (slot.pending) return slot.pending;
  if (status().hydrated && !force) return Promise.resolve();

  update({ loading: true, error: null });
  slot.pending = load()
    .then(() => {
      update({ hydrated: true, loading: false, error: null });
    })
    .catch((error: unknown) => {
      const failure = toApiFailure(error);
      announceFailure(failure);
      update({ loading: false, error: failure });
    })
    .finally(() => {
      slot.pending = null;
    });
  return slot.pending;
}
