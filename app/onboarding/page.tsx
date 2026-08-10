"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase";
import InfinityMark from "@/components/shared/InfinityMark";

const GOALS = [
  { key: "Soccer/Fitness", emoji: "⚽" },
  { key: "Academic", emoji: "📚" },
  { key: "Confidence", emoji: "🔥" },
  { key: "Nutrition", emoji: "🥗" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => browserClient(), []);
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [name, setName] = useState("Armaan");
  const [age, setAge] = useState("15");
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    await supabase
      .from("profiles")
      .update({
        name,
        age: parseInt(age) || null,
        goals,
        position: "Winger / CAM",
        onboarded: true,
      })
      .eq("id", user.id);
    // Add this user to the leaderboard.
    await supabase.from("leaderboard_users").insert({
      display_name: name,
      avatar_seed: user.id.slice(0, 8),
      xp: 0,
      level: 1,
      is_ghost: false,
      real_user_id: user.id,
    });
    router.push("/");
    router.refresh();
  }

  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      {step === 0 && (
        <div className="text-center">
          <div className="mx-auto mb-5 w-fit">
            <InfinityMark size={80} />
          </div>
          <h1 className="text-3xl font-bold">Welcome to Accelerator</h1>
          <p className="mt-3 text-muted">
            Your daily plan, training, nutrition, focus, and an AI coach — built to make you better every day.
          </p>
          <button className="btn-primary mt-8 w-full" onClick={() => setStep(1)}>
            Get started
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1 className="mb-1 text-2xl font-bold">What are your goals?</h1>
          <p className="mb-6 text-muted">Pick everything you want to work on.</p>
          <div className="grid grid-cols-2 gap-3">
            {GOALS.map((g) => {
              const on = goals.includes(g.key);
              return (
                <button
                  key={g.key}
                  onClick={() => setGoals((s) => (on ? s.filter((x) => x !== g.key) : [...s, g.key]))}
                  className={`card-sm flex flex-col items-center gap-2 py-6 transition-all ${
                    on ? "border-white ring-2 ring-white" : ""
                  }`}
                >
                  <span className="text-3xl">{g.emoji}</span>
                  <span className="font-medium">{g.key}</span>
                </button>
              );
            })}
          </div>
          <button className="btn-primary mt-8 w-full disabled:opacity-50" disabled={goals.length === 0} onClick={() => setStep(2)}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="mb-1 text-2xl font-bold">Tell us about you</h1>
          <p className="mb-6 text-muted">This personalizes your plan and coaching.</p>
          <div className="space-y-4">
            <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <button className="btn-primary mt-8 w-full" disabled={saving} onClick={finish}>
            {saving ? "Setting up…" : "Start"}
          </button>
        </div>
      )}
    </main>
  );
}
