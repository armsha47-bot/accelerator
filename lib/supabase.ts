/**
 * Browser Supabase client — safe to import from Client Components ("use client").
 * Server-only clients (serverClient / adminClient) live in ./supabase-server so
 * that next/headers never leaks into the client bundle.
 */
import { createBrowserClient } from "@supabase/ssr";

// Fall back to harmless placeholders so the client constructs even with no env
// (demo mode). Real values take over when configured.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key";

export function browserClient() {
  // Schema generic `any` — no generated Database types, so queries return `any`
  // instead of `never`. Swap for a generated `Database` type later if desired.
  return createBrowserClient<any>(URL, ANON);
}
