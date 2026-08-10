"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { browserClient } from "@/lib/supabase";
import { levelProgress, LEVEL_THRESHOLDS, MAX_LEVEL } from "@/lib/level-utils";
import { BADGES, BADGE_BY_KEY } from "@/lib/badges";
import type { Profile } from "@/lib/types";
import { DEMO, demoProfile, demoBadges, demoStats } from "@/lib/demo";
import { demoGet, demoSet } from "@/lib/demo-store";
import PageWrapper from "@/components/layout/PageWrapper";
import LevelCrest from "@/components/shared/LevelCrest";
import NumberCounter from "@/components/shared/NumberCounter";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => browserClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ workouts: 0, meals: 0, quests: 0 });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPos, setEditPos] = useState("");

  useEffect(() => {
    (async () => {
      if (DEMO) {
        const ov = demoGet<{ name?: string; position?: string }>("profileOverrides", {});
        setProfile({ ...demoProfile, ...ov });
        setEarned(new Set(demoBadges));
        setStats(demoStats);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prof }, { data: badges }, { count: workouts }, { count: meals }, { count: quests }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("user_badges").select("badge_key").eq("user_id", user.id),
          supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("quests").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        ]);
      setProfile(prof as Profile);
      setEarned(new Set((badges ?? []).map((b: any) => b.badge_key)));
      setStats({ workouts: workouts ?? 0, meals: meals ?? 0, quests: quests ?? 0 });
    })();
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function startEdit() {
    setEditName(profile?.name ?? "");
    setEditPos(profile?.position ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    const name = editName.trim() || null;
    const position = editPos.trim() || null;
    setProfile((p) => (p ? { ...p, name, position } : p));
    setEditing(false);
    if (DEMO) {
      demoSet("profileOverrides", { name, position });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ name, position }).eq("id", user.id);
  }

  if (!profile) return <PageWrapper><div className="h-64 animate-pulse rounded-3xl bg-surface" /></PageWrapper>;

  const lp = levelProgress(profile.xp);
  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" });

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Profile</h1>

      {/* User card */}
      <section className="card mb-4 flex items-center gap-4">
        <LevelCrest level={lp.level} size={72} />
        <div className="flex-1">
          {editing ? (
            <div className="space-y-2">
              <input className="input px-3 py-2 text-base font-bold" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" autoFocus />
              <input className="input px-3 py-2 text-sm" value={editPos} onChange={(e) => setEditPos(e.target.value)} placeholder="Position (e.g. Winger / CAM)" />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="btn-primary px-4 py-1.5 text-sm">Save</button>
                <button onClick={() => setEditing(false)} className="btn-ghost px-4 py-1.5 text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <button onClick={startEdit} aria-label="Edit name & position" className="text-muted transition-colors hover:text-ink">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-muted">{profile.position}</p>
              <div className="mt-1 flex gap-3 text-xs text-muted">
                <span>🔥 Best {profile.longest_streak}</span>
                <span>Since {memberSince}</span>
              </div>
            </>
          )}
        </div>
        <div className="text-right">
          <NumberCounter value={profile.xp} className="block text-2xl font-bold text-ink glow-text" />
          <div className="text-xs text-muted">total XP</div>
        </div>
      </section>

      {/* Level progress */}
      <section className="card mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">{lp.crestName} · Level {lp.level}</span>
          <span className="text-sm text-muted">
            {lp.isMax ? "MAX" : `${lp.remaining.toLocaleString()} XP to L${lp.level + 1}`}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${lp.fraction * 100}%` }} />
        </div>
        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
          {Array.from({ length: MAX_LEVEL }).map((_, i) => (
            <div key={i} className={`flex shrink-0 flex-col items-center ${i + 1 <= lp.level ? "" : "opacity-30"}`}>
              <LevelCrest level={i + 1} size={40} />
              <span className="text-[10px] text-muted">{LEVEL_THRESHOLDS[i].toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats grid */}
      <section className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Workouts" value={stats.workouts} />
        <Stat label="Meals logged" value={stats.meals} />
        <Stat label="Quests done" value={stats.quests} />
        <Stat label="Day streak" value={profile.streak} />
      </section>

      {/* Badges */}
      <section className="card mb-4">
        <h3 className="mb-3 font-semibold">Badges</h3>
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map((b) => {
            const has = earned.has(b.key);
            return (
              <div key={b.key} className={`flex flex-col items-center gap-1 text-center ${has ? "" : "opacity-30"}`} title={b.hint}>
                <div className={`grid h-12 w-12 place-items-center rounded-full text-2xl ${has ? "bg-elevated shadow-glow" : "bg-border"}`}>
                  {b.emoji}
                </div>
                <span className="text-[9px] leading-tight text-muted">{b.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Goals */}
      <section className="card mb-4">
        <h3 className="mb-2 font-semibold">Goals</h3>
        <div className="flex flex-wrap gap-2">
          {(profile.goals ?? []).map((g) => (
            <span key={g} className="pill bg-elevated text-ink">{g}</span>
          ))}
        </div>
      </section>

      {/* More */}
      <section className="card mb-4">
        <h3 className="mb-3 font-semibold">More</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/stats", label: "All-time Stats", emoji: "📊" },
            { href: "/goals", label: "Goals", emoji: "🎯" },
            { href: "/calendar", label: "Calendar", emoji: "🗓️" },
            { href: "/study", label: "Study / AMC", emoji: "🧮" },
            { href: "/sleep", label: "Sleep", emoji: "😴" },
            { href: "/settings", label: "Settings", emoji: "⚙️" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-2xl bg-elevated px-4 py-3 text-sm font-medium">
              <span>{l.emoji}</span>
              {l.label}
            </Link>
          ))}
        </div>
      </section>

      <button onClick={logout} className="btn-ghost w-full text-macroFat">
        Log out
      </button>
    </PageWrapper>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-sm">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
