import axios from "axios";
import { ACCESS_APPS, GRANTABLE_ROLES } from "../../constants/access";
import {
  NOTIF_DEFAULTS,
  isNotificationScope,
  isNotificationWhen,
} from "../../constants/notifications";
import { REGIONS } from "../../constants/regions";
import { DECISION_STAGE_LABEL_KEYS } from "../../constants/requests";
import { SESSION_ROLES } from "../../constants/roles";
import type {
  AccessAppKey,
  AccessAppRoles,
  AccessRegionGrant,
  AccountGrants,
  AwaitingProject,
  ConfirmedProject,
  DiscardedProject,
  GrantChange,
  InviteDescription,
  InvitePayload,
  InviteStatus,
  JoinEntry,
  JoinOutcome,
  OpenInvite,
  ProjectConfirmation,
  RoleGrantPayload,
  RoleRevokePayload,
  SentInvite,
} from "../../types/access";
import type { EtenCreditEntry, EtenYearReport } from "../../types/eten";
import type {
  NotificationPrefs,
  PanelEntry,
  ProjectNotificationKind,
} from "../../types/notification";
import type {
  IntakeForm,
  IntakeLink,
  IntakeLinkCreated,
  IntakeLinkCreatePayload,
  IntakeSubmissionPayload,
  ReceivedSubmission,
} from "../../types/forms";
import type {
  MeetingId,
  MeetingLogEntry,
  MeetingLogPayload,
} from "../../types/meeting";
import type {
  ConsentContext,
  IntercessorCreate,
  IntercessorDirectory,
  IntercessorEntry,
  IntercessorUpdatePayload,
  PrayerRequest,
} from "../../types/prayer";
import type { Project, ProjectMember, ProjectRef } from "../../types/project";
import type { Region, RegionKey, RegionTeam, RoleChange } from "../../types/region";
import type { RequestDecisionStage } from "../../types/request";
import type { ImportError } from "../../utils/export";
import type { SaveOutcome } from "../../types/team";
import type {
  AuthenticatedAccount,
  Credentials,
  SessionApps,
  SessionRole,
  ShemaSession,
} from "../../types/session";
import { API_BASE_URL, REQUEST_TIMEOUT_MS, http, refreshSession } from "./client";
import { failure, toApiFailure, UNKNOWN_VOCABULARY } from "./errors";
import { forgetTokens, refreshToken, setTokens } from "./tokens";
import { toLocalIsoDate } from "../../utils/format";

const SHEMA = "/shema";

interface WireTokens {
  access_token: string;
  refresh_token: string;
}

interface WireAccount {
  id: string;
  email: string;
  display_name: string | null;
}

interface WireAuthResponse {
  user: WireAccount;
  tokens: WireTokens;
}

interface WireHandoff {
  code: string;
  expires_at: string;
}

const REGION_KEYS = new Set<string>(REGIONS.map((region) => region.key));

function account(wire: WireAccount): AuthenticatedAccount {
  return {
    id: wire.id,
    email: wire.email,
    displayName: wire.display_name ?? null,
  };
}

function knownRole(value: unknown): SessionRole {
  const role = SESSION_ROLES.find((key) => key === value);
  if (role === undefined) throw failure("invalid", null, UNKNOWN_VOCABULARY);
  return role;
}

const WEB_PROTOCOLS = new Set(["http:", "https:"]);

function appAddress(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const address = new URL(value.trim());
    if (!WEB_PROTOCOLS.has(address.protocol)) return null;
    return address.href.replace(/\/+$/u, "");
  } catch {
    return null;
  }
}

export function readApps(payload: unknown): SessionApps {
  const apps: Record<string, unknown> =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? Object.fromEntries(Object.entries(payload))
      : {};
  return { resourceRequestForm: appAddress(apps.resourceRequestForm) };
}

