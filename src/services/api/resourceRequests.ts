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
import {
  fieldsOf,
  listOf,
  optionalTextOf,
  refuseVocabulary,
  textOf,
} from "./endpoints";

const REQUESTS = "/resource-requests";

function flag(value: unknown): boolean {
  return typeof value === "boolean" ? value : refuseVocabulary();
}

function amount(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return textOf(value);
}

function currency(value: unknown): RequestCurrency {
  return REQUEST_CURRENCIES.find((code) => code === value) ?? refuseVocabulary();
}

function decision(value: unknown): RequestDecision | null {
  if (value === null || value === undefined) return null;
  return REQUEST_DECISIONS.find((known) => known === value) ?? refuseVocabulary();
}

export function readCard(payload: unknown): RequestCard {
  const fields = fieldsOf(payload);
  const { stage, request_type: requestType } = fields;
  if (!isRequestStage(stage) || !isRequestType(requestType)) refuseVocabulary();
  return {
    id: textOf(fields.id),
    reg_name: textOf(fields.reg_name),
    request_type: requestType,
    amount_requested: amount(fields.amount_requested),
    currency: currency(fields.currency),
    stage,
    created_at: textOf(fields.created_at),
    submitted_at: optionalTextOf(fields.submitted_at),
    endorsed: flag(fields.endorsed),
    decision: decision(fields.decision),
    open: flag(fields.open),
    can_edit: flag(fields.can_edit),
    started_by_name: optionalTextOf(fields.started_by_name),
  };
}

export function readLink(payload: unknown): RequestLink {
  const fields = fieldsOf(payload);
  const { status } = fields;
  if (!isRequestLinkStatus(status)) refuseVocabulary();
  return {
    id: textOf(fields.id),
    email: textOf(fields.email),
    project_hint: textOf(fields.project_hint),
    status,
    expires_at: textOf(fields.expires_at),
    verified_at: optionalTextOf(fields.verified_at),
    revoked_at: optionalTextOf(fields.revoked_at),
    created_by: textOf(fields.created_by),
    created_at: textOf(fields.created_at),
  };
}

export function readIssuedLink(payload: unknown): IssuedRequestLink {
  const fields = fieldsOf(payload);
  return { ...readLink(fields), token: textOf(fields.token), code: textOf(fields.code) };
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
