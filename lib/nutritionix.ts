/**
 * Nutritionix natural-language + instant search. SERVER ONLY (keeps the API
 * credentials off the client). Used by /api/food-search.
 */
const BASE = "https://trackapi.nutritionix.com/v2";

function headers() {
  const id = process.env.NUTRITIONIX_APP_ID;
  const key = process.env.NUTRITIONIX_API_KEY;
  if (!id || !key) throw new Error("Nutritionix credentials are not set.");
  return {
    "x-app-id": id,
    "x-app-key": key,
    "Content-Type": "application/json",
  };
}

export interface FoodResult {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_qty: number;
  serving_unit: string;
}

/** Full macros for a specific food phrase, e.g. "2 eggs and toast". */
export async function nutrients(query: string): Promise<FoodResult[]> {
  const res = await fetch(`${BASE}/natural/nutrients`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Nutritionix nutrients ${res.status}`);
  const data = await res.json();
  return (data.foods ?? []).map(
    (f: any): FoodResult => ({
      food_name: f.food_name,
      calories: Math.round(f.nf_calories ?? 0),
      protein_g: +(f.nf_protein ?? 0).toFixed(1),
      carbs_g: +(f.nf_total_carbohydrate ?? 0).toFixed(1),
      fat_g: +(f.nf_total_fat ?? 0).toFixed(1),
      serving_qty: f.serving_qty ?? 1,
      serving_unit: f.serving_unit ?? "serving",
    })
  );
}

/** Quick autocomplete list for the search bar (names only, cheap). */
export async function instantSearch(query: string): Promise<string[]> {
  const res = await fetch(
    `${BASE}/search/instant?query=${encodeURIComponent(query)}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Nutritionix instant ${res.status}`);
  const data = await res.json();
  const common = (data.common ?? []).map((c: any) => c.food_name as string);
  return Array.from(new Set<string>(common)).slice(0, 12);
}