export function readSession(payload: unknown): ShemaSession {
  const body = (payload ?? {}) as Record<string, unknown>;
  const listed = body.roles;
  if (!Array.isArray(listed)) throw failure("invalid", null, UNKNOWN_VOCABULARY);
  if (listed.length === 0) throw failure("forbidden");
  const roles = listed.map(knownRole);
  const role = knownRole(body.role);
  if (role !== roles[0]) throw failure("invalid", null, UNKNOWN_VOCABULARY);

  const scope = body.regionScope;
  if (scope !== null && scope !== undefined && !Array.isArray(scope)) {
    throw failure("invalid", null, UNKNOWN_VOCABULARY);
  }

  const regionScope =
    scope === null || scope === undefined
      ? null
      : scope.map((key) => {
          if (typeof key !== "string" || !REGION_KEYS.has(key)) {
            throw failure("invalid", null, UNKNOWN_VOCABULARY);
          }
          return key as RegionKey;
        });

  const name = body.name;
  return {
    role,
    roles,
    regionScope,
    name: typeof name === "string" && name ? name : null,
    apps: readApps(body.apps),
  };
}

export const authAPI = {
  async signIn(credentials: Credentials): Promise<AuthenticatedAccount> {
    const { data } = await http.post<WireAuthResponse>("/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });
    setTokens({
      accessToken: data.tokens.access_token,
      refreshToken: data.tokens.refresh_token,
    });
    return account(data.user);
  },

  async me(): Promise<AuthenticatedAccount> {
    const { data } = await http.get<WireAccount>("/auth/me");
    return account(data);
  },

  refresh(): Promise<boolean> {
    return refreshSession();
  },

  async handoff(
    appKey: AccessAppKey,
    context: Record<string, string> | null,
  ): Promise<string> {
    const token = refreshToken();
    if (!token) throw failure("unauthorized");
    const { data } = await http.post<WireHandoff>("/auth/handoff", {
      app_key: appKey,
      refresh_token: token,
      context,
    });
    return data.code;
  },

  async signOut(): Promise<void> {
    const token = refreshToken();
    try {
      if (token) await http.post("/auth/logout", { refresh_token: token });
    } catch {
      // The local session is gone either way, and a refresh token this browser
      // never wrote down cannot be replayed from here.
    } finally {
      forgetTokens("signedOut");
    }
  },
};

export const sessionAPI = {
  async get(): Promise<ShemaSession> {
    const { data } = await http.get<unknown>(`${SHEMA}/session`);
    return readSession(data);
  },
};

// `.list()` / `.get()` stay unreachable — `source.ts` keeps the "projects" namespace on
// fixtures. BE-05 shipped `GET /shema/projects` as the browse envelope
// (`{items, counts, …}`, see `./projectBrowse.ts`), never the plain `Project[]` this
// method was written against before BE-05 existed, and there is no single-record read
// yet either — that is BE-06 / INT-03's. Left in place as the shape the fixture side
// still has to match; do not point the "projects" namespace at these before BE-06 lands.
export const projectsAPI = {
  async list(): Promise<Project[]> {
    const { data } = await http.get<Project[]>(`${SHEMA}/projects`);
    return data;
  },

  async get(id: string): Promise<Project | null> {
    try {
      const { data } = await http.get<Project>(
        `${SHEMA}/projects/${encodeURIComponent(id)}`,
      );
      return data;
    } catch (error) {
      if (toApiFailure(error).kind === "notFound") return null;
      throw error;
    }
  },
};

interface RegionTeamSaved {
  outcome: SaveOutcome;
  changes: RoleChange[];
}

export const regionsAPI = {
  async list(): Promise<Region[]> {
    const { data } = await http.get<Region[]>(`${SHEMA}/regions`);
    return data;
  },

  /**
   * `from`, `changedBy` and `now` go unread here: the server reads the seat
   * it already stores and derives who/when from the authenticated caller and
   * its own clock (`save_region_team.py`), so the client's guess never
   * travels. The fixture implementation needs all three to simulate that
   * same diff locally, which is why the call site still sends them — and why
   * this side keeps the same arity rather than dropping the unused three.
   */
  async saveTeam(
    regionKey: RegionKey,
    _from: RegionTeam,
    to: RegionTeam,
    _changedBy: string,
    _now: Date,
  ): Promise<RegionTeamSaved> {
    void _from;
    void _changedBy;
    void _now;
    const { data } = await http.put<RegionTeamSaved>(
      `${SHEMA}/regions/${encodeURIComponent(regionKey)}/team`,
      { team: to },
    );
    return data;
  },

  async roleChanges(): Promise<RoleChange[]> {
    const { data } = await http.get<RoleChange[]>(
      `${SHEMA}/regions/role-changes`,
    );
    return data;
  },
};

const MEETING_LOG = `${SHEMA}/meetings/log`;

export const meetingsAPI = {
  async log(): Promise<MeetingLogEntry[]> {
    const { data } = await http.get<MeetingLogEntry[]>(MEETING_LOG);
    return data;
  },

  async logMeeting(payload: MeetingLogPayload): Promise<MeetingLogEntry> {
    const { data } = await http.post<MeetingLogEntry>(MEETING_LOG, payload);
    return data;
  },

  async undo(
    meetingId: MeetingId,
    scopeKey: RegionKey,
    period: string,
  ): Promise<void> {
    await http.delete(
      `${MEETING_LOG}/${encodeURIComponent(meetingId)}/${encodeURIComponent(scopeKey)}/${encodeURIComponent(period)}`,
    );
  },
};

export const prayerAPI = {
  async list(): Promise<PrayerRequest[]> {
    const { data } = await http.get<PrayerRequest[]>(
      `${SHEMA}/prayer/requests`,
    );
    return data;
  },
};

const PEOPLE = `${SHEMA}/prayer/intercessors`;

export const intercessorsAPI = {
  async list(): Promise<IntercessorDirectory> {
    const { data } = await http.get<IntercessorDirectory>(PEOPLE);
    return data;
  },

  async create(payload: IntercessorCreate): Promise<IntercessorEntry> {
    const { data } = await http.post<IntercessorEntry>(PEOPLE, payload);
    return data;
  },

  async update(
    id: string,
    payload: IntercessorUpdatePayload,
  ): Promise<IntercessorEntry> {
    const { data } = await http.patch<IntercessorEntry>(
      `${PEOPLE}/${encodeURIComponent(id)}`,
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await http.delete(`${PEOPLE}/${encodeURIComponent(id)}`);
  },

  /** One person, one call, logged server-side (`reveal_intercessor_contact.py`). */
  async contact(id: string): Promise<string> {
    const { data } = await http.get<{ id: string; contact: string }>(
      `${PEOPLE}/${encodeURIComponent(id)}/contact`,
    );
    return data.contact;
  },

  async grantConsent(
    id: string,
    context: ConsentContext,
    basis: string,
  ): Promise<IntercessorEntry> {
    const { data } = await http.put<IntercessorEntry>(
      `${PEOPLE}/${encodeURIComponent(id)}/consents/${context}`,
      { basis },
    );
    return data;
  },

  /** "Revisado" — the one-year review (OBT-531). The answer is the entry, flag cleared. */
  async review(id: string): Promise<IntercessorEntry> {
    const { data } = await http.post<IntercessorEntry>(
      `${PEOPLE}/${encodeURIComponent(id)}/review`,
    );
    return data;
  },

  // --- the exit link's two routes — the person's own phone, no session ---------------

  /** Whether the link still lets somebody leave. 204 and nothing else; changes nothing. */
  async exitLink(token: string): Promise<void> {
    await http.get(`${SHEMA}/intercessors/leave/${encodeURIComponent(token)}`);
  },

  /** Leave the network: the person, their consents and their links are erased. */
  async leave(token: string): Promise<void> {
    await http.post(`${SHEMA}/intercessors/leave/${encodeURIComponent(token)}`);
  },
};

export const etenAPI = {
  async report(year: number): Promise<EtenYearReport> {
    const { data } = await http.get<EtenYearReport>(`${SHEMA}/eten/report`, {
      params: { year },
    });
    return data;
  },

  async credits(): Promise<EtenCreditEntry[]> {
    const { data } = await http.get<EtenCreditEntry[]>(`${SHEMA}/eten/credits`);
    return data;
  },
};

export const formsAPI = {
  async received(): Promise<ReceivedSubmission[]> {
    const { data } = await http.get<ReceivedSubmission[]>(
      `${SHEMA}/forms/submissions`,
    );
    return data;
  },

  async mintIntakeLink(
    payload: IntakeLinkCreatePayload,
  ): Promise<IntakeLinkCreated> {
    const { data } = await http.post<IntakeLinkCreated>(
      `${SHEMA}/intake-links`,
      { projectId: payload.projectId, expiresAt: payload.expiresAt },
    );
    return data;
  },

  async listIntakeLinks(projectId?: string): Promise<IntakeLink[]> {
    const { data } = await http.get<IntakeLink[]>(`${SHEMA}/intake-links`, {
      params: projectId ? { projectId } : undefined,
    });
    return data;
  },

  async revokeIntakeLink(linkId: string): Promise<IntakeLink> {
    const { data } = await http.post<IntakeLink>(
      `${SHEMA}/intake-links/${encodeURIComponent(linkId)}/revoke`,
    );
    return data;
  },

  // --- the two unauthenticated routes — the leader's own phone, no session ---------

  async intakeForm(token: string): Promise<IntakeForm> {
    const { data } = await http.get<IntakeForm>(
      `${SHEMA}/intake/${encodeURIComponent(token)}`,
    );
    return data;
  },

  async submitIntake(
    token: string,
    payload: IntakeSubmissionPayload,
  ): Promise<void> {
    await http.post(`${SHEMA}/intake/${encodeURIComponent(token)}`, payload);
  },
};

// --- membros do projeto — BE-18 (OBT-524), data-contracts §9.14 ---------------------------

const members = (projectId: string) =>
  `${SHEMA}/projects/${encodeURIComponent(projectId)}/members`;

export const membersAPI = {
  /** Who is on the project's team now, in the order they joined. */
  async list(projectId: string): Promise<ProjectMember[]> {
    const { data } = await http.get<ProjectMember[]>(members(projectId));
    return data;
  },

  /** The Admin puts an account on the team — 409 if it is already a live member. */
  async add(projectId: string, userId: string): Promise<ProjectMember> {
    const { data } = await http.post<ProjectMember>(members(projectId), { userId });
    return data;
  },

  /** The Admin takes an account off the team; the server marks the row and keeps it. */
  async remove(projectId: string, userId: string): Promise<void> {
    await http.delete(`${members(projectId)}/${encodeURIComponent(userId)}`);
  },

  /** The projects the signed-in account is a live member of. */
  async mine(): Promise<ProjectRef[]> {
    const { data } = await http.get<ProjectRef[]>(`${SHEMA}/me/projects`);
    return data;
  },
};

const ACCESS = `${SHEMA}/access`;

const INVITE_STATUSES: readonly InviteStatus[] = [
  "pending",
  "used",
  "expired",
  "revoked",
];

export function refuseVocabulary(): never {
  throw failure("invalid", null, UNKNOWN_VOCABULARY);
}

export function fieldsOf(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    refuseVocabulary();
  }
  return Object.fromEntries(Object.entries(value));
}

export function textOf(value: unknown): string {
  return typeof value === "string" ? value : refuseVocabulary();
}

export function optionalTextOf(value: unknown): string | null {
  return value === null || value === undefined ? null : textOf(value);
}

export function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : refuseVocabulary();
}

