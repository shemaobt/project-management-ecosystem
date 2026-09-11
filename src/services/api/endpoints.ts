import { REGIONS } from "../../constants/regions";
import { SESSION_ROLES } from "../../constants/roles";
import type { EtenCreditEntry, EtenYearReport } from "../../types/eten";
import type { ReceivedSubmission } from "../../types/forms";
import type { MeetingDefinition, MeetingLogEntry } from "../../types/meeting";
import type {
  ConsentContext,
  IntercessorCreate,
  IntercessorDirectory,
  IntercessorEntry,
  IntercessorUpdatePayload,
  PrayerRequest,
} from "../../types/prayer";
import type { Project } from "../../types/project";
import type { Region, RegionKey, RegionTeam, RoleChange } from "../../types/region";
import type { SaveOutcome } from "../../types/team";
import type {
  AuthenticatedAccount,
  Credentials,
  SessionRole,
  ShemaSession,
} from "../../types/session";
import { http, refreshSession } from "./client";
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

const ROLE_KEYS = new Set<string>(SESSION_ROLES);

function account(wire: WireAccount): AuthenticatedAccount {
  return {
    id: wire.id,
    email: wire.email,
    displayName: wire.display_name ?? null,
  };
}

export function readSession(payload: unknown): ShemaSession {
  const body = (payload ?? {}) as Record<string, unknown>;
  const role = body.role;
  if (typeof role !== "string" || !ROLE_KEYS.has(role)) {
    throw failure("invalid", null, UNKNOWN_VOCABULARY);
  }

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
    role: role as SessionRole,
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
};
