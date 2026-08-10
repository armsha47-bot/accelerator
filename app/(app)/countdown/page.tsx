"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase";
import { DEMO } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import PageWrapper from "@/components/layout/PageWrapper";

interface Countdown {
  id: string;
  name: string;
  event_date: string;
  color: string | null;
  icon_key: string | null;
}

const SEEDS = [
  { name: "Soccer Tryouts", icon: "⚽", color: "#22C55E" },
  { name: "AMC 10", icon: "🧮", color: "#F0F0F0" },
  { name: "AMC 10B", icon: "🧮", color: "#A78BFA" },
];

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export default function CountdownPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [events, setEvents] = useState<Countdown[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  const seededRows = () =>
    SEEDS.map((s, i) => ({
      id: `seed-${i}`,
      name: s.name,
      event_date: new Date(Date.now() + (14 + i * 7) * 86400000).toISOString().slice(0, 10),
      color: s.color,
      icon_key: s.icon,
    })) as Countdown[];

  const load = useCallback(async () => {
    if (DEMO) {
      let saved = demoGet<Countdown[]>("countdowns", []);
      if (saved.length === 0) {
        saved = seededRows();
        demoSet("countdowns", saved);
      }
      setEvents(saved);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    let { data } = await supabase.from("countdown_events").select("*").eq("user_id", user.id).order("event_date");
    if ((data ?? []).length === 0) {
      const rows = SEEDS.map((s, i) => ({
        user_id: user.id,
        name: s.name,
        event_date: new Date(Date.now() + (14 + i * 7) * 86400000).toISOString().slice(0, 10),
        color: s.color,
        icon_key: s.icon,
      }));
      await supabase.from("countdown_events").insert(rows);
      ({ data } = await supabase.from("countdown_events").select("*").eq("user_id", user.id).order("event_date"));
    }
    setEvents((data ?? []) as Countdown[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!name.trim() || !date) return;
    if (DEMO) {
      const next = [...events, { id: `demo-${Date.now()}`, name: name.trim(), event_date: date, icon_key: "⏳", color: "#F59E0B" } as Countdown].sort((a, b) => (a.event_date < b.event_date ? -1 : 1));
      setEvents(next);
      demoSet("countdowns", next);
      setName("");
      setDate("");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("countdown_events").insert({ user_id: user.id, name: name.trim(), event_date: date, icon_key: "⏳", color: "#F59E0B" });
    setName("");
    setDate("");
    load();
  }

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Countdowns</h1>

      <div className="mb-5 space-y-3">
        {events.map((e) => {
          const d = daysUntil(e.event_date);
          const soon = d >= 0 && d <= 7;
          return (
            <div key={e.id} className={`card flex items-center gap-4 ${soon ? "border-gold" : ""}`}>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-elevated text-2xl">{e.icon_key ?? "⏳"}</span>
              <div className="flex-1">
                <p className="font-semibold">{e.name}</p>
                <p className="text-xs text-muted">{new Date(e.event_date + "T00:00:00").toLocaleDateString()}</p>
                {soon && <span className="pill mt-1 bg-gold/20 text-gold">This week!</span>}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: e.color ?? "#F8F8FF" }}>{d < 0 ? "—" : d}</div>
                <Link href={`/coach`} className="text-xs text-ink">
                  {d === 0 ? "Today!" : "Prepare"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <section className="card">
        <h3 className="mb-3 font-semibold">New countdown</h3>
        <div className="space-y-3">
          <input className="input" placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn-primary w-full" onClick={add}>Add</button>
        </div>
      </section>
    </PageWrapper>
  );
}
