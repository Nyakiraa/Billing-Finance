import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = mustGetEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return cachedClient;
}

