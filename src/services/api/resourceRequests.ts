import {
  REQUEST_CURRENCIES,
  REQUEST_DECISIONS,
  isRequestLinkStatus,
  isRequestStage,
  isRequestType,
} from "../../constants/requests";
import type {
  IssuedRequestLink,
  RequestCard,
  RequestCurrency,
  RequestDecision,
  RequestLink,
  RequestLinkPayload,
} from "../../types/request";
import { http } from "./client";
import { failure, UNKNOWN_VOCABULARY } from "./errors";

const REQUESTS = "/resource-requests";

function refuse(): never {
  throw failure("invalid", null, UNKNOWN_VOCABULARY);
}

function fieldsOf(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) refuse();
  return Object.fromEntries(Object.entries(value));
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : refuse();
}

function text(value: unknown): string {
  return typeof value === "string" ? value : refuse();
}

function optionalText(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

function flag(value: unknown): boolean {
  return typeof value === "boolean" ? value : refuse();
}

function amount(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return text(value);
}

function currency(value: unknown): RequestCurrency {
  return REQUEST_CURRENCIES.find((code) => code === value) ?? refuse();
}

function decision(value: unknown): RequestDecision | null {
  if (value === null || value === undefined) return null;
  return REQUEST_DECISIONS.find((known) => known === value) ?? refuse();
}

export function readCard(payload: unknown): RequestCard {
  const fields = fieldsOf(payload);
  const { stage, request_type: requestType } = fields;
  if (!isRequestStage(stage) || !isRequestType(requestType)) refuse();
  return {
    id: text(fields.id),
    reg_name: text(fields.reg_name),
    request_type: requestType,
    amount_requested: amount(fields.amount_requested),
    currency: currency(fields.currency),
    stage,
    created_at: text(fields.created_at),
    submitted_at: optionalText(fields.submitted_at),
    endorsed: flag(fields.endorsed),
    decision: decision(fields.decision),
    open: flag(fields.open),
    can_edit: flag(fields.can_edit),
    started_by_name: optionalText(fields.started_by_name),
  };
}

export function readLink(payload: unknown): RequestLink {
  const fields = fieldsOf(payload);
  const { status } = fields;
  if (!isRequestLinkStatus(status)) refuse();
  return {
    id: text(fields.id),
    email: text(fields.email),
    project_hint: text(fields.project_hint),
    status,
    expires_at: text(fields.expires_at),
    verified_at: optionalText(fields.verified_at),
    revoked_at: optionalText(fields.revoked_at),
    created_by: text(fields.created_by),
    created_at: text(fields.created_at),
  };
}

export function readIssuedLink(payload: unknown): IssuedRequestLink {
  const fields = fieldsOf(payload);
  return { ...readLink(fields), token: text(fields.token), code: text(fields.code) };
}

export const resourceRequestsAPI = {
  async projectRequests(projectId: string): Promise<RequestCard[]> {
    const { data } = await http.get<unknown>(
      `${REQUESTS}/projects/${encodeURIComponent(projectId)}/requests`,
    );
    return listOf(data).map(readCard);
  },

  async links(): Promise<RequestLink[]> {
    const { data } = await http.get<unknown>(`${REQUESTS}/links`);
    return listOf(data).map(readLink);
  },

  async issueLink(payload: RequestLinkPayload): Promise<IssuedRequestLink> {
    const { data } = await http.post<unknown>(`${REQUESTS}/links`, payload);
    return readIssuedLink(data);
  },

  async revokeLink(linkId: string): Promise<RequestLink> {
    const { data } = await http.post<unknown>(
      `${REQUESTS}/links/${encodeURIComponent(linkId)}/revoke`,
    );
    return readLink(data);
  },
};

export type ResourceRequestsAPI = typeof resourceRequestsAPI;
