import { createBrowserClient, isBrowser } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser-only Supabase client. Returns null when env vars are missing or
 * running outside the browser (SSR), so the app still renders without auth.
 * Session persistence is handled by @supabase/ssr (localStorage-backed).
 */
export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!isBrowser()) return null;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}