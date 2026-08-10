"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { todayISO, XP } from "@/lib/xp-utils";
import { compressImage } from "@/lib/image";
import { DEMO } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import { recoveryScore, recoveryLabel, recoveryColor } from "@/lib/recovery";
import { LineChart } from "@/components/shared/Charts";
import PageWrapper from "@/components/layout/PageWrapper";

const TRAIN_LINKS = [
  { href: "/stretch", label: "Stretch", emoji: "🤸" },
  { href: "/study", label: "Study", emoji: "🧮" },
  { href: "/sleep", label: "Sleep", emoji: "😴" },
  { href: "/injury", label: "Injury", emoji: "🩹" },
  { href: "/ritual", label: "Ritual", emoji: "🧠" },
  { href: "/focus", label: "Focus", emoji: "⏱️" },
];

interface SetEntry {
  reps: number;
  weight: number;
}
interface Exercise {
  name: string;
  sets: SetEntry[];
}

export default function TrainPage() {
  const supabase = useMemo(() => browserClient(), []);
  const { award } = useXP();

  const [workout, setWorkout] = useState<Exercise[] | null>(null);
  const [exName, setExName] = useState("");
  const [saving, setSaving] = useState(false);

  const volume = (workout ?? []).reduce(
    (v, ex) => v + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0
  );

  function addExercise() {
    if (!exName.trim()) return;
    setWorkout((w) => [...(w ?? []), { name: exName.trim(), sets: [] }]);
    setExName("");
  }
  function addSet(i: number) {
    setWorkout((w) => {
      const copy = [...(w ?? [])];
      const last = copy[i].sets[copy[i].sets.length - 1];
      copy[i] = { ...copy[i], sets: [...copy[i].sets, { reps: last?.reps ?? 8, weight: last?.weight ?? 20 }] };
      return copy;
    });
  }
  function updateSet(i: number, j: number, field: keyof SetEntry, val: number) {
    setWorkout((w) => {
      const copy = [...(w ?? [])];
      const sets = [...copy[i].sets];
      sets[j] = { ...sets[j], [field]: val };
      copy[i] = { ...copy[i], sets };
      return copy;
    });
  }

  async function finish() {
    if (!workout || workout.length === 0) return;
    setSaving(true);

    if (DEMO) {
      const list = demoGet<any[]>("workouts", []);
      demoSet("workouts", [{ id: `demo-${Date.now()}`, name: "Workout", date: todayISO() }, ...list]);
      await award(XP.WORKOUT, "workout");
      setWorkout(null);
      setSaving(false);
      alert("Workout saved! +25 XP");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false); // don't hang the button
      return;
    }
    const { data: w } = await supabase
      .from("workouts")
      .insert({ user_id: user.id, name: "Workout", date: todayISO() })
      .select()
      .single();
    if (w) {
      await supabase.from("workout_exercises").insert(
        workout.map((ex) => ({ workout_id: w.id, exercise_name: ex.name, sets: ex.sets }))
      );
    }
    await award(XP.WORKOUT, "workout");
    setWorkout(null);
    setSaving(false);
    alert("Workout saved! +25 XP");
  }

  // Recovery score — demo uses good sleep + light prior day; real app would read
  // last night's sleep, yesterday's volume, and mood.
  const recovery = recoveryScore(
    DEMO ? { sleepHours: 7.5, yesterdayVolume: 3200, mood: 4 } : { sleepHours: null, yesterdayVolume: null, mood: null }
  );

  return (
    <PageWrapper>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Train</h1>
        <span className="pill" style={{ background: `${recoveryColor(recovery)}22`, color: recoveryColor(recovery) }}>
          Recovery {recovery}%
        </span>
      </div>
      <p className="mb-4 -mt-2 text-xs text-muted">{recoveryLabel(recovery)}</p>

      {/* Quick links */}
      <section className="-mx-4 mb-4 px-4">
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {TRAIN_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="chip">
              <span>{l.emoji}</span>
              {l.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Workout logger */}
      <section className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Workout</h2>
          {workout && <span className="pill bg-elevated text-gold">Vol {Math.round(volume)}</span>}
        </div>

        {!workout ? (
          <button className="btn-primary w-full" onClick={() => setWorkout([])}>
            Start Workout
          </button>
        ) : (
          <>
            {workout.map((ex, i) => (
              <div key={i} className="mb-3 rounded-2xl bg-elevated p-3">
                <p className="mb-2 font-medium">{ex.name}</p>
                {ex.sets.map((set, j) => (
                  <div key={j} className="mb-2 flex items-center gap-2 text-sm">
                    <span className="w-6 text-muted">{j + 1}</span>
                    <input type="number" value={set.reps} onChange={(e) => updateSet(i, j, "reps", +e.target.value)} className="w-16 rounded-xl bg-surface px-2 py-1.5 text-center" />
                    <span className="text-muted">reps ×</span>
                    <input type="number" value={set.weight} onChange={(e) => updateSet(i, j, "weight", +e.target.value)} className="w-16 rounded-xl bg-surface px-2 py-1.5 text-center" />
                    <span className="text-muted">kg</span>
                  </div>
                ))}
                <button onClick={() => addSet(i)} className="text-sm font-medium text-ink">+ Set</button>
              </div>
            ))}
            <div className="mb-3 flex gap-2">
              <input className="input flex-1" placeholder="Exercise name" value={exName} onChange={(e) => setExName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addExercise()} />
              <button className="btn-ghost px-4" onClick={addExercise}>+</button>
            </div>
            <button className="btn-primary w-full" onClick={finish} disabled={saving}>
              {saving ? "Saving…" : "Finish Workout"}
            </button>
          </>
        )}
      </section>

      {/* Scans */}
      <section id="scan" className="mb-4">
        <h2 className="mb-3 font-semibold">Scans</h2>
        <div className="space-y-3">
          <ScanCard kind="physique" title="Physique Scan" emoji="💪" award={award} />
          <ScanCard kind="posture" title="Posture Check" emoji="🧍" award={award} />
          <ScanCard kind="outfit" title="Outfit Rating" emoji="👕" award={award} />
        </div>
      </section>

      {/* Body weight */}
      <BodyWeight supabase={supabase} award={award} />

      {/* Workout history */}
      <WorkoutHistory supabase={supabase} />
    </PageWrapper>
  );
}

