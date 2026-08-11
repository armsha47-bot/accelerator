/**
 * POST /api/food-search  { query }  → portion-aware FoodHit[] for the picker.
 * Uses USDA FoodData Central (giant real database); falls back to the offline
 * DB if USDA isn't configured or returns nothing. Credentials stay server-side.
 */
import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase-server";
import { searchFoods } from "@/lib/usda";
import { searchFoodDbHits } from "@/lib/food-db";

async function requireUser() {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: Request) {
  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { query } = await req.json().catch(() => ({}));
  if (!query || !String(query).trim()) return NextResponse.json({ foods: [] });

  try {
    const foods = await searchFoods(String(query));
    if (foods.length) return NextResponse.json({ foods, source: "usda" });
  } catch {
    // USDA not configured or errored — fall through to the offline DB.
  }
  return NextResponse.json({ foods: searchFoodDbHits(String(query)), source: "offline" });
}
