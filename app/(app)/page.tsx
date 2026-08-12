"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, Reorder, useDragControls } from "framer-motion";
import { browserClient } from "@/lib/supabase";
import { useXP } from "@/hooks/useXP";
import { greeting, todayISO, mondayISO, XP } from "@/lib/xp-utils";
import { levelProgress } from "@/lib/level-utils";
import { quoteOfDay } from "@/lib/quotes";
import { DEMO, demoProfile, demoPlan, demoHabits, demoQuests, demoWeek } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import type { DailyPlan, Habit, PlanTask, Profile, Slot } from "@/lib/types";
import PageWrapper from "@/components/layout/PageWrapper";
import LevelCrest from "@/components/shared/LevelCrest";
import DonutRing from "@/components/home/DonutRing";
import WeekBubbles, { type DayStatus } from "@/components/home/WeekBubbles";
import TutorialTour from "@/components/shared/TutorialTour";
import FireStreakCounter from "@/components/home/FireStreakCounter";
import NumberCounter from "@/components/shared/NumberCounter";
import CustomizeHomeSheet from "@/components/home/CustomizeHomeSheet";
import { useHomePrefs, type HomeSectionId } from "@/hooks/useHomePrefs";

const SLOTS: { key: Slot; label: string; accent: string }[] = [
  { key: "morning", label: "Morning", accent: "#FFFFFF" },
  { key: "afternoon", label: "Afternoon", accent: "#FFFFFF" },
  { key: "evening", label: "Evening", accent: "#FFFFFF" },
];

const QUICK = [
  { href: "/nutrition?action=log", label: "Log Meal", emoji: "🍽️" },
  { href: "/train?action=start", label: "Log Workout", emoji: "🏋️" },
  { href: "/coach", label: "AI Coach", emoji: "💬" },
  { href: "/train#scan", label: "Scan", emoji: "📸" },
  { href: "/stretch", label: "Stretch", emoji: "🤸" },
  { href: "/confidence", label: "Confidence", emoji: "🔥" },
  { href: "/focus", label: "Focus", emoji: "⏱️" },
  { href: "/countdown", label: "Countdown", emoji: "⏳" },
];

