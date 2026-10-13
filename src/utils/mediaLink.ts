import type { MediaPhoto, Project } from "../types/project";
import { isMediaAuthorized } from "./media";

/**
 * When to ask for a photo's link again (OBT-582): a minute before the server's expiry, so the
 * picture on screen never points at an address that has just stopped working — and never
 * sooner than half a minute, so a link the server mints short cannot turn into a loop.
 */
export function linkRefreshDelayMs(expiresInMinutes: number): number {
  const lifetime = Math.max(0, expiresInMinutes) * 60_000;
  return Math.max(30_000, lifetime - 60_000);
}

/**
 * How many times a photo whose bytes failed to load gets a fresh link (OBT-582): one. A
 * corrupted object, or a network that bars the bytes, would otherwise turn into a loop of
 * link-and-bytes on the field connection; after the one retry the slot stays empty, with no
 * reason, as every refusal does. A load that succeeds resets the count, so a link that merely
 * expired on screen still gets its retry next time.
 */
export const IMAGE_RETRIES = 1;

export interface PhotoLinkState {
  /** Bumped to ask for a link — what the component's effect depends on. */
  attempt: number;
  /** Retries spent on image failures since the last successful load. */
  imageRetries: number;
  /** Nothing more is asked for: the slot stays empty. */
  givenUp: boolean;
}

export const FIRST_LINK: PhotoLinkState = { attempt: 0, imageRetries: 0, givenUp: false };

export type PhotoLinkEvent = "imageFailed" | "imageLoaded" | "expiring";

export function nextPhotoLink(state: PhotoLinkState, event: PhotoLinkEvent): PhotoLinkState {
  if (state.givenUp) return state;
  switch (event) {
    case "imageLoaded":
      return state.imageRetries === 0 ? state : { ...state, imageRetries: 0 };
    case "expiring":
      return { ...state, attempt: state.attempt + 1 };
    case "imageFailed":
      return state.imageRetries >= IMAGE_RETRIES
        ? { ...state, givenUp: true }
        : { attempt: state.attempt + 1, imageRetries: state.imageRetries + 1, givenUp: false };
  }
}

/**
 * Whether the Mídia tab asks for a photo's bytes at all: a server photo (an id and no local
 * bytes) of a saved record, authorized, and — on a withheld project — only for its
 * coordination (OBT-581; Daniel 9/oct, option b). The server would refuse the rest with a 403;
 * not asking spares the call, and it is what keeps OBT Lab and the Resource Circle from ever
 * holding a withheld project's link.
 */
export function asksForPhotoBytes(
  project: Partial<Pick<Project, "id" | "sensitiveCountry" | "readAs">>,
  photo: MediaPhoto,
): boolean {
  if (photo.image || !photo.id || !project.id) return false;
  if (!isMediaAuthorized(photo)) return false;
  return !project.sensitiveCountry || project.readAs === "coordination";
}

/**
 * A server photo's decision as the server holds it (OBT-582, review): read off the saved record,
 * by the photo's id, never off the draft. `mediaPhotos` is a pending write — no save consumes
 * it — so a draft that once held the photo as authorized would otherwise paint `granted: true`
 * back over the record re-read after a withdrawal. A photo with no id is this device's own and
 * keeps what the draft says. **Nor is it restored over a new file**: `withPhotoImage` keeps the
 * slot's id when the file changes and clears the decision, and the consent belongs to the photo,
 * not to the slot (FE-27) — so a draft that brings its own bytes keeps its own, empty decision
 * instead of inheriting the old photo's `granted` with somebody else's `by` and `at`.
 */
export function asServerHoldsIt(photo: MediaPhoto, saved: Pick<Project, "mediaPhotos"> | undefined): MediaPhoto {
  if (!photo.id || !saved || photo.image) return photo;
  const held = saved.mediaPhotos?.find((entry) => entry.id === photo.id);
  return held ? { ...photo, authorization: held.authorization } : photo;
}

/**
 * Whether *Retirar autorização* is drawn (OBT-582, review): an authorized server photo, on a
 * record this reader reads as its **coordination**. The route is the coordinator's
 * (`CoordinatorUser`) and is scoped to the coordinator's regions (`get_project`), so a
 * coordinator of another region — whom `readerOf` reads as `other` — or a `trusted` reader is
 * answered 404 or 403: a button there would be a dead control. The role half is asked by the
 * button itself (`canWithdrawMediaAuthorization`).
 */
export function offersWithdrawal(
  project: Partial<Pick<Project, "id" | "readAs">>,
  photo: MediaPhoto,
): boolean {
  return Boolean(photo.id && project.id) && project.readAs === "coordination" && isMediaAuthorized(photo);
}
