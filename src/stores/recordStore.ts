import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_UNIT_TYPE } from "../constants/project";
import { createDeferredJsonStorage } from "./draftStorage";
import type { RecordTabId } from "../constants/recordTabs";
import type { Project } from "../types/project";

export const NEW_RECORD = "novo";

const DRAFTS_KEY = "shema-record-drafts-v1";

const draftStorage = createDeferredJsonStorage<PersistedRecords>();

export type ProjectDraft = Partial<Project>;

export const REQUIRED_FIELDS = [
  "languageName",
  "bridgeLanguage",
  "team",
  "objective",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export const REQUIRED_LABEL_KEYS: Record<RequiredField, string> = {
  languageName: "f_lang_name",
  bridgeLanguage: "f_bridge",
  team: "d_facilitators",
  objective: "sec_objective",
};

export const REQUIRED_FIELD_TAB: Record<RequiredField, RecordTabId> = {
  languageName: "identidade",
  bridgeLanguage: "identidade",
  team: "equipe",
  objective: "objetivo",
};

export function missingRequired(draft: ProjectDraft): RequiredField[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = draft[field];
    if (Array.isArray(value)) return value.length === 0;
    return typeof value !== "string" || value.trim() === "";
  });
}

export function makeEmptyProject(): Omit<Project, "id"> {
  return {
    languageName: "",
    languageCode: "",
    bridgeLanguage: "",
    vitalityStatus: "",
    location: "",
    speakerCount: "",
    coords: [0, 0],
    translationType: [],
    financialResources: [],
    team: "",
    ywamBase: "",
    teamLeader: "",
    mentor: "",
    translators: "",
    technicalReviewers: "",
    partnerOrg: "",
    teamContact: "",
    objective: [],
    scopeDetails: "",
    totalUnits: 0,
    totalUnitsType: DEFAULT_UNIT_TYPE,
    translatedUnits: 0,
    communityCheckedUnits: 0,
    approvedUnits: 0,
    startDate: "",
    deadline: "",
    status: "em-andamento",
    sensitivity: "",
    sensitiveCountry: false,
    statusComments: "",
    statusGoal: "",
    orgRole: "",
    phases: [],
    materials: [],
    storyProgress: [],
    bookProgress: [],
    progressHistory: [],
    healthEmotional: "",
    healthRelational: "",
    healthSpiritual: "",
    healthAssessmentDate: "",
    healthAssessor: "",
    healthNotes: "",
    prayerRequests: "",
    needsPastoralIntervention: "nao",
    pastoralInterventionName: "",
    needsItems: [],
    needsNotes: "",
    notes: "",
    inETEN: false,
    regionalCoordinator: "",
    obtLabPerson: "",
    resourceCirclePerson: "",
    lastUpdated: "",
  };
}

export function materializeDraft(draft: ProjectDraft, id = ""): Project {
  return { ...makeEmptyProject(), ...draft, id };
}

interface RecordState {
  drafts: Record<string, ProjectDraft>;
  updateDraft: (recordId: string, patch: ProjectDraft) => void;
  updateDraftValue: <K extends keyof Project>(
    recordId: string,
    field: K,
    updater: (current: Project[K] | undefined) => Project[K],
  ) => void;
  discardDraft: (recordId: string) => void;
  settleDraft: (recordId: string, written: readonly (keyof Project)[]) => void;
}

type PersistedRecords = Pick<RecordState, "drafts">;

export const useRecordStore = create<RecordState>()(
  persist<RecordState, [], [], PersistedRecords>(
    (set) => ({
      drafts: {},
      updateDraft: (recordId, patch) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [recordId]: { ...state.drafts[recordId], ...patch },
          },
        })),
      updateDraftValue: (recordId, field, updater) =>
        set((state) => {
          const draft = state.drafts[recordId];
          const current = draft && field in draft ? draft[field] : undefined;
          return {
            drafts: {
              ...state.drafts,
              [recordId]: { ...draft, [field]: updater(current) },
            },
          };
        }),
      discardDraft: (recordId) =>
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[recordId];
          return { drafts };
        }),
      /**
       * Forget exactly what the server took, and keep the rest.
       *
       * A save writes the fields the record endpoint owns; the ones it does not own yet
       * (`constants/recordFields.ts`) stay typed where they were typed, because throwing
       * away input nothing accepted is the loss this screen exists to prevent. What is
       * dropped is dropped because the record now carries it — the draft is an overlay,
       * and an overlay that repeats what is underneath it only hides the next edit
       * somebody else makes.
       */
      settleDraft: (recordId, written) =>
        set((state) => {
          const draft = state.drafts[recordId];
          if (!draft) return state;
          const kept: ProjectDraft = { ...draft };
          for (const field of written) delete kept[field];
          const drafts = { ...state.drafts };
          if (Object.keys(kept).length === 0) delete drafts[recordId];
          else drafts[recordId] = kept;
          return { drafts };
        }),
    }),
    {
      name: DRAFTS_KEY,
      storage: draftStorage,
      partialize: (state) => ({ drafts: state.drafts }),
    },
  ),
);

export const flushDraftWrites = (): void => draftStorage.flush();

export const selectDraft = (
  drafts: Record<string, ProjectDraft>,
  recordId: string,
): ProjectDraft | undefined => drafts[recordId];

export const hasDraft = (
  drafts: Record<string, ProjectDraft>,
  recordId: string,
): boolean => Object.keys(drafts[recordId] ?? {}).length > 0;
