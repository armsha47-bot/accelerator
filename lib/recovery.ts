/**
 * Recovery score (0-100): 50% last night's sleep, 30% yesterday's training
 * volume (inverse — more volume → more fatigue), 20% yesterday's mood.
 */
export interface RecoveryInputs {
  sleepHours: number | null; // last night
  yesterdayVolume: number | null; // total kg*reps
  mood: number | null; // 1-5
}

export function recoveryScore({ sleepHours, yesterdayVolume, mood }: RecoveryInputs): number {
  // Sleep: 8h+ = full, 4h = 0.
  const sleep = sleepHours == null ? 0.7 : clamp((sleepHours - 4) / 4);
  // Volume: 0 = fresh (1.0), heavy (>=8000) = 0. Rest days score high.
  const vol = yesterdayVolume == null ? 0.8 : clamp(1 - yesterdayVolume / 8000);
  // Mood: 1..5 → 0..1.
  const m = mood == null ? 0.7 : clamp((mood - 1) / 4);
  const score = sleep * 0.5 + vol * 0.3 + m * 0.2;
  return Math.round(score * 100);
}

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function recoveryLabel(score: number): string {
  if (score >= 80) return "Full send — push hard today";
  if (score >= 60) return "Good to go — normal intensity";
  if (score >= 40) return "Take it easier — moderate session";
  return "Recovery day — light movement only";
}

export function recoveryColor(score: number): string {
  if (score >= 80) return "#22C55E"; // green — full send
  if (score >= 60) return "#F0F0F0"; // white — good to go
  if (score >= 40) return "#F59E0B"; // amber — take it easier
  return "#EF4444"; // red — recovery day
}
