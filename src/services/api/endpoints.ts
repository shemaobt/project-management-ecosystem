import { REGIONS } from "../../constants/regions";
import { SESSION_ROLES } from "../../constants/roles";
import type { EtenCreditEntry, EtenYearReport } from "../../types/eten";
import type { ReceivedSubmission } from "../../types/forms";
import type { MeetingDefinition, MeetingLogEntry } from "../../types/meeting";
import type { Intercessor, PrayerRequest } from "../../types/prayer";
import type { Project } from "../../types/project";
import type { Region, RegionKey } from "../../types/region";
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

export const regionsAPI = {
  async list(): Promise<Region[]> {
    const { data } = await http.get<Region[]>(`${SHEMA}/regions`);
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

export const intercessorsAPI = {
  async list(): Promise<Intercessor[]> {
    const { data } = await http.get<Intercessor[]>(
      `${SHEMA}/prayer/intercessors`,
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
