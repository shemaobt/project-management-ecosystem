import type { HealthDimensionKey } from "../types/project";

export const GUIDING_QUESTIONS: Record<
  HealthDimensionKey,
  readonly string[]
> = {
  emotional: ["hq_emotional_1", "hq_emotional_2", "hq_emotional_3", "hq_emotional_4"],
  relational: [
    "hq_relational_1",
    "hq_relational_2",
    "hq_relational_3",
    "hq_relational_4",
  ],
  spiritual: [
    "hq_spiritual_1",
    "hq_spiritual_2",
    "hq_spiritual_3",
    "hq_spiritual_4",
  ],
  physical: ["hq_physical_1", "hq_physical_2", "hq_physical_3", "hq_physical_4"],
};

export const QUESTIONS_PENDING_CLIENT: readonly HealthDimensionKey[] = [];
