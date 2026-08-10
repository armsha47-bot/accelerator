"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { browserClient } from "@/lib/supabase";
import { DEMO, demoProfile } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import { pushSupported, subscribeToPush, unsubscribeFromPush, currentSubscription } from "@/lib/push-client";
import PageWrapper from "@/components/layout/PageWrapper";

export default function SettingsPage() {
  const supabase = useMemo(() => browserClient(), []);
  const router = useRouter();
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [calorieGoal, setCalorieGoal] = useState(2500);
  const [xpGoal, setXpGoal] = useState(500);
  const [protein, setProtein] = useState(150);
  const [carbs, setCarbs] = useState(300);
  const [fat, setFat] = useState(80);
  const [diet, setDiet] = useState("vegetarian");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (DEMO) {
      const ov = demoGet<{ name?: string; position?: string }>("profileOverrides", {});
      setName(ov.name ?? demoProfile.name ?? "");
      setPosition(ov.position ?? demoProfile.position ?? "");
      setCalorieGoal(demoProfile.daily_calorie_goal);
      setXpGoal(demoProfile.daily_xp_goal);
      setProtein(demoProfile.protein_goal);
      setCarbs(demoProfile.carbs_goal);
      setFat(demoProfile.fat_goal);
      setDiet(demoProfile.diet);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("name, position, daily_calorie_goal, daily_xp_goal, protein_goal, carbs_goal, fat_goal, diet")
      .eq("id", user.id)
      .single();
    if (data) {
      setName(data.name ?? "");
      setPosition(data.position ?? "");
      setCalorieGoal(data.daily_calorie_goal ?? 2500);
      setXpGoal(data.daily_xp_goal ?? 500);
      setProtein(data.protein_goal ?? 150);
      setCarbs(data.carbs_goal ?? 300);
      setFat(data.fat_goal ?? 80);
      setDiet(data.diet ?? "vegetarian");
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    const patch = {
      name: name.trim() || null,
      position: position.trim() || null,
      daily_calorie_goal: calorieGoal,
      daily_xp_goal: xpGoal,
      protein_goal: protein,
      carbs_goal: carbs,
      fat_goal: fat,
      diet,
    };
    if (DEMO) {
      demoSet("profileOverrides", { name: patch.name, position: patch.position });
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await supabase.from("profiles").update(patch).eq("id", user.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>

      <section className="card mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-muted">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Position</label>
            <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Winger / CAM" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-muted">Daily calorie goal</label>
            <input className="input" type="number" value={calorieGoal} onChange={(e) => setCalorieGoal(+e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Daily XP goal</label>
            <input className="input" type="number" value={xpGoal} onChange={(e) => setXpGoal(+e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted">Macro goals (grams)</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input className="input text-center" type="number" value={protein} onChange={(e) => setProtein(+e.target.value)} />
              <p className="mt-1 text-center text-xs" style={{ color: "#60A5FA" }}>Protein</p>
            </div>
            <div>
              <input className="input text-center" type="number" value={carbs} onChange={(e) => setCarbs(+e.target.value)} />
              <p className="mt-1 text-center text-xs" style={{ color: "#F59E0B" }}>Carbs</p>
            </div>
            <div>
              <input className="input text-center" type="number" value={fat} onChange={(e) => setFat(+e.target.value)} />
              <p className="mt-1 text-center text-xs" style={{ color: "#EF4444" }}>Fat</p>
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted">Diet</label>
          <div className="flex gap-2">
            {[
              { key: "vegetarian", label: "Vegetarian" },
              { key: "vegan", label: "Vegan" },
              { key: "omnivore", label: "Meat" },
            ].map((d) => (
              <button
                key={d.key}
                onClick={() => setDiet(d.key)}
                className={`pill flex-1 justify-center ${diet === d.key ? "bg-white text-bg" : "bg-elevated text-muted"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary w-full" onClick={save}>{saved ? "Saved ✓" : "Save"}</button>
      </section>

      <ReminderSettings />

      <section className="card mb-4 space-y-2">
        <h3 className="mb-1 font-semibold">More</h3>
        <Link href="/stats" className="block rounded-2xl bg-elevated px-4 py-3">All-time Stats →</Link>
        <Link href="/goals" className="block rounded-2xl bg-elevated px-4 py-3">Goal Milestones →</Link>
        <Link href="/calendar" className="block rounded-2xl bg-elevated px-4 py-3">Calendar →</Link>
        <a href="/api/export" className="block rounded-2xl bg-elevated px-4 py-3">Export my data (ZIP) →</a>
      </section>

      <button onClick={logout} className="btn-ghost w-full text-macroFat">Log out</button>
    </PageWrapper>
  );
}

function ReminderSettings() {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSupported(pushSupported());
    if (pushSupported()) currentSubscription().then((s) => setOn(!!s));
  }, []);

  async function toggle() {
    setBusy(true);
    setMsg(null);
    try {
      if (on) {
        await unsubscribeFromPush();
        setOn(false);
      } else {
        const res = await subscribeToPush();
        if (res.ok) {
          setOn(true);
        } else {
          setMsg(
            res.reason === "denied"
              ? "Notifications were blocked in your browser settings."
              : res.reason === "unsupported"
              ? "This browser doesn't support push notifications."
              : "Couldn't enable reminders."
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setMsg(null);
    const res = await fetch("/api/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Sent to ${data.sent ?? 0} device(s).` : data.error || "Send failed.");
  }

  return (
    <section className="card mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Reminders</h3>
          <p className="text-xs text-muted">Plan-ready, streak protection, and quest deadlines.</p>
        </div>
        <button
          onClick={toggle}
          disabled={busy || !supported}
          className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-white" : "bg-border"} disabled:opacity-50`}
          aria-label="Toggle reminders"
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full transition-all ${on ? "left-6 bg-bg" : "left-1 bg-white"}`} />
        </button>
      </div>
      {!supported && <p className="text-xs text-muted">Push notifications aren&apos;t supported in this browser. Install the app to your Home Screen first.</p>}
      {on && (
        <button onClick={test} className="btn-ghost w-full py-2 text-sm">Send a test notification</button>
      )}
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </section>
  );
}
