"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { todayISO } from "@/lib/xp-utils";
import { DEMO } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import PageWrapper from "@/components/layout/PageWrapper";
import { LineChart } from "@/components/shared/Charts";

const SUBJECTS = ["AMC Math", "Precalculus", "Chemistry", "Statistics", "Finance", "Other"];
const EXAMS = ["AMC 10A", "AMC 10B", "AMC 12A", "AMC 12B"];

export default function StudyPage() {
  const supabase = useMemo(() => browserClient(), []);
  const { award } = useXP();
  const [tab, setTab] = useState<"session" | "amc">("session");
  const [sessions, setSessions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (DEMO) {
      setSessions(demoGet<any[]>("studySessions", []));
      setAttempts(demoGet<any[]>("amcAttempts", []));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("study_sessions").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
      supabase.from("amc_attempts").select("*").eq("user_id", user.id).order("date", { ascending: true }),
    ]);
    setSessions(s ?? []);
    setAttempts(a ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function del(table: string, id: string, setter: (fn: (a: any[]) => any[]) => void) {
    setter((a) => {
      const next = a.filter((x) => x.id !== id);
      if (DEMO) demoSet(table === "study_sessions" ? "studySessions" : "amcAttempts", next);
      return next;
    });
    if (!DEMO) await supabase.from(table).delete().eq("id", id);
  }

  const weekMinutes = sessions
    .filter((s) => s.date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
    .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Study</h1>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("session")} className={`pill flex-1 justify-center ${tab === "session" ? "bg-white text-bg" : "bg-elevated text-muted"}`}>Sessions</button>
        <button onClick={() => setTab("amc")} className={`pill flex-1 justify-center ${tab === "amc" ? "bg-white text-bg" : "bg-elevated text-muted"}`}>AMC</button>
      </div>

      {tab === "session" ? (
        <>
          <section className="card mb-4 flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold">{Math.round(weekMinutes / 60 * 10) / 10}h</div>
              <div className="text-xs text-muted">this week</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <div className="text-xs text-muted">sessions</div>
            </div>
          </section>
          <SessionForm supabase={supabase} subjects={SUBJECTS} onSaved={load} award={award} />
          <section className="mt-4 space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="card-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{s.subject}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted">{s.duration_minutes}m</p>
                    <button onClick={() => del("study_sessions", s.id, setSessions)} className="text-muted">✕</button>
                  </div>
                </div>
                {s.topics && <p className="text-xs text-muted">{s.topics}</p>}
              </div>
            ))}
          </section>
        </>
      ) : (
        <>
          {attempts.length >= 2 && (
            <section className="card mb-4">
              <p className="mb-2 text-sm font-semibold">Score trend</p>
              <LineChart data={attempts.map((a) => a.score ?? 0)} color="#F0F0F0" />
              <p className="mt-2 text-xs text-muted">
                +{(attempts[attempts.length - 1].score ?? 0) - (attempts[0].score ?? 0)} pts since first attempt
              </p>
            </section>
          )}
          <AmcForm supabase={supabase} exams={EXAMS} onSaved={load} award={award} />
          <section className="mt-4 space-y-2">
            {[...attempts].reverse().map((a) => (
              <div key={a.id} className="card-sm flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.exam_type} {a.year}</p>
                  <p className="text-xs text-muted">{a.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold text-ink">{a.score}<span className="text-sm text-muted">/150</span></p>
                  <button onClick={() => del("amc_attempts", a.id, setAttempts)} className="text-muted">✕</button>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </PageWrapper>
  );
}

function SessionForm({ supabase, subjects, onSaved, award }: any) {
  const [subject, setSubject] = useState(subjects[0]);
  const [minutes, setMinutes] = useState("30");
  const [topics, setTopics] = useState("");
  const [difficulty, setDifficulty] = useState(3);

  async function save() {
    const row = { subject, duration_minutes: parseInt(minutes) || 0, topics, difficulty, date: todayISO() };
    if (DEMO) {
      const next = [{ id: `demo-${Date.now()}`, ...row }, ...demoGet<any[]>("studySessions", [])];
      demoSet("studySessions", next);
      await award(15, "study session");
      setTopics("");
      onSaved();
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("study_sessions").insert({ user_id: user.id, ...row });
    await award(15, "study session");
    setTopics("");
    onSaved();
  }

  return (
    <section className="card space-y-3">
      <h3 className="font-semibold">Log a session</h3>
      <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
        {subjects.map((s: string) => <option key={s}>{s}</option>)}
      </select>
      <div className="flex gap-2">
        <input className="input flex-1" type="number" placeholder="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setDifficulty(n)} className={`h-8 w-8 rounded-full text-sm ${difficulty >= n ? "bg-gold text-black" : "bg-elevated text-muted"}`}>{n}</button>
          ))}
        </div>
      </div>
      <input className="input" placeholder="Topics covered" value={topics} onChange={(e) => setTopics(e.target.value)} />
      <button className="btn-primary w-full" onClick={save}>Save session (+15 XP)</button>
    </section>
  );
}

function AmcForm({ supabase, exams, onSaved, award }: any) {
  const [exam, setExam] = useState(exams[0]);
  const [year, setYear] = useState("2024");
  const [score, setScore] = useState("");

  async function save() {
    const row = { exam_type: exam, year: parseInt(year) || null, score: parseInt(score) || 0, date: todayISO() };
    if (DEMO) {
      const next = [...demoGet<any[]>("amcAttempts", []), { id: `demo-${Date.now()}`, ...row }];
      demoSet("amcAttempts", next);
      await award(20, "amc attempt");
      setScore("");
      onSaved();
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("amc_attempts").insert({ user_id: user.id, ...row });
    await award(20, "amc attempt");
    setScore("");
    onSaved();
  }

  return (
    <section className="card space-y-3">
      <h3 className="font-semibold">Log AMC attempt</h3>
      <div className="flex gap-2">
        <select className="input flex-1" value={exam} onChange={(e) => setExam(e.target.value)}>
          {exams.map((x: string) => <option key={x}>{x}</option>)}
        </select>
        <input className="input w-24" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>
      <input className="input" type="number" placeholder="Score / 150" value={score} onChange={(e) => setScore(e.target.value)} />
      <button className="btn-primary w-full" onClick={save}>Save attempt (+20 XP)</button>
    </section>
  );
}
