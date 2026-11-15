import type { StudyState } from "./types";
import { STORAGE_KEY, STORAGE_VERSION } from "./storage";
import { createSupabaseClient } from "./supabase";

/** Key used to back up local data before any cloud operation. */
const BACKUP_KEY_PREFIX = "studyos:log:backup-";

/**
 * Backs up the current localStorage `studyos:log` blob under a timestamped key
 * so the user's existing data is never lost during migration or sync.
 */
export function backupLocalLog(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const backupKey = `${BACKUP_KEY_PREFIX}${Date.now()}`;
    window.localStorage.setItem(backupKey, raw);
    return backupKey;
  } catch {
    return null;
  }
}

/**
 * Lists available local backups (most recent first) so a user can restore if needed.
 */
export function listLocalBackups(): { key: string; timestamp: number }[] {
  if (typeof window === "undefined") return [];
  try {
    const backups: { key: string; timestamp: number }[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
        const timestamp = Number(key.slice(BACKUP_KEY_PREFIX.length));
        if (Number.isFinite(timestamp)) {
          backups.push({ key, timestamp });
        }
      }
    }
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

/**
 * Restores a previously backed-up localStorage blob.
 */
export function restoreLocalBackup(backupKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(backupKey);
    if (!raw) return false;
    window.localStorage.setItem(STORAGE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

/** Upload the entire StudyState to Supabase for the given user. */
export async function uploadStudyLog(userId: string, state: StudyState): Promise<void> {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error("Supabase client unavailable");

  const { error } = await supabase.from("user_study_logs").upsert(
    {
      user_id: userId,
      payload: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

/** Download the stored StudyState for the given user, or null if none exists. */
export async function downloadStudyLog(userId: string): Promise<StudyState | null> {
  const supabase = createSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_study_logs")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return (data.payload ?? null) as StudyState | null;
}

/** Returns true if a cloud record exists for the user. */
export async function cloudLogExists(userId: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  if (!supabase) return false;

  const { count, error } = await supabase
    .from("user_study_logs")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Key prefix for per-user sync-resolution tracking in localStorage. */
const SYNC_RESOLVED_KEY_PREFIX = "studyos:sync-resolved-";

/**
 * Resolution outcome recorded for a user after they choose how to handle
 * a local-vs-cloud conflict.
 */
export type SyncResolution = "useCloud" | "useLocal" | "merge";

/** Persisted record of a completed sync resolution for one user. */
interface SyncResolvedRecord {
  /** ISO timestamp when the resolution was completed. */
  resolvedAt: string;
  /** Which option the user chose. */
  resolution: SyncResolution;
  /** STORAGE_VERSION at the time of resolution. */
  version: number;
}

/**
 * Checks whether the sync conflict has already been resolved for this user.
 * Persisted in localStorage so it survives page refreshes and browser restarts.
 */
export function isSyncResolved(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(
      `${SYNC_RESOLVED_KEY_PREFIX}${userId}`,
    );
    return raw !== null;
  } catch {
    return false;
  }
}

/**
 * Reads the stored sync-resolution record for this user.
 * Returns null if no resolution has been recorded.
 */
export function getSyncResolvedRecord(userId: string): SyncResolvedRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      `${SYNC_RESOLVED_KEY_PREFIX}${userId}`,
    );
    if (!raw) return null;
    return JSON.parse(raw) as SyncResolvedRecord;
  } catch {
    return null;
  }
}

/**
 * Marks the sync conflict as resolved for this user after the chosen migration
 * has been successfully completed and verified. Only call this after the
 * save/upload/download operation has been confirmed to succeed.
 */
export function markSyncResolved(
  userId: string,
  resolution: SyncResolution,
): void {
  if (typeof window === "undefined") return;
  try {
    const record: SyncResolvedRecord = {
      resolvedAt: new Date().toISOString(),
      resolution,
      version: STORAGE_VERSION,
    };
    window.localStorage.setItem(
      `${SYNC_RESOLVED_KEY_PREFIX}${userId}`,
      JSON.stringify(record),
    );
  } catch {
    // Ignore storage failures — sync can still proceed without tracking.
  }
}

/**
 * Clears the sync-resolution state for this user (e.g., explicit reset or
 * fresh-sync request). Never reused across different user IDs.
 */
export function clearSyncResolved(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(
      `${SYNC_RESOLVED_KEY_PREFIX}${userId}`,
    );
  } catch {
    // Ignore storage failures.
  }
}