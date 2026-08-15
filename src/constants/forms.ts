import type {
  FormDefinition,
  FormFiller,
  FormKind,
  FormMechanism,
  FormStep,
  ReportingState,
  StepActor,
} from "../types/forms";

export const FIELD_FORMS: readonly FormDefinition[] = [
  {
    kind: "pulso",
    cadence: "monthly",
    mechanism: "file",
    filledBy: "teamLeader",
    titleKey: "forms_pulse_title",
    voiceKey: "forms_pulse_voice",
    descriptionKey: "forms_pulse_desc",
    mechanismKey: "forms_pulse_mechanism",
  },
  {
    kind: "health",
    cadence: "quarterly",
    mechanism: "inApp",
    filledBy: "obtLab",
    titleKey: "forms_health_title",
    voiceKey: "forms_health_voice",
    descriptionKey: "forms_health_desc",
    mechanismKey: "forms_health_mechanism",
  },
];

export const PULSE_LOOP: readonly FormStep[] = [
  {
    key: "generate",
    actor: "coordinator",
    labelKey: "forms_step_generate",
    detailKey: "forms_step_generate_detail",
  },
  {
    key: "send",
    actor: "coordinator",
    labelKey: "forms_step_send",
    detailKey: "forms_step_send_detail",
  },
  {
    key: "answer",
    actor: "leader",
    labelKey: "forms_step_answer",
    detailKey: "forms_step_answer_detail",
  },
  {
    key: "import",
    actor: "coordinator",
    labelKey: "forms_step_import",
    detailKey: "forms_step_import_detail",
  },
  {
    key: "archive",
    actor: "system",
    labelKey: "forms_step_archive",
    detailKey: "forms_step_archive_detail",
  },
];

export const PULSE_QUESTIONS: readonly string[] = [
  "forms_q_voice",
  "forms_q_photo",
  "forms_q_chapters",
  "forms_q_blockers",
  "forms_q_prayer",
];

export const FORM_MECHANISM_LABEL_KEYS: Record<FormMechanism, string> = {
  file: "forms_mechanism_file",
  inApp: "forms_mechanism_inapp",
};

export const FORM_FILLER_LABEL_KEYS: Record<FormFiller, string> = {
  teamLeader: "forms_filler_leader",
  obtLab: "forms_filler_obtlab",
};

export const FORM_TAG_LABEL_KEYS: Record<FormKind, string> = {
  pulso: "forms_tag_pulse",
  health: "forms_tag_health",
};

export const STEP_ACTOR_LABEL_KEYS: Record<StepActor, string> = {
  coordinator: "forms_actor_coordinator",
  leader: "forms_actor_leader",
  system: "forms_actor_system",
};

export const REPORTING_LABEL_KEYS: Record<ReportingState, string> = {
  reported: "forms_reported",
  awaiting: "forms_awaiting",
  never: "forms_never",
};
