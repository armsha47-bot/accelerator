"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { todayISO, XP } from "@/lib/xp-utils";
import PageWrapper from "@/components/layout/PageWrapper";

const EVENTS = ["Big Game / Tryout", "Test / Exam", "Performance", "Other"];

type StepKind = "ground" | "remind" | "visualize" | "ignite" | "go";
const STEPS: { kind: StepKind; label: string; seconds: number }[] = [
  { kind: "ground", label: "Ground", seconds: 60 },
  { kind: "remind", label: "Remember", seconds: 30 },
  { kind: "visualize", label: "Visualize", seconds: 60 },
  { kind: "ignite", label: "Ignite", seconds: 30 },
  { kind: "go", label: "Go", seconds: 6 },
];

const VISUALIZE: Record<string, string> = {
  "Big Game / Tryout": "See the first touch. The pass that splits them. You're calm, sharp, everywhere. See yourself winning the moment.",
  "Test / Exam": "See yourself reading the first problem, breathing, and knowing. Pen moving. Calm and quick. You've prepared for this.",
  Performance: "See the room. Feel your feet. See yourself owning the space, present and unshakable.",
  Other: "See yourself succeeding — vivid, specific, calm, and in control.",
};

export default function RitualPage() {
  const supabase = useMemo(() => browserClient(), []);
  const { award } = useXP();
  const [event, setEvent] = useState<string | null>(null);
  const [wins, setWins] = useState<string[]>([]);
  const [hype, setHype] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("wins_journal").select("description").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3);
      setWins((data ?? []).map((w: any) => w.description));
    })();
  }, [supabase]);

  async function start(ev: string) {
    setEvent(ev);
    // Kick off hype generation for the "ignite" step.
    try {
      const res = await fetch("/api/confidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "hype", context: `${ev} — 75 words, punchy` }),
      });
      const data = await res.json();
      setHype(data.text);
    } catch {
      setHype("This is your moment. You've done the work. Now go take it.");
    }
  }

  async function finish() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("ritual_sessions").insert({ user_id: user.id, event_type: event, completed: true, date: todayISO() });
    await award(XP.RITUAL, "pre-event ritual");
    setEvent(null);
  }

  if (event) {
    return <Runner event={event} wins={wins} hype={hype} onDone={finish} onQuit={() => setEvent(null)} />;
  }

  return (
    <PageWrapper>
      <h1 className="mb-2 text-2xl font-bold">Pre-Event Ritual</h1>
      <p className="mb-5 text-muted">A guided sequence to lock in before the moment. What&apos;s coming?</p>
      <div className="space-y-3">
        {EVENTS.map((e) => (
          <button key={e} onClick={() => start(e)} className="card w-full text-left font-semibold">
            {e}
          </button>
        ))}
      </div>
    </PageWrapper>
  );
}

function Runner({ event, wins, hype, onDone, onQuit }: { event: string; wins: string[]; hype: string; onDone: () => void; onQuit: () => void }) {
  const [i, setI] = useState(0);
  const [remaining, setRemaining] = useState(STEPS[0].seconds);
  const doneRef = useRef(false);
  const step = STEPS[i];

  useEffect(() => {
    setRemaining(STEPS[i].seconds);
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (i + 1 < STEPS.length) setI((x) => x + 1);
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

  const scale = step.kind === "ground" ? (remaining % 16 < 8 ? 1 : 0.55) : 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg px-8 text-center">
      <p className="mb-6 text-xs uppercase tracking-widest text-muted">{step.label} · {remaining}s</p>

      {step.kind === "ground" && (
        <>
          <div className="grid h-48 w-48 place-items-center rounded-full bg-white/10" style={{ transform: `scale(${scale})`, transition: "transform 4s ease-in-out" }}>
            <div className="h-32 w-32 rounded-full bg-white/20" />
          </div>
          <p className="mt-8 text-lg text-muted">Box breathing — in, hold, out, hold.</p>
        </>
      )}

      {step.kind === "remind" && (
        <div>
          {wins.length > 0 ? (
            wins.map((w, k) => <p key={k} className="mb-3 text-xl font-semibold">{w}</p>)
          ) : (
            <p className="text-xl font-semibold">You&apos;ve shown up before. You show up now.</p>
          )}
          <p className="mt-4 text-muted">You&apos;ve done hard things before.</p>
        </div>
      )}

      {step.kind === "visualize" && <p className="max-w-sm text-xl leading-relaxed">{VISUALIZE[event]}</p>}

      {step.kind === "ignite" && <p className="max-w-sm whitespace-pre-wrap text-xl font-bold leading-relaxed">{hype || "You're ready. Go."}</p>}

      {step.kind === "go" && (
        <div>
          <p className="text-2xl text-muted">{event}</p>
          <h2 className="mt-3 text-4xl font-bold">You&apos;re ready.</h2>
        </div>
      )}

      <button onClick={onQuit} className="absolute bottom-10 text-sm text-muted">Exit</button>
    </div>
  );
}
