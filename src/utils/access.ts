import {
  ACCESS_APPS,
  ADMIN_ROLE,
  FORM_APP,
  FORM_SEATS,
  GRANTABLE_ROLES,
  SHEMA_APP,
} from "../constants/access";
import { ROLE_DEFINITIONS } from "../constants/roles";
import type { AccessAppKey, AccountGrants } from "../types/access";
import type { Project } from "../types/project";
import type { RoleKey } from "../types/role";
import type { RegionKey } from "../types/region";
import type { SessionRole } from "../types/session";
import { regionOf, regionOfPlace } from "./region";

export function canAdministerAccess({
  roles,
}: {
  roles: readonly SessionRole[];
}): boolean {
  return roles.includes(ADMIN_ROLE);
}

const IMPORTING_ROLES: readonly SessionRole[] = [
  "coordinator",
  ADMIN_ROLE,
];

/**
 * Who may import a file of records — coordination, as BE-14's `import_projects` decides it:
 * a coordinator, the `admin` role (INT-11 · OBT-416), and only an account that writes a project
 * somewhere (OBT-593: the Admin alone writes none, and the import writes records). Reflection
 * only; an installation admin with none of these roles is the server's to admit.
 */
export function canImportProjects(
  roles: readonly SessionRole[],
  writeRegionScope?: readonly RegionKey[] | null,
): boolean {
  return roles.some((role) => IMPORTING_ROLES.includes(role)) && writesAnyProject(writeRegionScope);
}

/**
 * Whether the session is the installation's admin — `users.is_platform_admin`, which passes every
 * guard on the server, and not the `admin` role the PME labels *Admin da plataforma* (OBT-620).
 * The session carries no flag for it; `writeRegionScope: null` is the one sign, because shema-api
 * answers `null` to that account alone: `writing_scope` hands back the regional reach, global only
 * for an installation admin, and every other account — the `admin` role included — gets a list.
 * Absent (a server from before OBT-593) recognizes nobody.
 */
function isInstallationAdmin(writeRegionScope: readonly RegionKey[] | null | undefined): boolean {
  return writeRegionScope === null;
}

/**
 * Whom shema-api's `CoordinatorUser` admits — the `coordinator` grant, or the installation admin
 * (OBT-620). The leader link, a region's seats and a photo's withdrawal sit behind it and take the
 * write scope beside it, so each capability below asks both halves: the OBT Lab writes its own
 * region and is still refused by the role. The grant half reads no field, so it holds whether the
 * server sent `writeRegionScope` or not.
 */
function admittedAsCoordinator(
  roles: readonly SessionRole[],
  writeRegionScope: readonly RegionKey[] | null | undefined,
): boolean {
  return roles.includes("coordinator") || isInstallationAdmin(writeRegionScope);
}

/**
 * Who is offered the leader link — whom `POST /intake-links` admits: `CoordinatorUser` (OBT-620:
 * the OBT Lab was offered a button the route answers with 403) and the write scope (OBT-593: the
 * Admin alone writes none). The header mounts the dialog, and the list of links in it, only for
 * this reader.
 */
export function canMintLeaderLinks(
  roles: readonly SessionRole[],
  writeRegionScope?: readonly RegionKey[] | null,
): boolean {
  return admittedAsCoordinator(roles, writeRegionScope) && writesAnyProject(writeRegionScope);
}

/**
 * Who types over a region's seats on Equipe — whom `PUT /regions/{key}/team` admits:
 * `CoordinatorUser` and the write scope (OBT-620). The OBT Lab reads its region's seats and saves
 * none; a coordinator saves only where it writes a project (OBT-593).
 */
export function canWriteRegionTeam(
  roles: readonly SessionRole[],
  writeRegionScope: readonly RegionKey[] | null | undefined,
  region: RegionKey,
): boolean {
  return admittedAsCoordinator(roles, writeRegionScope) && writesProjectIn(writeRegionScope, region);
}

/**
 * The projects the leader-link dialog offers (OBT-593): only those in the account's write scope,
 * since the route mints in it and any other choice ends in a 403. The selector and the default
 * selection both read this list, so neither can reach a project outside it.
 */
export function leaderLinkProjects(
  projects: readonly Project[],
  writeRegionScope?: readonly RegionKey[] | null,
): Project[] {
  return projects.filter((project) => writesProjectIn(writeRegionScope, regionOf(project)));
}