function knownApp(value: unknown): AccessAppKey {
  return ACCESS_APPS.find((app) => app === value) ?? refuseVocabulary();
}

function knownRegion(value: unknown): RegionKey {
  return REGIONS.find((region) => region.key === value)?.key ?? refuseVocabulary();
}

function readAppRoles(value: unknown): AccessAppRoles {
  const fields = fieldsOf(value);
  const appKey = knownApp(fields.appKey);
  const roles = listOf(fields.roles).map(
    (role) =>
      GRANTABLE_ROLES[appKey].find((grantable) => grantable === role) ??
      refuseVocabulary(),
  );
  return { appKey, roles };
}

function readRegionGrant(value: unknown): AccessRegionGrant {
  const fields = fieldsOf(value);
  return {
    regionKey: knownRegion(fields.regionKey),
    grantedBy: optionalTextOf(fields.grantedBy),
    grantedAt: textOf(fields.grantedAt),
  };
}

export function readAccount(payload: unknown): AccountGrants {
  const fields = fieldsOf(payload);
  const scope = fields.regionScope;
  if (typeof fields.isActive !== "boolean") refuseVocabulary();
  return {
    userId: textOf(fields.userId),
    email: textOf(fields.email),
    displayName: optionalTextOf(fields.displayName),
    isActive: fields.isActive,
    apps: listOf(fields.apps).map(readAppRoles),
    regions: listOf(fields.regions).map(readRegionGrant),
    regionScope:
      scope === null || scope === undefined
        ? null
        : listOf(scope).map(knownRegion),
  };
}

