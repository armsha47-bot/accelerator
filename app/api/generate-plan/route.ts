/**
 * POST /api/generate-plan
 * Generates today's plan with Claude (fast model) if one doesn't exist yet,
 * personalized to the user's goals / streak / recent sleep. Idempotent per day.
 */
import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase-server";
import { anthropic, MODELS, textOf, parseJson } from "@/lib/anthropic";
import { todayISO } from "@/lib/xp-utils";
import type { PlanTask } from "@/lib/types";

interface PlanShape {
  morning: PlanTask[];
  afternoon: PlanTask[];
  evening: PlanTask[];
}

export async function POST() {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = adminClient();
  const date = todayISO();

  const { data: existing } = await admin
    .from("daily_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();
  if (existing) return NextResponse.json({ plan: existing, cached: true });

  const { data: profile } = await admin
    .from("profiles")
    .select("name, goals, streak, position, age")
    .eq("id", user.id)
    .single();

  const { data: sleep } = await admin
    .from("sleep_logs")
    .select("hours_slept")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dow = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const lastSleep = sleep?.hours_slept ?? null;

  const prompt = `Generate today's personalized plan for ${profile?.name ?? "the athlete"}, a ${profile?.age ?? 15}-year-old soccer ${profile?.position ?? "winger/CAM"}.
Goals: ${(profile?.goals ?? []).join(", ") || "soccer performance, academics, confidence, nutrition"}.
Current streak: ${profile?.streak ?? 0} days. Day: ${dow}.${lastSleep !== null ? ` Last night's sleep: ${lastSleep}h${lastSleep < 6 ? " (LOW — make the plan lighter and add a recovery note)" : ""}.` : ""}

Return ONLY JSON of this exact shape (2-3 morning, 2-3 afternoon, 1-2 evening tasks). Keep tasks specific, fresh, and non-repetitive. Reference soccer fitness, math/AMC prep, confidence, and nutrition where relevant:
{"morning":[{"title":"","description":"","why_this_matters":"","xp_reward":10,"category":"fitness|academic|mindset|nutrition"}],"afternoon":[...],"evening":[...]}`;

  let plan: PlanShape;
  try {
    const msg = await anthropic().messages.create({
      model: MODELS.fast,
      max_tokens: 1400,
      messages: [{ role: "user", content: prompt }],
    });
    plan = parseJson<PlanShape>(textOf(msg));
  } catch (e) {
    // Fall back to a sensible static plan so the app never shows an empty day.
    plan = FALLBACK_PLAN;
  }

  const { data: saved } = await admin
    .from("daily_plans")
    .insert({ user_id: user.id, date, morning: plan.morning, afternoon: plan.afternoon, evening: plan.evening })
    .select()
    .single();

  return NextResponse.json({ plan: saved, cached: false });
}

const FALLBACK_PLAN: PlanShape = {
  morning: [
    { title: "10-min ball mastery", description: "First touch, weak foot, quick cuts in your cleats.", why_this_matters: "Muscle memory that shows up under pressure.", xp_reward: 30, category: "fitness" },
    { title: "Protein-forward breakfast", description: "Eggs or Greek yogurt + fruit.", why_this_matters: "Fuels recovery and focus for the day.", xp_reward: 10, category: "nutrition" },
  ],
  afternoon: [
    { title: "AMC problem set (5 problems)", description: "Mixed algebra + number theory.", why_this_matters: "Consistent reps build the pattern recognition that wins timed exams.", xp_reward: 25, category: "academic" },
    { title: "Confidence rep", description: "Say one thing you did well today out loud.", why_this_matters: "Identity is built by evidence you give yourself.", xp_reward: 10, category: "mindset" },
  ],
  evening: [
    { title: "Mobility + wind-down", description: "10-min hip/hamstring stretch, phone away 30 min before bed.", why_this_matters: "Sleep is where the gains lock in.", xp_reward: 15, category: "fitness" },
  ],
};
