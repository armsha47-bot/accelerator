/**
 * Server-side badge evaluation. Call after any XP award / stat change.
 * Lightweight: a handful of count queries, compare to thresholds, insert only
 * the newly-earned rows. Returns the badge keys that were just unlocked so the
 * caller can surface a BadgeUnlockToast.
 *
 * SERVER ONLY (uses adminClient).
 */
import { adminClient } from "./supabase-server";
import { qualifyingBadges, type BadgeStats } from "./badges";

async function count(table: string, userId: string, extra?: Record<string, unknown>) {
  const admin = adminClient();
  let q = admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (extra) for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
  const { count } = await q;
  return count ?? 0;
}

export async function checkBadges(userId: string): Promise<string[]> {
  const admin = adminClient();

  const [
    profile,
    mealsLogged,
    workoutsLogged,
    questsCompleted,
    pomodoroSessions,
    coachMessages,
  ] = await Promise.all([
    admin.from("profiles").select("level, streak").eq("id", userId).single(),
    count("food_logs", userId),
    count("workouts", userId),
    count("quests", userId, { completed: true }),
    count("focus_sessions", userId, { completed: true }),
    count("coach_messages", userId, { role: "user" }),
  ]);

  // Category task counts come from habit_completions joined to habit category is
  // heavier; approximate with completed custom_tasks by category via a view-less
  // count on xp_transactions reasons is unreliable, so we count habits+customs.
  const [academicTasks, fitnessTasks] = await Promise.all([
    countTasksByCategory(userId, "academic"),
    countTasksByCategory(userId, "fitness"),
  ]);

  const stats: BadgeStats = {
    streak: profile.data?.streak ?? 0,
    level: profile.data?.level ?? 1,
    mealsLogged,
    workoutsLogged,
    academicTasks,
    fitnessTasks,
    questsCompleted,
    pomodoroSessions,
    coachMessages,
    waterGoalStreak: await waterGoalStreak(userId),
  };

  const qualifying = qualifyingBadges(stats);
  if (qualifying.length === 0) return [];

  const { data: existing } = await admin
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((r) => r.badge_key));
  const fresh = qualifying.filter((k) => !have.has(k));
  if (fresh.length === 0) return [];

  await admin
    .from("user_badges")
    .insert(fresh.map((badge_key) => ({ user_id: userId, badge_key })));
  return fresh;
}

async function countTasksByCategory(userId: string, category: string): Promise<number> {
  const admin = adminClient();
  // Completed habit_completions whose habit is in this category.
  const { data } = await admin
    .from("habit_completions")
    .select("habit_id, habits!inner(category)")
    .eq("user_id", userId)
    .eq("habits.category", category);
  return data?.length ?? 0;
}

async function waterGoalStreak(userId: string): Promise<number> {
  const admin = adminClient();
  const { data } = await admin
    .from("daily_checkins")
    .select("date, water_glasses")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(14);
  let streak = 0;
  for (const row of data ?? []) {
    if ((row.water_glasses ?? 0) >= 8) streak++;
    else break;
  }
  return streak;
}