// The invitee's routes are the form's generic ones until OBT-549 moves them, and they
// answer snake_case — this is the one mapping they get, and the one place that changes.
const INVITES = "/resource-requests/access/invites";

interface WireInviteDescription {
  status: InviteStatus;
  email: string;
  role_key: string;
  account_exists: boolean;
  region_keys?: string[];
}

function invitation(wire: WireInviteDescription): InviteDescription {
  return {
    status: INVITE_STATUSES.find((status) => status === wire.status) ?? refuseVocabulary(),
    email: wire.email,
    roleKey: wire.role_key,
    accountExists: wire.account_exists,
    regionKeys: wire.region_keys ?? [],
  };
}

const guest = (path: string) => `${API_BASE_URL}${path}`;

const GUEST_HEADERS = { Accept: "application/json" };

export const accessAPI = {
  async person(email: string): Promise<AccountGrants> {
    const { data } = await http.get<unknown>(`${ACCESS}/people`, {
      params: { email },
    });
    return readAccount(data);
  },

  /** Grant a role; `regionKeys` is the account's whole scope for a regional one. */
  async grant(payload: RoleGrantPayload): Promise<AccountGrants> {
    const { data } = await http.post<unknown>(`${ACCESS}/grants`, payload);
    return readAccount(data);
  },

  async revoke(payload: RoleRevokePayload): Promise<AccountGrants> {
    const { data } = await http.post<unknown>(`${ACCESS}/grants/revoke`, payload);
    return readAccount(data);
  },

  /** The answer carries the link once; nothing else ever does. */
  async invite(payload: InvitePayload): Promise<SentInvite> {
    const { data } = await http.post<SentInvite>(`${ACCESS}/invites`, payload);
    return data;
  },

  async revokeInvite(inviteId: string): Promise<OpenInvite> {
    const { data } = await http.post<OpenInvite>(`${ACCESS}/invites/revoke`, {
      inviteId,
    });
    return data;
  },

  async invites(): Promise<OpenInvite[]> {
    const { data } = await http.get<OpenInvite[]>(`${ACCESS}/invites`);
    return data;
  },

  async changes(): Promise<GrantChange[]> {
    const { data } = await http.get<GrantChange[]>(`${ACCESS}/changes`);
    return data;
  },

  async pendingProjects(): Promise<AwaitingProject[]> {
    const { data } = await http.get<AwaitingProject[]>(`${SHEMA}/pending-projects`);
    return data;
  },

  async confirmProject(
    projectId: string,
    payload: ProjectConfirmation,
  ): Promise<ConfirmedProject> {
    const { data } = await http.post<ConfirmedProject>(
      `${SHEMA}/projects/${encodeURIComponent(projectId)}/confirm`,
      payload,
    );
    return data;
  },

  async discardProject(projectId: string, reason: string): Promise<DiscardedProject> {
    const { data } = await http.post<DiscardedProject>(
      `${SHEMA}/projects/${encodeURIComponent(projectId)}/reject`,
      { reason },
    );
    return data;
  },

  async describeInvite(token: string): Promise<InviteDescription> {
    const { data } = await http.get<WireInviteDescription>(
      `${INVITES}/${encodeURIComponent(token)}`,
    );
    return invitation(data);
  },

  /**
   * Sign up or in, accept, and sign the guest pair out again — on bare axios, like the
   * refresh in `client.ts`, so the pair never lands in `tokens.ts`: no session event
   * fires and the console's session is proved afterwards by its own `signIn`.
   */
  async join(token: string, entry: JoinEntry): Promise<JoinOutcome> {
    let pair: WireTokens;
    try {
      const { data } = await axios.post<WireAuthResponse>(
        guest(entry.create ? "/auth/signup" : "/auth/login"),
        entry.create
          ? {
              email: entry.email,
              password: entry.password,
              display_name: entry.displayName,
            }
          : { email: entry.email, password: entry.password },
        { timeout: REQUEST_TIMEOUT_MS, headers: GUEST_HEADERS },
      );
      pair = data.tokens;
    } catch (error) {
      return {
        ok: false,
        stage: "auth",
        failure: toApiFailure(error),
        accountCreated: false,
      };
    }

    try {
      await axios.post(
        guest(`${INVITES}/${encodeURIComponent(token)}/accept`),
        null,
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            ...GUEST_HEADERS,
            Authorization: `Bearer ${pair.access_token}`,
          },
        },
      );
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        stage: "accept",
        failure: toApiFailure(error),
        accountCreated: entry.create,
      };
    } finally {
      await axios
        .post(
          guest("/auth/logout"),
          { refresh_token: pair.refresh_token },
          { timeout: REQUEST_TIMEOUT_MS, headers: GUEST_HEADERS },
        )
        .catch(() => undefined);
    }
  },
};

