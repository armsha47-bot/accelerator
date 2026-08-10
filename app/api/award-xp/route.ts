/**
 * POST /api/award-xp  { amount: number, reason: string }
 * Adds XP to the signed-in user's profile, logs an xp_transaction, recomputes
 * level, and runs the badge checker. Returns the new totals + any leveled-up /
 * newly-earned badges so the client can celebrate.
 */
import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase-server";
import { levelForXp } from "@/lib/level-utils";
import { checkBadges } from "@/lib/badge-checker";

export async function POST(req: Request) {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { amount, reason } = await req.json().catch(() => ({}));
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "amount must be a number" }, { status: 400 });
  }

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("xp, level")
    .eq("id", user.id)
    .single();

  const prevXp = profile?.xp ?? 0;
  const prevLevel = profile?.level ?? 1;
  const newXp = Math.max(0, prevXp + amount);
  const newLevel = levelForXp(newXp);

  await Promise.all([
    admin.from("profiles").update({ xp: newXp, level: newLevel, last_active: new Date().toISOString().slice(0, 10) }).eq("id", user.id),
    admin.from("xp_transactions").insert({ user_id: user.id, amount, reason: reason ?? "xp" }),
    // Keep the user's leaderboard row (if any) in sync.
    admin.from("leaderboard_users").update({ xp: newXp, level: newLevel }).eq("real_user_id", user.id),
  ]);

  const newBadges = await checkBadges(user.id);

  return NextResponse.json({
    xp: newXp,
    level: newLevel,
    leveledUp: newLevel > prevLevel,
    newBadges,
  });
}
