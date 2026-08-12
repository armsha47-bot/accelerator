"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { todayISO, XP } from "@/lib/xp-utils";
import { compressImage } from "@/lib/image";
import { DEMO, demoProfile } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import { searchFoodDbHits } from "@/lib/food-db";
import type { CustomFood, CustomIngredient, FoodHit, FoodLog, FoodPortion, MealType, Profile } from "@/lib/types";

// A blank ingredient row for the custom-food builder.
const blankIngredient = (): CustomIngredient => ({ name: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

// Convert a saved custom food into a portion-aware FoodHit (base = 1 serving).
function customToHit(c: CustomFood): FoodHit {
  const u = c.serving_label || "serving";
  return {
    food_name: c.name,
    base_unit: u,
    calories: c.calories,
    protein_g: c.protein_g,
    carbs_g: c.carbs_g,
    fat_g: c.fat_g,
    portions: [
      { label: `1 ${u}`, quantity: 1 },
      { label: `½ ${u}`, quantity: 0.5 },
      { label: `2 ${u}`, quantity: 2 },
      { label: `3 ${u}`, quantity: 3 },
    ],
    source: "custom",
  };
}
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
  const [results, setResults] = useState<FoodHit[]>([]);
  const [searching, setSearching] = useState(false);
  // Portion picker state: which hit is being configured, chosen portion, count.
  const [picking, setPicking] = useState<FoodHit | null>(null);
  const [portionIdx, setPortionIdx] = useState(0);
  const [count, setCount] = useState(1);
  // Custom / homemade foods.
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [building, setBuilding] = useState(false);
  const [bName, setBName] = useState("");
  const [bServings, setBServings] = useState(1);
  const [bIngredients, setBIngredients] = useState<CustomIngredient[]>([blankIngredient()]);
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
      setCustomFoods(demoGet<CustomFood[]>("customFoods", []));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: prof }, { data: foodRows }, { data: checkin }, { data: customRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("date", date),
      supabase.from("daily_checkins").select("water_glasses").eq("user_id", user.id).eq("date", date).maybeSingle(),
      supabase.from("custom_foods").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(prof as Profile);
    setLogs((foodRows ?? []) as FoodLog[]);
    setWater(checkin?.water_glasses ?? 0);
    setCustomFoods((customRows ?? []) as CustomFood[]);
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

  // Your saved custom foods that match the query — always shown first.
  function matchingCustom(): FoodHit[] {
    const q = query.trim().toLowerCase();
    return customFoods.filter((c) => c.name.toLowerCase().includes(q)).map(customToHit);
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setPicking(null);
    const mine = matchingCustom();
    try {
      if (DEMO) {
        setResults([...mine, ...searchFoodDbHits(query)]);
        return;
      }
      const res = await fetch("/api/food-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults([...mine, ...(data.foods?.length ? data.foods : searchFoodDbHits(query))]);
    } catch {
      setResults([...mine, ...searchFoodDbHits(query)]);
    } finally {
      setSearching(false);
    }
  }

  // Open the portion picker for a search hit.
  function pickFood(h: FoodHit) {
    setPicking(h);
    setPortionIdx(0);
    setCount(1);
  }

  // Log the currently-picked food at the chosen portion × count.
  async function confirmAdd() {
    if (!picking) return;
    const p: FoodPortion = picking.portions[portionIdx] ?? { label: picking.base_unit, quantity: 1 };
    const qty = +(p.quantity * count).toFixed(4);
    const unit = count === 1 ? p.label : `${p.label} ×${count}`;
    const base = {
      food_name: picking.food_name,
      calories: picking.calories,
      protein_g: picking.protein_g,
      carbs_g: picking.carbs_g,
      fat_g: picking.fat_g,
    };
    setPicking(null);
    setResults([]);
    setQuery("");

    if (DEMO) {
      const row = { id: `demo-${Date.now()}`, date, meal_type: meal, ...base, quantity: qty, unit } as FoodLog;
      setLogs((l) => {
        const next = [...l, row];
        demoSet(`foodLogs:${date}`, next);
        return next;
      });
      await award(XP.MEAL, "log meal");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("food_logs")
      .insert({ user_id: user.id, date, meal_type: meal, ...base, quantity: qty, unit })
      .select()
      .single();
    if (data) setLogs((l) => [...l, data as FoodLog]);
    await award(XP.MEAL, "log meal");
  }

  // Log an AI recipe suggestion directly (already a full meal).
  async function logRecipe(rec: any) {
    const base = {
      food_name: rec.name,
      calories: Math.round(rec.calories),
      protein_g: rec.protein_g,
      carbs_g: rec.carbs_g,
      fat_g: rec.fat_g,
    };
    if (DEMO) {
      const row = { id: `demo-${Date.now()}`, date, meal_type: meal, ...base, quantity: 1, unit: "meal" } as FoodLog;
      setLogs((l) => {
        const next = [...l, row];
        demoSet(`foodLogs:${date}`, next);
        return next;
      });
      await award(XP.MEAL, "log meal");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("food_logs")
      .insert({ user_id: user.id, date, meal_type: meal, ...base, quantity: 1, unit: "meal" })
      .select()
      .single();
    if (data) setLogs((l) => [...l, data as FoodLog]);
    await award(XP.MEAL, "log meal");
  }

  // Totals summed from the builder's ingredients (for the whole recipe).
  const bTotals = bIngredients.reduce(
    (a, i) => ({ cal: a.cal + (+i.calories || 0), p: a.p + (+i.protein_g || 0), c: a.c + (+i.carbs_g || 0), f: a.f + (+i.fat_g || 0) }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );
  const servings = Math.max(1, bServings);

  function resetBuilder() {
    setBName("");
    setBServings(1);
    setBIngredients([blankIngredient()]);
    setBuilding(false);
  }

  async function saveCustomFood() {
    if (!bName.trim()) return;
    const per = {
      name: bName.trim(),
      serving_label: "serving",
      calories: Math.round(bTotals.cal / servings),
      protein_g: +(bTotals.p / servings).toFixed(1),
      carbs_g: +(bTotals.c / servings).toFixed(1),
      fat_g: +(bTotals.f / servings).toFixed(1),
      ingredients: bIngredients.filter((i) => i.name.trim()),
    };
    if (DEMO) {
      const row = { id: `demo-${Date.now()}`, ...per } as CustomFood;
      setCustomFoods((c) => {
        const next = [row, ...c];
        demoSet("customFoods", next);
        return next;
      });
      resetBuilder();
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("custom_foods").insert({ user_id: user.id, ...per }).select().single();
    if (data) setCustomFoods((c) => [data as CustomFood, ...c]);
    resetBuilder();
  }

  async function deleteCustomFood(id: string) {
    setCustomFoods((c) => {
      const next = c.filter((x) => x.id !== id);
      if (DEMO) demoSet("customFoods", next);
      return next;
    });
    if (!DEMO) await supabase.from("custom_foods").delete().eq("id", id);
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
            <MacroBar label="Protein" value={totals.p} goal={profile?.protein_goal ?? 150} color="#FFFFFF" />
            <MacroBar label="Carbs" value={totals.c} goal={profile?.carbs_goal ?? 300} color="#FFFFFF" />
            <MacroBar label="Fat" value={totals.f} goal={profile?.fat_goal ?? 80} color="#FFFFFF" />
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
                  <button className="chip shrink-0" onClick={() => logRecipe(rec)}>
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
        <input ref={scanInput} type="file" accept="image/*" className="hidden" onChange={onScanFile} />

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
                        className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-2 text-sm capitalize"
                        value={it.food_name}
                        onChange={(e) => setScanItems((s) => s!.map((x, j) => (j === i ? { ...x, food_name: e.target.value } : x)))}
                      />
                      <input
                        type="number"
                        className="w-16 shrink-0 rounded-xl bg-surface px-2 py-2 text-center text-sm"
                        value={it.calories}
                        onChange={(e) => setScanItems((s) => s!.map((x, j) => (j === i ? { ...x, calories: +e.target.value } : x)))}
                      />
                      <span className="shrink-0 text-xs text-muted">cal</span>
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
        {/* Portion picker for the selected food */}
        {picking && (
          <PortionPicker
            hit={picking}
            portionIdx={portionIdx}
            count={count}
            meal={meal}
            onPortion={setPortionIdx}
            onCount={setCount}
            onCancel={() => setPicking(null)}
            onConfirm={confirmAdd}
          />
        )}

        {!picking && results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((f, i) => (
              <button key={i} onClick={() => pickFood(f)} className="flex w-full items-center justify-between gap-2 rounded-2xl bg-elevated p-3 text-left">
                <span className="min-w-0">
                  <span className="block truncate font-medium capitalize">{f.food_name}</span>
                  {f.brand && <span className="block truncate text-xs text-muted">{f.brand}</span>}
                </span>
                <span className="shrink-0 text-sm text-muted">{f.calories} cal / {f.base_unit}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* My foods (custom / homemade) */}
      <section className="card mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">My foods</h3>
          {!building && (
            <button className="chip" onClick={() => setBuilding(true)}>+ Create</button>
          )}
        </div>

        {building ? (
          <div className="space-y-3">
            <input className="input" placeholder="Food name (e.g. Mom's pasta)" value={bName} onChange={(e) => setBName(e.target.value)} />

            <div>
              <p className="mb-1 text-xs text-muted">Ingredients</p>
              <div className="space-y-2">
                {bIngredients.map((ing, i) => (
                  <div key={i} className="rounded-2xl bg-elevated p-2">
                    <div className="mb-1 flex items-center gap-2">
                      <input
                        className="flex-1 rounded-xl bg-surface px-3 py-2 text-sm"
                        placeholder="Ingredient"
                        value={ing.name}
                        onChange={(e) => setBIngredients((s) => s.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      />
                      {bIngredients.length > 1 && (
                        <button className="text-muted" onClick={() => setBIngredients((s) => s.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["calories", "protein_g", "carbs_g", "fat_g"] as const).map((k) => (
                        <div key={k}>
                          <input
                            type="number"
                            className="w-full rounded-xl bg-surface px-2 py-1.5 text-center text-sm"
                            value={(ing as any)[k] || ""}
                            onChange={(e) => setBIngredients((s) => s.map((x, j) => (j === i ? { ...x, [k]: +e.target.value } : x)))}
                          />
                          <p className="mt-0.5 text-center text-[10px] text-muted">{k === "calories" ? "cal" : k[0] + "g"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-2 text-sm text-muted" onClick={() => setBIngredients((s) => [...s, blankIngredient()])}>+ Add ingredient</button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Servings this makes</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setBServings(Math.max(1, bServings - 1))} className="h-8 w-8 rounded-full bg-elevated text-lg leading-none">−</button>
                <span className="w-6 text-center font-semibold">{servings}</span>
                <button onClick={() => setBServings(bServings + 1)} className="h-8 w-8 rounded-full bg-elevated text-lg leading-none">+</button>
              </div>
            </div>

            <div className="rounded-xl bg-elevated p-3 text-center text-sm">
              <span className="text-muted">Per serving: </span>
              <span className="font-semibold">{Math.round(bTotals.cal / servings)} cal</span>
              <span className="text-muted"> · {Math.round(bTotals.p / servings)}p {Math.round(bTotals.c / servings)}c {Math.round(bTotals.f / servings)}f</span>
            </div>

            <div className="flex gap-2">
              <button className="btn-primary flex-1 disabled:opacity-50" disabled={!bName.trim()} onClick={saveCustomFood}>Save food</button>
              <button className="btn-ghost" onClick={resetBuilder}>Cancel</button>
            </div>
          </div>
        ) : customFoods.length === 0 ? (
          <p className="text-sm text-muted">Build homemade foods from their ingredients — they&apos;ll show up here and in search.</p>
        ) : (
          <div className="space-y-2">
            {customFoods.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl bg-elevated p-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => pickFood(customToHit(c))}>
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="text-xs text-muted">{Math.round(c.calories)} cal · {Math.round(c.protein_g)}p {Math.round(c.carbs_g)}c {Math.round(c.fat_g)}f / {c.serving_label}</span>
                </button>
                <button onClick={() => deleteCustomFood(c.id)} className="ml-2 shrink-0 text-muted" aria-label="Delete">✕</button>
              </div>
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

function PortionPicker({
  hit,
  portionIdx,
  count,
  meal,
  onPortion,
  onCount,
  onCancel,
  onConfirm,
}: {
  hit: FoodHit;
  portionIdx: number;
  count: number;
  meal: MealType;
  onPortion: (i: number) => void;
  onCount: (n: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const p = hit.portions[portionIdx] ?? { label: hit.base_unit, quantity: 1 };
  const mult = p.quantity * count;
  const round = (n: number) => Math.round(n * 10) / 10;
  return (
    <div className="mt-3 rounded-2xl border border-border bg-elevated p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold capitalize">{hit.food_name}</p>
          {hit.brand && <p className="truncate text-xs text-muted">{hit.brand}</p>}
        </div>
        <button onClick={onCancel} className="shrink-0 text-muted" aria-label="Cancel">✕</button>
      </div>

      <p className="mb-1 text-xs text-muted">Portion</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {hit.portions.map((po, i) => (
          <button
            key={i}
            onClick={() => onPortion(i)}
            className={`pill ${i === portionIdx ? "bg-white text-bg" : "bg-surface text-muted"}`}
          >
            {po.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted">Quantity</span>
        <div className="flex items-center gap-3">
          <button onClick={() => onCount(Math.max(0.5, +(count - 0.5).toFixed(2)))} className="h-8 w-8 rounded-full bg-surface text-lg leading-none">−</button>
          <span className="w-8 text-center font-semibold">{count}</span>
          <button onClick={() => onCount(+(count + 0.5).toFixed(2))} className="h-8 w-8 rounded-full bg-surface text-lg leading-none">+</button>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-surface p-3 text-center">
        <div className="text-2xl font-bold">{Math.round(hit.calories * mult)} cal</div>
        <div className="text-xs text-muted">
          {round(hit.protein_g * mult)}p · {round(hit.carbs_g * mult)}c · {round(hit.fat_g * mult)}f
        </div>
      </div>

      <button className="btn-primary w-full capitalize" onClick={onConfirm}>
        Add to {meal} (+{XP.MEAL} XP)
      </button>
    </div>
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
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (value / goal) * 100)}%`,
            background: color,
            boxShadow: color === "#FFFFFF" ? "0 0 8px rgba(255,255,255,0.7)" : undefined,
          }}
        />
      </div>
    </div>
  );
}

function CalRing({ consumed, goal }: { consumed: number; goal: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, consumed / goal);
  return (
    <svg width="84" height="84" className="rotate-[-90deg]" style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.7))" }}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="#2A2A2A" strokeWidth="8" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: "stroke-dashoffset 500ms" }} />
    </svg>
  );
}
