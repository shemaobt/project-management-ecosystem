import type { MeetingCadence } from "../types/meeting";

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

const MONTH_LENGTHS: readonly number[] = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
];

const PERIOD_MONTHS: Record<MeetingCadence, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1];
}

export function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

function pad(value: number, size: number): string {
  return String(value).padStart(size, "0");
}

export function parseIsoDate(value: string): CalendarDate | null {
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function formatIsoDate(date: CalendarDate): string {
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

export function toCalendarDate(now: Date = new Date()): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  return formatIsoDate(a).localeCompare(formatIsoDate(b));
}

function monthIndex(date: CalendarDate): number {
  return date.year * 12 + (date.month - 1);
}

function fromMonthIndex(index: number): CalendarDate {
  return { year: Math.floor(index / 12), month: (index % 12) + 1, day: 1 };
}

export function periodStart(
  cadence: MeetingCadence,
  date: CalendarDate,
): CalendarDate {
  if (cadence === "monthly") return { ...date, day: 1 };
  if (cadence === "quarterly") {
    return { year: date.year, month: (quarterOf(date.month) - 1) * 3 + 1, day: 1 };
  }
  return { year: date.year, month: 1, day: 1 };
}

export function shiftPeriods(
  cadence: MeetingCadence,
  date: CalendarDate,
  steps: number,
): CalendarDate {
  const start = periodStart(cadence, date);
  return fromMonthIndex(monthIndex(start) + steps * PERIOD_MONTHS[cadence]);
}

export function periodEnd(
  cadence: MeetingCadence,
  date: CalendarDate,
): CalendarDate {
  const closing = fromMonthIndex(monthIndex(shiftPeriods(cadence, date, 1)) - 1);
  return { ...closing, day: daysInMonth(closing.year, closing.month) };
}

export function periodKey(
  cadence: MeetingCadence,
  date: CalendarDate,
): string {
  if (cadence === "monthly") return `${pad(date.year, 4)}-${pad(date.month, 2)}`;
  if (cadence === "quarterly") {
    return `${pad(date.year, 4)}-Q${quarterOf(date.month)}`;
  }
  return pad(date.year, 4);
}

export function previousPeriodKey(
  cadence: MeetingCadence,
  date: CalendarDate,
): string {
  return periodKey(cadence, shiftPeriods(cadence, date, -1));
}

export function nextDeadline(
  cadence: MeetingCadence,
  date: CalendarDate,
): CalendarDate {
  return periodEnd(cadence, shiftPeriods(cadence, date, 1));
}

export function coversPeriod(
  cadence: MeetingCadence,
  date: string,
  reference: CalendarDate,
): boolean {
  const parsed = parseIsoDate(date);
  if (!parsed) return false;
  return periodKey(cadence, parsed) === periodKey(cadence, reference);
}
