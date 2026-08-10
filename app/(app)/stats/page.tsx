"use client";

import { useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { DEMO, demoProfile } from "@/lib/demo";
import PageWrapper from "@/components/layout/PageWrapper";

export default function StatsPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [s, setS] = useState<Record<string, number | string>>({});
  const [since, setSince] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (DEMO) {
        setS({ xp: 3820, workouts: 14, meals: 62, habits: 148, study: 41, focus: 22, breathing: 9, streak: 18 });
        setSince(new Date(demoProfile.created_at).toLocaleDateString());
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prof }, w, m, h, st, f] = await Promise.all([
        supabase.from("profiles").select("xp, longest_streak, created_at").eq("id", user.id).single(),
        supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("habit_completions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("study_sessions").select("duration_minutes").eq("user_id", user.id),
        supabase.from("focus_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
      ]);
      setS({
        xp: prof?.xp ?? 0,
        streak: prof?.longest_streak ?? 0,
        workouts: (w as any).count ?? 0,
        meals: (m as any).count ?? 0,
        habits: (h as any).count ?? 0,
        study: Math.round(((st.data ?? []).reduce((a: number, r: any) => a + (r.duration_minutes ?? 0), 0)) / 60),
        focus: (f as any).count ?? 0,
        breathing: 0,
      });
      setSince(prof?.created_at ? new Date(prof.created_at).toLocaleDateString() : "");
    })();
  }, [supabase]);

  const tiles = [
    { label: "Total XP earned", value: (s.xp ?? 0).toLocaleString?.() ?? s.xp },
    { label: "Workouts logged", value: s.workouts ?? 0 },
    { label: "Meals logged", value: s.meals ?? 0 },
    { label: "Habits completed", value: s.habits ?? 0 },
    { label: "Study hours", value: s.study ?? 0 },
    { label: "Focus sessions", value: s.focus ?? 0 },
    { label: "Breathing sessions", value: s.breathing ?? 0 },
    { label: "Longest streak", value: s.streak ?? 0 },
  ];

  return (
    <PageWrapper>
      <h1 className="mb-1 text-2xl font-bold">All-time Stats</h1>
      {since && <p className="mb-4 text-sm text-muted">Member since {since}</p>}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="card-sm">
            <div className="text-2xl font-bold text-ink">{String(t.value)}</div>
            <div className="text-xs text-muted">{t.label}</div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
