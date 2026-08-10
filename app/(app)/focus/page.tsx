"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { todayISO, XP } from "@/lib/xp-utils";
import PageWrapper from "@/components/layout/PageWrapper";

const PRESETS = [
  { label: "25 / 5", work: 25, brk: 5 },
  { label: "45 / 10", work: 45, brk: 10 },
  { label: "50 / 10", work: 50, brk: 10 },
];

export default function FocusPage() {
  const supabase = useMemo(() => browserClient(), []);
  const { award } = useXP();

  const [preset, setPreset] = useState(PRESETS[0]);
  const [label, setLabel] = useState("");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [cycle, setCycle] = useState(1);
  const [remaining, setRemaining] = useState(PRESETS[0].work * 60);
  const [holdT, setHoldT] = useState(0);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          nextPhase();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, cycle]);

  async function nextPhase() {
    if (phase === "work") {
      await award(XP.POMODORO_CYCLE, "pomodoro cycle");
      if (cycle >= 4) {
        // full block complete
        await award(XP.POMODORO_BLOCK - XP.POMODORO_CYCLE, "pomodoro block");
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("focus_sessions").insert({
            user_id: user.id,
            label: label || "Focus",
            duration_minutes: preset.work * 4,
            cycles_completed: 4,
            completed: true,
            date: todayISO(),
          });
        }
        reset();
        alert("Deep work block complete! +60 XP");
        return;
      }
      setPhase("break");
      setRemaining(preset.brk * 60);
    } else {
      setPhase("work");
      setCycle((c) => c + 1);
      setRemaining(preset.work * 60);
    }
  }

  function reset() {
    setRunning(false);
    setPhase("work");
    setCycle(1);
    setRemaining(preset.work * 60);
  }

  function startHoldExit() {
    holdRef.current = setInterval(() => {
      setHoldT((t) => {
        if (t >= 100) {
          clearInterval(holdRef.current!);
          reset();
          return 0;
        }
        return t + 5;
      });
    }, 100);
  }
  function endHoldExit() {
    if (holdRef.current) clearInterval(holdRef.current);
    setHoldT(0);
  }

  const total = phase === "work" ? preset.work * 60 : preset.brk * 60;
  const frac = total ? remaining / total : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (running) {
    const R = 130;
    const C = 2 * Math.PI * R;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6">
        <p className="mb-1 text-sm uppercase tracking-widest text-muted">
          {phase === "work" ? "Focus" : "Break"} · {cycle} of 4
        </p>
        <p className="mb-8 text-muted">{label || "Deep work"}</p>
        <div className="relative">
          <svg width="300" height="300" className="rotate-[-90deg]">
            <circle cx="150" cy="150" r={R} fill="none" stroke="#1C1C26" strokeWidth="4" />
            <circle cx="150" cy="150" r={R} fill="none" stroke={phase === "work" ? "#F0F0F0" : "#22C55E"} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-6xl font-bold tabular-nums">{mm}:{ss}</span>
          </div>
        </div>
        <button
          onMouseDown={startHoldExit}
          onMouseUp={endHoldExit}
          onMouseLeave={endHoldExit}
          onTouchStart={startHoldExit}
          onTouchEnd={endHoldExit}
          className="relative mt-12 overflow-hidden rounded-full border border-border px-8 py-3 text-sm text-muted"
        >
          <span className="absolute inset-y-0 left-0 bg-macroFat/40" style={{ width: `${holdT}%` }} />
          <span className="relative">Hold to exit</span>
        </button>
      </div>
    );
  }

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Focus Timer</h1>
      <section className="card space-y-4">
        <input className="input" placeholder="What are you working on?" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setPreset(p);
                setRemaining(p.work * 60);
              }}
              className={`pill flex-1 justify-center ${preset.label === p.label ? "bg-white text-bg" : "bg-elevated text-muted"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted">4 cycles = 1 deep work block (+60 XP)</p>
        <button className="btn-primary w-full" onClick={() => setRunning(true)}>
          Start focusing
        </button>
      </section>
    </PageWrapper>
  );
}