export type AccessAPI = typeof accessAPI;

/** The two languages the Pulse is written in — the console's own locale spelling (BE-09). */
export type PulseLanguage = "pt-BR" | "en";

/** The Pulse is written in the language the console is showing; the server speaks both. */
export function pulseLanguage(language: string): PulseLanguage {
  return language.startsWith("en") ? "en" : "pt-BR";
}

/**
 * The Prayer Pulse, generated on the server (INT-06 · OBT-411, BE-09). **The server writes the
 * file and the screen only shows it**: `GET /shema/prayer/pulse` renders the wall inside the
 * caller's scope — only requests the teams authorized for the network, sensitive countries
 * already transformed — and generating changes nothing there. `resourceCircle` alone may call
 * it. Its own namespace at the end of this file, as the no-collision rule asks.
 */
export interface PrayerPulseFile {
  readonly text: string;
  /** The name the server gives the file; the screen saves it under this name. */
  readonly fileName: string;
}

const PULSE_FALLBACK_NAME = "pulso-de-oracao.txt";

/** The name a `Content-Disposition: attachment; filename="…"` gives, or `fallback`. */
export function attachmentFileName(disposition: unknown, fallback: string): string {
  if (typeof disposition !== "string") return fallback;
  const match = /filename="([^"]+)"/u.exec(disposition);
  return match?.[1] ?? fallback;
}

