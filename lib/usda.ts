/**
 * USDA FoodData Central search. SERVER ONLY (keeps the API key off the client).
 * Free key: https://fdc.nal.usda.gov/api-key-signup.html — set USDA_API_KEY.
 *
 * The search endpoint returns nutrients per 100 g for every data type, so we
 * treat "100 g" as the base unit and expose selectable portions that scale it.
 */
import type { FoodHit, FoodPortion } from "./types";

const BASE = "https://api.nal.usda.gov/fdc/v1";

// Nutrient numbers in FoodData Central.
const N_ENERGY = "208"; // kcal (standard)
const N_ENERGY_ATWATER_GENERAL = "957"; // Foundation foods often use these
const N_ENERGY_ATWATER_SPECIFIC = "958";
const N_PROTEIN = "203";
const N_FAT = "204";
const N_CARB = "205";

function apiKey(): string {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new Error("USDA_API_KEY is not set.");
  return key;
}

function nutrient(nutrients: any[], number: string): number {
  const n = nutrients?.find((x) => String(x.nutrientNumber) === number || String(x.number) === number);
  return n ? +n.value || 0 : 0;
}

/** Energy in kcal, trying the standard number then Atwater fallbacks. */
function energy(nutrients: any[]): number {
  return (
    nutrient(nutrients, N_ENERGY) ||
    nutrient(nutrients, N_ENERGY_ATWATER_GENERAL) ||
    nutrient(nutrients, N_ENERGY_ATWATER_SPECIFIC)
  );
}

/** Build a small, sensible list of portions for a food (all scale the per-100 g base). */
function buildPortions(food: any): FoodPortion[] {
  const out: FoodPortion[] = [];
  const seen = new Set<string>();
  const push = (label: string, grams: number) => {
    if (!grams || grams <= 0) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, quantity: +(grams / 100).toFixed(4) });
  };

  // The food's own serving, if grams-based.
  const unit = (food.servingSizeUnit || "").toLowerCase();
  if (food.servingSize && (unit === "g" || unit === "ml")) {
    const house = food.householdServingFullText?.trim();
    push(house ? `${house} (${Math.round(food.servingSize)} g)` : `1 serving (${Math.round(food.servingSize)} g)`, food.servingSize);
  }
  // Any measured household portions the API provides.
  for (const m of food.foodMeasures ?? []) {
    if (m.gramWeight) push(m.disseminationText || m.modifier || "portion", m.gramWeight);
  }
  // Universal fallbacks.
  push("100 g", 100);
  push("1 oz (28 g)", 28);
  push("1 g", 1);

  return out.slice(0, 6);
}

// Prefer whole/generic foods over branded products so "banana" returns a fresh
// banana, not banana chips. Lower rank = shown first (stable within a type).
const TYPE_RANK: Record<string, number> = {
  Foundation: 0,
  "SR Legacy": 1,
  "Survey (FNDDS)": 2,
  Branded: 3,
};

/** Search USDA and normalize to FoodHit[] (per-100 g base + portions). */
export async function searchFoods(query: string): Promise<FoodHit[]> {
  // POST with a JSON body — the GET form 400s when dataType contains
  // "Survey (FNDDS)" (its parentheses break USDA's query-string parser).
  const res = await fetch(`${BASE}/foods/search?api_key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 40,
      dataType: ["Foundation", "SR Legacy", "Branded", "Survey (FNDDS)"],
    }),
  });
  if (!res.ok) throw new Error(`USDA search ${res.status}`);
  const data = await res.json();

  // Sort: entries that actually have calories first, then whole foods over
  // branded (so "apple" → fresh apple, not a 0-cal or branded row).
  const foods = [...(data.foods ?? [])].sort((a, b) => {
    const ca = energy(a.foodNutrients) > 0 ? 0 : 1;
    const cb = energy(b.foodNutrients) > 0 ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return (TYPE_RANK[a.dataType] ?? 9) - (TYPE_RANK[b.dataType] ?? 9);
  });

  return foods
    .map((f: any): FoodHit | null => {
      const nutrients = f.foodNutrients ?? [];
      const calories = Math.round(energy(nutrients));
      const protein = +nutrient(nutrients, N_PROTEIN).toFixed(1);
      const carbs = +nutrient(nutrients, N_CARB).toFixed(1);
      const fat = +nutrient(nutrients, N_FAT).toFixed(1);
      if (!calories && !protein && !carbs && !fat) return null; // skip empty rows
      const name = (f.description || "").toLowerCase();
      return {
        food_name: name.charAt(0).toUpperCase() + name.slice(1),
        brand: f.brandName || f.brandOwner || undefined,
        base_unit: "100 g",
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        portions: buildPortions(f),
        source: "usda",
      };
    })
    .filter(Boolean)
    .slice(0, 20) as FoodHit[];
}
