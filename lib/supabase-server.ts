/**
 * Server-only Supabase clients. Import ONLY from Server Components, Route
 * Handlers, or other server modules — never from a Client Component.
 *  - serverClient(): reads the auth cookie for the current request.
 *  - adminClient(): service-role, bypasses RLS. Never send to the browser.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function serverClient() {
  const store = cookies();
  return createServerClient<any>(URL, ANON, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(items: { name: string; value: string; options?: any }[]) {
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component where cookies are read-only; the
          // middleware refreshes the session so this is safe to ignore.
        }
      },
    },
  });
}

let _admin: ReturnType<typeof createClient<any>> | null = null;
export function adminClient() {
  if (!_admin) {
    _admin = createClient<any>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
