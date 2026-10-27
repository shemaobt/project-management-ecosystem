import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_UNIT_TYPE } from "../constants/project";
import { createDeferredJsonStorage } from "./draftStorage";
import type { RecordTabId } from "../constants/recordTabs";
import type { Project } from "../types/project";
import { mayWrite, type RecordAccess } from "../utils/recordAccess";

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

/** A field this reader may not write is never missing for them — the base of a withheld record read as `other`. */
export function missingRequired(
  draft: ProjectDraft,
  access: RecordAccess,
): RequiredField[] {
  return REQUIRED_FIELDS.filter((field) => {
    if (!mayWrite(access, field)) return false;
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
  /**
   * The version a record's draft must quote on its next save instead of the one just read —
   * set when a lost create's difference lands on the record it filed (OBT-625), and kept with
   * the draft, so a reload, a refused save or a dropped connection cannot turn that difference
   * into an overwrite of somebody's later edit. A save the server took, a conflict it answered
   * and a discard end it.
   */
  filedAt: Record<string, string>;
  markFiled: (recordId: string, version: string) => void;
  forgetFiled: (recordId: string) => void;
  updateDraft: (recordId: string, patch: ProjectDraft) => void;
  updateDraftValue: <K extends keyof Project>(
    recordId: string,
    field: K,
    updater: (current: Project[K] | undefined) => Project[K],
  ) => void;
  discardDraft: (recordId: string) => void;
  settleDraft: (recordId: string, written: readonly (keyof Project)[]) => void;
}

type PersistedRecords = Pick<RecordState, "drafts" | "filedAt">;

function without(map: Record<string, string>, key: string): Record<string, string> {
  if (!(key in map)) return map;
  const rest = { ...map };
  delete rest[key];
  return rest;
}

export const useRecordStore = create<RecordState>()(
  persist<RecordState, [], [], PersistedRecords>(
    (set) => ({
      drafts: {},
      filedAt: {},
      markFiled: (recordId, version) =>
        set((state) => ({ filedAt: { ...state.filedAt, [recordId]: version } })),
      forgetFiled: (recordId) =>
        set((state) => ({ filedAt: without(state.filedAt, recordId) })),
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
          return { drafts, filedAt: without(state.filedAt, recordId) };
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
          if (!draft) return { filedAt: without(state.filedAt, recordId) };
          const kept: ProjectDraft = { ...draft };
          for (const field of written) delete kept[field];
          const drafts = { ...state.drafts };
          if (Object.keys(kept).length === 0) delete drafts[recordId];
          else drafts[recordId] = kept;
          return { drafts, filedAt: without(state.filedAt, recordId) };
        }),
    }),
    {
      name: DRAFTS_KEY,
      storage: draftStorage,
      partialize: (state) => ({ drafts: state.drafts, filedAt: state.filedAt }),
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
