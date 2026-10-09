import { REGION_CENTROIDS } from "../constants/geo";
import type { SessionPersona } from "../contexts/session";
import type { Project, ReadAs } from "../types/project";
import type { RegionKey } from "../types/region";
import { canReadHealth, canWriteHealth } from "../utils/access";
import { getRegion } from "../utils/region";

/**
 * The server's reader rule (shema-api `_scope.readership`, OBT-528), for the doubles
 * only: in fixture mode they stand in for the server, so the mock role decides here and
 * nowhere else. Screens never evaluate a role — they read the `readAs` a payload carries.
 */
const COORDINATION_EVERYWHERE = ["admin"] as const;

function coordinatesEverywhere(persona: SessionPersona): boolean {
  return COORDINATION_EVERYWHERE.some((role) => persona.roles.includes(role));
}

export function readerOf(persona: SessionPersona, region: RegionKey): ReadAs {
  if (coordinatesEverywhere(persona)) return "coordination";
  if (
    persona.roles.includes("coordinator") &&
    (persona.regionScope === null || persona.regionScope.includes(region))
  ) {
    return "coordination";
  }
  // The Resource Circle reads the truth and edits nothing of it (OBT-571); the OBT Lab
  // stays `other`, by Daniel's decision, and keeps reading the region.
  if (persona.roles.includes("resourceCircle")) return "trusted";
  return "other";
}

export function readsHealth(persona: SessionPersona): boolean {
  return canReadHealth(persona.roles);
}

export function writesHealth(persona: SessionPersona): boolean {
  return canWriteHealth(persona.roles);
}

/**
 * `reads_truth_anywhere` on the server (OBT-571): who a notice about the collection — the
 * `locationsWithheld` count and the `sensitive` facet — is for. Coordination of any region,
 * or the Resource Circle, which reads the truth without coordinating.
 */
export function readsTruthAnywhere(persona: SessionPersona): boolean {
  if (coordinatesAnything(persona)) return true;
  // The server asks the Circle's scope to be global or non-empty, as it asks a coordinator's.
  return (
    persona.roles.includes("resourceCircle") &&
    (persona.regionScope === null || persona.regionScope.length > 0)
  );
}

export function coordinatesAnything(persona: SessionPersona): boolean {
  if (coordinatesEverywhere(persona)) return true;
  return (
    persona.roles.includes("coordinator") &&
    (persona.regionScope === null || persona.regionScope.length > 0)
  );
}

/** `LeavingShape`'s reduction: the region key for the place, the centroid, and nothing of the base, contacts or reason. */
export function withhold(project: Project): Project {
  const region = project.derived?.region ?? getRegion(project);
  return {
    ...project,
    location: region,
    location2: "",
    team: "",
    ywamBase: "",
    teamContact: "",
    teamLeaderContact: "",
    mentorContact: "",
    sensitivity: "",
    // The free text (OBT-556) and each need's description, which the server empties for
    // everybody but coordination on a withheld record.
    notes: "",
    healthNotes: "",
    statusComments: "",
    scopeDetails: "",
    needsItems: project.needsItems.map((need) => ({ ...need, description: "" })),
    coords: REGION_CENTROIDS[region],
    // The server's rule for the name (OBT-560): the public one, or the region key.
    languageName: project.publicLanguageName?.trim() || region,
    languageNameWithheld: true,
    publicLanguageName: undefined,
    // The captions and the deciding name (OBT-578, `_redaction.free_text_as_read`): the
    // caption is the leader's own sentence about the photo and `by` is a person's name;
    // `granted` and `at` stay, because the authorization gates the bytes and the caption is text.
    mediaPhotos: (project.mediaPhotos ?? []).map((photo) => ({
      ...photo,
      caption: "",
      authorization: unnamed(photo.authorization),
    })),
    mediaVideos: (project.mediaVideos ?? []).map((video) => ({
      ...video,
      caption: "",
      authorization: unnamed(video.authorization),
    })),
  };
}

function unnamed<A extends { by: string }>(authorization: A | null | undefined): A | null {
  return authorization ? { ...authorization, by: "" } : null;
}

export function asReadBy(project: Project, persona: SessionPersona): Project {
  const readAs = readerOf(persona, project.derived?.region ?? getRegion(project));
  const read = { ...project, readAs };
  if (readAs === "other" && project.sensitiveCountry) return withoutPhotoBytes(withhold(read));
  // The Resource Circle reads a withheld record's truth (OBT-571) and not its photos' bytes:
  // an image of a withheld project is the coordination's until OBT-575 (Daniel, 9/oct, b).
  if (readAs === "trusted" && project.sensitiveCountry) return withoutPhotoBytes(read);
  return read;
}

/** The bytes a fixture photo carries locally, dropped for a reader the server's link refuses. */
function withoutPhotoBytes(project: Project): Project {
  return {
    ...project,
    mediaPhotos: (project.mediaPhotos ?? []).map((photo) => ({ ...photo, image: null })),
  };
}

/**
 * `media_download_url`'s gates for the double (OBT-581): the photo must exist and hold bytes
 * (404), be authorized (403), and — on a withheld project — the reader must be its
 * coordination (403, the same refusal). One sentence for every 403, so nothing tells which.
 */
export function mediaLinkFor(
  project: Project,
  itemId: string,
  persona: SessionPersona,
): { ok: true; url: string } | { ok: false; status: 403 | 404 } {
  const photo = (project.mediaPhotos ?? []).find((entry) => entry.id === itemId);
  if (!photo || !photo.image) return { ok: false, status: 404 };
  if (photo.authorization?.granted !== true) return { ok: false, status: 403 };
  const reader = readerOf(persona, project.derived?.region ?? getRegion(project));
  if (project.sensitiveCountry && reader !== "coordination") return { ok: false, status: 403 };
  return { ok: true, url: photo.image.src };
}
