import axios from "axios";
import { ACCESS_APPS, GRANTABLE_ROLES } from "../../constants/access";
import { REGIONS } from "../../constants/regions";
import { SESSION_ROLES } from "../../constants/roles";
import type {
  AccessAppKey,
  AccessAppRoles,
  AccessRegionGrant,
  AccountGrants,
  GrantChange,
  InviteDescription,
  InvitePayload,
  InviteStatus,
  JoinEntry,
  JoinOutcome,
  OpenInvite,
  RoleGrantPayload,
  RoleRevokePayload,
  SentInvite,
} from "../../types/access";
import type { EtenCreditEntry, EtenYearReport } from "../../types/eten";
import type {
  IntakeForm,
  IntakeLink,
  IntakeLinkCreated,
  IntakeLinkCreatePayload,
  IntakeSubmissionPayload,
  ReceivedSubmission,
} from "../../types/forms";
import type { MeetingDefinition, MeetingLogEntry } from "../../types/meeting";
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
import type { SaveOutcome } from "../../types/team";
import type {
  AuthenticatedAccount,
  Credentials,
  SessionRole,
  ShemaSession,
} from "../../types/session";
import { API_BASE_URL, REQUEST_TIMEOUT_MS, http, refreshSession } from "./client";
import { failure, toApiFailure, UNKNOWN_VOCABULARY } from "./errors";
import { forgetTokens, refreshToken, setTokens } from "./tokens";

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

export const meetingsAPI = {
  async list(): Promise<MeetingDefinition[]> {
    const { data } = await http.get<MeetingDefinition[]>(`${SHEMA}/meetings`);
    return data;
  },

  async log(): Promise<MeetingLogEntry[]> {
    const { data } = await http.get<MeetingLogEntry[]>(`${SHEMA}/meetings/log`);
    return data;
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

// --- acesso — BE-22 (OBT-543), FE-52 (OBT-546), data-contracts §9.15 --------------------

const ACCESS = `${SHEMA}/access`;

const INVITE_STATUSES: readonly InviteStatus[] = [
  "pending",
  "used",
  "expired",
  "revoked",
];

function refuseVocabulary(): never {
  throw failure("invalid", null, UNKNOWN_VOCABULARY);
}

function fieldsOf(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    refuseVocabulary();
  }
  return Object.fromEntries(Object.entries(value));
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : refuseVocabulary();
}

function optionalTextOf(value: unknown): string | null {
  return value === null || value === undefined ? null : textOf(value);
}

function listOf(value: unknown): unknown[] {
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
  /** One account by exact e-mail — a 404 when nobody has it. */
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

  // --- the invitee, who has no session yet ------------------------------------------

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
