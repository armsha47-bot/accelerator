"use client";

import { useEffect, useState } from "react";
import { motion, useAnimate } from "framer-motion";
import { todayISO } from "@/lib/xp-utils";

/**
 * Streak counter with a fire "ignition" animation that plays once per new streak
 * day. It compares today's date + streak to the last-played record in
 * localStorage and only fires when the streak has advanced.
 */
const KEY = "accel_streak_anim";

export default function FireStreakCounter({ streak }: { streak: number }) {
  const [scope, animate] = useAnimate();
  const [ignited, setIgnited] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let last: { date?: string; streak?: number } = {};
    try {
      last = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      /* ignore */
    }
    const today = todayISO();
    const isNew = last.date !== today && streak > (last.streak ?? -1);
    if (!isNew) return;
    localStorage.setItem(KEY, JSON.stringify({ date: today, streak }));

    (async () => {
      setIgnited(true);
      // Spark → flame grows → number glows → settle.
      await animate(scope.current, { scale: [1, 1.3, 1] }, { duration: 0.8, times: [0, 0.6, 1] });
      setIgnited(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  return (
    <div
      ref={scope}
      className="pill bg-elevated"
      style={
        ignited
          ? { color: "#F97316", textShadow: "0 0 16px #EF4444, 0 0 32px #F97316" }
          : { color: "#F59E0B" }
      }
    >
      <motion.span
        animate={ignited ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.5 }}
        style={ignited ? { filter: "drop-shadow(0 0 8px #F97316)" } : undefined}
      >
        🔥
      </motion.span>
      <span className="font-semibold">{streak}</span>
    </div>
  );
}
