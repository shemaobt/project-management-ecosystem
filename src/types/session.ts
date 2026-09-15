import type { RegionKey } from "./region";
import type { RoleKey } from "./role";

export type SessionRole = "globalStrategist" | RoleKey;

export interface ShemaSession {
  role: SessionRole;
  regionScope: RegionKey[] | null;
  name: string | null;
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
