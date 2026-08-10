"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { DEMO } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import PageWrapper from "@/components/layout/PageWrapper";

interface Goal {
  id: string;
  title: string;
  target_date: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  completed: boolean;
}

const SEEDS = [
  { title: "Make varsity soccer", target_value: null, current_value: null },
  { title: "AIME qualify on AMC 10", target_value: 103, current_value: 84, unit: "score" },
  { title: "Reach Level 5", target_value: 5, current_value: 4, unit: "level" },
  { title: "Log 100 workouts", target_value: 100, current_value: 14, unit: "workouts" },
];

export default function GoalsPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    if (DEMO) {
      let saved = demoGet<Goal[]>("goalsList", []);
      if (saved.length === 0) {
        saved = SEEDS.map((s, i) => ({ id: `seed-${i}`, target_date: null, unit: null, completed: false, ...s } as Goal));
        demoSet("goalsList", saved);
      }
      setGoals(saved);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    let { data } = await supabase.from("goal_milestones").select("*").eq("user_id", user.id).order("completed");
    if ((data ?? []).length === 0) {
      await supabase.from("goal_milestones").insert(SEEDS.map((s) => ({ user_id: user.id, ...s })));
      ({ data } = await supabase.from("goal_milestones").select("*").eq("user_id", user.id));
    }
    setGoals((data ?? []) as Goal[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!title.trim()) return;
    if (DEMO) {
      const next = [...goals, { id: `demo-${Date.now()}`, title: title.trim(), target_date: null, current_value: null, target_value: null, unit: null, completed: false } as Goal];
      setGoals(next);
      demoSet("goalsList", next);
      setTitle("");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("goal_milestones").insert({ user_id: user.id, title: title.trim() });
    setTitle("");
    load();
  }

  async function complete(g: Goal) {
    if (DEMO) {
      const next = goals.map((x) => (x.id === g.id ? { ...x, completed: true } : x));
      setGoals(next);
      demoSet("goalsList", next);
      return;
    }
    await supabase.from("goal_milestones").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", g.id);
    load();
  }

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">My Goals</h1>

      <div className="mb-5 space-y-3">
        {goals.map((g) => {
          const frac = g.target_value && g.current_value != null ? Math.min(1, g.current_value / g.target_value) : null;
          return (
            <div key={g.id} className={`card ${g.completed ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{g.title}</p>
                  {g.target_date && <p className="text-xs text-muted">by {g.target_date}</p>}
                </div>
                {!g.completed && <button onClick={() => complete(g)} className="pill bg-green/20 text-green">Done</button>}
              </div>
              {frac != null && (
                <>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-white" style={{ width: `${frac * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{g.current_value} / {g.target_value} {g.unit}</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      <section className="card">
        <h3 className="mb-2 font-semibold">Add a goal</h3>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="btn-primary px-5" onClick={add}>Add</button>
        </div>
      </section>
    </PageWrapper>
  );
}
