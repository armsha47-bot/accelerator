/**
 * GET  /api/food-search?q=oatmeal        → instant name suggestions
 * POST /api/food-search  { query }        → full macros for a phrase
 * Proxies Nutritionix so credentials stay on the server.
 */
import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase-server";
import { instantSearch, nutrients } from "@/lib/nutritionix";

async function requireUser() {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: Request) {
  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });
  try {
    return NextResponse.json({ results: await instantSearch(q) });
  } catch {
    return NextResponse.json({ error: "search failed" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { query } = await req.json().catch(() => ({}));
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });
  try {
    return NextResponse.json({ foods: await nutrients(query) });
  } catch {
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
}
