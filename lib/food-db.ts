/**
 * A small offline food database used for demo-mode search (and as a fallback if
 * Nutritionix isn't configured). Macros are per the listed serving — realistic
 * ballpark values, vegetarian-friendly coverage plus common staples.
 */
import type { FoodHit } from "./types";

export interface FoodItem {
  food_name: string;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// prettier-ignore
export const FOOD_DB: FoodItem[] = [
  // Eggs & dairy
  { food_name: "Egg (large)", serving_unit: "egg", calories: 72, protein_g: 6, carbs_g: 0.4, fat_g: 5 },
  { food_name: "Scrambled eggs (2)", serving_unit: "serving", calories: 180, protein_g: 12, carbs_g: 2, fat_g: 13 },
  { food_name: "Greek yogurt, plain", serving_unit: "cup", calories: 130, protein_g: 22, carbs_g: 9, fat_g: 0.5 },
  { food_name: "Greek yogurt, vanilla", serving_unit: "cup", calories: 190, protein_g: 20, carbs_g: 22, fat_g: 3 },
  { food_name: "Milk, 2%", serving_unit: "cup", calories: 122, protein_g: 8, carbs_g: 12, fat_g: 5 },
  { food_name: "Cheddar cheese", serving_unit: "oz", calories: 113, protein_g: 7, carbs_g: 0.4, fat_g: 9 },
  { food_name: "Cottage cheese", serving_unit: "cup", calories: 180, protein_g: 24, carbs_g: 8, fat_g: 5 },
  { food_name: "Paneer", serving_unit: "100g", calories: 265, protein_g: 18, carbs_g: 4, fat_g: 20 },
  { food_name: "Mozzarella cheese", serving_unit: "oz", calories: 85, protein_g: 6, carbs_g: 1, fat_g: 6 },
  { food_name: "Butter", serving_unit: "tbsp", calories: 102, protein_g: 0.1, carbs_g: 0, fat_g: 12 },
  // Protein (veg + meat)
  { food_name: "Tofu, firm", serving_unit: "100g", calories: 144, protein_g: 17, carbs_g: 3, fat_g: 9 },
  { food_name: "Tempeh", serving_unit: "100g", calories: 192, protein_g: 20, carbs_g: 8, fat_g: 11 },
  { food_name: "Black beans", serving_unit: "cup", calories: 227, protein_g: 15, carbs_g: 41, fat_g: 0.9 },
  { food_name: "Chickpeas", serving_unit: "cup", calories: 269, protein_g: 15, carbs_g: 45, fat_g: 4 },
  { food_name: "Lentils, cooked", serving_unit: "cup", calories: 230, protein_g: 18, carbs_g: 40, fat_g: 0.8 },
  { food_name: "Edamame", serving_unit: "cup", calories: 188, protein_g: 18, carbs_g: 14, fat_g: 8 },
  { food_name: "Chicken breast", serving_unit: "100g", calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
  { food_name: "Salmon", serving_unit: "100g", calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13 },
  { food_name: "Ground beef, 90%", serving_unit: "100g", calories: 176, protein_g: 20, carbs_g: 0, fat_g: 10 },
  { food_name: "Tuna, canned", serving_unit: "can", calories: 121, protein_g: 27, carbs_g: 0, fat_g: 1 },
  { food_name: "Whey protein shake", serving_unit: "scoop", calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5 },
  // Grains & carbs
  { food_name: "White rice, cooked", serving_unit: "cup", calories: 205, protein_g: 4, carbs_g: 45, fat_g: 0.4 },
  { food_name: "Brown rice, cooked", serving_unit: "cup", calories: 218, protein_g: 5, carbs_g: 46, fat_g: 1.6 },
  { food_name: "Quinoa, cooked", serving_unit: "cup", calories: 222, protein_g: 8, carbs_g: 39, fat_g: 3.6 },
  { food_name: "Oatmeal", serving_unit: "cup", calories: 158, protein_g: 6, carbs_g: 27, fat_g: 3 },
  { food_name: "Whole wheat bread", serving_unit: "slice", calories: 80, protein_g: 4, carbs_g: 14, fat_g: 1 },
  { food_name: "Bagel", serving_unit: "bagel", calories: 245, protein_g: 10, carbs_g: 48, fat_g: 1.5 },
  { food_name: "Pasta, cooked", serving_unit: "cup", calories: 220, protein_g: 8, carbs_g: 43, fat_g: 1.3 },
  { food_name: "Sweet potato", serving_unit: "medium", calories: 112, protein_g: 2, carbs_g: 26, fat_g: 0.1 },
  { food_name: "Potato, baked", serving_unit: "medium", calories: 161, protein_g: 4, carbs_g: 37, fat_g: 0.2 },
  { food_name: "Tortilla, flour", serving_unit: "tortilla", calories: 140, protein_g: 4, carbs_g: 24, fat_g: 3.5 },
  { food_name: "Roti / chapati", serving_unit: "piece", calories: 120, protein_g: 3, carbs_g: 18, fat_g: 3.7 },
  { food_name: "Naan", serving_unit: "piece", calories: 260, protein_g: 9, carbs_g: 45, fat_g: 5 },
  // Fruits
  { food_name: "Banana", serving_unit: "medium", calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4 },
  { food_name: "Apple", serving_unit: "medium", calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3 },
  { food_name: "Blueberries", serving_unit: "cup", calories: 84, protein_g: 1.1, carbs_g: 21, fat_g: 0.5 },
  { food_name: "Strawberries", serving_unit: "cup", calories: 49, protein_g: 1, carbs_g: 12, fat_g: 0.5 },
  { food_name: "Orange", serving_unit: "medium", calories: 62, protein_g: 1.2, carbs_g: 15, fat_g: 0.2 },
  { food_name: "Grapes", serving_unit: "cup", calories: 104, protein_g: 1.1, carbs_g: 27, fat_g: 0.2 },
  { food_name: "Mango", serving_unit: "cup", calories: 99, protein_g: 1.4, carbs_g: 25, fat_g: 0.6 },
  { food_name: "Avocado", serving_unit: "half", calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15 },
  // Vegetables
  { food_name: "Broccoli", serving_unit: "cup", calories: 55, protein_g: 3.7, carbs_g: 11, fat_g: 0.6 },
  { food_name: "Spinach", serving_unit: "cup", calories: 7, protein_g: 0.9, carbs_g: 1.1, fat_g: 0.1 },
  { food_name: "Mixed salad", serving_unit: "bowl", calories: 90, protein_g: 3, carbs_g: 10, fat_g: 4 },
  { food_name: "Carrots", serving_unit: "cup", calories: 52, protein_g: 1.2, carbs_g: 12, fat_g: 0.3 },
  { food_name: "Bell pepper", serving_unit: "medium", calories: 31, protein_g: 1, carbs_g: 7, fat_g: 0.3 },
  // Nuts, fats, spreads
  { food_name: "Peanut butter", serving_unit: "tbsp", calories: 94, protein_g: 4, carbs_g: 3, fat_g: 8 },
  { food_name: "Almonds", serving_unit: "oz", calories: 164, protein_g: 6, carbs_g: 6, fat_g: 14 },
  { food_name: "Walnuts", serving_unit: "oz", calories: 185, protein_g: 4.3, carbs_g: 4, fat_g: 18 },
  { food_name: "Olive oil", serving_unit: "tbsp", calories: 119, protein_g: 0, carbs_g: 0, fat_g: 14 },
  { food_name: "Hummus", serving_unit: "1/4 cup", calories: 100, protein_g: 5, carbs_g: 9, fat_g: 6 },
  // Meals & mixed
  { food_name: "Cheese pizza slice", serving_unit: "slice", calories: 285, protein_g: 12, carbs_g: 36, fat_g: 10 },
  { food_name: "Bean burrito", serving_unit: "burrito", calories: 380, protein_g: 14, carbs_g: 56, fat_g: 11 },
  { food_name: "Veggie stir-fry + rice", serving_unit: "bowl", calories: 430, protein_g: 15, carbs_g: 62, fat_g: 13 },
  { food_name: "Paneer tikka", serving_unit: "serving", calories: 300, protein_g: 18, carbs_g: 10, fat_g: 21 },
  { food_name: "Dal (lentil curry)", serving_unit: "cup", calories: 180, protein_g: 12, carbs_g: 28, fat_g: 3 },
  { food_name: "Grilled cheese sandwich", serving_unit: "sandwich", calories: 400, protein_g: 15, carbs_g: 33, fat_g: 24 },
  { food_name: "PB&J sandwich", serving_unit: "sandwich", calories: 350, protein_g: 12, carbs_g: 45, fat_g: 14 },
  { food_name: "Protein bar", serving_unit: "bar", calories: 210, protein_g: 20, carbs_g: 22, fat_g: 7 },
  { food_name: "Granola", serving_unit: "1/2 cup", calories: 200, protein_g: 5, carbs_g: 32, fat_g: 6 },
  { food_name: "Smoothie (fruit + yogurt)", serving_unit: "cup", calories: 250, protein_g: 12, carbs_g: 42, fat_g: 3 },
  // Snacks & drinks
  { food_name: "Dark chocolate", serving_unit: "oz", calories: 155, protein_g: 2, carbs_g: 13, fat_g: 9 },
  { food_name: "Potato chips", serving_unit: "oz", calories: 152, protein_g: 2, carbs_g: 15, fat_g: 10 },
  { food_name: "Popcorn", serving_unit: "cup", calories: 31, protein_g: 1, carbs_g: 6, fat_g: 0.4 },
  { food_name: "Orange juice", serving_unit: "cup", calories: 112, protein_g: 1.7, carbs_g: 26, fat_g: 0.5 },
  { food_name: "Chocolate milk", serving_unit: "cup", calories: 208, protein_g: 8, carbs_g: 26, fat_g: 8.5 },
];

/** Case-insensitive substring search over the local DB. */
export function searchFoodDb(query: string, limit = 12): FoodItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored = FOOD_DB.map((f) => {
    const name = f.food_name.toLowerCase();
    let score = 0;
    if (name.startsWith(q)) score += 5;
    if (name.includes(q)) score += 3;
    for (const w of words) if (name.includes(w)) score += 1;
    return { f, score };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.f);
}

/** Same search, returned as portion-aware FoodHit[] for the picker UI. */
export function searchFoodDbHits(query: string, limit = 12): FoodHit[] {
  return searchFoodDb(query, limit).map(toHit);
}

/** Convert a per-serving offline item into a FoodHit with sensible portions. */
export function toHit(f: FoodItem): FoodHit {
  const u = f.serving_unit;
  return {
    food_name: f.food_name,
    base_unit: u,
    calories: f.calories,
    protein_g: f.protein_g,
    carbs_g: f.carbs_g,
    fat_g: f.fat_g,
    portions: [
      { label: `1 ${u}`, quantity: 1 },
      { label: `½ ${u}`, quantity: 0.5 },
      { label: `2 ${u}`, quantity: 2 },
      { label: `3 ${u}`, quantity: 3 },
    ],
    source: "offline",
  };
}
