import type { RegionKey } from "./region";
import type { RoleKey } from "./role";

export type SessionRole =
  | RoleKey
  | "admin"
  | "gestor"
  | "mesa"
  | "equipe";

export interface SessionApps {
  resourceRequestForm: string | null;
}

export interface ShemaSession {
  role: SessionRole;
  roles: SessionRole[];
  regionScope: RegionKey[] | null;
  name: string | null;
  apps: SessionApps;
}

export interface AuthenticatedAccount {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export type ApiFailureKind =
  | "offline"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "invalid"
  | "server"
  | "unexpected"
  | "canceled";

export interface ApiFailure {
  kind: ApiFailureKind;
  status: number | null;
  code: string | null;
  detail: string | null;
}
