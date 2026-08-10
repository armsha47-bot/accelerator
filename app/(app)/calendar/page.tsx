"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { todayISO } from "@/lib/xp-utils";
import { DEMO, demoWeek } from "@/lib/demo";
import PageWrapper from "@/components/layout/PageWrapper";

interface DayStat {
  total_tasks: number;
  completed_tasks: number;
  xp_earned: number;
}

export default function CalendarPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [stats, setStats] = useState<Record<string, DayStat>>({});

  const load = useCallback(async () => {
    if (DEMO) {
      const s: Record<string, DayStat> = {};
      for (const [date, v] of Object.entries(demoWeek)) s[date] = { total_tasks: v.total, completed_tasks: v.completed, xp_earned: v.completed * 40 };
      setStats(s);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("daily_completion_status").select("date, total_tasks, completed_tasks, xp_earned").eq("user_id", user.id);
    const s: Record<string, DayStat> = {};
    for (const r of data ?? []) s[(r as any).date] = r as DayStat;
    setStats(s);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const first = new Date(month.y, month.m, 1);
  const startPad = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  const color = (iso: string) => {
    const s = stats[iso];
    if (!s || !s.total_tasks) return "#2A2A3A";
    const f = s.completed_tasks / s.total_tasks;
    if (f >= 1) return "#22C55E";
    if (f > 0) return "#F59E0B";
    return "#2A2A3A";
  };

  const fullDays = Object.values(stats).filter((s) => s.total_tasks > 0 && s.completed_tasks >= s.total_tasks).length;
  const avgXp = Object.values(stats).length ? Math.round(Object.values(stats).reduce((a, s) => a + (s.xp_earned ?? 0), 0) / Object.values(stats).length) : 0;

  const monthName = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <PageWrapper>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setMonth((m) => ({ y: m.m === 0 ? m.y - 1 : m.y, m: (m.m + 11) % 12 }))} className="btn-ghost px-4 py-2">‹</button>
        <h1 className="text-xl font-bold">{monthName}</h1>
        <button onClick={() => setMonth((m) => ({ y: m.m === 11 ? m.y + 1 : m.y, m: (m.m + 1) % 12 }))} className="btn-ghost px-4 py-2">›</button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) =>
          iso ? (
            <div key={i} className="flex aspect-square flex-col items-center justify-center rounded-xl text-xs" style={{ background: color(iso), color: color(iso) === "#2A2A3A" ? "#9CA3AF" : "#0A0A0F" }}>
              {parseInt(iso.slice(-2))}
            </div>
          ) : (
            <div key={i} />
          )
        )}
      </div>

      <section className="card mt-5 text-sm text-muted">
        This month: <span className="font-semibold text-ink">{fullDays}</span> days fully completed · Avg XP:{" "}
        <span className="font-semibold text-ink">{avgXp}</span>/day
      </section>
    </PageWrapper>
  );
}
