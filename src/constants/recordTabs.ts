export const RECORD_TABS = [
  "identidade",
  "equipe",
  "objetivo",
  "recursos",
  "progresso",
  "saude",
  "necessidades",
  "midia",
  "notas",
  "materiais",
] as const;

export type RecordTabId = (typeof RECORD_TABS)[number];

export const DEFAULT_TAB: RecordTabId = "identidade";

export const TAB_LABEL_KEYS: Record<RecordTabId, string> = {
  identidade: "sec_id",
  equipe: "sec_team",
  objetivo: "sec_objective",
  recursos: "sec_financial",
  progresso: "sec_progress",
  saude: "sec_health",
  necessidades: "sec_needs",
  midia: "sec_media",
  notas: "sec_notes",
  materiais: "sec_materials",
};

export const TAB_MARKER_TONES: Record<RecordTabId, string> = {
  identidade: "bg-verde text-on-dark",
  equipe: "bg-verde-claro text-on-dark",
  objetivo: "bg-azul text-on-dark",
  recursos: "bg-telha text-on-brand",
  progresso: "bg-status-attention text-on-dark",
  saude: "bg-record-health text-on-dark",
  necessidades: "bg-areia text-on-light",
  midia: "bg-verde-claro text-on-dark",
  notas: "bg-preto text-on-dark",
  materiais: "bg-verde text-on-dark",
};

export const isRecordTab = (value: string): value is RecordTabId =>
  RECORD_TABS.some((tab) => tab === value);

export const tabNumber = (tab: RecordTabId): number =>
  RECORD_TABS.indexOf(tab) + 1;
