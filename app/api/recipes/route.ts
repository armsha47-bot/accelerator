/**
 * POST /api/recipes  { remaining: { cal, protein, carbs, fat } }
 * Suggests 2-3 simple VEGETARIAN meals that fit the user's remaining macros for
 * the day (daily goal − already logged). Fast model.
 */
import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase-server";
import { aiJson, MODELS } from "@/lib/ai";

const DIET_RULE: Record<string, string> = {
  vegetarian: "STRICTLY VEGETARIAN (no meat or fish; eggs and dairy are fine)",
  vegan: "STRICTLY VEGAN (no meat, fish, eggs, dairy, or honey)",
  omnivore: "any cuisine (meat, fish, and plant-based all welcome)",
};

interface Recipe {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  note?: string;
}

export async function POST(req: Request) {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { remaining } = (await req.json().catch(() => ({}))) as {
    remaining?: { cal: number; protein: number; carbs: number; fat: number };
  };
  const r = remaining ?? { cal: 800, protein: 50, carbs: 90, fat: 25 };

  const { data: profile } = await adminClient().from("profiles").select("diet").eq("id", user.id).single();
  const dietRule = DIET_RULE[profile?.diet ?? "vegetarian"] ?? DIET_RULE.vegetarian;

  const prompt = `Suggest 2-3 simple meals — ${dietRule} — for a 15-year-old athlete that together help hit his REMAINING macros for today: ~${Math.round(r.cal)} cal, ${Math.round(r.protein)}g protein, ${Math.round(r.carbs)}g carbs, ${Math.round(r.fat)}g fat. Prioritize protein. Return ONLY JSON:
[{"name":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"note":"one short reason"}]`;

  try {
    const recipes = await aiJson<Recipe[]>({ model: MODELS.fast, maxTokens: 700, prompt });
    return NextResponse.json({ recipes });
  } catch (e) {
    console.error("[recipes] generation failed:", e);
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
