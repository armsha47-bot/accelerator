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

export interface LeaderboardUser {
  id: string;
  display_name: string;
  avatar_seed: string;
  xp: number;
  level: number;
  is_ghost: boolean;
  real_user_id: string | null;
}
