import type { TFunction } from "i18next";
import type { OverallHealth, Project } from "../../../types/project";
import { formatDayMonth, formatNumber } from "../../../utils/format";
import { healthDotPhrase, priorityPhrase } from "../../common/StatusBadge";
import { cardLastProgressUpdate, cardPriority } from "./derived";

export const QUOTE_MAX_LENGTH = 140;

export function getCardQuote(project: Project): string {
  const source =
    project.prayerRequests ||
    project.healthNotes ||
    project.needsNotes ||
    project.notes;
  const text = source.trim();
  return text.length > QUOTE_MAX_LENGTH
    ? `${text.slice(0, QUOTE_MAX_LENGTH)}...`
    : text;
}

export function getCardDateLabel(
  project: Project,
  locale: string,
): string | null {
  const date = cardLastProgressUpdate(project);
  return date ? formatDayMonth(date, locale) : null;
}

export function getSpeakerLabel(project: Project, locale: string): string {
  if (!project.speakerCount) return "—";
  const value = Number(project.speakerCount);
  return Number.isFinite(value)
    ? formatNumber(value, locale)
    : project.speakerCount;
}

export function getUnitShare(units: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, units / total));
}

export function getIdentityLabel(project: Project): string {
  return [project.languageCode || "—", project.bridgeLanguage]
    .filter(Boolean)
    .join(" · ");
}

export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

export interface CardKeyEvent {
  key: string;
  preventDefault: () => void;
}

export interface CardButton {
  label: string;
  describedBy: string;
  onOpen: () => void;
}

export interface CardButtonProps {
  role: "button";
  tabIndex: 0;
  "aria-label": string;
  "aria-describedby": string;
  onClick: () => void;
  onKeyDown: (event: CardKeyEvent) => void;
}

export function openableCardProps({
  label,
  describedBy,
  onOpen,
}: CardButton): CardButtonProps {
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    "aria-describedby": describedBy,
    onClick: onOpen,
    onKeyDown: (event) => {
      if (!isActivationKey(event.key)) return;
      event.preventDefault();
      onOpen();
    },
  };
}

const CARD_HEALTH_DIMENSIONS = [
  { field: "healthEmotional", labelKey: "d_emotional" },
  { field: "healthRelational", labelKey: "d_relational" },
  { field: "healthSpiritual", labelKey: "d_spiritual" },
] as const satisfies readonly { field: keyof Project; labelKey: string }[];

export interface CardHealthDot {
  state: OverallHealth;
  labelKey: (typeof CARD_HEALTH_DIMENSIONS)[number]["labelKey"];
}

export function cardHealthDots(project: Project): CardHealthDot[] {
  return CARD_HEALTH_DIMENSIONS.map(({ field, labelKey }) => ({
    state: project[field] || "na",
    labelKey,
  }));
}

export interface FunnelStage {
  count: string;
  label: string;
}

export interface CardFunnel {
  translated: FunnelStage;
  checked: FunnelStage;
  approved: FunnelStage;
}

export function cardFunnel(project: Project, t: TFunction): CardFunnel {
  const label = (key: string) => t(key).toLowerCase();
  return {
    translated: {
      count: `${project.translatedUnits}/${project.totalUnits}`,
      label: label("d_p_translated_short"),
    },
    checked: {
      count: `${project.communityCheckedUnits}`,
      label: label("d_p_community_short"),
    },
    approved: {
      count: `${project.approvedUnits}`,
      label: label("d_p_approved_short"),
    },
  };
}

/**
 * What a screen reader hears after the card's name. A `role="button"` makes everything inside
 * the card presentational, so this sentence is the card's only spoken content: it is built from
 * the pin's and the dots' own phrases and the Diário footer's funnel, so the ear hears what the
 * eye sees, and changing what the card says aloud is this one function.
 */
export function cardSummary(project: Project, t: TFunction): string {
  const { translated, checked, approved } = cardFunnel(project, t);
  return [
    priorityPhrase(t, cardPriority(project)),
    ...cardHealthDots(project).map((dot) =>
      healthDotPhrase(t, t(dot.labelKey), dot.state),
    ),
    [translated, checked, approved]
      .map((stage) => `${stage.count} ${stage.label}`)
      .join(", "),
  ]
    .map((phrase) => `${phrase}.`)
    .join(" ");
}
