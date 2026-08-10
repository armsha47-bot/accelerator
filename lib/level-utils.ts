/**
 * Level progression. XP thresholds are the *cumulative* XP required to be AT a
 * given level. Levels 1..20; beyond 20 the user stays "Apex".
 *
 * Per-level deltas from the spec (L1→L2 … L19→L20).
 */
// Steep, escalating curve — the top ranks are a serious grind (~8.3M total XP
// to hit Level 20). Each step is roughly 1.5x the last.
const LEVEL_DELTAS = [
  500, 1200, 2500, 4500, 7500, 12000, 19000, 30000, 46000, 70000,
  105000, 155000, 230000, 340000, 500000, 750000, 1100000, 1650000, 2500000,
];

// Cumulative XP required to reach the start of each level (index 0 == level 1).
export const LEVEL_THRESHOLDS: number[] = (() => {
  const out = [0];
  for (const d of LEVEL_DELTAS) out.push(out[out.length - 1] + d);
  return out; // length 10: [0, 500, 1500, 3500, ...]
})();

export const MAX_LEVEL = LEVEL_THRESHOLDS.length; // 10

export const CREST_NAMES = [
  "Recruit",
  "Initiate",
  "Copper",
  "Iron",
  "Jade",
  "Obsidian",
  "Sapphire",
  "Steel",
  "Amethyst",
  "Ruby",
  "Emerald",
  "Onyx",
  "Topaz",
  "Aquamarine",
  "Diamond",
  "Void",
  "Celestial",
  "Inferno",
  "Sovereign",
  "Apex",
];

/** Level for a given total XP (1..MAX_LEVEL). */
export function levelForXp(totalXp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, MAX_LEVEL);
}

export interface LevelProgress {
  level: number;
  crestName: string;
  isMax: boolean;
  /** XP into the current level. */
  currentInLevel: number;
  /** XP needed to span the current level (currentInLevel..neededForLevel). */
  neededForLevel: number;
  /** XP remaining to next level (0 at max). */
  remaining: number;
  /** 0..1 progress through the current level. */
  fraction: number;
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelForXp(totalXp);
  const crestName = CREST_NAMES[level - 1];
  const floor = LEVEL_THRESHOLDS[level - 1];
  const isMax = level >= MAX_LEVEL;
  if (isMax) {
    return {
      level,
      crestName,
      isMax: true,
      currentInLevel: totalXp - floor,
      neededForLevel: 0,
      remaining: 0,
      fraction: 1,
    };
  }
  const ceil = LEVEL_THRESHOLDS[level];
  const neededForLevel = ceil - floor;
  const currentInLevel = totalXp - floor;
  return {
    level,
    crestName,
    isMax: false,
    currentInLevel,
    neededForLevel,
    remaining: ceil - totalXp,
    fraction: Math.max(0, Math.min(1, currentInLevel / neededForLevel)),
  };
}
