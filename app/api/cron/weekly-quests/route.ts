/**
 * GET /api/cron/weekly-quests — Monday cron. Generates 5 fresh weekly quests for
 * every onboarded user (if none exist for this week). Protected by CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-server";
import { todayISO } from "@/lib/xp-utils";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const qs = new URL(req.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || qs === secret;
}

const QUEST_TEMPLATES = [
  { title: "Log 5 workouts this week", xp_reward: 120, target: 5 },
  { title: "Complete your daily plan 5 days", xp_reward: 150, target: 5 },
  { title: "Hit your water goal 4 days", xp_reward: 80, target: 4 },
  { title: "Log a meal every day", xp_reward: 100, target: 7 },
  { title: "Complete 3 focus blocks", xp_reward: 90, target: 3 },
];

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = adminClient();
  const weekStart = todayISO();

  const { data: users } = await admin.from("profiles").select("id").eq("onboarded", true);
  let created = 0;
  for (const u of users ?? []) {
    const { data: existing } = await admin
      .from("quests")
      .select("id")
      .eq("user_id", u.id)
      .eq("week_start", weekStart)
      .limit(1);
    if ((existing ?? []).length > 0) continue;
    await admin.from("quests").insert(
      QUEST_TEMPLATES.map((q) => ({ user_id: u.id, ...q, week_start: weekStart }))
    );
    created++;
  }
  return NextResponse.json({ usersSeeded: created });
}