export default function HomePage() {
  const supabase = useMemo(() => browserClient(), []);
  const { floats, award } = useXP();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());
  const [doneHabits, setDoneHabits] = useState<Set<string>>(new Set());
  const [week, setWeek] = useState<Record<string, DayStatus>>({});
  const [customTasks, setCustomTasks] = useState<any[]>([]);
  // Task keys the user removed for today (base or custom), kept in localStorage.
  const [hiddenTasks, setHiddenTasks] = useState<string[]>([]);
  // Custom drag order of task keys per slot (localStorage-persisted).
  const [taskOrder, setTaskOrder] = useState<Record<string, string[]>>({});
  const [review, setReview] = useState<{ id: string; content: string; week_start: string } | null>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [xpToday, setXpToday] = useState(0);
  const [burstDate, setBurstDate] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const { prefs, setOrder, toggleHidden } = useHomePrefs();

  const date = todayISO();

  const load = useCallback(async () => {
    // Tasks removed for today + custom drag order (localStorage, both modes).
    if (typeof window !== "undefined") {
      try {
        setHiddenTasks(JSON.parse(localStorage.getItem(`accel_hidden:${date}`) || "[]"));
      } catch {
        setHiddenTasks([]);
      }
      try {
        setTaskOrder(JSON.parse(localStorage.getItem("accel_taskorder") || "{}"));
      } catch {
        setTaskOrder({});
      }
    }
    if (DEMO) {
      const ov = demoGet<{ name?: string; position?: string }>("profileOverrides", {});
      const streakOv = demoGet<{ streak: number; longest_streak: number; last_active: string }>("streakState", {} as any);
      setProfile({ ...demoProfile, ...ov, ...streakOv });
      setPlan(demoPlan);
      setHabits([...demoHabits, ...demoGet<Habit[]>("customHabits", [])]);
      setWeek(demoWeek);
      // Custom tasks the user added, scheduled for today.
      const dow = new Date().getDay();
      setCustomTasks(demoGet<any[]>("customTasksList", []).filter((t) => (t.days_of_week ?? []).includes(dow)));
      // Restore persisted demo state so checks/XP survive navigation.
      setDoneTasks(new Set(demoGet<string[]>(`doneTasks:${date}`, [])));
      setDoneHabits(new Set(demoGet<string[]>(`doneHabits:${date}`, [])));
      const questsDone = demoGet<string[]>("questsDone", demoQuests.filter((q) => q.completed).map((q) => q.id));
      setQuests(demoQuests.map((q) => ({ ...q, completed: questsDone.includes(q.id) })));
      setXpToday(demoGet<number>(`xpToday:${date}`, 340));
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const dow = new Date().getDay(); // 0=Sun
    const weekStart = mondayISO();

    const [
      { data: prof },
      planRes,
      { data: habitRows },
      { data: comps },
      { data: hComps },
      { data: weekRows },
      { data: customRows },
      { data: overrideRows },
      { data: reviewRows },
      { data: questRows },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      fetch("/api/generate-plan", { method: "POST" }).then((r) => r.json()).catch(() => null),
      supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true),
      supabase.from("task_completions").select("task_key").eq("user_id", user.id).eq("date", date),
      supabase.from("habit_completions").select("habit_id").eq("user_id", user.id).eq("date", date),
      supabase.from("daily_completion_status").select("date,total_tasks,completed_tasks").eq("user_id", user.id),
      supabase.from("custom_tasks").select("*").eq("user_id", user.id).eq("active", true),
      supabase.from("task_day_overrides").select("task_id, action").eq("user_id", user.id).eq("date", date),
      supabase.from("weekly_reviews").select("id, content, week_start").eq("user_id", user.id).eq("read", false).order("generated_at", { ascending: false }).limit(1),
      supabase.from("quests").select("*").eq("user_id", user.id).eq("week_start", weekStart),
    ]);

    if (prof) {
      if (!prof.onboarded) {
        window.location.href = "/onboarding";
        return;
      }
      setProfile(prof as Profile);
    }
    if (planRes?.plan) setPlan(planRes.plan as DailyPlan);
    setHabits((habitRows ?? []) as Habit[]);
    setDoneTasks(new Set((comps ?? []).map((c: any) => c.task_key)));
    setDoneHabits(new Set((hComps ?? []).map((c: any) => c.habit_id)));
    setReview((reviewRows ?? [])[0] ?? null);
    setQuests(questRows ?? []);

    // Merge scheduled custom tasks for today, minus skip/remove overrides.
    const removed = new Set((overrideRows ?? []).filter((o: any) => o.action === "remove" || o.action === "skip").map((o: any) => o.task_id));
    setCustomTasks(
      (customRows ?? []).filter((t: any) => (t.days_of_week ?? []).includes(dow) && !removed.has(t.id))
    );

    const w: Record<string, DayStatus> = {};
    for (const r of weekRows ?? []) {
      w[(r as any).date] = { date: (r as any).date, completed: (r as any).completed_tasks, total: (r as any).total_tasks };
    }
    setWeek(w);

    // XP earned today from the audit log.
    const { data: xpRows } = await supabase
      .from("xp_transactions")
      .select("amount, created_at")
      .eq("user_id", user.id)
      .gte("created_at", `${date}T00:00:00`);
    setXpToday((xpRows ?? []).reduce((s: number, r: any) => s + r.amount, 0));

    setLoading(false);
  }, [supabase, date]);

  useEffect(() => {
    load();
  }, [load]);

  const allTasks: { key: string; task: PlanTask; slot: Slot; idx: number }[] = useMemo(() => {
    const out: { key: string; task: PlanTask; slot: Slot; idx: number }[] = [];
    if (plan) {
      for (const { key: slot } of SLOTS) {
        // Every task is worth a flat 15 XP (XP is not per-task configurable).
        (plan[slot] ?? []).forEach((task, idx) => out.push({ key: `ai:${slot}:${idx}`, task: { ...task, xp_reward: XP.TASK }, slot, idx }));
      }
    }
    // Inject custom scheduled tasks into their slots.
    for (const t of customTasks) {
      out.push({
        key: `custom:${t.id}`,
        slot: (t.time_slot as Slot) ?? "morning",
        idx: 0,
        task: {
          title: t.title,
          description: t.description ?? undefined,
          why_this_matters: t.why_this_matters ?? undefined,
          xp_reward: XP.TASK,
          category: t.category ?? "fitness",
        },
      });
    }
    return out.filter((t) => !hiddenTasks.includes(t.key));
  }, [plan, customTasks, hiddenTasks]);

  const tasksTotal = allTasks.length;
  const tasksDone = allTasks.filter((t) => doneTasks.has(t.key)).length;

  // Fire a particle burst on today's bubble the moment everything is done.
  const allDoneToday =
    tasksTotal > 0 && tasksDone >= tasksTotal && (habits.length === 0 || doneHabits.size >= habits.length);
  const prevAllRef = useRef(false);
  useEffect(() => {
    if (allDoneToday && !prevAllRef.current) {
      setWeek((w) => ({ ...w, [date]: { date, completed: tasksTotal, total: tasksTotal, allComplete: true } }));
      setBurstDate(date);
      const t = setTimeout(() => setBurstDate(null), 900);
      prevAllRef.current = true;
      return () => clearTimeout(t);
    }
    prevAllRef.current = allDoneToday;
  }, [allDoneToday, date, tasksTotal]);

  // Streak: a day "counts" once 3 tasks are done. The streak number continues
  // if the previous counted day was yesterday, resets to 1 after a gap, and
  // shows 0 when a day was missed. streak_date holds the last counted date — a
  // dedicated field so award-xp's last_active writes never interfere.
  const yesterday = todayISO(new Date(Date.now() - 86400000));
  const effectiveStreak =
    !profile ? 0 : profile.streak_date === date || profile.streak_date === yesterday ? profile.streak ?? 0 : 0;

  const streakCreditedRef = useRef(false);
  useEffect(() => {
    if (!profile || tasksDone < 3 || streakCreditedRef.current) return;
    streakCreditedRef.current = true;
    if (profile.streak_date === date) return; // already counted today
    const newStreak = profile.streak_date === yesterday ? (profile.streak ?? 0) + 1 : 1;
    const newLongest = Math.max(profile.longest_streak ?? 0, newStreak);
    setProfile((p) => (p ? { ...p, streak: newStreak, longest_streak: newLongest, streak_date: date } : p));
    (async () => {
      if (DEMO) {
        demoSet("streakState", { streak: newStreak, longest_streak: newLongest, streak_date: date });
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await supabase.from("profiles").update({ streak: newStreak, longest_streak: newLongest, streak_date: date }).eq("id", user.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksDone, profile]);

  async function toggleTask(key: string, task: PlanTask) {
    const isDone = doneTasks.has(key);
    const delta = isDone ? -task.xp_reward : task.xp_reward;
    const nextSet = new Set(doneTasks);
    isDone ? nextSet.delete(key) : nextSet.add(key);
    setDoneTasks(nextSet); // optimistic (check or uncheck)
    const nextXp = Math.max(0, xpToday + delta);
    setXpToday(nextXp);

    if (DEMO) {
      demoSet(`doneTasks:${date}`, [...nextSet]);
      demoSet(`xpToday:${date}`, nextXp);
      await award(delta, `task:${task.title}`);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (isDone) {
      await supabase.from("task_completions").delete().eq("user_id", user.id).eq("task_key", key).eq("date", date);
    } else {
      await supabase.from("task_completions").insert({ user_id: user.id, task_key: key, date });
    }
    await award(delta, isDone ? `undo task:${task.title}` : `task:${task.title}`);

    const newDone = tasksDone + (isDone ? -1 : 1);
    await supabase.from("daily_completion_status").upsert(
      { user_id: user.id, date, total_tasks: tasksTotal, completed_tasks: newDone, all_complete: newDone >= tasksTotal && tasksTotal > 0 },
      { onConflict: "user_id,date" }
    );
    if (!isDone && newDone >= tasksTotal && tasksTotal > 0) await award(XP.FULL_DAY_BONUS, "full-day bonus");
  }

  async function toggleHabit(h: Habit) {
    const isDone = doneHabits.has(h.id);
    const delta = isDone ? -h.xp_reward : h.xp_reward;
    const nextSet = new Set(doneHabits);
    isDone ? nextSet.delete(h.id) : nextSet.add(h.id);
    setDoneHabits(nextSet);
    const nextXp = Math.max(0, xpToday + delta);
    setXpToday(nextXp);

    if (DEMO) {
      demoSet(`doneHabits:${date}`, [...nextSet]);
      demoSet(`xpToday:${date}`, nextXp);
      await award(delta, `habit:${h.title}`);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (isDone) {
      await supabase.from("habit_completions").delete().eq("user_id", user.id).eq("habit_id", h.id).eq("date", date);
    } else {
      await supabase.from("habit_completions").insert({ user_id: user.id, habit_id: h.id, date });
    }
    await award(delta, isDone ? `undo habit:${h.title}` : `habit:${h.title}`);
  }

  async function completeQuest(q: any) {
    const next = !q.completed;
    const delta = next ? q.xp_reward : -q.xp_reward;
    const nextQuests = quests.map((x) => (x.id === q.id ? { ...x, completed: next } : x));
    setQuests(nextQuests);
    const nextXp = Math.max(0, xpToday + delta);
    setXpToday(nextXp);
    if (DEMO) {
      demoSet("questsDone", nextQuests.filter((x) => x.completed).map((x) => x.id));
      demoSet(`xpToday:${date}`, nextXp);
    } else {
      await supabase.from("quests").update({ completed: next }).eq("id", q.id);
    }
    await award(delta, next ? `quest:${q.title}` : `undo quest:${q.title}`);
  }

  async function dismissReview() {
    if (!review) return;
    await supabase.from("weekly_reviews").update({ read: true }).eq("id", review.id);
    await award(XP.WEEKLY_REVIEW, "weekly review");
    setXpToday((x) => x + XP.WEEKLY_REVIEW);
    setReview(null);
  }

  // Delete a task. Custom tasks are removed FOR GOOD (deleted from the DB) so
  // they don't come back the next day. Base plan tasks are AI-generated fresh
  // each day, so they're hidden just for today (localStorage).
  async function removeTaskToday(key: string) {
    if (key.startsWith("custom:")) {
      const taskId = key.slice("custom:".length);
      setCustomTasks((ts) => ts.filter((t) => t.id !== taskId));
      if (DEMO) {
        demoSet("customTasksList", demoGet<any[]>("customTasksList", []).filter((t) => t.id !== taskId));
      } else {
        await supabase.from("custom_tasks").delete().eq("id", taskId);
      }
      return;
    }
    // Base plan task — hide for today only.
    setHiddenTasks((h) => {
      const next = Array.from(new Set([...h, key]));
      if (typeof window !== "undefined") localStorage.setItem(`accel_hidden:${date}`, JSON.stringify(next));
      return next;
    });
  }

  // Persist a slot's new drag order (array of task keys).
  function reorderSlot(slot: Slot, keys: string[]) {
    setTaskOrder((prev) => {
      const next = { ...prev, [slot]: keys };
      if (typeof window !== "undefined") localStorage.setItem("accel_taskorder", JSON.stringify(next));
      return next;
    });
  }

  // Sort a slot's tasks by the saved order; unlisted keys keep their natural spot at the end.
  function orderedSlot(slot: Slot, items: { key: string; task: PlanTask }[]) {
    const ord = taskOrder[slot];
    if (!ord?.length) return items;
    return [...items].sort((a, b) => {
      const ia = ord.indexOf(a.key);
      const ib = ord.indexOf(b.key);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  if (loading) return <HomeSkeleton />;

  const lp = levelProgress(profile?.xp ?? 0);
  const goal = profile?.daily_xp_goal ?? 500;
  const goalHit = xpToday >= goal;
  const quote = quoteOfDay();

  const sectionMap: Record<HomeSectionId, JSX.Element> = {
    week: (
      <section id="tour-week" className="card-sm mb-4">
        <WeekBubbles statuses={week} burstDate={burstDate} onSelect={() => (window.location.href = `/calendar`)} />
      </section>
    ),
    donut: (
      <section id="tour-donut" className="card mb-4 flex flex-col items-center">
        <DonutRing
          tasksDone={tasksDone}
          tasksTotal={tasksTotal}
          habitsDone={doneHabits.size}
          habitsTotal={habits.length}
          onClick={() => document.getElementById("plan")?.scrollIntoView({ behavior: "smooth" })}
        />
      </section>
    ),
    xp: (
      <section className="card-sm mb-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{goalHit ? "🎯 Daily goal crushed!" : "Today's XP"}</span>
          <span className="text-muted">
            <NumberCounter value={xpToday} duration={400} format={(n) => String(Math.round(n))} /> / {goal} XP
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#222]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (xpToday / goal) * 100)}%`,
              background: goalHit ? "#F59E0B" : "#FFFFFF",
              boxShadow: goalHit ? "0 0 10px #F59E0B" : "0 0 10px rgba(255,255,255,0.7)",
            }}
          />
        </div>
      </section>
    ),
    plan: (
      <section id="plan" className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Today&apos;s Plan</h2>
          <Link href="/tasks" className="text-sm font-medium text-ink">
            Manage
          </Link>
        </div>
        <div className="space-y-3">
          {SLOTS.map(({ key, label, accent }) => {
            const tasks = orderedSlot(key, allTasks.filter((t) => t.slot === key));
            if (tasks.length === 0) return null;
            return (
              <div key={key} className="card-sm border-l-[3px]" style={{ borderLeftColor: accent, boxShadow: "inset 3px 0 8px -4px rgba(255,255,255,0.6)" }}>
                <h3 className="mb-2 text-sm font-semibold text-muted">{label}</h3>
                <Reorder.Group
                  axis="y"
                  values={tasks.map((t) => t.key)}
                  onReorder={(keys) => reorderSlot(key, keys as string[])}
                  className="space-y-2"
                >
                  {tasks.map(({ key: tkey, task }) => (
                    <ReorderableTask
                      key={tkey}
                      tkey={tkey}
                      task={task}
                      done={doneTasks.has(tkey)}
                      onToggle={() => toggleTask(tkey, task)}
                      onRemove={() => removeTaskToday(tkey)}
                    />
                  ))}
                </Reorder.Group>
              </div>
            );
          })}
        </div>
      </section>
    ),
    habits: (
      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">My Habits</h2>
          <Link href="/tasks#habits" className="text-sm font-medium text-ink">
            + Add
          </Link>
        </div>
        {habits.length === 0 ? (
          <p className="card-sm text-sm text-muted">No habits yet — add a few daily anchors.</p>
        ) : (
          <div className="space-y-2">
            {habits.map((h, i) => (
              <motion.button
                key={h.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                onClick={() => toggleHabit(h)}
                className="card-sm flex w-full items-center gap-3 text-left"
              >
                <CircleCheck checked={doneHabits.has(h.id)} color="#22C55E" />
                <StrikeText done={doneHabits.has(h.id)} className="flex-1 font-medium">{h.title}</StrikeText>
                <span className="pill bg-elevated text-muted">+{h.xp_reward}</span>
              </motion.button>
            ))}
          </div>
        )}
      </section>
    ),
    quests:
      quests.length > 0 ? (
        <section className="mb-5">
          <h2 className="mb-3 text-lg font-bold">This Week&apos;s Quests</h2>
          <div className="space-y-2">
            {quests.map((q) => (
              <div key={q.id} className="card-sm flex items-center gap-3">
                <button onClick={() => completeQuest(q)}>
                  <CircleCheck checked={q.completed} color="#F59E0B" />
                </button>
                <div className="flex-1">
                  <StrikeText done={q.completed} className="block font-medium">{q.title}</StrikeText>
                  {q.target > 1 && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, ((q.progress ?? 0) / q.target) * 100)}%` }} />
                    </div>
                  )}
                </div>
                <span className="pill bg-elevated text-gold">+{q.xp_reward}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <></>
      ),
    quote: (
      <footer className="mt-8 border-t border-border pt-5 text-center">
        <p className="text-sm italic text-muted">&ldquo;{quote.text}&rdquo;</p>
        <p className="mt-1 text-xs text-muted">— {quote.author}</p>
      </footer>
    ),
  };

  return (
    <PageWrapper>
      {/* Floating XP animations */}
      <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex flex-col items-center">
        {floats.map((f) => (
          <span key={f.id} className={`animate-rise-fade text-2xl font-bold ${f.amount < 0 ? "text-red" : "text-gold"}`}>
            {f.amount < 0 ? "" : "+"}
            {f.amount} XP
          </span>
        ))}
      </div>

      {/* Top bar */}
      <header className="mb-5 flex items-center justify-between">
        <Link href="/profile" id="tour-crest" className="flex items-center gap-2">
          <LevelCrest level={lp.level} size={34} />
          <span className="text-sm font-semibold">Level {lp.level}</span>
        </Link>
        <h1 className="text-sm font-medium text-muted glow-text">
          Good {greeting()}, {profile?.name ?? "athlete"}
        </h1>
        <FireStreakCounter streak={effectiveStreak} tasksToday={tasksDone} />
      </header>

      {/* Weekly review */}
      {review && (
        <section className="card mb-4 border-gold/40 bg-gradient-to-br from-gold/10 to-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            Week of {new Date(review.week_start + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{review.content}</p>
          <button onClick={dismissReview} className="btn-ghost mt-3 w-full">
            Got it (+{XP.WEEKLY_REVIEW} XP)
          </button>
        </section>
      )}

      {/* Customize entry */}
      <div className="mb-3 flex justify-end">
        <button onClick={() => setCustomizing(true)} className="text-xs font-medium text-muted">
          ⚙ Customize
        </button>
      </div>

      {/* Reorderable sections */}
      {prefs.order
        .filter((id) => id === "plan" || !prefs.hidden.includes(id))
        .map((id) => (
          <div key={id}>{sectionMap[id]}</div>
        ))}

      {/* Quick actions (fixed) */}
      <section className="-mx-4 mb-6 mt-5 px-4">
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {QUICK.map((q) => (
            <Link key={q.label} href={q.href} id={q.label === "AI Coach" ? "tour-coach" : undefined} className="chip">
              <span>{q.emoji}</span>
              {q.label}
            </Link>
          ))}
        </div>
      </section>

      <TutorialTour
        steps={[
          { selector: "#tour-week", title: "Your week", body: "Green means you crushed every task that day. Tap a day to see the details." },
          { selector: "#tour-donut", title: "Today's progress", body: "This ring fills as you finish tasks and habits. Watch it fill as you go." },
          { selector: "#plan", title: "Earn XP", body: "Check off tasks to earn XP instantly. Finish the whole day for a bonus." },
          { selector: "#tour-coach", title: "Your AI coach", body: "Your coach is always here — ask about training, a big game, or a test." },
          { selector: "#tour-crest", title: "Level up", body: "Earn XP to level up. This is your crest — it gets richer every rank." },
        ]}
      />

      {customizing && (
        <CustomizeHomeSheet
          order={prefs.order}
          hidden={prefs.hidden}
          onReorder={setOrder}
          onToggle={toggleHidden}
          onClose={() => setCustomizing(false)}
        />
      )}
    </PageWrapper>
  );
}

// Wraps a task so it can be press-and-hold dragged to reorder within its slot.
// A ~220ms hold (that doesn't turn into a scroll) picks it up; then it slides.
function ReorderableTask({
  tkey,
  task,
  done,
  onToggle,
  onRemove,
}: {
  tkey: string;
  task: PlanTask;
  done: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  const controls = useDragControls();
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const clearHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = null;
  };
  return (
    <Reorder.Item
      value={tkey}
      dragListener={false}
      dragControls={controls}
      style={{ touchAction: dragging ? "none" : "pan-y" }}
      whileDrag={{ scale: 1.03, boxShadow: "0 10px 26px rgba(0,0,0,0.55)", zIndex: 40, position: "relative" }}
      onPointerDown={(e: React.PointerEvent) => {
        startPos.current = { x: e.clientX, y: e.clientY };
        clearHold();
        holdRef.current = setTimeout(() => {
          if (typeof navigator !== "undefined") navigator.vibrate?.(25);
          setDragging(true);
          controls.start(e);
        }, 220);
      }}
      onPointerMove={(e: React.PointerEvent) => {
        if (holdRef.current && startPos.current) {
          const moved = Math.abs(e.clientX - startPos.current.x) > 8 || Math.abs(e.clientY - startPos.current.y) > 8;
          if (moved) clearHold(); // it's a scroll, not a hold
        }
      }}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onDragEnd={() => setDragging(false)}
    >
      <div className={dragging ? "opacity-90" : ""}>
        <TaskRow task={task} done={done} onToggle={onToggle} onRemove={onRemove} />
      </div>
    </Reorder.Item>
  );
}

function TaskRow({
  task,
  done,
  onToggle,
  onRemove,
}: {
  task: PlanTask;
  done: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className="rounded-2xl bg-elevated p-3"
      animate={{ opacity: done ? 0.6 : 1, x: done ? 4 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5">
          <CircleCheck checked={done} color="#F0F0F0" />
        </button>
        <div className="min-w-0 flex-1">
          <StrikeText done={done} className="font-medium">{task.title}</StrikeText>
          {task.description && <p className="mt-0.5 text-xs text-muted">{task.description}</p>}
          {task.why_this_matters && (
            <button onClick={() => setOpen((o) => !o)} className="mt-1 block text-xs font-medium text-ink">
              {open ? "Hide" : "Why this matters"}
            </button>
          )}
          {open && task.why_this_matters && (
            <p className="mt-1 rounded-xl bg-surface p-2 text-xs text-muted">{task.why_this_matters}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="pill bg-surface text-gold">+{task.xp_reward}</span>
          {onRemove && (
            <button onClick={onRemove} aria-label="Delete task" className="px-1 text-muted transition-colors hover:text-macroFat">
              ✕
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Animated strike-through that grows left→right and correctly crosses EVERY
// line of a wrapped (multi-line) title. Uses a background gradient with
// box-decoration-break so each line fragment gets its own line. Shared by
// tasks, habits, and quests so the cross-out is identical everywhere.
function StrikeText({ done, children, className = "" }: { done: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`${className} ${done ? "text-muted" : ""}`}
      style={{
        backgroundImage: "linear-gradient(#8A8A8A, #8A8A8A)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0 60%",
        backgroundSize: done ? "100% 1.5px" : "0% 1.5px",
        transition: "background-size 0.25s ease, color 0.25s ease",
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}

function CircleCheck({ checked, color }: { checked: boolean; color: string }) {
  // Full sequence: border spins 360°, brief flash, checkmark draws in. On a light
  // (white) fill the checkmark is dark so it stays visible.
  const light = ["#FFFFFF", "#F0F0F0", "#FAFAFA"].includes(color.toUpperCase());
  const checkStroke = light ? "#080808" : "white";
  return (
    <motion.span
      className="grid h-6 w-6 place-items-center rounded-full border-2"
      style={{ borderColor: color, background: checked ? color : "transparent" }}
      animate={
        checked
          ? { rotate: [0, 360], scale: [1, 1.18, 1], boxShadow: [`0 0 0px ${color}`, `0 0 10px ${color}`, `0 0 0px ${color}`] }
          : { rotate: 0, scale: 1, boxShadow: `0 0 0px ${color}` }
      }
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={checkStroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M4 12l5 5L20 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.18, delay: 0.12 }} />
        </svg>
      )}
    </motion.span>
  );
}

function HomeSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="shimmer h-8 w-full rounded-2xl bg-surface" />
        <div className="shimmer h-16 w-full rounded-3xl bg-surface" />
        <div className="shimmer h-48 w-full rounded-3xl bg-surface" />
        <div className="shimmer h-32 w-full rounded-3xl bg-surface" />
        <div className="shimmer h-40 w-full rounded-3xl bg-surface" />
      </div>
    </PageWrapper>
  );
}