function ScanCard({
  kind,
  title,
  emoji,
  award,
}: {
  kind: "physique" | "posture" | "outfit";
  title: string;
  emoji: string;
  award: (n: number, r: string) => Promise<unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; summary: string; tips: string[] } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const image = await compressImage(file);
      const res = await fetch("/api/scan-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, kind }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        await award(XP.SCAN, `scan:${kind}`);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <button className="flex w-full items-center gap-3 text-left" onClick={() => inputRef.current?.click()}>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-elevated text-xl">{emoji}</span>
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted">Tap to take or upload a photo</p>
        </div>
        {loading && <span className="text-sm text-muted">Analyzing…</span>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      {result && (
        <div className="mt-3 rounded-2xl bg-elevated p-4">
          <div className="mb-2 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-lg font-bold text-bg">{result.score}</span>
            <p className="flex-1 text-sm">{result.summary}</p>
          </div>
          <ul className="space-y-1 text-sm text-muted">
            {result.tips?.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function BodyWeight({ supabase, award }: { supabase: ReturnType<typeof browserClient>; award: (n: number, r: string) => Promise<unknown> }) {
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (DEMO) {
      let saved = demoGet<any[]>("bodyWeights", []);
      if (saved.length === 0) {
        // Seed a small history so the trend graph is visible in the demo.
        const base = 132;
        saved = Array.from({ length: 8 }).map((_, k) => {
          const d = new Date(Date.now() - (7 - k) * 86400000);
          return {
            id: `seed-${k}`,
            weight_value: +(base - k * 0.4 + (k % 2 ? 0.3 : -0.2)).toFixed(1),
            unit: "lbs",
            date: d.toISOString().slice(0, 10),
          };
        }).reverse();
        demoSet("bodyWeights", saved);
      }
      setLogs(saved);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("body_weight_logs")
      .select("id, weight_value, unit, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);
    setLogs(data ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function log() {
    const n = parseFloat(val);
    if (!n) return;
    const today = todayISO();
    if (DEMO) {
      // One entry per day (replace today's if present), newest first.
      const next = [{ id: `demo-${today}`, weight_value: n, unit: "lbs", date: today }, ...logs.filter((w) => w.date !== today)];
      setLogs(next);
      demoSet("bodyWeights", next);
      await award(XP.BODY_WEIGHT, "body weight");
      setSaved(true);
      setVal("");
      setTimeout(() => setSaved(false), 2000);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("body_weight_logs").upsert(
      { user_id: user.id, weight_value: n, unit: "lbs", date: today },
      { onConflict: "user_id,date" } as any
    );
    await award(XP.BODY_WEIGHT, "body weight");
    setSaved(true);
    setVal("");
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  async function del(id: string) {
    const next = logs.filter((x) => x.id !== id);
    setLogs(next);
    if (DEMO) demoSet("bodyWeights", next);
    else await supabase.from("body_weight_logs").delete().eq("id", id);
  }

  // Chronological series for the trend graph.
  const series = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = series[series.length - 1]?.weight_value;

  return (
    <section className="card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Body Weight</h2>
        {latest != null && <span className="text-sm text-muted">{latest} lbs</span>}
      </div>
      <div className="flex gap-2">
        <input className="input flex-1" type="number" placeholder="Weight (lbs)" value={val} onChange={(e) => setVal(e.target.value)} />
        <button className="btn-primary px-5" onClick={log}>{saved ? "✓" : "Log"}</button>
      </div>

      {series.length >= 2 && (
        <div className="mt-4">
          <p className="mb-1 text-xs text-muted">Trend</p>
          <LineChart data={series.map((w) => Number(w.weight_value))} color="#F0F0F0" />
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-3 space-y-2">
          {logs.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-2xl bg-elevated px-4 py-2 text-sm">
              <span className="font-medium">{w.weight_value} {w.unit}</span>
              <div className="flex items-center gap-3 text-muted">
                <span className="text-xs">{w.date}</span>
                <button onClick={() => del(w.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WorkoutHistory({ supabase }: { supabase: ReturnType<typeof browserClient> }) {
  const [workouts, setWorkouts] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (DEMO) {
      setWorkouts(demoGet<any[]>("workouts", []));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("workouts")
      .select("id, name, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(10);
    setWorkouts(data ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function del(id: string) {
    const next = workouts.filter((x) => x.id !== id);
    setWorkouts(next);
    if (DEMO) {
      demoSet("workouts", next);
      return;
    }
    // workout_exercises cascade-delete via FK.
    await supabase.from("workouts").delete().eq("id", id);
  }

  if (workouts.length === 0) return null;
  return (
    <section className="card mt-4">
      <h2 className="mb-2 font-semibold">Recent Workouts</h2>
      <div className="space-y-2">
        {workouts.map((w) => (
          <div key={w.id} className="flex items-center justify-between rounded-2xl bg-elevated px-4 py-2 text-sm">
            <span className="font-medium">{w.name ?? "Workout"}</span>
            <div className="flex items-center gap-3 text-muted">
              <span className="text-xs">{w.date}</span>
              <button onClick={() => del(w.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