export function pulseFileName(disposition: unknown): string {
  return attachmentFileName(disposition, PULSE_FALLBACK_NAME);
}

export const prayerPulseAPI = {
  async generate(language: PulseLanguage): Promise<PrayerPulseFile> {
    const response = await http.get<string>(`${SHEMA}/prayer/pulse`, {
      params: { lang: language },
      responseType: "text",
    });
    return {
      text: response.data,
      fileName: pulseFileName(response.headers["content-disposition"]),
    };
  },
};

export type PrayerPulseAPI = typeof prayerPulseAPI;

/**
 * The bell's panel, its read mark and the preferences, on the server (INT-11 · OBT-416, BE-15).
 * The server routed every notice when it was written, so the console reads its own slice and
 * filters nothing by role or region again. A row this console cannot read is dropped rather
 * than guessed at: a kind outside the seven, or a request notice whose stage is not a decision.
 */
const NOTICES = `${SHEMA}/notifications`;

const PROJECT_NOTICE_KINDS: readonly ProjectNotificationKind[] = [
  "field",
  "health",
  "need",
  "stale",
  "prayer",
];

export interface ServedPanel {
  readonly entries: PanelEntry[];
  /** The ids the server already counts as seen — read state lives there, not in this browser. */
  readonly readIds: string[];
}

