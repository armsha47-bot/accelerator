"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { todayISO } from "@/lib/xp-utils";
import { DEMO } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import PageWrapper from "@/components/layout/PageWrapper";

interface SleepRow {
  id: string;
  date: string;
  hours_slept: number;
}

export default function SleepPage() {
  const supabase = useMemo(() => browserClient(), []);
  const { award } = useXP();
  const [rows, setRows] = useState<SleepRow[]>([]);
  const [hours, setHours] = useState("8");

  const load = useCallback(async () => {
    if (DEMO) {
      setRows(demoGet<SleepRow[]>("sleepLogs", []));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("sleep_logs")
      .select("id, date, hours_slept")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7);
    setRows((data ?? []) as SleepRow[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function log() {
    const h = parseFloat(hours);
    if (!h) return;
    const today = todayISO();
    if (DEMO) {
      const next = [{ id: `demo-${today}`, date: today, hours_slept: h }, ...rows.filter((r) => r.date !== today)].slice(0, 7);
      setRows(next);
      demoSet("sleepLogs", next);
      await award(5, "sleep log");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("sleep_logs").upsert(
      { user_id: user.id, date: today, hours_slept: h },
      { onConflict: "user_id,date" } as any
    );
    await award(5, "sleep log");
    load();
  }

  async function del(id: string) {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    if (DEMO) demoSet("sleepLogs", next);
    else await supabase.from("sleep_logs").delete().eq("id", id);
  }

  const last7 = [...rows].reverse();
  const avg = rows.length ? rows.reduce((s, r) => s + r.hours_slept, 0) / rows.length : 0;
  const barColor = (h: number) => (h >= 8 ? "#22C55E" : h >= 6 ? "#F59E0B" : "#F87171");

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Sleep</h1>

      <section className="card mb-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold">{avg ? avg.toFixed(1) : "—"}h</div>
            <div className="text-xs text-muted">7-night average</div>
          </div>
        </div>
        <div className="flex h-28 items-end gap-2">
          {last7.length === 0 && <p className="text-sm text-muted">No sleep logged yet.</p>}
          {last7.map((r) => (
            <button key={r.id} onClick={() => del(r.id)} title="Tap to delete" className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-full" style={{ height: `${Math.min(100, (r.hours_slept / 10) * 100)}%`, background: barColor(r.hours_slept) }} />
              <span className="text-[10px] text-muted">{r.date.slice(5)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="mb-2 font-semibold">Log last night</h3>
        <div className="flex gap-2">
          <input className="input flex-1" type="number" step="0.5" placeholder="Hours slept" value={hours} onChange={(e) => setHours(e.target.value)} />
          <button className="btn-primary px-5" onClick={log}>Log</button>
        </div>
        <p className="mt-2 text-xs text-muted">On low-sleep nights your daily plan is auto-calibrated lighter.</p>
      </section>
    </PageWrapper>
  );
}
