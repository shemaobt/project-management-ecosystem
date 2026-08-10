import type { Project } from "../../../types/project";
import { formatDayMonth, formatNumber } from "../../../utils/format";
import { getLastProgressUpdate } from "../../../utils/recency";

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
  const date = getLastProgressUpdate(project);
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

export interface OpenableCardProps {
  role: "button";
  tabIndex: number;
  "aria-label": string;
  onClick: () => void;
  onKeyDown: (event: CardKeyEvent) => void;
}

export function openableCardProps(
  label: string,
  onOpen: () => void,
): OpenableCardProps {
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    onClick: onOpen,
    onKeyDown: (event) => {
      if (!isActivationKey(event.key)) return;
      event.preventDefault();
      onOpen();
    },
  };
}
