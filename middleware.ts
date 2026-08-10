/**
 * Refreshes the Supabase auth session on every request and gates the app.
 * Unauthenticated users hitting an app route are bounced to /login; signed-in
 * users hitting /login or /signup are sent home.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Keyless demo: skip auth gating entirely so the UI is browsable without a
  // real Supabase project (also when no Supabase URL is configured at all).
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return res;

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(items: { name: string; value: string; options?: any }[]) {
          items.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          items.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && (path === "/login" || path === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Run on everything except static assets, the manifest, icons, and API cron.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-.*|apple-touch-icon.*|sw.js|workbox-.*|api/cron).*)"],
};
