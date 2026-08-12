"use client";

import { motion } from "framer-motion";
import ParticleBurst from "@/components/shared/ParticleBurst";
import { todayISO } from "@/lib/xp-utils";

/**
 * 7-day completion bubbles (Mon..Sun) — BINARY ONLY. A bubble is either solid
 * green (every task + habit that day complete) or dark. No partial arcs, no
 * intermediate states. Today (not yet complete) shows a white ring. When a
 * bubble newly turns green (`burstDate`), it springs + emits a particle burst.
 */
export interface DayStatus {
  date: string; // YYYY-MM-DD
  completed: number;
  total: number;
  allComplete?: boolean;
}

const LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
// LOCAL date (not UTC) — toISOString would roll over to tomorrow late at night
// in western timezones, making the wrong day light up as "today".
const iso = (d: Date) => todayISO(d);

export default function WeekBubbles({
  statuses,
  onSelect,
  burstDate,
}: {
  statuses: Record<string, DayStatus>;
  onSelect?: (date: string) => void;
  burstDate?: string | null;
}) {
  const today = new Date();
  const todayIso = iso(today);
  const monday = mondayOf(today);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return iso(d);
  });

  return (
    <div className="flex items-center justify-between px-2">
      {days.map((date, i) => {
        const st = statuses[date];
        const isToday = date === todayIso;
        const isFuture = date > todayIso;
        // Binary: complete only when explicitly all-complete (or full count).
        const all = st ? (st.allComplete ?? (st.total > 0 && st.completed >= st.total)) : false;

        const bursting = burstDate === date && all;
        return (
          <button
            key={date}
            onClick={() => onSelect?.(date)}
            disabled={isFuture}
            className="relative flex flex-col items-center"
          >
            <motion.span
              className={[
                "grid h-[34px] w-[34px] place-items-center rounded-full text-xs font-semibold",
                isFuture ? "opacity-30" : "",
                all
                  ? "bg-green text-white"
                  : isToday
                  ? "border-2 border-white bg-transparent text-white"
                  : "bg-elevated text-[#444]",
              ].join(" ")}
              animate={bursting ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={all ? { filter: "drop-shadow(0 0 6px #22C55E)" } : undefined}
            >
              {LABELS[i]}
            </motion.span>
            {bursting && <ParticleBurst />}
          </button>
        );
      })}
    </div>
  );
}
