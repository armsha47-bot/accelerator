"use client";

import { useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { XP } from "@/lib/xp-utils";
import { DEMO } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import PageWrapper from "@/components/layout/PageWrapper";

type Tab = "affirmation" | "hype" | "wins";

export default function ConfidencePage() {
  const supabase = useMemo(() => browserClient(), []);
  const { award } = useXP();
  const [tab, setTab] = useState<Tab>("affirmation");

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Confidence</h1>
      <div className="mb-4 flex gap-2">
        {(["affirmation", "hype", "wins"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pill flex-1 justify-center capitalize ${tab === t ? "bg-white text-bg" : "bg-elevated text-muted"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "affirmation" && <Affirmation />}
      {tab === "hype" && <Hype award={award} />}
      {tab === "wins" && <Wins supabase={supabase} award={award} />}
    </PageWrapper>
  );
}

function Affirmation() {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const DEMO_AFFIRMATIONS = [
    "I show up, I do the work, and I get better every single day.",
    "Pressure is a privilege — I was built for this moment.",
    "My discipline is louder than my doubt.",
    "I earn my confidence one rep, one problem, one day at a time.",
    "I am calm, sharp, and ready. Nothing outworks me.",
  ];

  async function gen() {
    if (DEMO) {
      setText(DEMO_AFFIRMATIONS[Math.floor(Math.random() * DEMO_AFFIRMATIONS.length)]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/confidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "affirmation" }),
      });
      const data = await res.json();
      setText(data.text);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    gen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card flex min-h-[240px] flex-col items-center justify-center bg-gradient-to-br from-white/10 to-surface text-center">
      {loading ? (
        <p className="text-muted">Generating…</p>
      ) : (
        <p className="text-2xl font-bold leading-snug">{text}</p>
      )}
      <button onClick={gen} className="btn-ghost mt-6" disabled={loading}>
        New affirmation
      </button>
    </div>
  );
}

function Hype({ award }: { award: (n: number, r: string) => Promise<unknown> }) {
  const [context, setContext] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function gen() {
    setText("");
    await award(XP.HYPE, "hype mode");
    if (DEMO) {
      setText(
        `${context ? context.trim() + " — this is your moment.\n\n" : ""}Listen. You didn't come this far to only come this far. Every early morning, every extra rep, every problem you grinded through when it would've been easier to quit — it's all in you now. Nobody is going to outwork you today. You're calm, you're sharp, and you're dangerous when it counts. Breathe. Lock in. Go take what's yours.`
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/confidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "hype", context }),
      });
      const data = await res.json();
      setText(data.text);
    } finally {
      setLoading(false);
    }
  }

  function speak() {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang.startsWith("en") && /male|daniel|alex/i.test(v.name)) ?? voices[0];
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }

  return (
    <div>
      <input className="input mb-3" placeholder="What are you about to do?" value={context} onChange={(e) => setContext(e.target.value)} />
      <button className="btn-primary mb-4 w-full" onClick={gen} disabled={loading}>
        {loading ? "Firing up…" : "I need a pump-up 🔥"}
      </button>
      {text && (
        <div className="card bg-gradient-to-br from-macroFat/20 to-surface">
          <p className="whitespace-pre-wrap text-lg font-semibold leading-relaxed">{text}</p>
          <button onClick={speak} className="btn-ghost mt-4 w-full">🔊 Read aloud</button>
        </div>
      )}
    </div>
  );
}

function Wins({ supabase, award }: { supabase: ReturnType<typeof browserClient>; award: (n: number, r: string) => Promise<unknown> }) {
  const [wins, setWins] = useState<{ id: string; description: string; created_at: string }[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    (async () => {
      if (DEMO) {
        setWins(demoGet<any[]>("wins", []));
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("wins_journal").select("id, description, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      setWins((data ?? []) as any);
    })();
  }, [supabase]);

  async function add() {
    if (!text.trim()) return;
    if (DEMO) {
      const next = [{ id: `demo-${Date.now()}`, description: text.trim(), created_at: new Date().toISOString() }, ...wins];
      setWins(next);
      demoSet("wins", next);
      setText("");
      await award(XP.WIN, "win logged");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("wins_journal").insert({ user_id: user.id, description: text.trim(), category: "general" }).select().single();
    if (data) setWins((w) => [data as any, ...w]);
    setText("");
    await award(XP.WIN, "win logged");
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input className="input flex-1" placeholder="Log a win, any size…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn-primary px-5" onClick={add}>Log</button>
      </div>
      <div className="space-y-2">
        {wins.map((w) => (
          <div key={w.id} className="card-sm flex items-start justify-between gap-3">
            <div>
              <p className="text-sm">{w.description}</p>
              <p className="mt-1 text-xs text-muted">{new Date(w.created_at).toLocaleDateString()}</p>
            </div>
            <button
              onClick={async () => {
                const next = wins.filter((x) => x.id !== w.id);
                setWins(next);
                if (DEMO) demoSet("wins", next);
                else await supabase.from("wins_journal").delete().eq("id", w.id);
              }}
              className="text-muted"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
