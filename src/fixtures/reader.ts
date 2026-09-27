import { REGION_CENTROIDS } from "../constants/geo";
import type { SessionPersona } from "../contexts/session";
import type { Project, ReadAs } from "../types/project";
import type { RegionKey } from "../types/region";
import { getRegion } from "../utils/region";

/**
 * The server's reader rule (shema-api `_scope.readership`, OBT-528), for the doubles
 * only: in fixture mode they stand in for the server, so the mock role decides here and
 * nowhere else. Screens never evaluate a role — they read the `readAs` a payload carries.
 */
const COORDINATION_EVERYWHERE = ["globalStrategist", "admin"] as const;

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
  return "other";
}

/** Who a collection's withheld notice is addressed to — `coordinates_anything`. */
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
    coords: REGION_CENTROIDS[region],
  };
}

/** A project as the double hands it to `persona`: stamped with `readAs`, reduced when read as `other`. */
export function asReadBy(project: Project, persona: SessionPersona): Project {
  const readAs = readerOf(persona, project.derived?.region ?? getRegion(project));
  const read = { ...project, readAs };
  return readAs === "other" && project.sensitiveCountry ? withhold(read) : read;
}
