"use client";

import { useState } from "react";
import { StudyState } from "@/lib/types";
import { backupLocalLog, restoreLocalBackup, listLocalBackups } from "@/lib/sync";
import { saveState } from "@/lib/storage";

interface AuthPromptProps {
  /** The remote (cloud) state fetched from Supabase. */
  remoteState: StudyState | null;
  /** Whether a cloud record already exists for this user. */
  cloudExists: boolean;
  /** Called when the user has decided how to proceed. */
  onResolve: (choice: "useCloud" | "useLocal" | "merge") => void;
}

export function AuthPrompt({
  remoteState,
  cloudExists,
  onResolve,
}: AuthPromptProps) {
  const [localBackuped, setLocalBackuped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUseCloud = () => {
    try {
      // Never overwrite local data without backing it up first.
      const backupKey = backupLocalLog();
      if (backupKey) setLocalBackuped(true);
      if (remoteState) saveState(remoteState);
      onResolve("useCloud");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cloud data.");
    }
  };

  const handleUseLocal = () => {
    // Keep local data; optionally back it up so it isn't lost.
    backupLocalLog();
    setLocalBackuped(true);
    onResolve("useLocal");
  };

  const handleRestoreBackup = (backupKey: string) => {
    try {
      if (restoreLocalBackup(backupKey)) {
        window.location.reload();
      } else {
        setError("Failed to restore backup.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore backup.");
    }
  };

  const backups = listLocalBackups();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface-subtle border border-hairline rounded-control p-5 max-w-md w-full shadow-dialog">
        <h2 className="text-lg font-medium text-foreground mb-3">
          Sync your StudyOS data
        </h2>
        <p className="text-sm text-muted mb-4 leading-relaxed">
          You already have study data saved locally on this device, and a cloud
          record exists for your account. Choose which version to keep. Your
          local data is backed up before anything changes.
        </p>

        {localBackuped && (
          <div className="mb-3 p-2 bg-success-soft border border-success-border/40 rounded-soft text-[11px] text-success">
            Local data backed up safely.
          </div>
        )}

        {error && (
          <div className="mb-3 p-2 bg-surface-subtle border border-hairline rounded-soft text-[11px] text-muted">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleUseCloud}
            className="w-full py-3 px-3 rounded-assign border border-hairline bg-surface-raised text-[11px] font-medium text-foreground hover:bg-surface-muted transition-colors"
          >
            Use cloud data (replaces local)
          </button>
          <button
            onClick={handleUseLocal}
            className="w-full py-3 px-3 rounded-assign border border-hairline bg-surface-raised text-[11px] font-medium text-foreground hover:bg-surface-muted transition-colors"
          >
            Keep local data (uploads to cloud)
          </button>
          {cloudExists && remoteState && (
            <button
              onClick={() => onResolve("merge")}
              className="w-full py-3 px-3 rounded-assign border border-hairline bg-surface-raised text-[11px] font-medium text-foreground hover:bg-surface-muted transition-colors"
            >
              Merge (cloud takes precedence)
            </button>
          )}
        </div>

        {backups.length > 0 && (
          <div className="mt-4 border-t border-hairline pt-3">
            <p className="text-[10px] text-muted mb-2">Restore an older backup:</p>
            <div className="flex flex-col gap-1">
              {backups.map((b) => (
                <button
                  key={b.key}
                  onClick={() => handleRestoreBackup(b.key)}
                  className="text-left py-1.5 px-2 rounded-soft border border-hairline bg-surface-subtle text-[10px] text-muted hover:bg-surface-muted transition-colors"
                >
                  {new Date(b.timestamp).toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}