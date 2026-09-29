import type { RequestStage } from "../types/request";

export const REQUEST_STAGE_LABEL_KEYS: Record<RequestStage, string> = {
  triagem: "request_stage_triagem",
  analise: "request_stage_analise",
  aprovado: "request_stage_aprovado",
  condicional: "request_stage_condicional",
  revisar: "request_stage_revisar",
  recusado: "request_stage_recusado",
};
