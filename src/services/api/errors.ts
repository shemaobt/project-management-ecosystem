import { isAxiosError } from "axios";
import type { ApiFailure, ApiFailureKind } from "../../types/session";

const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);

const CANCEL_CODES = new Set(["ERR_CANCELED"]);

const BY_STATUS: Record<number, ApiFailureKind> = {
  400: "invalid",
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
  422: "invalid",
};

export const FAILURE_MESSAGE_KEYS: Record<ApiFailureKind, string> = {
  offline: "net_offline",
  timeout: "net_timeout",
  unauthorized: "net_expired",
  forbidden: "net_forbidden",
  notFound: "net_not_found",
  conflict: "net_conflict",
  invalid: "net_invalid",
  server: "net_server",
  unexpected: "net_unexpected",
  canceled: "net_canceled",
};

const RETRYABLE = new Set<ApiFailureKind>([
  "offline",
  "timeout",
  "server",
  "conflict",
]);

const SERVER_SENTENCE_WINS = new Set<ApiFailureKind>([
  "invalid",
  "conflict",
  "notFound",
]);

interface HttpShape {
  code?: unknown;
  response?: unknown;
}

export type Translate = (
  key: string,
  params?: Record<string, unknown>,
) => string;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function envelope(data: unknown): {
  code: string | null;
  detail: string | null;
} {
  const body = asRecord(data);
  const code = body?.code;
  const detail = body?.detail;
  return {
    code: typeof code === "string" && code ? code : null,
    detail: typeof detail === "string" && detail ? detail : null,
  };
}

function offlineNow(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function withoutResponse(code: string | null): ApiFailureKind {
  if (code && CANCEL_CODES.has(code)) return "canceled";
  if (offlineNow()) return "offline";
  return code && TIMEOUT_CODES.has(code) ? "timeout" : "offline";
}

function fromStatus(status: number): ApiFailureKind {
  const known = BY_STATUS[status];
  if (known) return known;
  if (status >= 500) return "server";
  if (status >= 400) return "invalid";
  return "unexpected";
}

export function isApiFailure(value: unknown): value is ApiFailure {
  const record = asRecord(value);
  return (
    record !== null &&
    typeof record.kind === "string" &&
    record.kind in FAILURE_MESSAGE_KEYS &&
    "status" in record &&
    "code" in record &&
    "detail" in record
  );
}

export function toApiFailure(error: unknown): ApiFailure {
  if (isApiFailure(error)) return error;

  const shape = asRecord(error) as HttpShape | null;
  if (!shape) {
    return { kind: "unexpected", status: null, code: null, detail: null };
  }

  const code = typeof shape.code === "string" && shape.code ? shape.code : null;
  const response = asRecord(shape.response);
  const status = typeof response?.status === "number" ? response.status : null;

  if (status === null) {
    const kind = isAxiosError(error) ? withoutResponse(code) : "unexpected";
    return { kind, status: null, code, detail: null };
  }

  const body = envelope(response?.data);
  return {
    kind: fromStatus(status),
    status,
    code: body.code ?? code,
    detail: body.detail,
  };
}

export const UNKNOWN_VOCABULARY = "UNKNOWN_VOCABULARY";

export function failure(
  kind: ApiFailureKind,
  detail: string | null = null,
  code: string | null = null,
): ApiFailure {
  return { kind, status: null, code, detail };
}

export function failureMessageKey(failure: ApiFailure): string {
  return FAILURE_MESSAGE_KEYS[failure.kind];
}

export function failureMessage(failure: ApiFailure, t: Translate): string {
  if (SERVER_SENTENCE_WINS.has(failure.kind) && failure.detail) {
    return failure.detail;
  }
  return t(failureMessageKey(failure), { status: failure.status ?? "" });
}

export function isRetryable(failure: ApiFailure): boolean {
  return RETRYABLE.has(failure.kind);
}

export function isAnnounceable(failure: ApiFailure): boolean {
  return failure.kind !== "canceled";
}
