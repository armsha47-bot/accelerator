"use client";

import { useEffect, useState } from "react";
import NumberCounter from "@/components/shared/NumberCounter";

/**
 * Single-ring completion donut. ONE white arc (with white glow) over a dark
 * track, representing combined tasks + habits completed today. Animates from
 * 0 → value on mount and on every completion.
 */
export default function DonutRing({
  tasksDone,
  tasksTotal,
  habitsDone,
  habitsTotal,
  onClick,
}: {
  tasksDone: number;
  tasksTotal: number;
  habitsDone: number;
  habitsTotal: number;
  onClick?: () => void;
}) {
  const done = tasksDone + habitsDone;
  const total = tasksTotal + habitsTotal;

  const [t, setT] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setT(1));
    return () => cancelAnimationFrame(id);
  }, [done, total]);

  const size = 180;
  const c = size / 2;
  const r = 78;
  const circ = 2 * Math.PI * r;
  const frac = total ? done / total : 0;

  return (
    <button onClick={onClick} className="relative mx-auto block" aria-label="Today's completion" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#222222" strokeWidth="14" />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac * t)}
          style={{ transition: "stroke-dashoffset 600ms ease-out", filter: "drop-shadow(0 0 10px rgba(255,255,255,0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <NumberCounter value={done} duration={400} className="text-4xl font-bold leading-none glow-text" format={(n) => String(Math.round(n))} />
        <div className="text-sm text-muted">/{total}</div>
        <div className="mt-0.5 text-[10px] text-muted">tasks + habits</div>
      </div>
    </button>
  );
}
