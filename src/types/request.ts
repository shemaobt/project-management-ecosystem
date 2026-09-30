export type RequestStage =
  | "triagem"
  | "analise"
  | "aprovado"
  | "condicional"
  | "revisar"
  | "recusado";

export type RequestDecisionStage = Extract<
  RequestStage,
  "aprovado" | "condicional" | "revisar" | "recusado"
>;

export type RequestType = "traducao" | "treinamento" | "equipamentos";

export type RequestCurrency = "BRL" | "USD" | "EUR";

export type RequestDecision = "approved" | "conditional" | "revise" | "declined";

export interface RequestCard {
  id: string;
  reg_name: string;
  request_type: RequestType;
  amount_requested: string | null;
  currency: RequestCurrency;
  stage: RequestStage;
  created_at: string;
  submitted_at: string | null;
  endorsed: boolean;
  decision: RequestDecision | null;
  open: boolean;
  can_edit: boolean;
  started_by_name: string | null;
}

export type RequestLinkStatus = "pending" | "verified" | "expired" | "revoked";

export interface RequestLinkPayload {
  email: string;
  project_hint: string;
}

export interface RequestLink {
  id: string;
  email: string;
  project_hint: string;
  status: RequestLinkStatus;
  expires_at: string;
  verified_at: string | null;
  revoked_at: string | null;
  created_by: string;
  created_at: string;
}

export interface IssuedRequestLink extends RequestLink {
  token: string;
  code: string;
}
