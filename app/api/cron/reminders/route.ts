/**
 * GET /api/cron/reminders?kind=plan|streak|quest
 * Sends scheduled reminders to all subscribed users. Protected by CRON_SECRET.
 *   plan   — morning "your plan is ready"
 *   streak — evening "don't break your streak" (only if nothing logged today)
 *   quest  — Sunday "finish your weekly quests"
 */
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-server";
import { sendToUser } from "@/lib/push-server";
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
  const kind = (new URL(req.url).searchParams.get("kind") || "plan") as "plan" | "streak" | "quest";
  const admin = adminClient();

  // Everyone with at least one subscription.
  const { data: subs } = await admin.from("push_subscriptions").select("user_id");
  const userIds = Array.from(new Set((subs ?? []).map((s: any) => s.user_id)));

  let total = 0;
  for (const userId of userIds) {
    let payload: { title: string; body: string; url?: string } | null = null;

    if (kind === "plan") {
      payload = { title: "Your plan is ready", body: "🎯 Today's plan is waiting. Let's get after it.", url: "/" };
    } else if (kind === "quest") {
      payload = { title: "Weekly quests", body: "Finish your weekly quests before midnight!", url: "/" };
    } else if (kind === "streak") {
      // Only nudge if the user has logged nothing today.
      const { count } = await admin
        .from("xp_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", `${todayISO()}T00:00:00`);
      if ((count ?? 0) > 0) continue;
      const { data: prof } = await admin.from("profiles").select("streak").eq("id", userId).single();
      payload = {
        title: "Don't break your streak",
        body: `⚠️ ${prof?.streak ?? 0}-day streak on the line — log something today.`,
        url: "/",
      };
    }

    if (payload) total += await sendToUser(userId, payload);
  }

  return NextResponse.json({ kind, usersNotified: userIds.length, pushesSent: total });
}
