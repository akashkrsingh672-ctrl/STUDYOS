import type { StudyState } from "./types";

/**
 * localStorage persistence for the daywise working log.
 *
 * Every read/write is guarded: the app is also rendered on the server and in
 * private-browsing modes where `localStorage` can throw.
 */
export const STORAGE_KEY = "studyos:log";
export const STORAGE_VERSION = 3;
/** Oldest persisted shape we can still read and migrate in place. */
export const MIN_SUPPORTED_VERSION = 1;

export function loadState(): StudyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudyState;
    if (!parsed || typeof parsed !== "object") return null;
    if (
      typeof parsed.version !== "number" ||
      parsed.version < MIN_SUPPORTED_VERSION ||
      parsed.version > STORAGE_VERSION
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: StudyState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the in-memory log keeps working.
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function storageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = `${STORAGE_KEY}:probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
