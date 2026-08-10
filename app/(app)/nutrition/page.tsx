"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { todayISO, XP } from "@/lib/xp-utils";
import { compressImage } from "@/lib/image";
import { DEMO, demoProfile } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import { searchFoodDb } from "@/lib/food-db";
import type { FoodLog, MealType, Profile } from "@/lib/types";
import PageWrapper from "@/components/layout/PageWrapper";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function NutritionPage() {
  const supabase = useMemo(() => browserClient(), []);
  const { award } = useXP();
  const date = todayISO();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [water, setWater] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [meal, setMeal] = useState<MealType>("breakfast");
  const [scanItems, setScanItems] = useState<any[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanInput = useRef<HTMLInputElement>(null);
  const [recipes, setRecipes] = useState<any[] | null>(null);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [editGoals, setEditGoals] = useState(false);
  const [gCal, setGCal] = useState(2500);
  const [gP, setGP] = useState(150);
  const [gC, setGC] = useState(300);
  const [gF, setGF] = useState(80);

  const load = useCallback(async () => {
    if (DEMO) {
      const g = demoGet<any>("goals", {});
      setProfile({
        ...demoProfile,
        daily_calorie_goal: g.cal ?? demoProfile.daily_calorie_goal,
        protein_goal: g.protein ?? demoProfile.protein_goal,
        carbs_goal: g.carbs ?? demoProfile.carbs_goal,
        fat_goal: g.fat ?? demoProfile.fat_goal,
      });
      setLogs(demoGet<FoodLog[]>(`foodLogs:${date}`, []));
      setWater(demoGet<number>(`water:${date}`, 0));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: prof }, { data: foodRows }, { data: checkin }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("date", date),
      supabase.from("daily_checkins").select("water_glasses").eq("user_id", user.id).eq("date", date).maybeSingle(),
    ]);
    setProfile(prof as Profile);
    setLogs((foodRows ?? []) as FoodLog[]);
    setWater(checkin?.water_glasses ?? 0);
  }, [supabase, date]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = logs.reduce(
    (a, l) => ({
      cal: a.cal + l.calories * l.quantity,
      p: a.p + l.protein_g * l.quantity,
      c: a.c + l.carbs_g * l.quantity,
      f: a.f + l.fat_g * l.quantity,
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );
  const goal = profile?.daily_calorie_goal ?? 2500;

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      if (DEMO) {
        setResults(searchFoodDb(query));
        return;
      }
      const res = await fetch("/api/food-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      // Fall back to the local DB if Nutritionix returns nothing / isn't set up.
      setResults(data.foods?.length ? data.foods : searchFoodDb(query));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addFood(f: any) {
    if (DEMO) {
      const row = {
        id: `demo-${Date.now()}`,
        date,
        meal_type: meal,
        food_name: f.food_name,
        calories: f.calories,
        protein_g: f.protein_g,
        carbs_g: f.carbs_g,
        fat_g: f.fat_g,
        quantity: 1,
        unit: f.serving_unit ?? "serving",
      } as FoodLog;
      setLogs((l) => {
        const next = [...l, row];
        demoSet(`foodLogs:${date}`, next);
        return next;
      });
      setResults([]);
      setQuery("");
      await award(XP.MEAL, "log meal");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("food_logs")
      .insert({
        user_id: user.id,
        date,
        meal_type: meal,
        food_name: f.food_name,
        calories: f.calories,
        protein_g: f.protein_g,
        carbs_g: f.carbs_g,
        fat_g: f.fat_g,
        quantity: 1,
        unit: f.serving_unit ?? "serving",
      })
      .select()
      .single();
    if (data) setLogs((l) => [...l, data as FoodLog]);
    setResults([]);
    setQuery("");
    await award(XP.MEAL, "log meal");
  }

  async function removeFood(id: string) {
    setLogs((l) => {
      const next = l.filter((x) => x.id !== id);
      if (DEMO) demoSet(`foodLogs:${date}`, next);
      return next;
    });
    if (!DEMO) await supabase.from("food_logs").delete().eq("id", id);
  }

  async function onScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanItems(null);
    try {
      const image = await compressImage(file);
      const res = await fetch("/api/scan-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, kind: "food" }),
      });
      const data = await res.json();
      // Editable copy — user can tweak before logging.
      setScanItems(
        (data.result?.items ?? []).map((it: any) => ({
          food_name: it.food_name ?? "Food",
          calories: Math.round(it.calories ?? 0),
          protein_g: +(it.protein_g ?? 0),
          carbs_g: +(it.carbs_g ?? 0),
          fat_g: +(it.fat_g ?? 0),
        }))
      );
    } catch {
      setScanItems([]);
    } finally {
      setScanning(false);
      if (scanInput.current) scanInput.current.value = "";
    }
  }

  async function logScanned() {
    if (!scanItems?.length) return;
    if (DEMO) {
      const rows = scanItems.map((it, i) => ({
        id: `demo-${Date.now()}-${i}`,
        date,
        meal_type: meal,
        food_name: it.food_name,
        calories: it.calories,
        protein_g: it.protein_g,
        carbs_g: it.carbs_g,
        fat_g: it.fat_g,
        quantity: 1,
        unit: "serving",
      })) as FoodLog[];
      setLogs((l) => {
        const next = [...l, ...rows];
        demoSet(`foodLogs:${date}`, next);
        return next;
      });
      setScanItems(null);
      await award(XP.SCAN, "food scan");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const rows = scanItems.map((it) => ({
      user_id: user.id,
      date,
      meal_type: meal,
      food_name: it.food_name,
      calories: it.calories,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      quantity: 1,
      unit: "serving",
    }));
    const { data } = await supabase.from("food_logs").insert(rows).select();
    if (data) setLogs((l) => [...l, ...(data as FoodLog[])]);
    setScanItems(null);
    await award(XP.SCAN, "food scan");
  }

  async function suggestRecipes() {
    setLoadingRecipes(true);
    setRecipes(null);
    const remaining = {
      cal: Math.max(0, goal - totals.cal),
      protein: Math.max(0, (profile?.protein_goal ?? 150) - totals.p),
      carbs: Math.max(0, (profile?.carbs_goal ?? 300) - totals.c),
      fat: Math.max(0, (profile?.fat_goal ?? 80) - totals.f),
    };
    try {
      if (DEMO) {
        setRecipes([
          { name: "Greek yogurt + berries + granola", calories: 340, protein_g: 24, carbs_g: 42, fat_g: 8, note: "Fast protein to close the gap." },
          { name: "Paneer & veggie stir-fry + rice", calories: 520, protein_g: 28, carbs_g: 60, fat_g: 18, note: "Balanced, vegetarian, filling." },
          { name: "Peanut butter banana toast", calories: 300, protein_g: 12, carbs_g: 38, fat_g: 12, note: "Quick carbs + healthy fat." },
        ]);
        return;
      }
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remaining }),
      });
      const data = await res.json();
      setRecipes(data.recipes ?? []);
    } catch {
      setRecipes([]);
    } finally {
      setLoadingRecipes(false);
    }
  }

  function openGoals() {
    setGCal(goal);
    setGP(profile?.protein_goal ?? 150);
    setGC(profile?.carbs_goal ?? 300);
    setGF(profile?.fat_goal ?? 80);
    setEditGoals(true);
  }

  async function saveGoals() {
    setProfile((p) => (p ? { ...p, daily_calorie_goal: gCal, protein_goal: gP, carbs_goal: gC, fat_goal: gF } : p));
    setEditGoals(false);
    if (DEMO) {
      demoSet("goals", { cal: gCal, protein: gP, carbs: gC, fat: gF });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ daily_calorie_goal: gCal, protein_goal: gP, carbs_goal: gC, fat_goal: gF }).eq("id", user.id);
  }

  async function setWaterGlasses(n: number) {
    const prev = water;
    setWater(n); // optimistic — works in demo too
    if (typeof navigator !== "undefined") navigator.vibrate?.(30);
    if (n >= 8 && prev < 8) await award(XP.WATER_GOAL, "water goal");
    if (DEMO) {
      demoSet(`water:${date}`, n);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("daily_checkins").upsert(
      { user_id: user.id, date, water_glasses: n },
      { onConflict: "user_id,date" }
    );
  }

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Nutrition</h1>

      {/* Summary */}
      <section className="card mb-4">
        {editGoals ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Edit goals</p>
            <div>
              <label className="mb-1 block text-xs text-muted">Daily calories</label>
              <input className="input" type="number" value={gCal} onChange={(e) => setGCal(+e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input className="input text-center" type="number" value={gP} onChange={(e) => setGP(+e.target.value)} />
                <p className="mt-1 text-center text-xs" style={{ color: "#60A5FA" }}>Protein</p>
              </div>
              <div>
                <input className="input text-center" type="number" value={gC} onChange={(e) => setGC(+e.target.value)} />
                <p className="mt-1 text-center text-xs" style={{ color: "#F59E0B" }}>Carbs</p>
              </div>
              <div>
                <input className="input text-center" type="number" value={gF} onChange={(e) => setGF(+e.target.value)} />
                <p className="mt-1 text-center text-xs" style={{ color: "#EF4444" }}>Fat</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={saveGoals}>Save goals</button>
              <button className="btn-ghost" onClick={() => setEditGoals(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{Math.round(totals.cal)}</div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  / {goal} cal
                  <button onClick={openGoals} aria-label="Edit goals" className="text-muted transition-colors hover:text-ink">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </div>
              </div>
              <CalRing consumed={totals.cal} goal={goal} />
            </div>
            <MacroBar label="Protein" value={totals.p} goal={profile?.protein_goal ?? 150} color="#60A5FA" />
            <MacroBar label="Carbs" value={totals.c} goal={profile?.carbs_goal ?? 300} color="#F59E0B" />
            <MacroBar label="Fat" value={totals.f} goal={profile?.fat_goal ?? 80} color="#EF4444" />
          </>
        )}
      </section>

      {/* AI recipe suggestions */}
      <section className="card mb-4">
        <button className="btn-primary w-full" onClick={suggestRecipes} disabled={loadingRecipes}>
          {loadingRecipes ? "Thinking…" : "What should I eat?"}
        </button>
        {recipes && (
          <div className="mt-3 space-y-2">
            {recipes.length === 0 && <p className="text-sm text-muted">Couldn&apos;t generate suggestions right now.</p>}
            {recipes.map((rec, i) => (
              <div key={i} className="rounded-2xl bg-elevated p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{rec.name}</p>
                    <p className="text-xs text-muted">
                      {Math.round(rec.calories)} cal · {Math.round(rec.protein_g)}p {Math.round(rec.carbs_g)}c {Math.round(rec.fat_g)}f
                    </p>
                    {rec.note && <p className="mt-1 text-xs text-muted">{rec.note}</p>}
                  </div>
                  <button
                    className="chip shrink-0"
                    onClick={() => addFood({ food_name: rec.name, calories: rec.calories, protein_g: rec.protein_g, carbs_g: rec.carbs_g, fat_g: rec.fat_g, serving_unit: "meal" })}
                  >
                    Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Water */}
      <section className="card-sm mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">Water</span>
          <span className="text-sm text-muted">{water}/8 glasses</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => {
            const filled = i < water;
            return (
              <motion.button
                key={i}
                onClick={() => setWaterGlasses(i + 1 === water ? i : i + 1)}
                className="h-9 flex-1 rounded-full"
                aria-label={`${i + 1} glasses`}
                whileTap={{ scale: 0.85 }}
                animate={{
                  backgroundColor: filled ? "#60A5FA" : "#2A2A2A",
                  boxShadow: filled ? "0 0 10px rgba(96,165,250,0.7)" : "0 0 0px rgba(96,165,250,0)",
                  scale: filled ? [1.15, 1] : 1,
                }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            );
          })}
        </div>
      </section>

      {/* Search + log */}
      <section className="card mb-4">
        <h3 className="mb-2 font-semibold">Log a meal</h3>
        <div className="mb-2 flex gap-2">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`pill capitalize ${meal === m ? "bg-white text-bg" : "bg-elevated text-muted"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. 2 eggs and toast"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn-primary px-4" onClick={search} disabled={searching}>
            {searching ? "…" : "Find"}
          </button>
        </div>

        {/* Photo scan */}
        <button
          onClick={() => scanInput.current?.click()}
          disabled={scanning}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-elevated py-3 text-sm font-medium"
        >
          {scanning ? "Analyzing photo…" : "📷 Scan a photo of your food"}
        </button>
        <input ref={scanInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onScanFile} />

        {scanItems && (
          <div className="mt-3 rounded-2xl bg-elevated p-3">
            {scanItems.length === 0 ? (
              <p className="text-sm text-muted">Couldn&apos;t read that photo. Try again or search instead.</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-muted">Detected — edit before logging:</p>
                <div className="space-y-2">
                  {scanItems.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded-xl bg-surface px-3 py-2 text-sm capitalize"
                        value={it.food_name}
                        onChange={(e) => setScanItems((s) => s!.map((x, j) => (j === i ? { ...x, food_name: e.target.value } : x)))}
                      />
                      <input
                        type="number"
                        className="w-20 rounded-xl bg-surface px-2 py-2 text-center text-sm"
                        value={it.calories}
                        onChange={(e) => setScanItems((s) => s!.map((x, j) => (j === i ? { ...x, calories: +e.target.value } : x)))}
                      />
                      <span className="text-xs text-muted">cal</span>
                    </div>
                  ))}
                </div>
                <button className="btn-primary mt-3 w-full" onClick={logScanned}>
                  Log {scanItems.length} item{scanItems.length > 1 ? "s" : ""} (+{XP.SCAN} XP)
                </button>
              </>
            )}
          </div>
        )}
        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((f, i) => (
              <button key={i} onClick={() => addFood(f)} className="flex w-full items-center justify-between rounded-2xl bg-elevated p-3 text-left">
                <span className="font-medium capitalize">{f.food_name}</span>
                <span className="text-sm text-muted">{f.calories} cal · +add</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Today's log */}
      <section>
        <h3 className="mb-2 font-semibold">Today&apos;s log</h3>
        {logs.length === 0 ? (
          <p className="card-sm text-sm text-muted">Nothing logged yet.</p>
        ) : (
          MEALS.map((m) => {
            const items = logs.filter((l) => l.meal_type === m);
            if (items.length === 0) return null;
            return (
              <div key={m} className="mb-3">
                <p className="mb-1 text-xs font-semibold uppercase text-muted">{m}</p>
                <div className="space-y-2">
                  {items.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-2xl bg-surface p-3">
                      <div>
                        <p className="font-medium capitalize">{l.food_name}</p>
                        <p className="text-xs text-muted">
                          {Math.round(l.calories * l.quantity)} cal · {Math.round(l.protein_g * l.quantity)}p {Math.round(l.carbs_g * l.quantity)}c {Math.round(l.fat_g * l.quantity)}f
                        </p>
                      </div>
                      <button onClick={() => removeFood(l.id)} className="text-muted">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>
    </PageWrapper>
  );
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="text-muted">{Math.round(value)}g / {goal}g</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (value / goal) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function CalRing({ consumed, goal }: { consumed: number; goal: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, consumed / goal);
  return (
    <svg width="84" height="84" className="rotate-[-90deg]">
      <circle cx="42" cy="42" r={r} fill="none" stroke="#2A2A3A" strokeWidth="8" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="#22C55E" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: "stroke-dashoffset 500ms" }} />
    </svg>
  );
}
