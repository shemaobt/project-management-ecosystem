import type {
  FinancialResource,
  HealthLevel,
  NeedCategory,
  NeedStatus,
  NeedUrgency,
  Objective,
  OverallHealth,
  ProjectPriority,
  ProjectStatus,
  StaleStatus,
  TranslationType,
} from "../types/project";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "nao-iniciado",
  "em-andamento",
  "final",
  "concluido",
  "pausado",
  "cancelado",
  "planejado",
  "desconhecido",
];

export const EXPLICIT_PROJECT_STATUSES: readonly ProjectStatus[] = [
  "em-andamento",
  "cancelado",
  "pausado",
  "planejado",
  "concluido",
  "desconhecido",
];

export const HEALTH_LEVELS: readonly HealthLevel[] = ["boa", "atencao", "critica"];

export const OVERALL_HEALTH_STATES: readonly OverallHealth[] = [...HEALTH_LEVELS, "na"];

export const STALE_STATUSES: readonly StaleStatus[] = ["em-dia", "atencao", "critico"];

export const PROJECT_PRIORITIES: readonly ProjectPriority[] = [
  "critical",
  "warning",
  "completed",
  "planned",
  "paused",
  "canceled",
  "unknown",
  "default",
];

export const TRANSLATION_TYPES: readonly TranslationType[] = [
  "OBT",
  "OMT",
  "OBT/OMT",
  "Tradução escrita",
  "IA Assistida",
  "Filme Jesus",
  "Língua de Sinais",
  "Ready Vessels",
  "Taste&See",
];

export const VITALITY_SCALE: readonly {
  value: string;
  labelKey: string;
}[] = [
  { value: "Vital", labelKey: "vit_vital" },
  { value: "Vulnerável", labelKey: "vit_vulnerable" },
  { value: "Ameaçada", labelKey: "vit_threatened" },
  { value: "Seriamente ameaçada", labelKey: "vit_severely" },
  { value: "Em situação crítica", labelKey: "vit_critical" },
  { value: "Extinta", labelKey: "vit_extinct" },
];

export const FINANCIAL_RESOURCES: readonly FinancialResource[] = [
  "Seed Company",
  "Global Partnerships",
  "OBT TABLE - ETEN",
  "Innovation Lab",
  "Outros",
];

export const OBJECTIVES: readonly Objective[] = [
  "NT",
  "AT",
  "Bíblia Completa",
  "Livros Específicos",
  "Capítulos",
  "Histórias",
  "Outro",
];

export const NEED_CATEGORIES: readonly { id: NeedCategory; labelKey: string }[] = [
  { id: "financial", labelKey: "need_cat_financial" },
  { id: "training", labelKey: "need_cat_training" },
  { id: "equipment", labelKey: "need_cat_equipment" },
  { id: "volunteers", labelKey: "need_cat_volunteers" },
  { id: "material", labelKey: "need_cat_material" },
  { id: "security", labelKey: "need_cat_security" },
  { id: "connectivity", labelKey: "need_cat_connectivity" },
  { id: "logistics", labelKey: "need_cat_logistics" },
  { id: "documentation", labelKey: "need_cat_documentation" },
];

export const NEED_URGENCIES: readonly NeedUrgency[] = ["low", "medium", "high"];

export const NEED_STATUSES: readonly NeedStatus[] = [
  "open",
  "in-progress",
  "fulfilled",
  "dropped",
];

export const OPEN_NEED_STATUSES: readonly NeedStatus[] = ["open", "in-progress"];

export const NEED_URGENCY_LABEL_KEYS: Record<NeedUrgency, string> = {
  low: "need_urgency_low",
  medium: "need_urgency_medium",
  high: "need_urgency_high",
};

export const NEED_STATUS_LABEL_KEYS: Record<NeedStatus, string> = {
  open: "need_status_open",
  "in-progress": "need_status_inprogress",
  fulfilled: "need_status_fulfilled",
  dropped: "need_status_dropped",
};

export const NEED_STATUS_SYMBOLS: Record<NeedStatus, string> = {
  open: "○",
  "in-progress": "◐",
  fulfilled: "●",
  dropped: "–",
};

export const NEED_URGENCY_SYMBOLS: Record<NeedUrgency, string> = {
  low: "·",
  medium: "!",
  high: "!!",
};

export const NEED_URGENCY_TONES: Record<NeedUrgency, string> = {
  low: "bg-muted text-fg-muted",
  medium: "bg-status-attention-fg text-on-brand",
  high: "bg-telha text-on-brand",
};

export const NEED_STATUS_TONES: Record<NeedStatus, string> = {
  open: "bg-azul-ink text-on-brand",
  "in-progress": "bg-status-attention-fg text-on-brand",
  fulfilled: "bg-verde-claro-ink text-on-brand",
  dropped: "bg-muted text-fg-muted",
};

export const UNIT_TYPES: readonly string[] = [
  "Livros",
  "Capítulos",
  "Versículos",
  "Páginas",
  "Histórias",
  "Outro",
];

export const STALE_ATTENTION_DAYS = 60;

export const STALE_CRITICAL_DAYS = 120;

export const RECENT_UPDATE_DAYS = 30;

export const DEADLINE_SOON_DAYS = 90;

export const HEALTH_SCORES: Record<HealthLevel | "", number> = {
  boa: 3,
  atencao: 2,
  critica: 1,
  "": 0,
};
