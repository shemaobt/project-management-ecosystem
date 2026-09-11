import { DEFAULT_METAPHOR } from "../../constants/metaphors";
import { createEmptyProject } from "../../fixtures";
import type {
  FinancialResource,
  NeedCategory,
  NeedItem,
  NeedStatus,
  NeedUrgency,
  Objective,
  Project,
  ProjectDerived,
  TranslationType,
} from "../../types/project";
import type {
  ProjectBrowseQuery,
  ProjectBrowseResult,
} from "../../types/projectBrowse";
import { encodeView } from "../../utils/filterSerialisation";
import { emptyCounts, type FacetCounts, type FacetGroup } from "../../utils/search";
import { http } from "./client";

const SHEMA = "/shema";

export type { ProjectBrowseQuery, ProjectBrowseResult };

interface WireNeed {
  category: string;
  urgency: NeedUrgency;
  status: NeedStatus;
  prayerShared: boolean;
  prayerAnswered: boolean;
}

interface WireProjectCard {
  id: string;
  languageName: string;
  languageCode: string;
  bridgeLanguage: string;
  vitalityStatus: string;
  speakerCount: string;
  location: string;
  location2: string | null;
  team: string;
  teamLeader: string;
  mentor: string;
  partnerOrg: string;
  orgRole: string;
  facilitator: string | null;
  objective: string[];
  translationType: string[];
  financialResources: string[];
  portion: string | null;
  scopeDetails: string;
  totalUnits: number;
  totalUnitsType: string;
  translatedUnits: number;
  communityCheckedUnits: number;
  approvedUnits: number;
  statusGoal: string;
  statusComments: string;
  healthEmotional: string | null;
  healthRelational: string | null;
  healthSpiritual: string | null;
  healthPhysical: string | null;
  healthAssessmentDate: string | null;
  healthAssessor: string;
  healthNotes: string;
  startDate: string | null;
  deadline: string | null;
  lastUpdated: string | null;
  inEten: boolean;
  needsNotes: string;
  notes: string;
  needs: WireNeed[];
  derived: ProjectDerived | null;
  coords: [number, number];
  locationWithheld: boolean;
}

interface WireFacetCounts {
  groups: Record<string, Record<string, number>>;
  presets: Record<string, number>;
  groupAll: Record<string, number>;
}

interface WireProjectPage {
  items: WireProjectCard[];
  counts: WireFacetCounts;
  matched: number;
  total: number;
  locationsWithheld: number | null;
}

/**
 * `?status=…&continent=…&presets=attention,recent&q=…&sort=…` — the screen's own shared
 * URL, key for key, plus `limit`/`offset`. `encodeView` is built for the shareable URL
 * (where absent means default), which is exactly `ShemaProjectQuery`'s own contract, so
 * reusing it is what keeps the two in lock-step rather than a second, hand-typed mapping
 * that drifts the day a filter is added.
 */
function buildParams(query: ProjectBrowseQuery): URLSearchParams {
  const params = encodeView({
    filters: query.filters,
    search: query.search,
    sort: query.sort,
    // Never emit `view` — the server's `ShemaProjectQuery` has `extra="forbid"` and does
    // not know the card metaphor.
    metaphor: DEFAULT_METAPHOR,
  });
  if (query.limit !== null) params.set("limit", String(query.limit));
  if (query.offset > 0) params.set("offset", String(query.offset));
  return params;
}

function mapNeed(need: WireNeed): NeedItem {
  return {
    category: need.category as NeedCategory,
    urgency: need.urgency,
    status: need.status,
    description: "",
    prayerShared: need.prayerShared,
    prayerAnswered: need.prayerAnswered,
  };
}

/**
 * Wire card -> the local `Project` shape every screen already reads, built on
 * `createEmptyProject`'s defaults rather than repeating them: everything the record
 * tabs need but the list endpoint deliberately never sends (progress tables, contacts,
 * `source`, org-chart names, the three guarded prayer fields) stays at its safe empty
 * value, with one owner for what that value is. `team` also fills `ywamBase` — one
 * concept, two names (CLAUDE.md §5.2). Nothing in the Projetos screen reads the fields
 * left blank; INT-03 reads the full record through BE-06, not this endpoint.
 */
