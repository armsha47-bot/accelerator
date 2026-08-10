/**
 * Badge catalog + threshold checker. Shared shape used by the Profile grid and
 * the server-side checker in badge-checker.ts.
 */
export interface BadgeDef {
  key: string;
  label: string;
  emoji: string;
  hint: string;
}

export const BADGES: BadgeDef[] = [
  { key: "first_flame", label: "First Flame", emoji: "🔥", hint: "First daily streak" },
  { key: "iron_will", label: "Iron Will", emoji: "💪", hint: "7-day streak" },
  { key: "charged", label: "Charged", emoji: "⚡", hint: "30-day streak" },
  { key: "century", label: "Century", emoji: "🌟", hint: "100-day streak" },
  { key: "fueled", label: "Fueled", emoji: "🍽️", hint: "Log 50 meals" },
  { key: "grinder", label: "Grinder", emoji: "🏋️", hint: "Log 10 workouts" },
  { key: "scholar", label: "Scholar", emoji: "📚", hint: "20 academic tasks" },
  { key: "pitch_ready", label: "Pitch Ready", emoji: "⚽", hint: "20 soccer/fitness tasks" },
  { key: "quest_master", label: "Quest Master", emoji: "🏆", hint: "10 weekly quests" },
  { key: "level_5", label: "Level 5", emoji: "💎", hint: "Reach level 5" },
  { key: "elite", label: "Elite", emoji: "👑", hint: "Reach level 10" },
  { key: "focused", label: "Focused", emoji: "🧠", hint: "5 Pomodoro sessions" },
  { key: "coachable", label: "Coachable", emoji: "💬", hint: "20 coach messages" },
  { key: "hydrated", label: "Hydrated", emoji: "🌊", hint: "Water goal 7 days running" },
];

export const BADGE_BY_KEY = Object.fromEntries(BADGES.map((b) => [b.key, b]));

/** Counters the checker compares against thresholds. */
export interface BadgeStats {
  streak: number;
  level: number;
  mealsLogged: number;
  workoutsLogged: number;
  academicTasks: number;
  fitnessTasks: number;
  questsCompleted: number;
  pomodoroSessions: number;
  coachMessages: number;
  waterGoalStreak: number;
}

/** Return the badge keys that `stats` qualifies for (earned + not). */
export function qualifyingBadges(stats: BadgeStats): string[] {
  const earned: string[] = [];
  const add = (cond: boolean, key: string) => cond && earned.push(key);
  add(stats.streak >= 1, "first_flame");
  add(stats.streak >= 7, "iron_will");
  add(stats.streak >= 30, "charged");
  add(stats.streak >= 100, "century");
  add(stats.mealsLogged >= 50, "fueled");
  add(stats.workoutsLogged >= 10, "grinder");
  add(stats.academicTasks >= 20, "scholar");
  add(stats.fitnessTasks >= 20, "pitch_ready");
  add(stats.questsCompleted >= 10, "quest_master");
  add(stats.level >= 5, "level_5");
  add(stats.level >= 10, "elite");
  add(stats.pomodoroSessions >= 5, "focused");
  add(stats.coachMessages >= 20, "coachable");
  add(stats.waterGoalStreak >= 7, "hydrated");
  return earned;
}
