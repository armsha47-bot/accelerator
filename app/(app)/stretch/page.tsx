"use client";

import { useEffect, useRef, useState } from "react";
import { useXP } from "@/hooks/useXP";
import { XP } from "@/lib/xp-utils";
import { DEMO } from "@/lib/demo";
import PageWrapper from "@/components/layout/PageWrapper";

interface Stretch {
  name: string;
  duration_seconds: number;
  instructions: string;
  target_muscle?: string;
}

// Used in demo (and as a fallback) — a targeted lower-body routine.
const DEMO_AI_STRETCH: Stretch[] = [
  { name: "Standing quad stretch", duration_seconds: 30, instructions: "Heel to glute, stand tall, hips forward.", target_muscle: "Quads" },
  { name: "Hamstring reach", duration_seconds: 30, instructions: "Hinge at the hips, soft knees, reach for toes.", target_muscle: "Hamstrings" },
  { name: "Hip flexor lunge", duration_seconds: 30, instructions: "Tuck the pelvis, sink into the front hip.", target_muscle: "Hip flexors" },
  { name: "Pigeon pose", duration_seconds: 30, instructions: "Front shin across, sink hips, breathe.", target_muscle: "Glutes" },
  { name: "Calf stretch", duration_seconds: 30, instructions: "Back heel down against a wall, straight leg.", target_muscle: "Calves" },
  { name: "Adductor (groin) stretch", duration_seconds: 30, instructions: "Wide stance, shift weight to one side.", target_muscle: "Groin" },
];

const ROUTINES: Record<string, { title: string; emoji: string; steps: Stretch[] }> = {
  warmup: {
    title: "Pre-Soccer Dynamic Warm-Up",
    emoji: "⚽",
    steps: [
      { name: "Leg swings", duration_seconds: 30, instructions: "Front-to-back, both legs. Loosen the hips." },
      { name: "Hip circles", duration_seconds: 30, instructions: "Big circles each direction." },
      { name: "High knees", duration_seconds: 30, instructions: "Drive knees up, quick feet." },
      { name: "Lateral shuffles", duration_seconds: 30, instructions: "Stay low, push off the outside foot." },
      { name: "Ankle rolls", duration_seconds: 20, instructions: "Both directions, each ankle." },
      { name: "Dynamic quad stretch", duration_seconds: 30, instructions: "Heel to glute, walking." },
      { name: "Calf raises", duration_seconds: 30, instructions: "Slow up, slow down." },
      { name: "Arm circles", duration_seconds: 20, instructions: "Forward and back." },
    ],
  },
  recovery: {
    title: "Post-Workout Recovery",
    emoji: "🧘",
    steps: [
      { name: "Quad stretch", duration_seconds: 30, instructions: "Hold heel to glute, stand tall." },
      { name: "Hamstring stretch", duration_seconds: 30, instructions: "Hinge forward, soft knee." },
      { name: "Hip flexor lunge", duration_seconds: 30, instructions: "Tuck hips, feel the front hip." },
      { name: "Pigeon pose", duration_seconds: 30, instructions: "Front shin across, sink hips." },
      { name: "Calf stretch", duration_seconds: 30, instructions: "Back heel down against a wall." },
      { name: "Chest opener", duration_seconds: 30, instructions: "Hands behind, lift and open." },
      { name: "Shoulder cross-body", duration_seconds: 30, instructions: "Pull arm across, both sides." },
      { name: "Child's pose", duration_seconds: 30, instructions: "Sit back, arms long, breathe." },
    ],
  },
  morning: {
    title: "Morning Flexibility",
    emoji: "🌅",
    steps: [
      { name: "Neck rolls", duration_seconds: 20, instructions: "Slow half-circles." },
      { name: "Spinal twist", duration_seconds: 30, instructions: "Seated, rotate each way." },
      { name: "Seated forward fold", duration_seconds: 30, instructions: "Reach for toes, relax back." },
      { name: "Butterfly stretch", duration_seconds: 30, instructions: "Soles together, knees down." },
      { name: "World's greatest stretch", duration_seconds: 40, instructions: "Lunge, rotate, reach up." },
      { name: "Cat-cow", duration_seconds: 30, instructions: "Flow with the breath." },
    ],
  },
};

export default function StretchPage() {
  const { award } = useXP();
  const [active, setActive] = useState<string | null>(null);
  const [aiSteps, setAiSteps] = useState<Stretch[] | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  async function startAi() {
    setLoadingAi(true);
    try {
      if (DEMO) {
        setAiSteps(DEMO_AI_STRETCH);
        setActive("ai");
        return;
      }
      const res = await fetch("/api/generate-stretch", { method: "POST" });
      const data = await res.json();
      if (data.stretches?.length) {
        setAiSteps(data.stretches);
        setActive("ai");
      } else {
        // Fallback if the AI route isn't available.
        setAiSteps(DEMO_AI_STRETCH);
        setActive("ai");
      }
    } finally {
      setLoadingAi(false);
    }
  }

  const steps = active === "ai" ? aiSteps ?? [] : active ? ROUTINES[active].steps : [];

  if (active && steps.length) {
    return <Runner steps={steps} onDone={() => { award(XP.STRETCH, "stretch"); setActive(null); }} onQuit={() => setActive(null)} />;
  }

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Stretching</h1>
      <div className="space-y-3">
        {Object.entries(ROUTINES).map(([key, r]) => (
          <button key={key} onClick={() => setActive(key)} className="card flex w-full items-center justify-between text-left">
            <div>
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-muted">{r.steps.length} stretches · +20 XP</p>
            </div>
            <span className="text-2xl">{r.emoji}</span>
          </button>
        ))}
        <button onClick={startAi} disabled={loadingAi} className="card flex w-full items-center justify-between text-left">
          <div>
            <p className="font-semibold">AI Custom Stretch</p>
            <p className="text-sm text-muted">{loadingAi ? "Building from your last workout…" : "Personalized to your last workout"}</p>
          </div>
          <span className="text-2xl">✨</span>
        </button>
      </div>
    </PageWrapper>
  );
}

function Runner({ steps, onDone, onQuit }: { steps: Stretch[]; onDone: () => void; onQuit: () => void }) {
  const [i, setI] = useState(0);
  const [remaining, setRemaining] = useState(steps[0].duration_seconds);
  const doneRef = useRef(false);

  useEffect(() => {
    setRemaining(steps[i].duration_seconds);
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (i + 1 < steps.length) setI((x) => x + 1);
          else if (!doneRef.current) {
            doneRef.current = true;
            onDone();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const step = steps[i];
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg px-8 text-center">
      <p className="mb-2 text-sm text-muted">Stretch {i + 1} of {steps.length}</p>
      <div className="mb-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
      </div>
      <h2 className="mb-3 text-3xl font-bold">{step.name}</h2>
      <p className="mb-6 max-w-xs text-muted">{step.instructions}</p>
      <div className="mb-8 text-6xl font-bold tabular-nums text-ink">{remaining}</div>
      <div className="flex gap-3">
        <button onClick={() => (i + 1 < steps.length ? setI((x) => x + 1) : onDone())} className="btn-primary px-8">Next</button>
        <button onClick={onQuit} className="btn-ghost">Quit</button>
      </div>
    </div>
  );
}