/**
 * Who takes a photo's authorization back — `CoordinatorUser` on the server's withdraw route
 * (OBT-578): the coordinator, and the installation admin that guard also admits (OBT-620); the
 * Admin does not grant or refuse in the team's place — and, given the project's region, only where
 * the account writes (OBT-593). Reflection only, so the button is not drawn for a reader the route
 * refuses.
 */
export function canWithdrawMediaAuthorization(
  roles: readonly SessionRole[],
  writeRegionScope?: readonly RegionKey[] | null,
  region?: RegionKey,
): boolean {
  if (region === undefined) return false;
  return admittedAsCoordinator(roles, writeRegionScope) && writesProjectIn(writeRegionScope, region);
}

/**
 * Who writes the intercessor network — adds, edits, removes — mirroring shema-api's
 * `NetworkWriter` (OBT-574): coordination and the `admin` role. Karina, 6/out:
 * *"Somente a coordenação tem acesso editar e apagar o contato do intercessor. O Resource
 * Circle pode ver, mas não edita."* The Circle reads the network and reveals a contact; the
 * server answers 403 to any write of it. Reflection only: an installation admin with none of
 * these roles is the server's to admit.
 */
const NETWORK_WRITERS: readonly SessionRole[] = ["coordinator", ADMIN_ROLE];

export function canWriteNetwork(roles: readonly SessionRole[]): boolean {
  return roles.some((role) => NETWORK_WRITERS.includes(role));
}

/**
 * Who keeps a contact current — marks the one-year review — mirroring shema-api's
 * `NetworkKeeper` (OBT-574): the writers and the Resource Circle. Daniel, 10/out: *"conta como
 * edição mas o Resource Circle precisa ter esse acesso"*.
 */
const NETWORK_KEEPERS: readonly SessionRole[] = [...NETWORK_WRITERS, "resourceCircle"];

/**
 * Who reads the network at all, mirroring shema-api's `NetworkReader` (OBT-598): the Resource
 * Circle, coordination and the `admin` role. Today the same three as the keepers, and still a
 * list of its own, because the server keeps them apart. The OBT Lab is refused with a 403, so
 * the Intercessores tab is not offered to it. Reflection only: the page still asks the server,
 * and only its 403 says the network is refused.
 */
const NETWORK_READERS: readonly SessionRole[] = ["resourceCircle", "coordinator", ADMIN_ROLE];

export function canReadNetwork(roles: readonly SessionRole[]): boolean {
  return roles.some((role) => NETWORK_READERS.includes(role));
}

export function canKeepNetwork(roles: readonly SessionRole[]): boolean {
  return roles.some((role) => NETWORK_KEEPERS.includes(role));
}

/**
 * Who opens a new record — everyone the server lets write a project. The Resource Circle
 * writes none (OBT-571, Daniel 7/oct: *só não podem editar* read whole; `refuse_circle_writes`
 * answers 403 on every project route, the create included), unless it also coordinates —
 * `readership` makes a Circle who coordinates coordination, and a Circle who is also OBT Lab
 * is refused too, the stricter of the two readings. Reflection only: without it the button
 * leads to a form the server refuses after it was filled, the worst kind of dead control.
 */
export function canCreateProjects(
  roles: readonly SessionRole[],
  writeRegionScope?: readonly RegionKey[] | null,
): boolean {
  const circle = roles.includes("resourceCircle");
  const coordinates = roles.includes("coordinator") || roles.includes(ADMIN_ROLE);
  return (!circle || coordinates) && writesAnyProject(writeRegionScope);
}

/**
 * Where the account writes a project — the session's `writeRegionScope` (OBT-593, Daniel
 * 19/oct: the Admin reads every region as the coordination and writes only access). The one
 * rule *Editar*, the record's form and *Novo projeto* ask, so a control the server answers
 * with 403 is not drawn. **Absent** — a server from before the field — is today's behaviour:
 * it hides nothing and allows nothing new; it is not `null`, which means every region.
 */
export function writesProjectIn(
  writeRegionScope: readonly RegionKey[] | null | undefined,
  region: RegionKey,
): boolean {
  if (writeRegionScope === undefined || writeRegionScope === null) return true;
  return writeRegionScope.includes(region);
}

export function writesAnyProject(writeRegionScope: readonly RegionKey[] | null | undefined): boolean {
  if (writeRegionScope === undefined || writeRegionScope === null) return true;
  return writeRegionScope.length > 0;
}

