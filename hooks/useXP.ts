"use client";

import { useCallback, useState } from "react";
import { dispatchCelebrate } from "@/components/shared/CelebrationProvider";

export interface XpFloat {
  id: number;
  amount: number;
}

export interface AwardResult {
  xp: number;
  level: number;
  leveledUp: boolean;
  newBadges: string[];
}

/**
 * Client hook for awarding XP. Fires a floating "+N XP" animation immediately
 * (optimistic) and reconciles with the server response. Returns the floats to
 * render plus level-up / badge signals to celebrate on.
 */
export function useXP() {
  const [floats, setFloats] = useState<XpFloat[]>([]);

  const award = useCallback(async (amount: number, reason: string): Promise<AwardResult | null> => {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, amount }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(50);

    try {
      const res = await fetch("/api/award-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason }),
      });
      if (!res.ok) return null;
      const result = (await res.json()) as AwardResult;
      if (result.leveledUp || result.newBadges?.length) {
        dispatchCelebrate({ leveledUp: result.leveledUp, level: result.level, newBadges: result.newBadges });
      }
      return result;
    } catch {
      return null;
    }
  }, []);

  return { floats, award };
}
