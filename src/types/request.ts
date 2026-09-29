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
