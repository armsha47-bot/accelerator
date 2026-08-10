"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { todayISO } from "@/lib/xp-utils";
import { DEMO } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import PageWrapper from "@/components/layout/PageWrapper";

const PARTS = ["Left knee", "Right knee", "Left ankle", "Right ankle", "Lower back", "Hamstring", "Groin", "Shoulder", "Other"];
const TYPES = ["soreness", "tightness", "pain", "injury"];

interface Injury {
  id: string;
  body_part: string;
  severity: number;
  injury_type: string;
  notes: string | null;
  resolved: boolean;
  date: string;
}

export default function InjuryPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [rows, setRows] = useState<Injury[]>([]);
  const [part, setPart] = useState(PARTS[0]);
  const [type, setType] = useState(TYPES[0]);
  const [severity, setSeverity] = useState(2);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (DEMO) {
      setRows(demoGet<Injury[]>("injuries", []));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("injury_logs").select("*").eq("user_id", user.id).order("date", { ascending: false });
    setRows((data ?? []) as Injury[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (DEMO) {
      const next = [{ id: `demo-${Date.now()}`, body_part: part, injury_type: type, severity, notes, resolved: false, date: todayISO() } as Injury, ...rows];
      setRows(next);
      demoSet("injuries", next);
      setNotes("");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("injury_logs").insert({ user_id: user.id, body_part: part, injury_type: type, severity, notes, date: todayISO() });
    setNotes("");
    load();
  }

  async function resolve(id: string) {
    if (DEMO) {
      const next = rows.map((r) => (r.id === id ? { ...r, resolved: true } : r));
      setRows(next);
      demoSet("injuries", next);
      return;
    }
    await supabase.from("injury_logs").update({ resolved: true, resolved_date: todayISO() }).eq("id", id);
    load();
  }

  const active = rows.filter((r) => !r.resolved);

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Injury & Soreness</h1>

      {active.length > 0 && (
        <section className="card mb-4 border-gold/40">
          <p className="text-sm font-semibold text-gold">⚠️ Active issues</p>
          <p className="mt-1 text-sm text-muted">Your workout suggestions avoid stressing these areas.</p>
        </section>
      )}

      <section className="card mb-4 space-y-3">
        <h3 className="font-semibold">Log an issue</h3>
        <select className="input" value={part} onChange={(e) => setPart(e.target.value)}>
          {PARTS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`pill flex-1 justify-center capitalize ${type === t ? "bg-white text-bg" : "bg-elevated text-muted"}`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Severity</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setSeverity(n)} className={`h-8 w-8 rounded-full text-sm ${severity >= n ? "bg-macroFat text-white" : "bg-elevated text-muted"}`}>{n}</button>
          ))}
        </div>
        <input className="input" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn-primary w-full" onClick={add}>Log issue</button>
      </section>

      <section className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className={`card-sm flex items-center justify-between ${r.resolved ? "opacity-50" : ""}`}>
            <div>
              <p className="font-medium">{r.body_part} · <span className="capitalize text-muted">{r.injury_type}</span></p>
              <p className="text-xs text-muted">Severity {r.severity} · {r.date}</p>
            </div>
            {!r.resolved && <button onClick={() => resolve(r.id)} className="pill bg-green/20 text-green">Resolve</button>}
          </div>
        ))}
      </section>
    </PageWrapper>
  );
}