function isDecisionStage(value: unknown): value is RequestDecisionStage {
  return typeof value === "string" && Object.hasOwn(DECISION_STAGE_LABEL_KEYS, value);
}

export function readPanelEntry(raw: unknown): PanelEntry | null {
  const row = fieldsOf(raw);
  const id = textOf(row.id);
  // The panel speaks in local days (`notificationAge`); the server stamps an instant.
  const instant = new Date(textOf(row.createdAt));
  if (id === "" || Number.isNaN(instant.getTime())) return null;
  const date = toLocalIsoDate(instant);
  const urgent = row.urgent === true;
  const projectId = optionalTextOf(row.projectId);
  if (row.kind === "requestArrival" || row.kind === "requestDecision") {
    const requestName = optionalTextOf(row.requestName) ?? "";
    if (row.kind === "requestArrival") {
      return {
        kind: "requestArrival",
        id,
        urgent,
        audience: [],
        projectId,
        date,
        requestName,
        requestStage: "triagem",
      };
    }
    if (!isDecisionStage(row.requestStage)) return null;
    return {
      kind: "requestDecision",
      id,
      urgent,
      audience: [],
      projectId,
      date,
      requestName,
      requestStage: row.requestStage,
    };
  }
  const kind = PROJECT_NOTICE_KINDS.find((candidate) => candidate === row.kind);
  if (kind === undefined) return null;
  return { origin: "server", id, kind, urgent, projectId, date, body: textOf(row.body) };
}

export function readServedPanel(payload: unknown): ServedPanel {
  const entries: PanelEntry[] = [];
  const readIds: string[] = [];
  for (const raw of listOf(payload)) {
    const entry = readPanelEntry(raw);
    if (entry === null) continue;
    entries.push(entry);
    if (fieldsOf(raw).isRead === true) readIds.push(entry.id);
  }
  return { entries, readIds };
}

/**
 * The server keeps `when` and `scope` as free text and answers `""` for an account that never
 * saved; this console's vocabulary is what the screen offers, so an empty or unknown value
 * reads as the screen's own default rather than as no choice at all.
 */
export function readNotificationPrefs(payload: unknown): NotificationPrefs {
  const data = fieldsOf(payload);
  const channels = fieldsOf(data.channels);
  const when = textOf(data.when);
  const scope = textOf(data.scope);
  return {
    enabled: data.enabled !== false,
    channels: {
      email: channels.email === true,
      push: channels.push === true,
      whatsapp: channels.whatsapp === true,
    },
    when: isNotificationWhen(when) ? when : NOTIF_DEFAULTS.when,
    scope: isNotificationScope(scope) ? scope : NOTIF_DEFAULTS.scope,
    emailAddr: textOf(data.emailAddr),
    phoneAddr: textOf(data.phoneAddr),
    customProjectIds: listOf(data.customProjectIds).filter(
      (value): value is string => typeof value === "string",
    ),
  };
}

export const notificationsAPI = {
  async list(): Promise<ServedPanel> {
    const { data } = await http.get<unknown>(NOTICES);
    return readServedPanel(data);
  },

  async markRead(ids: readonly string[]): Promise<void> {
    await http.post(`${NOTICES}/read`, { ids });
  },

  async prefs(): Promise<NotificationPrefs> {
    const { data } = await http.get<unknown>(`${NOTICES}/prefs`);
    return readNotificationPrefs(data);
  },

  async savePrefs(prefs: NotificationPrefs): Promise<NotificationPrefs> {
    const { data } = await http.put<unknown>(`${NOTICES}/prefs`, prefs);
    return readNotificationPrefs(data);
  },
};

