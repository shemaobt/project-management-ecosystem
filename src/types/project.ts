export type ProjectStatus =
  | "nao-iniciado"
  | "em-andamento"
  | "final"
  | "concluido"
  | "pausado"
  | "cancelado"
  | "planejado"
  | "desconhecido";

export type HealthLevel = "boa" | "atencao" | "critica";

export type HealthRating = HealthLevel | "";

export type OverallHealth = HealthLevel | "na";

export type StaleStatus = "em-dia" | "atencao" | "critico";

export type HealthDimensionKey =
  | "emotional"
  | "relational"
  | "spiritual"
  | "physical";

export type PrayerVisibility = "coordenacao" | "rede";

export interface HealthAssessment {
  date: string;
  assessor: string;
  emotional: HealthRating;
  relational: HealthRating;
  spiritual: HealthRating;
  physical: HealthRating;
  notes: string;
}

export type ProjectPriority =
  | "critical"
  | "warning"
  | "completed"
  | "planned"
  | "paused"
  | "canceled"
  | "unknown"
  | "default";

export type PresetId = "attention" | "prayer" | "celebrate" | "recent";

export type Objective =
  | "NT"
  | "AT"
  | "Bíblia Completa"
  | "Livros Específicos"
  | "Capítulos"
  | "Histórias"
  | "Outro";

export type TranslationType =
  | "OBT"
  | "OMT"
  | "OBT/OMT"
  | "Tradução escrita"
  | "IA Assistida"
  | "Filme Jesus"
  | "Língua de Sinais"
  | "Ready Vessels"
  | "Taste&See";

export type FinancialResource =
  | "Seed Company"
  | "Global Partnerships"
  | "OBT TABLE - ETEN"
  | "Innovation Lab"
  | "Outros";

export type NeedCategory =
  | "financial"
  | "training"
  | "equipment"
  | "volunteers"
  | "material"
  | "security"
  | "connectivity"
  | "logistics"
  | "documentation";

export type NeedUrgency = "low" | "medium" | "high";

export type NeedStatus = "open" | "in-progress" | "fulfilled" | "dropped";

export type YesNo = "sim" | "nao";

export type StoryRecordStatus = "planned" | "recording" | "recorded";

export type MaterialKind = "text" | "audio" | "video";

export type Coordinates = [longitude: number, latitude: number];

export interface NeedItem {
  category: NeedCategory;
  urgency: NeedUrgency;
  status: NeedStatus;
  description: string;
  estimatedValue?: string;
  deadline?: string;
  prayerShared?: boolean;
  prayerAnswered?: boolean;
  fulfilledBy?: string;
  fulfilledDate?: string;
  submittedBy?: string;
  submittedAt?: string;
}

export interface BookProgressItem {
  id: string;
  name: string;
  chapters: number;
  translated: number;
  communityChecked: number;
  mentorApproved: number;
}

export interface StoryProgressItem {
  name: string;
  audioHours?: number | string;
  recordLocation?: string;
  recordStatus?: StoryRecordStatus;
  aiAssisted?: boolean;
}

export interface OtherProgressItem {
  name: string;
  chapters: number;
  translated: number;
  communityChecked: number;
  mentorApproved: number;
}

export interface ProgressHistoryEntry {
  date: string;
  translatedUnits: number;
  communityCheckedUnits: number;
  approvedUnits: number;
  previousTranslated?: number;
  previousCommunity?: number;
  previousApproved?: number;
  initial?: boolean;
  synthetic?: boolean;
  fromField?: boolean;
  formType?: string;
}

export interface ProgressRollup {
  translated: number;
  community: number;
  approved: number;
  total: number;
}

export interface ProjectPhase {
  label: string;
  scope: string;
  date: string;
}

export interface ProjectMaterial {
  kind: MaterialKind;
  scope: string;
  fileName?: string;
  fileSize?: number;
  dataUrl?: string;
  link?: string;
}

export interface ProjectVideo {
  url: string;
  caption?: string;
}

export interface BibleBook {
  id: string;
  name: string;
  en: string;
  chapters: number;
  ot: boolean;
}

export interface DeadlineInfo {
  cls: "" | "overdue" | "soon" | "ok";
  days: number | null;
}

export interface Project {
  id: string;
  languageName: string;
  languageCode: string;
  bridgeLanguage: string;
  vitalityStatus: string;
  location: string;
  speakerCount: string;
  coords: Coordinates;
  translationType: TranslationType[];
  financialResources: FinancialResource[];
  team: string;
  ywamBase: string;
  teamLeader: string;
  mentor: string;
  translators: string;
  technicalReviewers: string;
  partnerOrg: string;
  teamContact: string;
  objective: Objective[];
  scopeDetails: string;
  totalUnits: number;
  totalUnitsType: string;
  translatedUnits: number;
  communityCheckedUnits: number;
  approvedUnits: number;
  startDate: string;
  deadline: string;
  status: ProjectStatus;
  sensitivity: string;
  sensitiveCountry: boolean;
  statusComments: string;
  statusGoal: string;
  orgRole: string;
  phases: ProjectPhase[];
  materials: ProjectMaterial[];
  storyProgress: StoryProgressItem[];
  bookProgress: BookProgressItem[];
  progressHistory: ProgressHistoryEntry[];
  healthEmotional: HealthRating;
  healthRelational: HealthRating;
  healthSpiritual: HealthRating;
  healthAssessmentDate: string;
  healthAssessor: string;
  healthNotes: string;
  prayerRequests: string;
  needsPastoralIntervention: YesNo;
  pastoralInterventionName: string;
  needsItems: NeedItem[];
  needsNotes: string;
  notes: string;
  inETEN: boolean;
  regionalCoordinator: string;
  obtLabPerson: string;
  resourceCirclePerson: string;
  lastUpdated: string;
  healthPhysical?: HealthRating;
  healthHistory?: HealthAssessment[];
  prayerVisibility?: PrayerVisibility;
  pastoralInterventionWhen?: string;
  location2?: string;
  portion?: string;
  facilitator?: string;
  teamLeaderContact?: string;
  mentorContact?: string;
  objectiveNotes?: string;
  financialNotes?: string;
  financialOtherDetails?: string;
  otherProgress?: OtherProgressItem[];
  storiesTranslated?: string;
  readyVesselsAudioHours?: string;
  mediaPhotoCaptions?: string[];
  mediaPhotoAuth?: boolean[];
  mediaVideos?: ProjectVideo[];
}
