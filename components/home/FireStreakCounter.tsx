"use client";

import { useEffect, useState } from "react";
import { motion, useAnimate } from "framer-motion";
import { todayISO } from "@/lib/xp-utils";

/**
 * Streak counter with a fire "ignition" animation that plays once per day, the
 * moment the day's 3rd task is completed (the threshold that keeps the streak
 * alive). A localStorage record stops it replaying on later visits that day.
 */
const KEY = "accel_streak_anim";
const IGNITE_AT = 3; // tasks completed today that light the fire

export default function FireStreakCounter({ streak, tasksToday = 0 }: { streak: number; tasksToday?: number }) {
  const [scope, animate] = useAnimate();
  const [ignited, setIgnited] = useState(false);
  // Lit once today's task threshold is met (drives the persistent glow).
  const lit = tasksToday >= IGNITE_AT;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tasksToday < IGNITE_AT) return;
    let last: { date?: string } = {};
    try {
      last = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      /* ignore */
    }
    const today = todayISO();
    if (last.date === today) return; // already played the ignition today
    localStorage.setItem(KEY, JSON.stringify({ date: today }));

    (async () => {
      setIgnited(true);
      // Spark → flame grows → number glows → settle.
      await animate(scope.current, { scale: [1, 1.3, 1] }, { duration: 0.8, times: [0, 0.6, 1] });
      setIgnited(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksToday]);

  return (
    <div
      ref={scope}
      className="pill bg-elevated"
      style={
        ignited
          ? { color: "#F97316", textShadow: "0 0 16px #EF4444, 0 0 32px #F97316" }
          : lit
          ? { color: "#F97316", textShadow: "0 0 10px #F97316" }
          : { color: "#6B6B6B" }
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