export type NotificationsAPI = typeof notificationsAPI;

/**
 * The projects export and import, on the server (INT-11 · OBT-416, BE-14). **The server builds
 * the file**: the console no longer assembles one, so the privacy filters have one home. The
 * export is a download with real progress; the import sends the file's bytes untouched, because
 * reading, recognising and checking them is the server's (`import_projects.py`).
 */
export type TransferFormat = "json" | "csv";

export interface TransferProgress {
  readonly loaded: number;
  /** `null` when the server did not state the size — the screen then counts bytes only. */
  readonly total: number | null;
}

export interface ExportedFile {
  readonly blob: Blob;
  readonly fileName: string;
}

/** What the import answered: applied whole, or refused whole with the file's own reason. */
export type ImportAnswer =
  | { readonly ok: true; readonly applied: number; readonly ignoredFields: string[] }
  | { readonly ok: false; readonly error: ImportError };

/**
 * BE-14's 400 names its refusal with the very keys the dialog already words (`ImportRefusal`
 * in `shema_transfer.py`), plus the item or the id. Anything else is not a refusal of the
 * file and travels as a failure, so a 409 or a 403 is never read as a broken record.
 */
export function readImportRefusal(payload: unknown): ImportError | null {
  const body = fieldsOf(payload);
  switch (body.key) {
    case "import_invalid_json":
    case "import_is_export":
    case "import_not_list":
      return { key: body.key };
    case "import_bad_record":
      return typeof body.index === "number" ? { key: body.key, index: body.index } : null;
    case "import_duplicate_id":
      return typeof body.id === "string" ? { key: body.key, id: body.id } : null;
    default:
      return null;
  }
}

const LOCAL_DAY_HEADER = "X-Shema-Local-Date";

const EXPORT_FALLBACK_NAME: Record<TransferFormat, string> = {
  json: "shema-projetos.json",
  csv: "shema-projetos.csv",
};

export const transferAPI = {
  async exportProjects(
    format: TransferFormat,
    language: PulseLanguage,
    onProgress: (progress: TransferProgress) => void,
  ): Promise<ExportedFile> {
    const response = await http.get<Blob>(`${SHEMA}/export/projects`, {
      params: { format, lang: language },
      responseType: "blob",
      // A large export on a field connection outlives the default timeout; progress is what
      // tells the person it is still moving, so no clock cuts it short.
      timeout: 0,
      onDownloadProgress: (event) =>
        onProgress({
          loaded: event.loaded,
          total: typeof event.total === "number" && event.total > 0 ? event.total : null,
        }),
    });
    return {
      blob: response.data,
      fileName: attachmentFileName(
        response.headers["content-disposition"],
        EXPORT_FALLBACK_NAME[format],
      ),
    };
  },

  async importProjects(raw: string): Promise<ImportAnswer> {
    // A 400 is the file's refusal and its body names why; it is let through here because the
    // client's error path keeps only `detail` and `code`, and the key is what the dialog words.
    const response = await http.post<unknown>(`${SHEMA}/import/projects`, raw, {
      headers: {
        "Content-Type": "application/json",
        [LOCAL_DAY_HEADER]: toLocalIsoDate(),
      },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 400,
    });
    if (response.status === 400) {
      const refusal = readImportRefusal(response.data);
      if (refusal === null) throw failure("invalid", textOrNull(fieldsOf(response.data).detail));
      return { ok: false, error: refusal };
    }
    const answer = fieldsOf(response.data);
    return {
      ok: true,
      applied: typeof answer.applied === "number" ? answer.applied : 0,
      ignoredFields: listOf(answer.ignoredFields ?? []).filter(
        (value): value is string => typeof value === "string",
      ),
    };
  },
};

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export type TransferAPI = typeof transferAPI;
