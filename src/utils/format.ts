import { getActiveLocale } from "../i18n";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function toLocalIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatDate(date: string, locale = getActiveLocale()): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/u;

export function utcDay(moment: string): string {
  const match = ISO_DAY.exec(moment);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

export function formatDayMonth(date: string, locale = getActiveLocale()): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
  });
}

export function formatMonthName(
  year: number,
  month: number,
  locale = getActiveLocale(),
): string {
  const name = new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
  });
  return `${name.charAt(0).toLocaleUpperCase(locale)}${name.slice(1)}`;
}

export function formatNumber(
  value: number,
  locale = getActiveLocale(),
): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
  }
  return `${minutes}:${rest}`;
}

export function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
