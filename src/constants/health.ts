import type {
  HealthDimensionKey,
  HealthRating,
  Project,
} from "../types/project";

export const RATING_ON = "data-[on=true]:";

export const RATING_TONES: Record<HealthRating, string> = {
  boa: "data-[on=true]:border-verde-claro-ink data-[on=true]:bg-verde-claro-ink data-[on=true]:text-on-brand",
  atencao:
    "data-[on=true]:border-status-attention-fg data-[on=true]:bg-status-attention-fg data-[on=true]:text-on-brand",
  critica:
    "data-[on=true]:border-telha data-[on=true]:bg-telha data-[on=true]:text-on-brand",
  "": "data-[on=true]:border-preto data-[on=true]:bg-preto data-[on=true]:text-on-dark",
};

export type HealthDimensionField =
  | "healthEmotional"
  | "healthRelational"
  | "healthSpiritual"
  | "healthPhysical";

export interface HealthDimension {
  key: HealthDimensionKey;
  field: HealthDimensionField;
  labelKey: string;
  questionKey: string;
}

export const HEALTH_DIMENSIONS: readonly HealthDimension[] = [
  {
    key: "emotional",
    field: "healthEmotional",
    labelKey: "d_emotional",
    questionKey: "health_q_emotional",
  },
  {
    key: "relational",
    field: "healthRelational",
    labelKey: "d_relational",
    questionKey: "health_q_relational",
  },
  {
    key: "spiritual",
    field: "healthSpiritual",
    labelKey: "d_spiritual",
    questionKey: "health_q_spiritual",
  },
  {
    key: "physical",
    field: "healthPhysical",
    labelKey: "d_physical",
    questionKey: "health_q_physical",
  },
];

export const HEALTH_DIMENSION_KEYS: readonly HealthDimensionKey[] =
  HEALTH_DIMENSIONS.map((dimension) => dimension.key);

export const ASSESSMENT_FIELDS: Record<HealthDimensionKey, HealthDimensionField> =
  Object.fromEntries(
    HEALTH_DIMENSIONS.map((dimension) => [dimension.key, dimension.field]),
  ) as Record<HealthDimensionKey, HealthDimensionField>;

export type AssessedProject = Partial<
  Pick<
    Project,
    | "healthEmotional"
    | "healthRelational"
    | "healthSpiritual"
    | "healthPhysical"
    | "healthAssessmentDate"
    | "healthAssessor"
    | "healthNotes"
    | "healthHistory"
  >
>;
