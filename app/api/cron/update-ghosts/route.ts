/**
 * GET /api/cron/update-ghosts
 * Daily Vercel Cron: bumps each ghost leaderboard user by a random 10-30 XP and
 * recomputes their level, so the board feels alive. Protected by CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-server";
import { levelForXp } from "@/lib/level-utils";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const qs = new URL(req.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = adminClient();
  const { data: ghosts } = await admin
    .from("leaderboard_users")
    .select("id, xp")
    .eq("is_ghost", true);

  await Promise.all(
    (ghosts ?? []).map((g) => {
      const bump = 10 + Math.floor(Math.random() * 21); // 10-30
      const xp = (g.xp ?? 0) + bump;
      return admin.from("leaderboard_users").update({ xp, level: levelForXp(xp) }).eq("id", g.id);
    })
  );

  return NextResponse.json({ updated: ghosts?.length ?? 0 });
}
