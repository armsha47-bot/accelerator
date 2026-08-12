"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  function resetForm() {
    setName("");
    setDate("");
    setEditingId(null);
  }

  function startEdit(e: Countdown) {
    setEditingId(e.id);
    setName(e.name);
    setDate(e.event_date);
    if (typeof document !== "undefined") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function save() {
    if (!name.trim() || !date) return;
    const patch = { name: name.trim(), event_date: date };
    if (DEMO) {
      const next = (editingId
        ? events.map((e) => (e.id === editingId ? { ...e, ...patch } : e))
        : [...events, { id: `demo-${Date.now()}`, ...patch, icon_key: "⏳", color: "#F59E0B" } as Countdown]
      ).sort((a, b) => (a.event_date < b.event_date ? -1 : 1));
      setEvents(next);
      demoSet("countdowns", next);
      resetForm();
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    // Seeded rows have client-only ids; treat editing one as an insert.
    if (editingId && !editingId.startsWith("seed-")) {
      await supabase.from("countdown_events").update(patch).eq("id", editingId);
    } else {
      await supabase.from("countdown_events").insert({ user_id: user.id, ...patch, icon_key: "⏳", color: "#F59E0B" });
    }
    resetForm();
    load();
  }

  async function del(id: string) {
    setEvents((es) => {
      const next = es.filter((e) => e.id !== id);
      if (DEMO) demoSet("countdowns", next);
      return next;
    });
    if (editingId === id) resetForm();
    if (!DEMO && !id.startsWith("seed-")) await supabase.from("countdown_events").delete().eq("id", id);
  }

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Countdowns</h1>

      <div className="mb-5 space-y-3">
        {events.map((e) => {
          const d = daysUntil(e.event_date);
          const soon = d >= 0 && d <= 7;
          return (
            <div key={e.id} className={`card flex items-center gap-3 ${soon ? "border-gold" : ""}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-elevated text-2xl">{e.icon_key ?? "⏳"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.name}</p>
                <p className="text-xs text-muted">{new Date(e.event_date + "T00:00:00").toLocaleDateString()}</p>
                {soon && <span className="pill mt-1 bg-gold/20 text-gold">This week!</span>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-bold" style={{ color: e.color ?? "#F8F8FF" }}>{d < 0 ? "—" : d}</div>
                <span className="text-xs text-muted">{d === 0 ? "Today!" : d < 0 ? "Passed" : "days"}</span>
              </div>
              <div className="flex shrink-0 flex-col gap-2 pl-1">
                <button onClick={() => startEdit(e)} aria-label="Edit" className="text-muted transition-colors hover:text-ink">✏️</button>
                <button onClick={() => del(e.id)} aria-label="Delete" className="text-muted transition-colors hover:text-macroFat">✕</button>
              </div>
            </div>
          );
        })}
      </div>

      <section className="card">
        <h3 className="mb-3 font-semibold">{editingId ? "Edit countdown" : "New countdown"}</h3>
        <div className="space-y-3">
          <input className="input" placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            className="input block w-full min-w-0 appearance-none"
            style={{ WebkitAppearance: "none" }}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={save}>{editingId ? "Update" : "Add"}</button>
            {editingId && <button className="btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
