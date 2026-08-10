"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";
import type { Category, Habit, Slot } from "@/lib/types";
import { DEMO, demoHabits } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import PageWrapper from "@/components/layout/PageWrapper";

const CATS: Category[] = ["fitness", "academic", "mindset", "nutrition"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const SLOTS: Slot[] = ["morning", "afternoon", "evening"];

interface CustomTask {
  id: string;
  title: string;
  category: Category;
  time_slot: Slot;
  xp_reward: number;
  days_of_week: number[];
}

export default function TasksPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<CustomTask[]>([]);
  const [showTask, setShowTask] = useState(false);
  const [showHabit, setShowHabit] = useState(false);

  const load = useCallback(async () => {
    if (DEMO) {
      setHabits([...demoHabits, ...demoGet<Habit[]>("customHabits", [])]);
      setTasks(demoGet<CustomTask[]>("customTasksList", []));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: h }, { data: t }] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true),
      supabase.from("custom_tasks").select("*").eq("user_id", user.id).eq("active", true),
    ]);
    setHabits((h ?? []) as Habit[]);
    setTasks((t ?? []) as CustomTask[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Manage</h1>

      {/* Custom tasks */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Custom Tasks</h2>
          <button onClick={() => setShowTask(true)} className="text-sm font-medium text-ink">+ Add task</button>
        </div>
        {tasks.length === 0 ? (
          <p className="card-sm text-sm text-muted">No custom tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="card-sm flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs capitalize text-muted">{t.time_slot} · {t.category} · +{t.xp_reward} XP</p>
                </div>
                <button onClick={async () => { if (DEMO) { const next = tasks.filter((x) => x.id !== t.id); demoSet("customTasksList", next); load(); } else { await supabase.from("custom_tasks").update({ active: false }).eq("id", t.id); load(); } }} className="text-muted">✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Habits */}
      <section id="habits">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Habits</h2>
          <button onClick={() => setShowHabit(true)} className="text-sm font-medium text-ink">+ Add habit</button>
        </div>
        {habits.length === 0 ? (
          <p className="card-sm text-sm text-muted">No habits yet.</p>
        ) : (
          <div className="space-y-2">
            {habits.map((h) => (
              <div key={h.id} className="card-sm flex items-center justify-between">
                <div>
                  <p className="font-medium">{h.title}</p>
                  <p className="text-xs capitalize text-muted">{h.category} · +{h.xp_reward} XP</p>
                </div>
                <button onClick={async () => { if (DEMO) { const next = demoGet<Habit[]>("customHabits", []).filter((x) => x.id !== h.id); demoSet("customHabits", next); load(); } else { await supabase.from("habits").update({ active: false }).eq("id", h.id); load(); } }} className="text-muted">✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showTask && <TaskModal supabase={supabase} onClose={() => setShowTask(false)} onSaved={() => { setShowTask(false); load(); }} />}
      {showHabit && <HabitModal supabase={supabase} onClose={() => setShowHabit(false)} onSaved={() => { setShowHabit(false); load(); }} />}
    </PageWrapper>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-t-3xl border border-border bg-surface p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function TaskModal({ supabase, onClose, onSaved }: { supabase: ReturnType<typeof browserClient>; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [xp, setXp] = useState(15);
  const [cat, setCat] = useState<Category>("fitness");
  const [slot, setSlot] = useState<Slot>("morning");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurring, setRecurring] = useState(true);

  async function save() {
    if (!title.trim()) return;
    const row = {
      title: title.trim(),
      why_this_matters: why || null,
      xp_reward: xp,
      category: cat,
      time_slot: slot,
      days_of_week: recurring ? days : [new Date().getDay()],
      active: true,
    };
    if (DEMO) {
      const next = [...demoGet<any[]>("customTasksList", []), { id: `demo-${Date.now()}`, ...row }];
      demoSet("customTasksList", next);
      onSaved();
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("custom_tasks").insert({ user_id: user.id, ...row });
    onSaved();
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="mb-4 text-lg font-bold">New Task</h3>
      <div className="space-y-3">
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" placeholder="Why this matters (optional)" value={why} onChange={(e) => setWhy(e.target.value)} />
        <div className="flex gap-2">
          {SLOTS.map((s) => (
            <button key={s} onClick={() => setSlot(s)} className={`pill flex-1 justify-center capitalize ${slot === s ? "bg-white text-bg" : "bg-elevated text-muted"}`}>{s}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`pill capitalize ${cat === c ? "bg-white text-bg" : "bg-elevated text-muted"}`}>{c}</button>
          ))}
        </div>
        <div>
          <p className="mb-1 text-sm text-muted">XP reward: {xp}</p>
          <input type="range" min={5} max={50} step={5} value={xp} onChange={(e) => setXp(+e.target.value)} className="w-full accent-white" />
        </div>
        <div className="flex justify-between">
          {DAYS.map((d, i) => (
            <button key={i} onClick={() => setDays((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))} className={`grid h-9 w-9 place-items-center rounded-full text-sm ${days.includes(i) ? "bg-white text-bg" : "bg-elevated text-muted"}`}>{d}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="accent-white" />
          Repeat every selected day
        </label>
        <button className="btn-primary w-full" onClick={save}>Save task</button>
      </div>
    </Sheet>
  );
}

function HabitModal({ supabase, onClose, onSaved }: { supabase: ReturnType<typeof browserClient>; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<Category>("fitness");

  async function save() {
    if (!title.trim()) return;
    if (DEMO) {
      const next = [...demoGet<any[]>("customHabits", []), { id: `demo-${Date.now()}`, title: title.trim(), description: null, category: cat, xp_reward: 10, active: true }];
      demoSet("customHabits", next);
      onSaved();
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("habits").insert({ user_id: user.id, title: title.trim(), category: cat, xp_reward: 10 });
    onSaved();
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="mb-4 text-lg font-bold">New Habit</h3>
      <div className="space-y-3">
        <input className="input" placeholder="e.g. 10-min stretch" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`pill capitalize ${cat === c ? "bg-white text-bg" : "bg-elevated text-muted"}`}>{c}</button>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={save}>Save habit</button>
      </div>
    </Sheet>
  );
}
