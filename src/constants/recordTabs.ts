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
  equipe: "bg-verde-claro-ink text-on-dark",
  objetivo: "bg-azul-ink text-on-dark",
  recursos: "bg-telha text-on-brand",
  progresso: "bg-status-attention-fg text-on-dark",
  saude: "bg-record-health text-on-dark",
  necessidades: "bg-areia text-on-light",
  midia: "bg-verde-claro-ink text-on-dark",
  notas: "bg-preto text-on-dark",
  materiais: "bg-verde text-on-dark",
};

export const isRecordTab = (value: string): value is RecordTabId =>
  RECORD_TABS.some((tab) => tab === value);

/**
 * The tabs only the health audience reads (OBT-553). The Saúde tab is a team's health, its
 * pastoral follow-up and the history of its assessments: a reader outside the audience is
 * handed every one of them empty, and an empty tab would say *nobody has assessed this
 * team* about a team that may have been.
 */
const HEALTH_TABS: readonly RecordTabId[] = ["saude"];

export const visibleTabs = (readsHealth: boolean): readonly RecordTabId[] =>
  readsHealth
    ? RECORD_TABS
    : RECORD_TABS.filter((tab) => !HEALTH_TABS.includes(tab));

/** The number a tab wears among the tabs the reader sees — consecutive, with no hole where a tab is not theirs. */
export const tabNumber = (
  tab: RecordTabId,
  tabs: readonly RecordTabId[] = RECORD_TABS,
): number => tabs.indexOf(tab) + 1;
