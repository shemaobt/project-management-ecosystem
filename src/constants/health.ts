import type {
  HealthDimensionKey,
  HealthRating,
  Project,
} from "../types/project";

export const RATING_ON = "data-[state=checked]:";

export const RATING_TONES: Record<HealthRating, string> = {
  boa: "data-[state=checked]:border-verde-claro-ink data-[state=checked]:bg-verde-claro-ink data-[state=checked]:text-on-brand",
  atencao:
    "data-[state=checked]:border-status-attention-fg data-[state=checked]:bg-status-attention-fg data-[state=checked]:text-on-brand",
  critica:
    "data-[state=checked]:border-telha data-[state=checked]:bg-telha data-[state=checked]:text-on-brand",
  "": "data-[state=checked]:border-preto data-[state=checked]:bg-preto data-[state=checked]:text-on-dark",
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

/**
 * The published set of guiding questions this console renders — BE-07's version 1,
 * `health_q_{dimension}` for each of `HEALTH_DIMENSIONS`, key for key. A submission is
 * stamped with this number so a later reader can tell which wording a rating answered
 * (`app/utils/shema_health_questions.py`). Bump it only alongside a real change to the
 * four `questionKey`s above — never on its own.
 */
export const CURRENT_QUESTION_SET_VERSION = 1;

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
