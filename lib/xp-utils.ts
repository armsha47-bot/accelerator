/**
 * XP reward table + a couple of small helpers. Kept as plain constants so both
 * client optimistic updates and the server /api/award-xp route agree on values.
 */
export const XP = {
  HABIT: 10,
  MEAL: 5,
  WORKOUT: 25,
  SCAN: 20, // physique / posture / outfit / food photo
  STRETCH: 20,
  BODY_WEIGHT: 5,
  CHECKIN: 10, // mood + sleep
  WATER_GOAL: 10, // 8 glasses
  POMODORO_BLOCK: 60, // full 4-cycle deep-work block
  POMODORO_CYCLE: 15,
  WIN: 15, // wins journal entry
  HYPE: 5, // trigger hype mode
  WEEKLY_REVIEW: 10, // read/dismiss weekly review
  RITUAL: 30, // pre-event ritual
  BREATHING: 15,
  FULL_DAY_BONUS: 50, // all tasks in a day complete
} as const;

// Streak milestone bonuses.
export const STREAK_BONUSES: Record<number, number> = {
  7: 100,
  30: 500,
  100: 2000,
};

/** Streak keeps the day alive → bonus = streak * 2 (per spec). */
export function streakBonus(streak: number): number {
  return streak * 2;
}

/** Time-of-day greeting used across Home / confidence. */
export function greeting(d = new Date()): "morning" | "afternoon" | "evening" {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/** Which plan slot a given hour falls into. */
export function currentSlot(d = new Date()): "morning" | "afternoon" | "evening" {
  return greeting(d);
}

/** Local YYYY-MM-DD (matches Postgres `date` columns without TZ surprises). */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the current week as YYYY-MM-DD (week_start key for quests/reviews). */
export function mondayISO(d = new Date()): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return todayISO(x);
}
