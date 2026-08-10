"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { browserClient } from "@/lib/supabase";
import type { LeaderboardUser } from "@/lib/types";
import { DEMO, demoLeaderboard, DEMO_USER_ID, demoProfile } from "@/lib/demo";
import { demoGet } from "@/lib/demo-store";
import { levelForXp } from "@/lib/level-utils";
import { todayISO } from "@/lib/xp-utils";
import PageWrapper from "@/components/layout/PageWrapper";
import LevelCrest from "@/components/shared/LevelCrest";

export default function LeaderboardPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [rows, setRows] = useState<LeaderboardUser[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const build = useCallback(async () => {
    if (DEMO) {
      // My leaderboard XP = base total + XP earned today, so logging activity can
      // push me past ghosts (and the row animates into its new position).
      const extra = Math.max(0, demoGet<number>(`xpToday:${todayISO()}`, 340) - 340);
      const list = (demoLeaderboard as LeaderboardUser[]).map((r) =>
        r.real_user_id === DEMO_USER_ID ? { ...r, xp: demoProfile.xp + extra } : r
      );
      list.sort((a, b) => b.xp - a.xp);
      setMeId(DEMO_USER_ID);
      setRows(list);
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMeId(user?.id ?? null);
    const { data } = await supabase.from("leaderboard_users").select("*").order("xp", { ascending: false });
    setRows((data ?? []) as LeaderboardUser[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    build();
    // Re-read when returning to the tab, and (demo) poll so a rank change made on
    // another screen animates into place here.
    const onFocus = () => build();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const id = DEMO ? window.setInterval(build, 2000) : undefined;
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      if (id) clearInterval(id);
    };
  }, [build]);

  const myRank = rows.findIndex((r) => r.real_user_id === meId);
  const me = myRank >= 0 ? rows[myRank] : null;
  const above = myRank > 0 ? rows[myRank - 1] : null;

  return (
    <PageWrapper>
      <h1 className="mb-4 text-2xl font-bold">Leaderboard</h1>

      {/* Weekly challenge */}
      <section className="card mb-4 bg-gradient-to-br from-white/10 to-surface">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">This week&apos;s challenge</p>
        <p className="mt-1 text-lg font-bold">Most workouts logged 🏋️</p>
        <p className="text-sm text-muted">Climb the board by training the most this week.</p>
      </section>

      {me && (
        <section className="card mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Your rank</p>
            <motion.p key={myRank} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }} className="text-3xl font-bold text-ink">
              #{myRank + 1}
            </motion.p>
          </div>
          {above ? (
            <p className="text-right text-sm text-muted">
              {(above.xp - me.xp).toLocaleString()} XP<br />to pass {above.display_name}
            </p>
          ) : (
            <p className="text-right text-sm font-semibold text-gold">👑 Top of the board</p>
          )}
        </section>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-surface" />
      ) : (
        <div className="relative space-y-2">
          {rows.map((r, i) => {
            const mine = r.real_user_id && r.real_user_id === meId;
            const lvl = levelForXp(r.xp);
            return (
              <motion.div
                key={r.id}
                layout
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${mine ? "border-white bg-white/10" : "border-border bg-surface"}`}
              >
                <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
                <img
                  src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(r.avatar_seed)}`}
                  alt=""
                  className="h-9 w-9 rounded-full ring-2 ring-border"
                />
                <span className="flex-1 font-medium">
                  {r.display_name} {mine && <span className="text-xs text-ink">(you)</span>}
                </span>
                <LevelCrest level={lvl} size={22} />
                <span className="w-16 text-right text-sm font-semibold text-gold">{r.xp.toLocaleString()}</span>
              </motion.div>
            );
          })}
        </div>
      )}

      <button
        className="btn-ghost mt-4 w-full"
        onClick={() => {
          navigator.clipboard?.writeText(window.location.origin);
          alert("Invite link copied!");
        }}
      >
        Invite a friend
      </button>
    </PageWrapper>
  );
}
