import type { RequestDecisionStage } from "../types/request";

export const DECISION_STAGE_LABEL_KEYS: Record<RequestDecisionStage, string> = {
  aprovado: "request_stage_aprovado",
  condicional: "request_stage_condicional",
  revisar: "request_stage_revisar",
  recusado: "request_stage_recusado",
};