function mapCard(wire: WireProjectCard): Project {
  const derived = wire.derived;
  return {
    ...createEmptyProject(wire.id),
    languageName: wire.languageName,
    languageCode: wire.languageCode,
    bridgeLanguage: wire.bridgeLanguage,
    vitalityStatus: wire.vitalityStatus,
    location: wire.location,
    location2: wire.location2 ?? undefined,
    speakerCount: wire.speakerCount,
    coords: wire.coords,
    translationType: wire.translationType as TranslationType[],
    financialResources: wire.financialResources as FinancialResource[],
    team: wire.team,
    ywamBase: wire.team,
    teamLeader: wire.teamLeader,
    mentor: wire.mentor,
    partnerOrg: wire.partnerOrg,
    objective: wire.objective as Objective[],
    scopeDetails: wire.scopeDetails,
    totalUnits: wire.totalUnits,
    totalUnitsType: wire.totalUnitsType,
    translatedUnits: wire.translatedUnits,
    communityCheckedUnits: wire.communityCheckedUnits,
    approvedUnits: wire.approvedUnits,
    startDate: wire.startDate ?? "",
    deadline: wire.deadline ?? "",
    // The stored status can be NULL (nothing recorded); `derived.status` is the server's
    // own already-inferred reading, which is what makes `getProjectStatus` converge to
    // the same answer client-side whether or not this project ever had one saved.
    status: derived?.status ?? "desconhecido",
    sensitiveCountry: wire.locationWithheld,
    statusComments: wire.statusComments,
    statusGoal: wire.statusGoal,
    orgRole: wire.orgRole,
    healthEmotional: (wire.healthEmotional ?? "") as Project["healthEmotional"],
    healthRelational: (wire.healthRelational ?? "") as Project["healthRelational"],
    healthSpiritual: (wire.healthSpiritual ?? "") as Project["healthSpiritual"],
    healthPhysical: (wire.healthPhysical ?? "") as Project["healthPhysical"],
    healthAssessmentDate: wire.healthAssessmentDate ?? "",
    healthAssessor: wire.healthAssessor,
    healthNotes: wire.healthNotes,
    needsItems: wire.needs.map(mapNeed),
    needsNotes: wire.needsNotes,
    notes: wire.notes,
    inETEN: wire.inEten,
    lastUpdated: wire.lastUpdated ?? "",
    portion: wire.portion ?? undefined,
    facilitator: wire.facilitator ?? undefined,
    derived: derived ?? undefined,
  };
}

/** Server groups are sparse for open vocabularies (team, country, …); a closed one
 * (health, stale, eten, …) comes back with every member already, zeros included. Starting
 * from `emptyCounts()` and overlaying what the server sent means an omitted member of a
 * closed group still reads 0 rather than `undefined` — the shape `Sidebar`'s "zero stays
 * visible" rule (§5.1) expects. */
function mapCounts(wire: WireFacetCounts): FacetCounts {
  const counts = emptyCounts();
  for (const group of Object.keys(wire.groups) as FacetGroup[]) {
    Object.assign(counts[group] as Record<string, number>, wire.groups[group]);
  }
  Object.assign(counts.preset, wire.presets);
  Object.assign(counts.groupAll, wire.groupAll);
  return counts;
}

function mapPage(wire: WireProjectPage): ProjectBrowseResult {
  return {
    items: wire.items.map(mapCard),
    counts: mapCounts(wire.counts),
    matched: wire.matched,
    total: wire.total,
    locationsWithheld: wire.locationsWithheld,
  };
}

export const projectBrowseAPI = {
  async browse(query: ProjectBrowseQuery): Promise<ProjectBrowseResult> {
    const { data } = await http.get<WireProjectPage>(`${SHEMA}/projects`, {
      params: buildParams(query),
    });
    return mapPage(data);
  },
};
