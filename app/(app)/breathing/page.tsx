"use client";

import { useEffect, useRef, useState } from "react";
import { useXP } from "@/hooks/useXP";
import { XP } from "@/lib/xp-utils";
import PageWrapper from "@/components/layout/PageWrapper";

type Phase = { label: string; seconds: number; scale: number };
const PATTERNS: Record<string, { name: string; phases: Phase[] }> = {
  box: {
    name: "Box Breathing",
    phases: [
      { label: "Breathe in", seconds: 4, scale: 1 },
      { label: "Hold", seconds: 4, scale: 1 },
      { label: "Breathe out", seconds: 4, scale: 0.5 },
      { label: "Hold", seconds: 4, scale: 0.5 },
    ],
  },
  "478": {
    name: "4-7-8 Breathing",
    phases: [
      { label: "Breathe in", seconds: 4, scale: 1 },
      { label: "Hold", seconds: 7, scale: 1 },
      { label: "Breathe out", seconds: 8, scale: 0.5 },
    ],
  },
};

const ROUNDS = 4;

export default function BreathingPage() {
  const { award } = useXP();
  const [key, setKey] = useState<keyof typeof PATTERNS | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  const pattern = key ? PATTERNS[key] : null;
  const phase = pattern?.phases[phaseIdx];

  useEffect(() => {
    if (!pattern || !phase) return;
    setCount(phase.seconds);
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(id);
          advance();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, phaseIdx, round]);

  function advance() {
    if (!pattern) return;
    if (phaseIdx + 1 < pattern.phases.length) {
      setPhaseIdx((i) => i + 1);
    } else if (round < ROUNDS) {
      setRound((r) => r + 1);
      setPhaseIdx(0);
    } else if (!doneRef.current) {
      doneRef.current = true;
      award(XP.BREATHING, "breathing");
      setKey(null);
      setTimeout(() => alert("Nice. +15 XP"), 100);
    }
  }

  if (pattern && phase) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg">
        <p className="mb-2 text-sm text-muted">Round {round} of {ROUNDS}</p>
        <div
          className="grid h-56 w-56 place-items-center rounded-full bg-white/10"
          style={{ transform: `scale(${phase.scale})`, transition: `transform ${phase.seconds}s ease-in-out` }}
        >
          <div className="grid h-40 w-40 place-items-center rounded-full bg-white/20">
            <span className="text-3xl font-bold">{count}</span>
          </div>
        </div>
        <p className="mt-8 text-xl font-semibold">{phase.label}</p>
        <button onClick={() => setKey(null)} className="mt-8 text-sm text-muted">Exit</button>
      </div>
    );
  }

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Breathing</h1>
      <div className="space-y-3">
        {(Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).map((k) => (
          <button
            key={k}
            onClick={() => {
              doneRef.current = false;
              setRound(1);
              setPhaseIdx(0);
              setKey(k);
            }}
            className="card flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="font-semibold">{PATTERNS[k].name}</p>
              <p className="text-sm text-muted">{PATTERNS[k].phases.map((p) => p.seconds).join("-")} · {ROUNDS} rounds</p>
            </div>
            <span className="text-2xl">🫁</span>
          </button>
        ))}
      </div>
    </PageWrapper>
  );
}
