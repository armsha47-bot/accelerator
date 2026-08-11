/** Shared domain types used across the app. */

export type Category = "fitness" | "academic" | "mindset" | "nutrition";
export type Slot = "morning" | "afternoon" | "evening";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface PlanTask {
  title: string;
  description?: string;
  why_this_matters?: string;
  xp_reward: number;
  category: Category;
  completed?: boolean;
}

export interface DailyPlan {
  id: string;
  date: string;
  morning: PlanTask[];
  afternoon: PlanTask[];
  evening: PlanTask[];
}

export interface Profile {
  id: string;
  name: string | null;
  age: number | null;
  position: string | null;
  goals: string[];
  xp: number;
  level: number;
  streak: number;
  longest_streak: number;
  daily_xp_goal: number;
  daily_calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  diet: string; // 'vegetarian' | 'vegan' | 'omnivore'
  weight_unit: string;
  onboarded: boolean;
  last_active: string | null;
  streak_date: string | null; // last date the daily streak was credited
  created_at: string;
}

export interface Habit {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  xp_reward: number;
  active: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  progress: number;
  target: number;
  completed: boolean;
  week_start: string;
}

export interface FoodLog {
  id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  quantity: number;
  unit: string;
}

/** A selectable portion for a food. `quantity` multiplies the food's base macros. */
export interface FoodPortion {
  label: string; // e.g. "1 cup (240 g)", "100 g", "1 serving"
  quantity: number; // multiple of the base unit (base macros are for quantity = 1)
}

/**
 * A normalized search hit. Macros are for the BASE unit (quantity = 1); a
 * FoodPortion's `quantity` scales them, and the portion picker multiplies again
 * by how many the user logs. Works for USDA (per-100 g), the offline DB
 * (per-serving), and custom foods alike.
 */
export interface FoodHit {
  food_name: string;
  brand?: string;
  base_unit: string; // label of quantity = 1 (e.g. "100 g", "serving")
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portions: FoodPortion[];
  source?: "usda" | "offline" | "custom";
}

export interface CustomFood {
  id: string;
  name: string;
  serving_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: CustomIngredient[];
}

export interface CustomIngredient {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface LeaderboardUser {
  id: string;
  display_name: string;
  avatar_seed: string;
  xp: number;
  level: number;
  is_ghost: boolean;
  real_user_id: string | null;
}
