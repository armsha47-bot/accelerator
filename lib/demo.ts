/**
 * Keyless demo mode. When NEXT_PUBLIC_DEMO_MODE === "true", pages that would
 * otherwise need Supabase/AI fall back to this mock data so the UI renders
 * without any backend. Turn it off (or remove the env var) once real keys are in.
 */
import type { DailyPlan, Habit, Profile } from "./types";
import { todayISO, mondayISO } from "./xp-utils";

// Demo mode is on when explicitly enabled OR when no real Supabase URL is
// configured — so a zero-config deploy (e.g. Vercel with no env vars) still runs.
export const DEMO =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const demoProfile: Profile = {
  id: "demo-user",
  name: "Armaan",
  age: 15,
  position: "Winger / CAM",
  goals: ["Soccer/Fitness", "Academic", "Confidence", "Nutrition"],
  xp: 3820,
  level: 4,
  streak: 12,
  longest_streak: 18,
  daily_xp_goal: 500,
  daily_calorie_goal: 2500,
  protein_goal: 150,
  carbs_goal: 300,
  fat_goal: 80,
  diet: "vegetarian",
  weight_unit: "lbs",
  onboarded: true,
  last_active: todayISO(),
  created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
};

export const demoPlan: DailyPlan = {
  id: "demo-plan",
  date: todayISO(),
  morning: [
    { title: "10-min ball mastery", description: "First touch, weak foot, quick cuts in your cleats.", why_this_matters: "Muscle memory that shows up under pressure when it counts most.", xp_reward: 30, category: "fitness" },
    { title: "Protein-forward breakfast", description: "Eggs or Greek yogurt + fruit.", why_this_matters: "Fuels recovery and focus for the day.", xp_reward: 10, category: "nutrition" },
  ],
  afternoon: [
    { title: "AMC problem set (5 problems)", description: "Mixed algebra + number theory.", why_this_matters: "Consistent reps build the pattern recognition that wins timed exams.", xp_reward: 25, category: "academic" },
    { title: "Confidence rep", description: "Say one thing you did well today out loud.", why_this_matters: "Identity is built by the evidence you give yourself.", xp_reward: 10, category: "mindset" },
  ],
  evening: [
    { title: "Mobility + wind-down", description: "10-min hip/hamstring stretch, phone away 30 min before bed.", why_this_matters: "Sleep is where the gains lock in.", xp_reward: 15, category: "fitness" },
  ],
};

export const demoHabits: Habit[] = [
  { id: "h1", title: "Drink 3L of water", description: null, category: "nutrition", xp_reward: 10, active: true },
  { id: "h2", title: "10-min juggling", description: null, category: "fitness", xp_reward: 10, active: true },
  { id: "h3", title: "Read 15 minutes", description: null, category: "mindset", xp_reward: 10, active: true },
];

export const demoQuests = [
  { id: "q1", title: "Log 5 workouts this week", xp_reward: 120, progress: 3, target: 5, completed: false, week_start: mondayISO() },
  { id: "q2", title: "Complete your daily plan 5 days", xp_reward: 150, progress: 4, target: 5, completed: false, week_start: mondayISO() },
  { id: "q3", title: "Hit your water goal 4 days", xp_reward: 80, progress: 4, target: 4, completed: true, week_start: mondayISO() },
];

export const demoBadges = ["first_flame", "iron_will", "fueled", "grinder", "focused"];

export const demoStats = { workouts: 14, meals: 62, quests: 7 };

export const demoLeaderboard = [
  { id: "g1", display_name: "Marcus K.", avatar_seed: "marcus7", xp: 8420, level: 7, is_ghost: true, real_user_id: null },
  { id: "g2", display_name: "Jordan F.", avatar_seed: "jordan12", xp: 6100, level: 6, is_ghost: true, real_user_id: null },
  { id: "g3", display_name: "Kai R.", avatar_seed: "kai99", xp: 4200, level: 5, is_ghost: true, real_user_id: null },
  { id: "me", display_name: "Armaan", avatar_seed: "armaan", xp: 3820, level: 4, is_ghost: false, real_user_id: "demo-user" },
  { id: "g4", display_name: "Dev S.", avatar_seed: "devs22", xp: 3100, level: 4, is_ghost: true, real_user_id: null },
  { id: "g5", display_name: "Tyler B.", avatar_seed: "tyler8", xp: 2200, level: 4, is_ghost: true, real_user_id: null },
  { id: "g6", display_name: "Noah C.", avatar_seed: "noah33", xp: 1400, level: 3, is_ghost: true, real_user_id: null },
  { id: "g7", display_name: "Ethan M.", avatar_seed: "ethanm", xp: 800, level: 2, is_ghost: true, real_user_id: null },
  { id: "g8", display_name: "Sam L.", avatar_seed: "saml44", xp: 300, level: 1, is_ghost: true, real_user_id: null },
];

export const DEMO_USER_ID = "demo-user";

export const demoWeek = (() => {
  const out: Record<string, { date: string; completed: number; total: number }> = {};
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const fills = [1, 1, 0.5, 1, 0.75, 0, 0];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = todayISO(d);
    out[iso] = { date: iso, completed: Math.round(fills[i] * 6), total: 6 };
  }
  return out;
})();
