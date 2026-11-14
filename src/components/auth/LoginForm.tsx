"use client";

import { useState, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";

interface LoginFormProps {
  onAuthenticated: () => void;
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseClient();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) {
        setError("Authentication is not configured.");
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const authFn = mode === "signin" ? "signInWithPassword" : "signUp";
        const { error: authError } = await supabase.auth[authFn]({
          email,
          password,
        });

        if (authError) throw authError;
        // The store's onAuthStateChange listener handles session restore,
        // cloud fetch, and sync setup. Just notify the parent.
        onAuthenticated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, email, password, mode, onAuthenticated],
  );

  if (!supabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
        <p className="text-[12px] text-muted">
          Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 space-y-4">
      <h2 className="text-lg font-medium text-foreground">
        {mode === "signin" ? "Welcome back" : "Create account"}
      </h2>

      {error && (
        <div className="p-3 rounded-soft border border-hairline bg-surface-subtle text-[11px] text-muted w-full">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="py-2.5 px-3 rounded-control border border-hairline bg-surface-subtle text-[12px] text-foreground focus:border-accent focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="py-2.5 px-3 rounded-control border border-hairline bg-surface-subtle text-[12px] text-foreground focus:border-accent focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="py-3 rounded-assign border border-hairline bg-accent text-on-accent text-[12px] font-medium hover:bg-surface-muted disabled:opacity-50 transition-colors"
        >
          {loading ? "Signing in…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="py-2 rounded-assign border border-hairline bg-transparent text-[11px] text-accent hover:bg-surface-muted transition-colors"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}