/**
 * Who reads a team's health — `HEALTH_AUDIENCE` in shema-api's `_health_audience.py` (OBT-553,
 * widened by OBT-571): a coordinator, the OBT Lab and, since OBT-571, the Resource Circle —
 * *"o Resource Circle poderá ver tudo"* (Karina, 6/out), and the health is in that *tudo* by
 * Daniel's decision. The Shemá `admin` role stays outside it and is handed every health field
 * empty, as a project nobody has assessed. Reflection only, off the roles the session already
 * carries: the server decides, and the `?health=` filter, the health order and the `health`
 * facet it ignores or drops are what the screen reads back. An installation admin reads on
 * the server and is not among the session's roles, so this does not claim it.
 */
const HEALTH_AUDIENCE: readonly SessionRole[] = ["coordinator", "obtLab", "resourceCircle"];

export function canReadHealth(roles: readonly SessionRole[]): boolean {
  return roles.some((role) => HEALTH_AUDIENCE.includes(role));
}

/**
 * Who writes the pastoral follow-up and files a health assessment — narrower than who reads
 * (OBT-571): the Resource Circle reads the health and changes nothing. `PASTORAL_WRITES`
 * and the assessment route keep refusing it on the server; this is the reflection, asked by
 * `mayWrite` for the follow-up and, since OBT-579, by the Avaliação de Saúde itself —
 * `FormulariosPage` draws its button and `AvaliacaoPage` opens its route only for a writer,
 * so nobody walks the four dimensions to meet the refusal at the end.
 */
const HEALTH_WRITERS: readonly SessionRole[] = ["coordinator", "obtLab"];

export function canWriteHealth(roles: readonly SessionRole[]): boolean {
  return roles.some((role) => HEALTH_WRITERS.includes(role));
}

/**
 * Who files a health assessment for a project in this region — a health writer who also writes
 * projects there (OBT-593): `POST /projects/{id}/health-assessments` takes the write scope, so
 * Admin + coordenação da Ásia is not offered the questionnaire of an African project.
 */
export function canWriteHealthIn(
  roles: readonly SessionRole[],
  writeRegionScope: readonly RegionKey[] | null | undefined,
  region: RegionKey,
): boolean {
  return canWriteHealth(roles) && writesProjectIn(writeRegionScope, region);
}

/**
 * The region a new record's place falls in when the account does not write there, else `null`
 * (OBT-593). `POST /projects` derives the region from `location` the way `regionOfPlace` reads
 * it (OBT-591) and refuses outside the write scope, so the form says it before the save does.
 */
export function newRecordOutsideWrites(
  writeRegionScope: readonly RegionKey[] | null | undefined,
  location: string,
): RegionKey | null {
  const region = regionOfPlace(location);
  return writesProjectIn(writeRegionScope, region) ? null : region;
}

export function holdsShemaGrant(roles: readonly SessionRole[]): boolean {
  return roles.some((role) => GRANTABLE_ROLES[SHEMA_APP].includes(role));
}

export function holdsFormRole(roles: readonly SessionRole[]): boolean {
  return roles.some((role) => GRANTABLE_ROLES[FORM_APP].includes(role));
}

export function isFormOnly(roles: readonly SessionRole[]): boolean {
  return roles.length > 0 && roles.every((role) => FORM_SEATS.includes(role));
}

export function isRegionalRole(role: string): role is RoleKey {
  return Object.hasOwn(ROLE_DEFINITIONS, role);
}

export function canSubmitRegions(
  role: SessionRole,
  regions: readonly string[],
): boolean {
  return !isRegionalRole(role) || regions.length > 0;
}

export function rolesHeld(
  account: AccountGrants,
  app: AccessAppKey,
): readonly SessionRole[] {
  return account.apps.find((entry) => entry.appKey === app)?.roles ?? [];
}

export function revokesLastRegional(
  account: AccountGrants,
  app: AccessAppKey,
  role: SessionRole,
): boolean {
  if (app !== SHEMA_APP || !isRegionalRole(role)) return false;
  return rolesHeld(account, SHEMA_APP).every(
    (held) => held === role || !isRegionalRole(held),
  );
}

export function invitableRoles(app: AccessAppKey): readonly SessionRole[] {
  return GRANTABLE_ROLES[app].filter((role) => role !== ADMIN_ROLE);
}

export function appOfInvitedRole(role: string): AccessAppKey | null {
  return (
    ACCESS_APPS.find((app) =>
      invitableRoles(app).some((invitable) => invitable === role),
    ) ?? null
  );
}
