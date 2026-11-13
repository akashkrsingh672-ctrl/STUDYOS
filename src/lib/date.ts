// Local-date helpers for the daywise log.
// Every date key is an ISO `YYYY-MM-DD` string in the user's local timezone
// (never parsed as UTC, so day boundaries match the wall clock).

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Monday-first weekday labels for calendar grids. */
export const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, (month || 1) - 1, day || 1);
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function countDaysBetween(from: string, to: string): number {
  const a = fromDateKey(from).getTime();
  const b = fromDateKey(to).getTime();
  return Math.round((b - a) / 86400000);
}

export function isSameMonth(key: string, year: number, monthIndex: number): boolean {
  const date = fromDateKey(key);
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

export function monthLabel(year: number, monthIndex: number): string {
  return `${MONTHS[monthIndex]} ${year}`;
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

/** Full label, e.g. "Thu 13 Nov 2026". */
export function formatFullDate(key: string): string {
  if (!key) return "";
  const date = fromDateKey(key);
  return `${DAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** Medium label, e.g. "13 Nov 2026" (matches the top-nav preview date). */
export function formatMediumDate(key: string): string {
  if (!key) return "";
  const date = fromDateKey(key);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** Short label, e.g. "13 Nov". */
export function formatDayMonth(key: string): string {
  if (!key) return "";
  const date = fromDateKey(key);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatDayNumber(key: string): string {
  if (!key) return "";
  return pad2(fromDateKey(key).getDate());
}

/** "Today" / "Tomorrow" / "Yesterday" / "Thu 13 Nov 2026". */
export function relativeLabel(key: string, today: string): string {
  if (!key) return "";
  const delta = countDaysBetween(today, key);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return formatFullDate(key);
}

/**
 * Six-week Monday-first month grid. Cells are ISO date keys or null for the
 * leading/trailing blanks.
 */
export function buildMonthGrid(year: number, monthIndex: number): (string | null)[][] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toDateKey(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function yearMonthOf(key: string): { year: number; monthIndex: number } {
  const date = fromDateKey(key);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}
