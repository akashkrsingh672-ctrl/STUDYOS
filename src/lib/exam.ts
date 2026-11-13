import { countDaysBetween } from "./date.ts";

/**
 * Board-exam date that drives the sidebar countdown.
 * Local date key (`YYYY-MM-DD`); 16 Feb 2027 is the next 16 February.
 */
export const EXAM_DATE = "2027-02-16";

/**
 * Whole days left until the board exams, never negative. Returns `null` while
 * the app has not hydrated a "today" key yet, so SSR and the first client paint
 * can render a stable placeholder.
 */
export function daysUntilExam(today: string): number | null {
  if (!today) return null;
  return Math.max(0, countDaysBetween(today, EXAM_DATE));
}