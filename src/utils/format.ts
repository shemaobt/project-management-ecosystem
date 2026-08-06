import { getActiveLocale } from "../i18n";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function formatDate(date: string, locale = getActiveLocale()): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatNumber(
  value: number,
  locale = getActiveLocale(),
): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
