import type {
  RequestCurrency,
  RequestDecision,
  RequestDecisionStage,
  RequestLinkStatus,
  RequestStage,
  RequestType,
} from "../types/request";

export const DECISION_STAGE_LABEL_KEYS: Record<RequestDecisionStage, string> = {
  aprovado: "request_stage_aprovado",
  condicional: "request_stage_condicional",
  revisar: "request_stage_revisar",
  recusado: "request_stage_recusado",
};

export const STAGE_LABEL_KEYS: Record<RequestStage, string> = {
  triagem: "request_stage_triagem",
  analise: "request_stage_analise",
  ...DECISION_STAGE_LABEL_KEYS,
};

type RequestTone = "neutral" | "accent" | "green" | "azul";

export const STAGE_TONES: Record<RequestStage, RequestTone> = {
  triagem: "azul",
  analise: "azul",
  aprovado: "green",
  condicional: "green",
  revisar: "accent",
  recusado: "neutral",
};

export const OPEN_INSTANCE_TONE: RequestTone = "accent";

export const REQUEST_TYPE_LABEL_KEYS: Record<RequestType, string> = {
  traducao: "request_type_traducao",
  treinamento: "request_type_treinamento",
  equipamentos: "request_type_equipamentos",
};

export const REQUEST_CURRENCIES: readonly RequestCurrency[] = ["BRL", "USD", "EUR"];

export const REQUEST_DECISIONS: readonly RequestDecision[] = [
  "approved",
  "conditional",
  "revise",
  "declined",
];

export const REQUEST_LINK_STATUS_LABEL_KEYS: Record<RequestLinkStatus, string> = {
  pending: "intake_status_pending",
  verified: "rr_link_status_verified",
  expired: "intake_status_expired",
  revoked: "intake_status_revoked",
};

export const REQUEST_LINK_STATUS_TONES: Record<
  RequestLinkStatus,
  "accent" | "green" | "neutral"
> = {
  pending: "accent",
  verified: "green",
  expired: "neutral",
  revoked: "neutral",
};

export const REVOCABLE_LINK_STATUSES: readonly RequestLinkStatus[] = ["pending", "verified"];

export const FORM_ENTRY_PATH = "/entrar";

export const FORM_LINK_PATH = "/solicitar";

export const PROJECT_HINT_MAX = 500;

export const isRequestStage = (value: unknown): value is RequestStage =>
  typeof value === "string" && Object.hasOwn(STAGE_LABEL_KEYS, value);

export const isRequestType = (value: unknown): value is RequestType =>
  typeof value === "string" && Object.hasOwn(REQUEST_TYPE_LABEL_KEYS, value);

export const isRequestLinkStatus = (value: unknown): value is RequestLinkStatus =>
  typeof value === "string" && Object.hasOwn(REQUEST_LINK_STATUS_LABEL_KEYS, value);
