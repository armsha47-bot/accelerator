/**
 * GET /api/cron/weekly-review — Sunday-evening cron. Generates a coach-style
 * weekly review for each onboarded user from the week's activity, plus one AI
 * habit insight. Protected by CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-server";
import { anthropic, MODELS, textOf } from "@/lib/anthropic";
import { todayISO } from "@/lib/xp-utils";

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
  const weekStart = todayISO();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: users } = await admin.from("profiles").select("id, name, streak").eq("onboarded", true);
  let generated = 0;

  for (const u of users ?? []) {
    const [{ count: workouts }, { count: meals }, { data: xp }] = await Promise.all([
      admin.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", u.id).gte("date", weekAgo.slice(0, 10)),
      admin.from("food_logs").select("id", { count: "exact", head: true }).eq("user_id", u.id).gte("date", weekAgo.slice(0, 10)),
      admin.from("xp_transactions").select("amount").eq("user_id", u.id).gte("created_at", weekAgo),
    ]);
    const xpEarned = (xp ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

    let content = `You logged ${workouts ?? 0} workouts and ${meals ?? 0} meals this week, earning ${xpEarned} XP. Keep the streak alive and pick one thing to sharpen next week.`;
    try {
      const msg = await anthropic().messages.create({
        model: MODELS.fast,
        max_tokens: 260,
        messages: [
          {
            role: "user",
            content: `Write a 100-150 word weekly review for ${u.name ?? "the athlete"} like a coach reviewing game film — direct, specific, honest. This week: ${workouts ?? 0} workouts, ${meals ?? 0} meals logged, ${xpEarned} XP, ${u.streak ?? 0}-day streak. Call out what was strong, what slipped, and one focus for next week. No preamble.`,
          },
        ],
      });
      content = textOf(msg);
    } catch {
      /* fall back to the summary above */
    }

    await admin.from("weekly_reviews").insert({ user_id: u.id, week_start: weekStart, content, read: false });
    generated++;
  }

  return NextResponse.json({ reviewsGenerated: generated });
}
